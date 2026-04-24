// api/src/functions/shared/cors.js
// CORS helper para SWA proxy functions - chamadas cross-origin do Lovable preview

const ALLOWED_ORIGINS = new Set([
    'https://chat.sastria.com.br',
    'https://thankful-bay-087d0e00f.6.azurestaticapps.net',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:3000',
]);

function isAllowed(origin) {
    if (!origin) return true; // same-origin requests
    if (ALLOWED_ORIGINS.has(origin)) return true;
    if (origin.endsWith('.azurestaticapps.net')) return true;
    if (origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com')) return true;
    return false;
}

function corsHeaders(req) {
    const origin = req.headers?.get?.('origin') || req.headers?.origin || '';
    return {
        'Access-Control-Allow-Origin': isAllowed(origin) ? origin : 'https://chat.sastria.com.br',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-sastria-jwt, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
    };
}

function optionsResponse(req) {
    return { status: 204, headers: corsHeaders(req) };
}

module.exports = { corsHeaders, optionsResponse };
