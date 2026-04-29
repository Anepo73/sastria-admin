import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { fetchOpportunities, runRecommendations, fetchTenants } from '@/lib/api';
import type { Opportunity, Tenant } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, X } from 'lucide-react';
import { toast } from 'sonner';

// ── Mapa de cores por severidade (valores reais do banco sem acentos) ──────────
const severityStyle: Record<string, string> = {
  Desperdicio:    'bg-red-500/20     text-red-400    border-red-500/30',
  Risco:          'bg-orange-500/20  text-orange-400 border-orange-500/30',
  Potencial:      'bg-yellow-500/20  text-yellow-400 border-yellow-500/30',
  Adequacao:      'bg-blue-500/20    text-blue-400   border-blue-500/30',
  Simplificacao:  'bg-green-500/20   text-green-400  border-green-500/30',
  // compatibilidade com valores legados
  Alta:  'bg-red-500/20    text-red-400    border-red-500/30',
  Média: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Baixa: 'bg-blue-500/20   text-blue-400   border-blue-500/30',
};

// ── Labels de exibição para severidade ────────────────────────────────────────
const SEVERITY_LABEL: Record<string, string> = {
  Desperdicio:   'Desperdício',
  Risco:         'Risco',
  Potencial:     'Potencial',
  Adequacao:     'Adequação',
  Simplificacao: 'Simplificação',
  Alta:          'Alta',
  Média:         'Média',
  Baixa:         'Baixa',
};

// ── Labels legíveis para recommendation_type ───────────────────────────────────
const TYPE_LABEL: Record<string, string> = {
  ACTIVE_USER_INACTIVE_90D_HAS_LICENSE:      'Usuário inativo c/ licença',
  DISABLED_USER_HAS_LICENSE:                 'Usuário desabilitado c/ licença',
  OFFICE_DESKTOP_INACTIVE_90D:               'Office Desktop inativo 90d',
  Avaliar_Downgrade:                         'Adequação de licença',
  LICENSE_DOWNGRADE_OPPORTUNITY:             'Adequação de licença',
  POTENTIAL_OVERPROVISIONING:                'Superprovisionamento potencial',
  SUBSCRIPTION_RENEWAL_LOW_UTILIZATION:      'Renovação c/ baixa utilização',
  SUBSCRIPTION_RISK_STATUS:                  'Risco no status da assinatura',
  TRIAL_SUBSCRIPTION_ACTIVE:                 'Trial ativo',
  'License Overlap':                         'Sobreposição de licenças',
};

function typeLabel(t: string) { return TYPE_LABEL[t] || t; }
function sevLabel(s: string)  { return SEVERITY_LABEL[s] || s; }

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtShort = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}K`;
  return fmt(v);
};

const Select = ({
  value, onChange, children, className = '',
}: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string;
}) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className={`rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground h-10 ${className}`}
  >
    {children}
  </select>
);

// ── Pivot Table Component ────────────────────────────────────────────────────
function PivotDashboard({ opps }: { opps: Opportunity[] }) {
  const pivot = useMemo(() => {
    // Collect unique severities and licenses
    const severities = [...new Set(opps.map(o => o.severity))].filter(Boolean).sort();
    const licenses = [...new Set(opps.map(o => o.sku_display_name || '(Sem Licença)'))].sort();

    // Build matrix: license → severity → { count, savings }
    const matrix: Record<string, Record<string, { count: number; savings: number }>> = {};
    const sevTotals: Record<string, { count: number; savings: number }> = {};
    const licTotals: Record<string, { count: number; savings: number }> = {};
    let grandCount = 0;
    let grandSavings = 0;

    for (const sev of severities) {
      sevTotals[sev] = { count: 0, savings: 0 };
    }

    for (const lic of licenses) {
      matrix[lic] = {};
      licTotals[lic] = { count: 0, savings: 0 };
      for (const sev of severities) {
        matrix[lic][sev] = { count: 0, savings: 0 };
      }
    }

    for (const o of opps) {
      const lic = o.sku_display_name || '(Sem Licença)';
      const sev = o.severity;
      if (!sev) continue;
      if (!matrix[lic]) continue;
      if (!matrix[lic][sev]) matrix[lic][sev] = { count: 0, savings: 0 };

      matrix[lic][sev].count++;
      matrix[lic][sev].savings += o.savings_year ?? 0;

      sevTotals[sev].count++;
      sevTotals[sev].savings += o.savings_year ?? 0;

      licTotals[lic].count++;
      licTotals[lic].savings += o.savings_year ?? 0;

      grandCount++;
      grandSavings += o.savings_year ?? 0;
    }

    // Sort licenses by total savings descending
    licenses.sort((a, b) => (licTotals[b]?.savings ?? 0) - (licTotals[a]?.savings ?? 0));

    return { severities, licenses, matrix, sevTotals, licTotals, grandCount, grandSavings };
  }, [opps]);

  if (pivot.licenses.length === 0) return null;

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <h2 className="text-sm font-semibold text-foreground">Resumo por Licença × Severidade</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Quantidade de recomendações e saving estimado</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50 bg-surface/50">
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground min-w-[200px]">Licença</th>
              {pivot.severities.map(sev => (
                <th key={sev} className="text-center px-3 py-2.5 min-w-[100px]">
                  <Badge className={`${severityStyle[sev] ?? ''} text-[10px] px-1.5`}>{sevLabel(sev)}</Badge>
                </th>
              ))}
              <th className="text-center px-3 py-2.5 font-bold text-foreground min-w-[100px] bg-surface/80">Total</th>
            </tr>
          </thead>
          <tbody>
            {pivot.licenses.map(lic => (
              <tr key={lic} className="border-b border-border/30 hover:bg-surface-hover/30 transition-colors">
                <td className="px-3 py-2 font-medium text-foreground truncate max-w-[250px]" title={lic}>{lic}</td>
                {pivot.severities.map(sev => {
                  const cell = pivot.matrix[lic]?.[sev];
                  return (
                    <td key={sev} className="text-center px-3 py-2">
                      {cell && cell.count > 0 ? (
                        <div>
                          <span className="font-semibold text-foreground">{cell.count}</span>
                          {cell.savings > 0 && (
                            <div className="text-[10px] text-success mt-0.5">{fmtShort(cell.savings)}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="text-center px-3 py-2 bg-surface/50 font-bold">
                  <span className="text-foreground">{pivot.licTotals[lic]?.count ?? 0}</span>
                  {(pivot.licTotals[lic]?.savings ?? 0) > 0 && (
                    <div className="text-[10px] text-success mt-0.5">{fmtShort(pivot.licTotals[lic].savings)}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface/80 border-t border-border/50">
              <td className="px-3 py-2.5 font-bold text-foreground">Total</td>
              {pivot.severities.map(sev => (
                <td key={sev} className="text-center px-3 py-2.5 font-bold">
                  <span className="text-foreground">{pivot.sevTotals[sev]?.count ?? 0}</span>
                  {(pivot.sevTotals[sev]?.savings ?? 0) > 0 && (
                    <div className="text-[10px] text-success mt-0.5">{fmtShort(pivot.sevTotals[sev].savings)}</div>
                  )}
                </td>
              ))}
              <td className="text-center px-3 py-2.5 font-bold bg-primary/5">
                <span className="text-primary text-sm">{pivot.grandCount}</span>
                {pivot.grandSavings > 0 && (
                  <div className="text-xs text-success mt-0.5 font-bold">{fmt(pivot.grandSavings)}</div>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function OpportunitiesPage() {
  const [searchParams] = useSearchParams();
  const qsTenantId = searchParams.get('tenant') ?? '';

  const tenants: Tenant[] = useQuery({ queryKey: ['tenants'], queryFn: fetchTenants }).data ?? [];

  // ── Seleção de tenant — pre-seleciona pelo query param ────────────────────
  const [tenantCode, setTenantCode] = useState('');

  // Auto-select tenant from query string
  useEffect(() => {
    if (qsTenantId && tenants.length > 0 && !tenantCode) {
      const match = tenants.find(t => t.tenant_id === qsTenantId);
      if (match) setTenantCode(match.tenant_code);
    }
  }, [qsTenantId, tenants, tenantCode]);

  const selectedTenant  = tenants.find(t => t.tenant_code === tenantCode);
  const tenantId        = selectedTenant?.tenant_id ?? '';

  // ── Filtros client-side ──────────────────────────────────────────────────────
  const [search,        setSearch]        = useState('');
  const [filterType,    setFilterType]    = useState('');
  const [filterSev,     setFilterSev]     = useState('');
  const [filterLicense, setFilterLicense] = useState('');
  const [filterStatus,  setFilterStatus]  = useState('OPEN');
  const [minSavings,    setMinSavings]    = useState('');

  const [generating, setGenerating] = useState(false);

  // ── Busca (1 chamada por tenant, sem filtros no backend) ─────────────────────
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['opportunities', tenantId],
    queryFn:  () => fetchOpportunities({ tenant_id: tenantId }),
    enabled:  !!tenantId,
  });
  const allOpps: Opportunity[] = data ?? [];

  // ── Opções dinâmicas dos dropdowns ───────────────────────────────────────────
  const uniqueTypes    = useMemo(() => [...new Set(allOpps.map(o => o.type))].filter(Boolean).sort(), [allOpps]);
  const uniqueSevs     = useMemo(() => [...new Set(allOpps.map(o => o.severity))].filter(Boolean).sort(), [allOpps]);
  const uniqueStatuses = useMemo(() => [...new Set(allOpps.map(o => o.status))].filter(Boolean).sort(), [allOpps]);
  const uniqueLicenses = useMemo(() => [...new Set(allOpps.map(o => o.sku_display_name).filter(Boolean) as string[])].sort(), [allOpps]);

  // ── Filtro client-side ───────────────────────────────────────────────────────
  const opps = useMemo(() => {
    const q   = search.toLowerCase().trim();
    const min = minSavings ? parseFloat(minSavings) : null;
    return allOpps.filter(o => {
      if (filterType    && o.type     !== filterType)   return false;
      if (filterSev     && o.severity !== filterSev)    return false;
      if (filterStatus  && o.status   !== filterStatus) return false;
      if (filterLicense && (o.sku_display_name ?? '') !== filterLicense) return false;
      if (min !== null && o.savings_year < min)        return false;
      if (q && !(
        o.user.toLowerCase().includes(q) ||
        o.recommendation.toLowerCase().includes(q) ||
        o.type.toLowerCase().includes(q) ||
        (o.sku_display_name ?? '').toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [allOpps, filterType, filterSev, filterStatus, filterLicense, minSavings, search]);

  const totalSavings = useMemo(() => opps.reduce((s, o) => s + (o.savings_year ?? 0), 0), [opps]);

  const hasFilters = search || filterType || filterSev || filterLicense || filterStatus !== 'OPEN' || minSavings;
  const clearFilters = () => { setSearch(''); setFilterType(''); setFilterSev(''); setFilterLicense(''); setFilterStatus('OPEN'); setMinSavings(''); };

  const handleGenerate = async () => {
    if (!tenantId) { toast.error('Selecione um tenant'); return; }
    setGenerating(true);
    try {
      await runRecommendations(tenantId);
      toast.success('Recomendações geradas!');
      refetch();
    } catch (err: unknown) {
      toast.error('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'));
    } finally { setGenerating(false); }
  };

  return (
    <div className="p-6 admin-bg relative admin-grid min-h-full">
      <div className="relative z-10 max-w-7xl mx-auto space-y-5">

        {/* ── Cabeçalho ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">Oportunidades de Economia</h1>
          <Button onClick={handleGenerate} disabled={generating || !tenantCode}>
            <RefreshCw className={`h-4 w-4 mr-1 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Gerando...' : 'Gerar Recomendações'}
          </Button>
        </div>

        {/* ── Linha 1: tenant + busca ───────────────────────────────────── */}
        <div className="flex gap-3 flex-wrap items-center">
          <Select value={tenantCode} onChange={setTenantCode} className="min-w-[180px]">
            <option value="">Selecione o Tenant</option>
            {tenants.map(t => <option key={t.tenant_id} value={t.tenant_code}>{t.tenant_code}</option>)}
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar usuário, descrição, SKU…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-surface"
            />
          </div>
        </div>

        {/* ── Dashboard Pivot ──────────────────────────────────────────── */}
        {allOpps.length > 0 && <PivotDashboard opps={allOpps} />}

        {/* ── Linha 2: filtros dinâmicos ────────────────────────────────── */}
        <div className="flex gap-3 flex-wrap items-center">
          <Select value={filterType} onChange={setFilterType} className="min-w-[220px]">
            <option value="">Todos os tipos</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
          </Select>

          <Select value={filterSev} onChange={setFilterSev}>
            <option value="">Todas as severidades</option>
            {uniqueSevs.map(s => <option key={s} value={s}>{sevLabel(s)}</option>)}
          </Select>

          <Select value={filterStatus} onChange={setFilterStatus}>
            <option value="">Todos os status</option>
            {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>

          <Input
            placeholder="Economia mín. (R$)"
            value={minSavings}
            onChange={e => setMinSavings(e.target.value)}
            className="w-44 bg-surface"
            type="number"
            min={0}
          />

          <Select value={filterLicense} onChange={setFilterLicense} className="min-w-[220px]">
            <option value="">Todas as licenças</option>
            {uniqueLicenses.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5 mr-1" /> Limpar filtros
            </Button>
          )}
        </div>

        {/* ── Sumário ───────────────────────────────────────────────────── */}
        {allOpps.length > 0 && (
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{opps.length}</span>
              {allOpps.length !== opps.length ? ` de ${allOpps.length}` : ''} recomendações
            </span>
            <span>
              Economia estimada:{' '}
              <span className="font-semibold text-success">{fmt(totalSavings)}</span>
            </span>
          </div>
        )}

        {/* ── Tabela ────────────────────────────────────────────────────── */}
        <div className="glass rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Usuário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Licença</TableHead>
                <TableHead>Recomendação</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Economia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!tenantCode ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Selecione um tenant para ver as oportunidades
                </TableCell></TableRow>
              ) : isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Carregando…
                </TableCell></TableRow>
              ) : opps.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {hasFilters ? 'Nenhuma recomendação corresponde aos filtros.' : 'Nenhuma oportunidade encontrada.'}
                </TableCell></TableRow>
              ) : opps.map((o, i) => (
                <TableRow key={i} className="border-border hover:bg-surface-hover/50">
                  <TableCell className="max-w-[200px] truncate font-mono text-xs">{o.user}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs whitespace-nowrap">{typeLabel(o.type)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[180px] text-xs text-muted-foreground truncate" title={o.sku_display_name ?? ''}>
                    {o.sku_display_name || <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell className="max-w-sm text-sm text-muted-foreground">{o.recommendation}</TableCell>
                  <TableCell>
                    <Badge className={`${severityStyle[o.severity] ?? ''} text-xs`}>{sevLabel(o.severity)}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${o.status === 'OPEN' ? 'text-success' : 'text-muted-foreground'}`}>
                      {o.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-success whitespace-nowrap">
                    {fmt(o.savings_year)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
