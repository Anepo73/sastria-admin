const { app } = require('@azure/functions');
const jwt = require('jsonwebtoken');

const BACKEND_BASE = 'https://fn-sastri-graph-proxy1-cufvhzhsc6b0f0dq.brazilsouth-01.azurewebsites.net/api';

function validateGlobalAdminJwt(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw Object.assign(new Error('JWT_SECRET não configurado.'), { status: 500 });
    const payload = jwt.verify(token, secret);
    if (payload.persona !== 'GlobalAdmin' && payload.persona !== 'Admin') {
        throw Object.assign(new Error('Permissão insuficiente.'), { status: 403 });
    }
    return payload;
}

app.http('VouchersAdmin', {
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        if (request.method === 'OPTIONS') {
            return require('./shared/cors').optionsResponse(request);
        }

        // Autenticar via JWT (GlobalAdmin only)
        const rawToken = request.headers.get('x-sastria-jwt') || '';
        const token = rawToken.replace(/^Bearer\s+/i, '');
        if (!token) {
            return {
                status: 401,
                headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
                jsonBody: { ok: false, erro: 'Token JWT ausente.' }
            };
        }
        let adminPayload;
        try {
            adminPayload = validateGlobalAdminJwt(token);
        } catch (authErr) {
            return {
                status: authErr.status || 401,
                headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
                jsonBody: { ok: false, erro: authErr.message }
            };
        }

        const backendKey = process.env.PROXY_BACKEND_FUNCTION_KEY;
        if (!backendKey) {
            context.error('PROXY_BACKEND_FUNCTION_KEY não configurada.');
            return {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
                jsonBody: { ok: false, erro: 'Configuração do backend ausente.' }
            };
        }

        // Montar payload para o backend
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        const attempts = url.searchParams.get('attempts');

        let body = {};
        if (request.method === 'POST') {
            try { body = await request.json(); } catch { body = {}; }
        }

        const backendBody = {
            method: request.method,
            id: id || undefined,
            attempts: attempts === 'true',
            createdBy: adminPayload.email || adminPayload.userId || 'globaladmin',
            ...body,
        };

        let backendResponse;
        try {
            backendResponse = await fetch(`${BACKEND_BASE}/VouchersAdmin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-functions-key': backendKey,
                },
                body: JSON.stringify(backendBody),
            });
        } catch (fetchErr) {
            context.error('Fetch to VouchersAdmin backend failed:', fetchErr);
            return {
                status: 502,
                headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
                jsonBody: { ok: false, erro: `Backend inacessível: ${fetchErr.message}` }
            };
        }

        const responseText = await backendResponse.text();
        let responseData = null;
        try { responseData = JSON.parse(responseText); } catch { /* non-JSON */ }

        return {
            status: backendResponse.status,
            headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
            jsonBody: responseData ?? { ok: backendResponse.ok }
        };
    },
});
