const { app } = require('@azure/functions');
const jwt = require('jsonwebtoken');

const BACKEND_URL = "https://fn-sastri-graph-proxy1-cufvhzhsc6b0f0dq.brazilsouth-01.azurewebsites.net/api/RunRecommendations";

function validateAdminJwt(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw Object.assign(new Error('JWT_SECRET não configurado.'), { status: 500 });
    const payload = jwt.verify(token, secret);
    if (payload.persona !== 'GlobalAdmin' && payload.persona !== 'Admin') {
        throw Object.assign(new Error('Permissão insuficiente.'), { status: 403 });
    }
    return payload;
}

app.http('RunRecommendations', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        if (request.method === 'OPTIONS') {
            return require('./shared/cors').optionsResponse(request);
        }
        const cors = require('./shared/cors').corsHeaders(request);
        try {
            // Autenticar via JWT
            const rawToken = request.headers.get('x-sastria-jwt') || '';
            const token = rawToken.replace(/^Bearer\s+/i, '');
            if (!token) {
                return { status: 401, headers: { 'Content-Type': 'application/json', ...cors }, jsonBody: { ok: false, error: 'Token JWT ausente.' } };
            }
            let jwtPayload;
            try {
                jwtPayload = validateAdminJwt(token);
            } catch (authErr) {
                return { status: authErr.status || 401, headers: { 'Content-Type': 'application/json', ...cors }, jsonBody: { ok: false, error: authErr.message } };
            }

            // Lê o body ANTES de extrair o tenantId, pois ele vem no body
            const body = await request.json().catch(() => ({}));

            // Tenant ID: prioridade → body.tenant_id → header → JWT
            const tenantId = body?.tenant_id || request.headers.get('x-tenant-id') || jwtPayload.tenantId;
            if (!tenantId) {
                return { status: 400, headers: { 'Content-Type': 'application/json', ...cors }, jsonBody: { ok: false, error: 'tenant_id ausente (body, header ou JWT).' } };
            }

            // Function key server-side
            const backendKey = process.env.PROXY_BACKEND_FUNCTION_KEY;
            if (!backendKey) {
                context.error('PROXY_BACKEND_FUNCTION_KEY não configurada.');
                return { status: 500, headers: { 'Content-Type': 'application/json', ...cors }, jsonBody: { ok: false, error: 'Configuração do backend ausente no servidor.' } };
            }

            const response = await fetch(BACKEND_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-tenant-id": tenantId,
                    "x-functions-key": backendKey
                },
                body: JSON.stringify(body)
            });

            const text = await response.text();
            let data;
            try { data = JSON.parse(text); } catch(e) { data = { error: text }; }

            return { status: response.status, headers: { 'Content-Type': 'application/json', ...cors }, jsonBody: data };
        } catch (error) {
            context.error("Proxy RunRecommendations errored:", error);
            return { status: 500, headers: { 'Content-Type': 'application/json', ...cors }, jsonBody: { error: error.message } };
        }
    }
});
