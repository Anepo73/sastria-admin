const { app } = require('@azure/functions');

/**
 * IngestProxy (SWA Function)
 *
 * Forward transparente para fn-sastri-graph-proxy1/api/IngestProxy,
 * que contém toda a lógica: validação JWT, allowlist de endpoints,
 * credenciais do ingestor server-side.
 *
 * O browser envia apenas o JWT e o body { endpoint, tenant_code, timeout_ms }.
 */

const PROXY_BACKEND_URL = 'https://fn-sastri-graph-proxy1-cufvhzhsc6b0f0dq.brazilsouth-01.azurewebsites.net/api/IngestProxy';

app.http('IngestProxy', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        if (request.method === 'OPTIONS') {
            return require('./shared/cors').optionsResponse(request);
        }

        // Repassar o JWT do browser — o proxy backend valida internamente
        const jwtToken = request.headers.get('x-sastria-jwt') || '';
        if (!jwtToken) {
            return {
                status: 401,
                headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
                jsonBody: { ok: false, erro: 'Token JWT ausente.' }
            };
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
                jsonBody: { ok: false, erro: 'Corpo da requisição inválido.' }
            };
        }

        const timeoutMs = body?.timeout_ms || 300000;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(PROXY_BACKEND_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-sastria-jwt': jwtToken
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });

            clearTimeout(timer);

            const text = await response.text();
            let data;
            try { data = JSON.parse(text); } catch { data = { raw: text }; }

            return {
                status: response.status,
                headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
                jsonBody: data
            };

        } catch (err) {
            clearTimeout(timer);
            const isTimeout = err.name === 'AbortError';
            context.warn(`IngestProxy forward ${isTimeout ? 'timeout' : 'error'}:`, err.message);
            return {
                status: isTimeout ? 504 : 502,
                headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
                jsonBody: {
                    ok: false,
                    erro: isTimeout
                        ? `Timeout após ${timeoutMs / 1000}s — o ingestor pode ainda estar rodando no Azure.`
                        : err.message
                }
            };
        }
    }
});
