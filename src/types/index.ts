export interface SastriaUser {
  email: string;
  persona: 'GlobalAdmin' | 'Admin' | 'CIO' | 'Governança' | 'Finanças' | 'Compras';
  tenantId: string;   // UUID estavel do tenant (nao muda com rename)
  tenantCode: string; // nome/label do tenant (pode ser alterado)
  azureTenantId?: string; // UUID do tenant Azure (para KB APIs)
  userId?: string;
  [key: string]: unknown;
}

export interface Tenant {
  tenant_id: string;
  tenant_code: string;
  is_enabled: boolean;
  sync_enabled: boolean;    // normalização local
  sync_enable?: boolean;    // campo real do backend (sem o 'd')
  azure_tenant_id?: string;
  graph_client_id?: string;
  graph_secret_kv_name?: string;
  // Stats (populated by read with stats)
  user_count?: number;
  active_users?: number;
  open_recs?: number;
  closed_recs?: number;
  potential_savings?: number;
  kb_files?: number;
}

export interface SkuCatalogItem {
  sku_id: string;
  part_number: string;
  display_name: string;
  category: string;
  price_unit?: number;
  is_active: boolean;
  [key: string]: unknown;
}

export interface TenantSku {
  sku_id: string;
  part_number: string;
  display_name: string;
  assigned: number;
  active: number;
  suspended: number;
  in_alert: number;
  cost_brl?: number;
  in_catalog?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  logId?: string;
  feedback?: 1 | -1 | null;
}

export interface ChatLogEntry {
  date: string;
  user_email: string;
  tenant_code: string;
  session_id: string;
  question: string;
  response: string;
  feedback: number | null;
}

export interface Opportunity {
  user: string;
  type: string;            // recommendation_type raw
  recommendation: string;  // recommendation_description
  severity: string;        // raw DB value: Desperdicio | Adequacao | Potencial | Risco | Simplificacao ...
  savings_year: number;    // estimated_savings — valor ANUAL (BRL)
  status: string;          // OPEN | RESOLVED
  sku_display_name?: string;
}

export interface TenantUser {
  userId?: string;
  tenantId?: string;
  email: string;
  persona: string;
  createdAt?: string;
  tenantCode?: string;
}

export interface M365UserSuggestion {
  userId: string;
  email: string;
  displayName: string;
  department?: string;
  jobTitle?: string;
}

export interface IngestEndpoint {
  name: string;
  path: string;
  timeout_ms: number;
  status: 'pending' | 'running' | 'ok' | 'error';
  statusCode?: number;
  summary?: string; // e.g. "156 usuários" extraído do response do ingestor
}
