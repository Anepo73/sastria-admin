import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Shield, Users, AlertTriangle, ArrowDownCircle,
  UserX, ChevronDown, ChevronRight, Scale,
  Filter, Server,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────
interface Analysis {
  user_email: string;
  user_display_name: string;
  analysis_status: string;
  assigned_licenses_csv: string | null;
  required_licenses_csv: string | null;
  missing_licenses: string | null;
  redundant_licenses: string | null;
  highest_required: string;
  highest_assigned: string;
  analysis_reason: string;
  confidence_score: string;
  risk_level: string;
  environment_id: string;
  account_enabled: boolean;
}

// ── API helpers ──────────────────────────────────────────────
async function swaPost(tool: string, tenantId: string, args: Record<string, unknown> = {}) {
  const jwt = localStorage.getItem('sastria_jwt');
  const res = await fetch('/api/RunTool', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { 'x-sastria-jwt': jwt } : {}),
    },
    body: JSON.stringify({ tool_name: tool, tenant_id: tenantId, args }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── Status config ────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  D365_FO_SUBLICENCIADO:                { label: 'Sub-licenciado',      color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: AlertTriangle },
  D365_FO_SUPERLICENCIADO:              { label: 'Super-licenciado',    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Scale },
  D365_FO_REDUNDANTE:                   { label: 'Redundante',          color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: Filter },
  D365_FO_FULL_PARA_ACTIVITY:           { label: 'Full → Activity',     color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', icon: ArrowDownCircle },
  D365_FO_CANDIDATO_FULL_PARA_TEAM_MEMBER: { label: 'Full → Team',     color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: ArrowDownCircle },
  D365_FO_NAO_REQUER_LICENCA:           { label: 'Sem Requisito',       color: 'text-teal-400 bg-teal-500/10 border-teal-500/20', icon: UserX },
  D365_FO_USUARIO_INATIVA_COM_LICENCA:  { label: 'Inativo c/ Licença',  color: 'text-pink-400 bg-pink-500/10 border-pink-500/20', icon: UserX },
  D365_FO_ROLE_CANDIDATA_REDESENHO:     { label: 'Redesenho de Role',   color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20', icon: Shield },
  D365_FO_AMBIENTE_NAO_ELIGIVEL:        { label: 'Ambiente Inelegível', color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', icon: Server },
  OK:                                    { label: 'OK',                  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: Shield },
};

function statusBadge(status: string) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'text-muted-foreground bg-muted/10 border-border' };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function riskBadge(risk: string) {
  const colors: Record<string, string> = {
    HIGH: 'text-red-400 bg-red-500/10 border-red-500/20',
    MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    LOW: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${colors[risk] || 'text-muted-foreground'}`}>
      {risk}
    </span>
  );
}

// ── Stat Card ────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color = 'text-violet-400' }:
  { icon: typeof Shield; label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface/50 p-4 flex items-start gap-3 hover:border-violet-500/30 transition-all">
      <div className="shrink-0 w-10 h-10 rounded-lg bg-surface border border-border/40 flex items-center justify-center">
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ── User Row ─────────────────────────────────────────────────
function UserRow({ a }: { a: Analysis }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        className="border-b border-border/20 hover:bg-surface/80 transition-colors cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground/40 shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm text-foreground truncate">{a.user_display_name || a.user_email}</p>
              <p className="text-[11px] text-muted-foreground truncate">{a.user_email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-2.5">{statusBadge(a.analysis_status)}</td>
        <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{a.highest_assigned || '—'}</td>
        <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{a.highest_required || '—'}</td>
        <td className="px-4 py-2.5">{riskBadge(a.risk_level)}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="px-4 py-3 bg-surface/30 border-b border-border/20">
            <div className="space-y-2 animate-fade-in">
              <p className="text-xs text-muted-foreground leading-relaxed">{a.analysis_reason}</p>
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                {a.assigned_licenses_csv && (
                  <span>Atribuídas: <strong className="text-foreground font-mono">{a.assigned_licenses_csv}</strong></span>
                )}
                {a.required_licenses_csv && (
                  <span>Requeridas: <strong className="text-foreground font-mono">{a.required_licenses_csv}</strong></span>
                )}
                {a.missing_licenses && (
                  <span className="text-red-400">Faltando: <strong>{a.missing_licenses}</strong></span>
                )}
                {a.redundant_licenses && (
                  <span className="text-amber-400">Redundantes: <strong>{a.redundant_licenses}</strong></span>
                )}
                <span>Confiança: <strong className="text-foreground">{a.confidence_score}</strong></span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function D365LicenseGovernancePage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Load tenant
  const { data: tenantsData } = useQuery({
    queryKey: ['d365-tenants'],
    queryFn: async () => {
      const jwt = localStorage.getItem('sastria_jwt');
      const res = await fetch('/api/GetTenants', {
        headers: jwt ? { 'x-sastria-jwt': jwt } : {},
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const tenants = tenantsData?.tenants ?? [];
  const [selectedTenant, setSelectedTenant] = useState('');
  const tenantId = selectedTenant || tenants[0]?.TenantId || '';

  // Load analysis data
  const { data: analysisData, isLoading } = useQuery({
    queryKey: ['fo-license-analysis', tenantId, statusFilter],
    queryFn: () => swaPost('get_d365_fo_license_analysis', tenantId, {
      status_filter: statusFilter || undefined,
      top_n: 100,
    }),
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const { data: roleData } = useQuery({
    queryKey: ['fo-role-impact', tenantId],
    queryFn: () => swaPost('get_d365_fo_role_impact', tenantId, { min_users: 5 }),
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const analyses: Analysis[] = analysisData?.usuarios ?? [];
  const summary: Record<string, number> = analysisData?.resumo ?? {};
  const roles = roleData?.roles ?? [];
  const redesignCandidates = roleData?.candidatos_redesenho ?? [];
  const totalAnalyzed = analysisData?.total_usuarios_analisados ?? 0;

  // Filter by search
  const filtered = search
    ? analyses.filter(a =>
        (a.user_email || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.user_display_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : analyses;

  // Summary stats
  const sublicensed = summary['D365_FO_SUBLICENCIADO'] ?? 0;
  const overlicensed = (summary['D365_FO_SUPERLICENCIADO'] ?? 0) +
                       (summary['D365_FO_FULL_PARA_ACTIVITY'] ?? 0) +
                       (summary['D365_FO_CANDIDATO_FULL_PARA_TEAM_MEMBER'] ?? 0);
  const redundant = summary['D365_FO_REDUNDANTE'] ?? 0;
  const inactive = summary['D365_FO_USUARIO_INATIVA_COM_LICENCA'] ?? 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-violet-400" />
            D365 F&O License Governance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Análise de licenciamento por Security Governance — Required vs Assigned.
          </p>
        </div>
        <select
          value={tenantId}
          onChange={e => setSelectedTenant(e.target.value)}
          className="text-sm rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        >
          {tenants.map((t: { TenantId: string; TenantCode: string }) => (
            <option key={t.TenantId} value={t.TenantId}>{t.TenantCode}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Analisados" value={totalAnalyzed} />
        <StatCard icon={AlertTriangle} label="Sub-licenciados" value={sublicensed} color="text-red-400" />
        <StatCard icon={ArrowDownCircle} label="Super-licenciados" value={overlicensed} color="text-amber-400" />
        <StatCard icon={Filter} label="Redundantes" value={redundant} color="text-orange-400" />
        <StatCard icon={UserX} label="Inativos c/ Licença" value={inactive} color="text-pink-400" />
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setStatusFilter('')}
          className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${
            !statusFilter ? 'bg-violet-500/15 border-violet-500/30 text-violet-400' : 'bg-surface border-border/30 text-muted-foreground hover:text-foreground'
          }`}
        >
          Todos com Issues
        </button>
        {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'OK').map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
            className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${
              statusFilter === key ? `${cfg.color} font-semibold` : 'bg-surface border-border/30 text-muted-foreground hover:text-foreground'
            }`}
          >
            {cfg.label}
            {summary[key] ? ` (${summary[key]})` : ''}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Buscar por email ou nome..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm text-sm rounded-lg border border-border bg-surface px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
      />

      {/* User Analysis Table */}
      <div className="rounded-xl border border-border/60 bg-surface/50 overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              {analyses.length === 0
                ? 'Nenhuma análise disponível. Execute a coleta de dados via API.'
                : 'Nenhum resultado para os filtros selecionados.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="border-b border-border/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2.5">Usuário</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-left px-4 py-2.5">Atribuída</th>
                  <th className="text-left px-4 py-2.5">Requerida</th>
                  <th className="text-left px-4 py-2.5">Risco</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => <UserRow key={`${a.user_email}-${i}`} a={a} />)}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Role Impact */}
      {roles.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-surface/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
            <Shield className="h-4 w-4 text-fuchsia-400" />
            <h2 className="text-sm font-semibold text-foreground">Impacto por Security Role</h2>
            {redesignCandidates.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 ml-auto">
                {redesignCandidates.length} candidatos a redesenho
              </span>
            )}
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-border/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2">Security Role</th>
                  <th className="text-left px-4 py-2">Licença Exigida</th>
                  <th className="text-right px-4 py-2">Usuários</th>
                  <th className="text-left px-4 py-2">Amostra</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r: Record<string, unknown>, i: number) => {
                  const isRedesign = redesignCandidates.some(
                    (rc: Record<string, unknown>) => rc.security_role === r.security_role
                  );
                  return (
                    <tr key={i} className={`border-b border-border/20 transition-colors ${isRedesign ? 'bg-fuchsia-500/5' : 'hover:bg-surface/80'}`}>
                      <td className="px-4 py-2 font-mono text-xs text-foreground">
                        {String(r.security_role)}
                        {isRedesign && (
                          <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
                            redesenho
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{String(r.required_license)}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs font-semibold text-foreground">{String(r.users_affected)}</td>
                      <td className="px-4 py-2 text-[11px] text-muted-foreground truncate max-w-[200px]">{String(r.sample_users)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
