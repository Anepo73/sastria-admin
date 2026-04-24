const { app } = require('@azure/functions');
const jwt = require('jsonwebtoken');

// Endpoints chamados pelo admin sob demanda.
// usersassignedplans e usersigninactivity sao demorados (>30s) — o orquestrador
// encerra a espera, mas o ingestor continua rodando no Azure ate concluir.
const INGESTION_ENDPOINTS = [
    '/api/ingest/users',
    '/api/ingest/organization',
    '/api/ingest/directorysubscriptions',
    '/api/ingest/subscribedskus',
    '/api/ingest/m365appuserdetail',
    '/api/ingest/mailboxusagedetail',
    '/api/ingest/reports/m365activeuserdetail',
    '/api/ingest/usersassignedplans',
    '/api/ingest/usersigninactivity',
    '/api/ingest/reports/o365ServicesUserCounts'
];

const INGESTOR_BASE_URL = 'https://fn-sastri-graph-ingestor1-cjegajfhddczbfcv.brazilsouth-01.azurewebsites.net';
const PER_CALL_TIMEOUT_MS = 28000; // 28s per call — respects 30s SWA Free proxy limit

// Fetch with a per-call timeout so a slow endpoint doesn't block indefinitely
async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function ingestEndpoint(endpoint, tenantCode, ingestorKey) {
    const url = `${INGESTOR_BASE_URL}${endpoint}`;
    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-functions-key': ingestorKey
            },
            body: JSON.stringify({ tenant_code: tenantCode })
        }, PER_CALL_TIMEOUT_MS);

        const text = await response.text();
        let parsed = null;
        try { parsed = JSON.parse(text); } catch { /* non-JSON ok */ }

        if (!response.ok) {
            const errMsg = parsed?.error || parsed?.erro || text || `HTTP ${response.status}`;
            return { endpoint, status: response.status, error: errMsg };
        }
        return { endpoint, status: response.status, success: true };

    } catch (err) {
        const errMsg = err.name === 'AbortError'
            ? `Timeout (>${PER_CALL_TIMEOUT_MS / 1000}s)`
            : err.message;
        return { endpoint, error: errMsg };
    }
}

function tryDecodeJwt(rawToken) {
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret || !rawToken) return null;
        const token = rawToken.replace(/^Bearer\s+/i, '');
        const payload = jwt.verify(token, secret);
        if (payload.persona === 'GlobalAdmin') return payload;
    } catch { /* invalid or expired */ }
    return null;
}

app.http('ingest_orchestrator', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        if (request.method === 'OPTIONS') {
            return require('./shared/cors').optionsResponse(request);
        }

        try {
            const body = await request.json();
            const { tenant_code, ingest_all, tenants } = body;

            // Verificar JWT para operações admin (ingest_all)
            const rawToken = request.headers.get('x-sastria-jwt') || '';
            const jwtPayload = tryDecodeJwt(rawToken);

            if (ingest_all && !jwtPayload) {
                return { status: 401, jsonBody: { ok: false, erro: 'Ação administrativa requer autenticação JWT válida.' } };
            }

            // Chave do ingestor sempre vem do servidor
            const ingestorKey = process.env.INGESTOR_FUNCTION_KEY;
            if (!ingestorKey) {
                return { status: 500, jsonBody: { ok: false, erro: 'INGESTOR_FUNCTION_KEY ausente no servidor SWA.' } };
            }

            const tenantsToProcess = ingest_all && tenants ? tenants : [tenant_code];

            if (!tenantsToProcess || tenantsToProcess.length === 0 || !tenantsToProcess[0]) {
                return { status: 400, jsonBody: { ok: false, erro: 'Tenant Code é obrigatório.' } };
            }

            // Process all tenants in parallel
            const tenantPromises = tenantsToProcess.map(async (tenant) => {
                // For each tenant, fire all endpoints in parallel
                const stepResults = await Promise.allSettled(
                    INGESTION_ENDPOINTS.map(ep => ingestEndpoint(ep, tenant, ingestorKey))
                );

                const steps = stepResults.map(r =>
                    r.status === 'fulfilled' ? r.value : { endpoint: '?', error: r.reason?.message || 'Unknown error' }
                );

                const success = steps.every(s => s.success === true);
                return { tenant_code: tenant, success, steps };
            });

            const results = await Promise.all(tenantPromises);
            const overallSuccess = results.every(r => r.success);

            return {
                status: overallSuccess ? 200 : 207,
                headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
                jsonBody: { ok: overallSuccess, results }
            };

        } catch (err) {
            context.error('Orchestrator error:', err);
            return {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
                jsonBody: { ok: false, erro: err.message || 'Internal Server Error' }
            };
        }
    }
});

