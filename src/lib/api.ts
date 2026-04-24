import type { Tenant, TenantUser, ChatLogEntry, Opportunity } from '@/types';

const PROXY_BASE = 'https://fn-sastri-graph-proxy1-cufvhzhsc6b0f0dq.brazilsouth-01.azurewebsites.net';

function getJwt(): string | null {
  return localStorage.getItem('sastria_jwt');
}

function authHeaders(): Record<string, string> {
  const jwt = getJwt();
  return jwt ? { 'Content-Type': 'application/json', 'x-sastria-jwt': jwt } : { 'Content-Type': 'application/json' };
}

function apiUrl(endpoint: string): string {
  // Inside SWA: use relative /api/ path → SWA managed functions
  // Outside (localhost, Lovable): call backend directly
  const host = window.location.hostname;
  const isSwa = host.endsWith('.azurestaticapps.net') || host === 'chat.sastria.com.br';
  return isSwa ? `/api/${endpoint}` : `${PROXY_BASE}/api/${endpoint}`;
}

async function swaPost(endpoint: string, body: Record<string, unknown>, extraHeaders?: Record<string, string>) {
  const res = await fetch(apiUrl(endpoint), {
    method: 'POST',
    headers: { ...authHeaders(), ...extraHeaders },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    localStorage.removeItem('sastria_jwt');
    window.location.href = '/login';
    throw new Error('Session expired. Redirecting to login...');
  }
  if (!res.ok) {
    let message = `API error: ${res.status}`;
    try {
      const body = await res.json();
      // Extrai a mensagem de erro do body do ingestor/proxy
      message = body?.error || body?.erro || body?.message || body?.detail || message;
      if (typeof message !== 'string') message = JSON.stringify(message).slice(0, 200);
    } catch { /* body não é JSON, usa mensagem genérica */ }
    throw new Error(message);
  }
  return res.json();
}

async function swaGet(endpoint: string, params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`${apiUrl(endpoint)}${qs}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (res.status === 401) {
    localStorage.removeItem('sastria_jwt');
    window.location.href = '/login';
    throw new Error('Session expired.');
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function swaPatch(endpoint: string, params: Record<string, string>) {
  const qs = '?' + new URLSearchParams(params).toString();
  const res = await fetch(`${apiUrl(endpoint)}${qs}`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (res.status === 401) {
    localStorage.removeItem('sastria_jwt');
    window.location.href = '/login';
    throw new Error('Session expired.');
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/** Extrai array de respostas no formato { ok, itens: [] } ou { data: [] } ou array direto */
function extractList(data: unknown): unknown[] {
  let arr: unknown[] = [];
  if (Array.isArray(data)) arr = data;
  else if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.itens)) arr = d.itens;
    else if (Array.isArray(d.data)) arr = d.data;
  }
  // Normaliza campos do backend com nomes inconsistentes
  return arr.map(item => {
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      // sync_enable (sem 'd') → sync_enabled
      if ('sync_enable' in obj && !('sync_enabled' in obj)) {
        return { ...obj, sync_enabled: obj.sync_enable };
      }
    }
    return item;
  });
}

async function proxyPost(endpoint: string, body: Record<string, unknown>, useAuth = false) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (useAuth) {
    const jwt = getJwt();
    if (jwt) {
      headers['x-sastria-jwt']  = jwt;
      headers['Authorization']  = `Bearer ${jwt}`;
    }
  }
  const res = await fetch(`${PROXY_BASE}/api/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Tenta extrair mensagem de erro do corpo da resposta antes de lançar
    let msg = `Erro ${res.status}`;
    try {
      const errBody = await res.json();
      msg = errBody.error || errBody.message || errBody.detail || msg;
    } catch { /* corpo não é JSON, usa msg genérica */ }
    throw new Error(msg);
  }
  return res.json();
}

async function proxyGet(endpoint: string, params: Record<string, string> = {}) {
  const jwt = getJwt();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (jwt) {
    headers['x-sastria-jwt'] = jwt;
    headers['Authorization'] = `Bearer ${jwt}`;
  }
  const qs = new URLSearchParams(params).toString();
  const url = `${PROXY_BASE}/api/${endpoint}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function proxyDelete(endpoint: string, params: Record<string, string> = {}) {
  const jwt = getJwt();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (jwt) {
    headers['x-sastria-jwt'] = jwt;
    headers['Authorization'] = `Bearer ${jwt}`;
  }
  const qs = new URLSearchParams(params).toString();
  const url = `${PROXY_BASE}/api/${endpoint}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Auth
export const authLogin = (email: string, password: string) =>
  proxyPost('AuthLogin', { email, password });

// Chat
export const sendChatMessage = (body: {
  question: string;
  session_id: string;
  user_email: string;
  user_name: string;
  tenant_code: string;
  timezone: string;
}) => proxyPost('chat', body);

export const sendChatFeedback = (logId: string, feedback: 1 | -1) =>
  proxyPost('ChatFeedback', { logId, feedback });

// Tenants
export const fetchTenants = async (): Promise<Tenant[]> => { const r = await swaPost('tenants', { operacao: 'read' }); return extractList(r) as Tenant[]; };
export const createTenant = (data: Record<string, unknown>) => swaPost('tenants', { operacao: 'create', ...data });
export const updateTenant = (data: Record<string, unknown>) => swaPost('tenants', { operacao: 'update', ...data });
export const deleteTenant = (tenant_id: string) => swaPost('tenants', { operacao: 'delete', tenant_id });
export const fetchTenantUsers = async (tenantId: string): Promise<TenantUser[]> => {
  // AuthManage GET lista usuários pelo UUID do tenant (não pelo tenant_code)
  const r = await proxyGet('AuthManage', tenantId ? { tenantId } : {});
  const raw: Record<string, unknown>[] = r?.users ?? [];
  // A SP usp_AuthListUsers retorna campos PascalCase (Email, Persona, UserId…)
  // Normalizamos para camelCase para alinhar com o TenantUser interface
  return raw.map(u => ({
    userId:     (u.UserId     ?? u.userId)     as string | undefined,
    tenantId:   (u.TenantId   ?? u.tenantId)   as string | undefined,
    email:      (u.Email      ?? u.email)      as string,
    persona:    (u.Persona    ?? u.persona)    as string,
    createdAt:  (u.CreatedAt  ?? u.createdAt)  as string | undefined,
    tenantCode: (u.TenantCode ?? u.tenantCode) as string | undefined,
  })) as TenantUser[];
};

// Auth Manage (via proxy)
export const createUser = (data: Record<string, unknown>) => proxyPost('AuthManage', data, true);
export const deleteUser = (userId: string) => proxyDelete('AuthManage', { userId });

export interface M365UserSuggestion {
  userId: string;
  email: string;
  displayName: string;
  department?: string;
  jobTitle?: string;
}

/** Pesquisa dinâmica de usuários M365 pelo e-mail ou nome para autocomplete */
export const searchM365Users = async (
  tenantId: string,
  q: string,
): Promise<M365UserSuggestion[]> => {
  if (!q || q.length < 2) return [];
  const r = await proxyGet('GraphUserSearch', { tenantId, q });
  return (r?.users ?? []) as M365UserSuggestion[];
};


// SKU Catalog
export const fetchSkuCatalog = async () => {
  const r = await swaPost('SkuCatalogAdmin', { operacao: 'read' });
  return extractList(r).map((item: unknown) => {
    const s = item as Record<string, unknown>;
    return {
      sku_id: s.sku_id,
      part_number: s.sku_part_number ?? s.part_number,
      display_name: s.product_display_name ?? s.display_name,
      category: s.product_family ?? s.category ?? '',
      price_unit: (s.Price_ERP ?? s.Price_EAS ?? s.price_unit) as number | undefined,
      is_active: s.is_deprecated != null ? !s.is_deprecated : (s.is_active ?? true),
      ...s,
    };
  });
};
// Mapeia os campos normalizados do frontend de volta aos nomes de coluna SQL esperados pelo backend
function toSkuBackend(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };

  // Normaliza campos legados → nomes SQL
  if (data.part_number && !data.sku_part_number)
    out.sku_part_number = data.part_number;
  if (data.display_name && !data.product_display_name)
    out.product_display_name = data.display_name;
  if (data.category && !data.product_family)
    out.product_family = data.category;
  if (data.price_unit != null && data.Price_ERP == null)
    out.Price_ERP = data.price_unit;

  // is_active (frontend) ↔ is_deprecated (DB): active = NOT deprecated
  if (data.is_active != null && data.is_deprecated == null)
    out.is_deprecated = data.is_active ? 0 : 1;

  return out;
}
export const createSkuCatalog = (data: Record<string, unknown>) =>
  swaPost('SkuCatalogAdmin', { operacao: 'create', ...toSkuBackend(data) });
export const updateSkuCatalog = (data: Record<string, unknown>) =>
  swaPost('SkuCatalogAdmin', { operacao: 'update', ...toSkuBackend(data) });
export const deleteSkuCatalog = (sku_id: string) => swaPost('SkuCatalogAdmin', { operacao: 'delete', sku_id });

// SKU Overlaps (Sobreposições)
export interface SkuOverlap {
  sku_id: string;
  sku_id_that_overlaps: string;
  advice_when_overlaping: string | null;
  sku_part_number?: string;
  product_display_name?: string;
}
export const fetchSkuOverlaps = async (sku_id: string): Promise<SkuOverlap[]> => {
  const r = await swaPost('SkuOverlapsAdmin', { action: 'read', sku_id });
  return extractList(r) as SkuOverlap[];
};
export const createSkuOverlap = (sku_id: string, sku_id_that_overlaps: string, advice_when_overlaping?: string) =>
  swaPost('SkuOverlapsAdmin', { action: 'create', sku_id, sku_id_that_overlaps, advice_when_overlaping: advice_when_overlaping || null });
export const updateSkuOverlap = (sku_id: string, sku_id_that_overlaps: string, advice_when_overlaping?: string) =>
  swaPost('SkuOverlapsAdmin', { action: 'update', sku_id, sku_id_that_overlaps, advice_when_overlaping: advice_when_overlaping || null });
export const deleteSkuOverlap = (sku_id: string, sku_id_that_overlaps: string) =>
  swaPost('SkuOverlapsAdmin', { action: 'delete', sku_id, sku_id_that_overlaps });

// Microsoft Catalog (microsoft.*)
export const fetchMsCatalogStats = () => swaPost('MicrosoftCatalogAdmin', { action: 'stats' });
export const fetchMsProducts = (search?: string, page = 1, pageSize = 50) =>
  swaPost('MicrosoftCatalogAdmin', { action: 'list_products', search, page, pageSize });
export const fetchMsServicePlans = (search?: string, page = 1, pageSize = 50) =>
  swaPost('MicrosoftCatalogAdmin', { action: 'list_service_plans', search, page, pageSize });
export const fetchMsProductDetail = (product_guid: string) =>
  swaPost('MicrosoftCatalogAdmin', { action: 'product_detail', product_guid });
export const fetchMsServicePlanDetail = (service_plan_id: string) =>
  swaPost('MicrosoftCatalogAdmin', { action: 'service_plan_detail', service_plan_id });
export const refreshMsCatalog = () =>
  swaPost('MicrosoftCatalogAdmin', { action: 'refresh' });

// Tenant SKUs
export const fetchTenantSkus = async (tenant_id: string) => { const r = await swaPost('SubscribedSkusAdmin', { operacao: 'read', tenant_id }); return extractList(r); };
export const updateTenantSkuCost = (tenant_id: string, sku_id: string, cost_brl: number) =>
  swaPost('SubscribedSkusAdmin', { operacao: 'update', tenant_id, sku_id, cost_brl });

// Directory Subscriptions
export const fetchTenantSubscriptions = async (tenant_id: string) => {
  const r = await swaPost('DirectorySubscriptionsAdmin', { operacao: 'read', tenant_id });
  return extractList(r);
};

// Chat Logs
export const fetchChatLogs = async (filters: Record<string, unknown>): Promise<ChatLogEntry[]> => {
  const r = await swaPost('chatlogs', filters);
  return extractList(r).map((item: unknown) => {
    const l = item as Record<string, unknown>;
    return {
      date: String(l.CreatedAt ?? l.date ?? l.created_at ?? ''),
      user_email: String(l.UserEmail ?? l.user_email ?? ''),
      tenant_code: String(l.TenantCode ?? l.tenant_code ?? ''),
      session_id: String(l.SessionId ?? l.session_id ?? l.LogId ?? ''),
      question: String(l.Question ?? l.question ?? ''),
      response: String(l.AssistantResponse ?? l.Response ?? l.VeaseResponse ?? l.response ?? ''),
      feedback: l.Feedback != null ? Number(l.Feedback) : null,
    };
  });
};

// Opportunities
export const fetchOpportunities = async (filters: Record<string, unknown>): Promise<Opportunity[]> => {
  const { tenant_id, ...rest } = filters as Record<string, unknown> & { tenant_id?: string };
  const headers = tenant_id ? { 'x-tenant-id': tenant_id as string } : {};
  const r = await swaPost('Oportunidades', rest, headers);
  return extractList(r).map((item: unknown) => {
    const o = item as Record<string, unknown>;
    return {
      user:             String(o.user_principal_name ?? o.user_display_name ?? o.user_id ?? ''),
      type:             String(o.recommendation_type ?? o.type ?? ''),
      recommendation:   String(o.recommendation_description ?? o.recommendation ?? ''),
      severity:         String(o.severity ?? ''),
      savings_year:     Number(o.estimated_savings ?? o.savings_year ?? 0),
      status:           String(o.status ?? 'OPEN'),
      sku_display_name: o.sku_display_name ? String(o.sku_display_name) : undefined,
    };
  });
};
export const runRecommendations = (tenant_id: string) => swaPost('RunRecommendations', { tenant_id });

// Ingest — chama proxy1/IngestProxy diretamente (bypassa SWA Free 45s timeout)
export const ingestEndpoint = async (endpoint: string, tenant_id: string, timeout_ms: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout_ms);
  try {
    const jwt = getJwt();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (jwt) {
      headers['x-sastria-jwt'] = jwt;
      headers['Authorization'] = `Bearer ${jwt}`;
    }
    const res = await fetch(`${PROXY_BASE}/api/IngestProxy`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ endpoint, tenant_id, timeout_ms }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      let msg = `API error: ${res.status}`;
      try {
        const errBody = await res.json();
        msg = errBody.error || errBody.erro || errBody.message || errBody.detail || msg;
        if (typeof msg !== 'string') msg = JSON.stringify(msg).slice(0, 200);
      } catch { /* body não é JSON */ }
      throw new Error(msg);
    }
    return res.json();
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      // Client-side timeout via AbortController — ingestor continues in background
      return { modo: 'gateway-timeout', mensagem: `Timeout após ${timeout_ms / 1000}s — o ingestor continua rodando no Azure.` };
    }
    if (err instanceof Error && err.message === 'Failed to fetch') {
      // Azure gateway dropped the connection (~230s) — ingestor continues in background
      return { modo: 'gateway-timeout', mensagem: 'Conexão encerrada pelo gateway (~230s) — o ingestor continua rodando no Azure.' };
    }
    throw err;
  }
};

// Wizard
export const wizardValidation = (data: { tenantId: string; clientId: string; clientSecret: string }) =>
  proxyPost('WizardValidation', data);

export const wizardCheckPermissions = (data: { tenantId: string; clientId: string; clientSecret: string; permissions: string[] }) =>
  proxyPost('WizardCheckPermissions', data);

export const wizardSubmit = (data: Record<string, unknown>) => proxyPost('WizardSubmit', data);

export const triggerIngestOrchestrator = (data: Record<string, unknown>) =>
  fetch(`/api/ingest_orchestrator`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// ─── Control Plane (fn-sastria-control-plane) ────────────────────────────────
// Chamadas diretas ao motor de IA/KB — separadas do proxy1 (Vease permanece intacto)

const CP_BASE = 'https://fn-sastria-control-plane.azurewebsites.net/api';

/** Lê response como texto antes de parsear — protege contra corpo vazio */
async function cpParseResponse(res: Response, endpoint: string) {
  const text = await res.text();
  if (!text || !text.trim()) {
    throw new Error(
      `Control Plane retornou corpo vazio [${res.status}] em /${endpoint}. ` +
      (res.status === 404 ? 'Função ainda não foi deployada.' :
       res.status >= 500 ? 'Erro interno no servidor.' : 'Verifique o deploy.')
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Resposta inválida do Control Plane [${res.status}] em /${endpoint}: ` +
      text.substring(0, 300)
    );
  }
}

async function cpGet(endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${CP_BASE}/${endpoint}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return cpParseResponse(res, endpoint);
}

async function cpPost(endpoint: string, body: Record<string, unknown>) {
  const jwt = getJwt();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (jwt) {
    headers['x-sastria-jwt'] = jwt;
    headers['Authorization'] = `Bearer ${jwt}`;
  }
  const res = await fetch(`${CP_BASE}/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return cpParseResponse(res, endpoint);
}

// Dashboard stats
export const fetchDashboardStats = () => cpGet('GetDashboardStats');

// Knowledge Base
export const fetchKnowledgeFiles = (tenantId: string) =>
  cpGet('GetTenantKnowledge', { tenantId });

export const syncKnowledgeFiles = (tenantId: string) =>
  cpGet('SyncKnowledgeStatus', { tenantId });

export const deleteKnowledgeFile = async (fileId: string) => {
  const res = await fetch(`${CP_BASE}/DeleteKnowledgeFile?fileId=${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
  });
  return res.json();
};

export const uploadKnowledgeFile = async (tenantId: string, file: File) => {
  const fd = new FormData();
  fd.append('tenantId', tenantId);
  fd.append('file', file);
  const res = await fetch(`${CP_BASE}/UploadKnowledgeFile`, { method: 'POST', body: fd });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Upload falhou');
  return data;
};

// Prompt do Agente
export const fetchPromptDraft = (tenantId: string) =>
  cpGet('GetPromptDraft', { tenantId });

export const saveDraftPrompt = (tenantId: string, draftText: string, isHtml = false) =>
  cpPost('SaveDraftPrompt', isHtml
    ? { tenantId, draftHtml: draftText }
    : { tenantId, draftText });

export const publishAgentVersion = (tenantId: string, actorId: string) =>
  cpPost('PublishAgentVersion', { tenantId, actorId });

export const provisionTenant = (tenantId: string, actorId = 'admin-ui') =>
  cpPost('ProvisionTenant', { tenantId, actorId });

// ─── Chat OpenAI (ChatRuntime) ────────────────────────────────────────────────
// Isolado do ChatAgent Vease — sendChatMessage() nao e alterado
export const sendChatAI = (body: {
  tenantId?:   string;
  tenantCode?: string;
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userEmail?: string;
  userRole?:  string;
}) => cpPost('ChatRuntime', body as Record<string, unknown>);

// ─── Chat Sessions ────────────────────────────────────────────────────────────
export const listChatSessions = (tenantId: string, userEmail: string) =>
  cpGet('ListChatSessions', { tenantId, userEmail });

export const getChatSession = (sessionId: string, userEmail: string) =>
  cpGet('GetChatSession', { sessionId, userEmail });

export const saveChatSession = (body: {
  sessionId?: string;
  tenantId: string;
  userEmail: string;
  userRole?: string;
  title: string;
  messages: Array<{ role: string; content: string }>;
}) => cpPost('SaveChatSession', body as Record<string, unknown>);

export const deleteChatSession = (sessionId: string, userEmail: string) =>
  cpPost('DeleteChatSession', { sessionId, userEmail } as Record<string, unknown>);

// ── Agent Global Config ──────────────────────────────────────────────────────
export const getAgentConfig = () => cpGet('GetAgentConfig');

export const saveAgentConfig = (key: string, value: string, updatedBy: string) =>
  cpPost('SaveAgentConfig', { key, value, updatedBy } as Record<string, unknown>);

export const getAgentTools = () => cpGet('GetAgentTools');

// ── Global Prompt ─────────────────────────────────────────────────────────────
export const getGlobalPrompt = () => cpGet('GetGlobalPrompt');

export const saveGlobalPrompt = (contentHtml: string, updatedBy: string) =>
  cpPost('SaveGlobalPrompt', { contentHtml, updatedBy } as Record<string, unknown>);


// ── Wizard: Voucher / Onboarding Code ─────────────────────────────────────────

export interface WizardValidateResult {
  valid: boolean;
  useId?: string;
  voucherId?: string;
  description?: string | null;
  expiresAt?: string | null;
  usesLeft?: number;
  maxUses?: number;
  reason?: 'not_found' | 'expired' | 'exhausted' | 'revoked' | 'invalid_format' | 'server_error';
  message?: string;
}

export async function wizardValidateCode(code: string): Promise<WizardValidateResult> {
  try {
    const res = await fetch(`${PROXY_BASE}/api/ValidateOnboardingCode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    return data;
  } catch {
    return { valid: false, reason: 'server_error', message: 'Não foi possível validar o código. Tente novamente.' };
  }
}

export const saveWizardProgress = (data: {
  useId: string;
  step: number;
  form: {
    tenantName?: string;
    clientId?: string;
    tenantId?: string;
    adminEmail?: string;
    includeSharePoint?: boolean;
  };
}) => proxyPost('SaveWizardProgress', data as Record<string, unknown>);

// ── Admin: Vouchers CRUD ───────────────────────────────────────────────────────

export const fetchVouchers = () => swaGet('VouchersAdmin');

export const createVoucher = (data: {
  description: string;
  maxUses?: number;
  expiresAt?: string | null;
  notes?: string | null;
}) => swaPost('VouchersAdmin', data as Record<string, unknown>);

export const revokeVoucher = (id: string) =>
  swaPatch('VouchersAdmin', { id });

export const fetchVoucherAttempts = () =>
  swaGet('VouchersAdmin', { attempts: 'true' });
