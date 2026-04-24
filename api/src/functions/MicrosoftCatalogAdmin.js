const { app } = require('@azure/functions');
const jwt = require('jsonwebtoken');

const BACKEND_URL = 'https://fn-sastri-graph-proxy1-cufvhzhsc6b0f0dq.brazilsouth-01.azurewebsites.net/api/MicrosoftCatalogAdmin';

function validateAdminJwt(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw Object.assign(new Error('JWT_SECRET não configurado.'), { status: 500 });
    const payload = jwt.verify(token, secret);
    if (payload.persona !== 'GlobalAdmin' && payload.persona !== 'Admin') {
        throw Object.assign(new Error('Permissão insuficiente.'), { status: 403 });
    }
    return payload;
}

app.http('MicrosoftCatalogAdmin', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        if (request.method === 'OPTIONS') {
            return require('./shared/cors').optionsResponse(request);
        }

        const rawToken = request.headers.get('x-sastria-jwt') || '';
        const token = rawToken.replace(/^Bearer\s+/i, '');
        if (!token) {
            return {
                status: 401,
                headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
                jsonBody: { ok: false, codigo: 'TOKEN_AUSENTE', erro: 'Token JWT ausente.' }
            };
        }
        try {
            validateAdminJwt(token);
        } catch (authErr) {
            return {
                status: authErr.status || 401,
                headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
                jsonBody: { ok: false, codigo: 'TOKEN_INVALIDO', erro: authErr.message }
            };
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
                jsonBody: { ok: false, codigo: 'BODY_INVALIDO', erro: 'Corpo da requisição inválido.' }
            };
        }

        const backendKey = process.env.PROXY_BACKEND_FUNCTION_KEY;
        if (!backendKey) {
            return {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
                jsonBody: { ok: false, codigo: 'CONFIG_AUSENTE', erro: 'Configuração do backend ausente.' }
            };
        }

        let backendResponse;
        try {
            backendResponse = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-functions-key': backendKey },
                body: JSON.stringify(body)
            });
        } catch (fetchErr) {
            return {
                status: 502,
                headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
                jsonBody: { ok: false, codigo: 'BACKEND_INACESSIVEL', erro: fetchErr.message }
            };
        }

        const responseText = await backendResponse.text();
        let responseData = null;
        try { responseData = JSON.parse(responseText); } catch {}

        if (!backendResponse.ok) {
            return {
                status: backendResponse.status,
                headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
                jsonBody: { ok: false, erro: responseData?.error || responseText }
            };
        }

        return {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...require('./shared/cors').corsHeaders(request) },
            jsonBody: responseData ?? { ok: true }
        };
    }
});
