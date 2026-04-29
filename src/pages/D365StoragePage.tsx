import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HardDrive, AlertTriangle, Database, FileWarning,
  RefreshCw, ChevronDown, ChevronRight, TrendingUp,
  Server, TableProperties, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// ── Types ────────────────────────────────────────────────────
interface Environment {
  tenant_id: string;
  environment_id: string;
  environment_name: string;
  environment_type: string;
  database_capacity_gb: number;
  file_capacity_gb: number;
  log_capacity_gb: number;
  total_capacity_gb: number;
  used_capacity_gb: number;
  base_entitlement_gb: number;
  addon_capacity_gb: number;
}

interface Finding {
  finding_code: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  current_value: number;
  threshold_value: number;
  estimated_recoverable_gb: number;
  source_entity: string;
  created_at_utc: string;
}

interface TableRow {
  table_name: string;
  row_count: number;
  size_gb: number;
  table_category: string;
}

// ── API ──────────────────────────────────────────────────────
const D365_BASE = 'https://fn-sastria-d365-storage.azurewebsites.net';
const D365_CODE = import.meta.env.VITE_D365_FUNCTION_KEY || '';

async function d365Get(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ ...params, code: D365_CODE }).toString();
  const res = await fetch(`${D365_BASE}/api/${path}?${qs}`);
  if (!res.ok) throw new Error(`D365 API error: ${res.status}`);
  return res.json();
}

async function d365Post(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${D365_BASE}/api/${path}?code=${D365_CODE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`D365 API error: ${res.status}`);
  return res.json();
}

// ── Helpers ──────────────────────────────────────────────────
function severityColor(sev: string) {
  switch (sev?.toUpperCase()) {
    case 'CRITICAL': return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'HIGH':     return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'MEDIUM':   return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'LOW':      return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    default:         return 'text-muted-foreground bg-muted/10 border-border';
  }
}

function categoryColor(cat: string) {
  switch (cat?.toLowerCase()) {
    case 'staging':    return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
    case 'log':        return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'functional': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'custom':     return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    default:           return 'text-muted-foreground bg-muted/10 border-border';
  }
}

function formatGB(gb: number | null) {
  if (gb == null) return '—';
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  return `${(gb * 1024).toFixed(0)} MB`;
}

// ── Stat Card ────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'text-violet-400' }:
  { icon: typeof HardDrive; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface/50 p-4 flex items-start gap-3 hover:border-violet-500/30 transition-all">
      <div className={`shrink-0 w-10 h-10 rounded-lg bg-surface border border-border/40 flex items-center justify-center`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Finding Card ─────────────────────────────────────────────
function FindingCard({ f }: { f: Finding }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-border/60 bg-surface/50 overflow-hidden hover:border-violet-500/30 transition-all">
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-start gap-3 p-4 text-left">
        <div className={`shrink-0 mt-0.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${severityColor(f.severity)}`}>
          {f.severity}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground">{f.title || f.finding_code}</h4>
          <div className="flex items-center gap-2 mt-1">
            {f.category && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${severityColor(f.severity)}`}>
                {f.category}
              </span>
            )}
            {f.estimated_recoverable_gb > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ↓ {formatGB(f.estimated_recoverable_gb)} recuperáveis
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-muted-foreground/40">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/40 pt-3 space-y-2 animate-fade-in">
          <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
          <div className="flex gap-4 text-[11px] text-muted-foreground">
            <span>Valor: <strong className="text-foreground">{f.current_value?.toFixed(2)}</strong></span>
            <span>Threshold: <strong className="text-foreground">{f.threshold_value?.toFixed(2)}</strong></span>
            <span>Fonte: <strong className="text-foreground font-mono">{f.source_entity}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function D365StoragePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState('');
  const [tabCat, setTabCat] = useState('all');

  // Load tenant list from graph proxy
  const { data: tenantsData } = useQuery({
    queryKey: ['d365-tenants'],
    queryFn: async () => {
      const jwt = localStorage.getItem('sastria_jwt');
      const res = await fetch('/api/GetTenants', {
        headers: jwt ? { 'x-sastria-jwt': jwt } : {},
      });
      if (!res.ok) throw new Error('Failed to load tenants');
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const tenants = tenantsData?.tenants ?? [];
  const tenantId = selectedTenant || tenants[0]?.TenantId || '';

  // D365 data queries
  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: ['d365-summary', tenantId],
    queryFn: () => d365Get('d365/export/json', { tenant_id: tenantId }),
    enabled: !!tenantId,
    staleTime: 2 * 60_000,
  });

  const { data: findingsData, isLoading: loadingFindings } = useQuery({
    queryKey: ['d365-findings', tenantId],
    queryFn: async () => {
      const jwt = localStorage.getItem('sastria_jwt');
      const res = await fetch(`/api/RunTool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(jwt ? { 'x-sastria-jwt': jwt } : {}) },
        body: JSON.stringify({ tool_name: 'get_d365_findings', tenant_id: tenantId, args: { limit: 50 } }),
      });
      if (!res.ok) {
        // Fallback: try D365 API directly
        return d365Post('d365/analyze', { tenant_id: tenantId });
      }
      return res.json();
    },
    enabled: !!tenantId,
    staleTime: 2 * 60_000,
  });

  // Run analysis mutation
  const analyzeMut = useMutation({
    mutationFn: () => d365Post('d365/analyze', { tenant_id: tenantId }),
    onSuccess: (data) => {
      toast({ title: 'Análise concluída', description: `${data.findings_generated ?? 0} findings gerados.` });
      qc.invalidateQueries({ queryKey: ['d365-findings', tenantId] });
      qc.invalidateQueries({ queryKey: ['d365-summary', tenantId] });
    },
    onError: (e) => toast({ title: 'Erro', description: String(e), variant: 'destructive' }),
  });

  // Extract data
  const environments: Environment[] = summaryData?.capacity ?? summaryData?.environments ?? [];
  const findings: Finding[] = findingsData?.findings ?? [];
  const topTables: TableRow[] = summaryData?.tables?.top_tables ?? summaryData?.top_tables ?? [];

  const totalCapacity = environments.reduce((s, e) => s + (e.total_capacity_gb || 0), 0);
  const usedCapacity = environments.reduce((s, e) => s + (e.used_capacity_gb || 0), 0);
  const usedPct = totalCapacity > 0 ? ((usedCapacity / totalCapacity) * 100).toFixed(1) : '—';

  const criticalFindings = findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length;
  const recoverableGB = findings.reduce((s, f) => s + (f.estimated_recoverable_gb || 0), 0);

  const filteredTables = tabCat === 'all' ? topTables : topTables.filter(t => t.table_category === tabCat);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-violet-400" />
            D365 Storage Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Análise de capacidade, findings e perfil de tabelas Dynamics 365.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tenant selector */}
          <select
            value={tenantId}
            onChange={e => setSelectedTenant(e.target.value)}
            className="text-sm rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          >
            {tenants.map((t: { TenantId: string; TenantCode: string }) => (
              <option key={t.TenantId} value={t.TenantId}>{t.TenantCode}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => analyzeMut.mutate()}
            disabled={analyzeMut.isPending || !tenantId}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${analyzeMut.isPending ? 'animate-spin' : ''}`} />
            Executar Análise
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Server}
          label="Environments"
          value={String(environments.length || '—')}
          sub={environments.length > 0 ? `${environments.map(e => e.environment_name).join(', ')}` : undefined}
        />
        <StatCard
          icon={Database}
          label="Capacidade Total"
          value={formatGB(totalCapacity || null)}
          sub={`${usedPct}% utilizado`}
          color="text-blue-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="Findings Ativos"
          value={String(findings.length || '—')}
          sub={criticalFindings > 0 ? `${criticalFindings} críticos/altos` : 'Nenhum crítico'}
          color={criticalFindings > 0 ? 'text-red-400' : 'text-emerald-400'}
        />
        <StatCard
          icon={TrendingUp}
          label="GB Recuperáveis"
          value={formatGB(recoverableGB || null)}
          sub="Estimativa de economia"
          color="text-emerald-400"
        />
      </div>

      {/* Environments Table */}
      {environments.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-surface/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
            <Server className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-foreground">Environments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2">Nome</th>
                  <th className="text-left px-4 py-2">Tipo</th>
                  <th className="text-right px-4 py-2">Database</th>
                  <th className="text-right px-4 py-2">File</th>
                  <th className="text-right px-4 py-2">Log</th>
                  <th className="text-right px-4 py-2">Total</th>
                  <th className="text-right px-4 py-2">Usado</th>
                </tr>
              </thead>
              <tbody>
                {environments.map((env, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-surface/80 transition-colors">
                    <td className="px-4 py-2 font-medium text-foreground">{env.environment_name || env.environment_id}</td>
                    <td className="px-4 py-2 text-muted-foreground">{env.environment_type}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatGB(env.database_capacity_gb)}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatGB(env.file_capacity_gb)}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatGB(env.log_capacity_gb)}</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold">{formatGB(env.total_capacity_gb)}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatGB(env.used_capacity_gb)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Findings */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-foreground">Findings de Otimização</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            {findings.length} ativo{findings.length !== 1 ? 's' : ''}
          </span>
        </div>
        {loadingFindings ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : findings.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-surface/50 p-8 text-center text-sm text-muted-foreground">
            <FileWarning className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            Nenhum finding de otimização ativo. Execute a análise para gerar findings.
          </div>
        ) : (
          <div className="space-y-2">
            {findings.map((f, i) => <FindingCard key={`${f.finding_code}-${i}`} f={f} />)}
          </div>
        )}
      </div>

      {/* Top Tables */}
      {topTables.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-surface/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2 flex-wrap">
            <TableProperties className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-foreground">Maiores Tabelas</h2>
            <div className="flex gap-1 ml-auto">
              {['all', 'staging', 'log', 'functional', 'custom', 'system'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setTabCat(cat)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    tabCat === cat
                      ? 'bg-violet-500/15 border-violet-500/30 text-violet-400'
                      : 'bg-surface border-border/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat === 'all' ? 'Todas' : cat}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-border/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2">#</th>
                  <th className="text-left px-4 py-2">Tabela</th>
                  <th className="text-right px-4 py-2">Linhas</th>
                  <th className="text-right px-4 py-2">Tamanho</th>
                  <th className="text-left px-4 py-2">Categoria</th>
                </tr>
              </thead>
              <tbody>
                {filteredTables.map((t, i) => (
                  <tr key={t.table_name} className="border-b border-border/20 hover:bg-surface/80 transition-colors">
                    <td className="px-4 py-1.5 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-4 py-1.5 font-mono text-xs text-foreground">{t.table_name}</td>
                    <td className="px-4 py-1.5 text-right font-mono text-xs">{t.row_count?.toLocaleString()}</td>
                    <td className="px-4 py-1.5 text-right font-mono text-xs font-semibold">{formatGB(t.size_gb)}</td>
                    <td className="px-4 py-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${categoryColor(t.table_category)}`}>
                        {t.table_category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loadingSummary && environments.length === 0 && findings.length === 0 && (
        <div className="rounded-xl border border-border/60 bg-surface/50 p-12 text-center">
          <HardDrive className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum dado D365</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Este tenant ainda não possui dados de storage Dynamics 365.
            Execute a coleta de dados primeiro.
          </p>
          <Button
            variant="outline"
            onClick={() => analyzeMut.mutate()}
            disabled={analyzeMut.isPending || !tenantId}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${analyzeMut.isPending ? 'animate-spin' : ''}`} />
            Executar Análise
          </Button>
        </div>
      )}
    </div>
  );
}
