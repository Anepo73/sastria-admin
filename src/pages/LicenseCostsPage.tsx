import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { fetchTenantSkus, updateTenantSkuCost, fetchTenants } from '@/lib/api';
import type { TenantSku, Tenant } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LicenseCostsPage() {
  const { user, isGlobalAdmin } = useAuthContext();
  const queryClient = useQueryClient();

  // GlobalAdmin: precisa escolher tenant. Admin: usa o próprio.
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const tenantId = isGlobalAdmin ? selectedTenantId : (user?.tenantId || '');

  // Buscar lista de tenants (só para GlobalAdmin)
  const { data: tenantsList } = useQuery({
    queryKey: ['tenants'],
    queryFn: fetchTenants,
    enabled: isGlobalAdmin,
  });
  const tenants: Tenant[] = tenantsList ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['license-costs', tenantId],
    queryFn: () => fetchTenantSkus(tenantId),
    enabled: !!tenantId,
  });
  const skus: TenantSku[] = (data as any)?.data || data || [];

  // ── Filters ──
  const [filters, setFilters] = useState({
    name: '',
    minAssigned: '',
    minActive: '',
    suspended: '',
    inAlert: '',
  });

  const [editingCosts, setEditingCosts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return skus.filter(s => {
      if (filters.name && !s.display_name.toLowerCase().includes(filters.name.toLowerCase()) &&
          !s.part_number.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.minAssigned && s.assigned < parseInt(filters.minAssigned)) return false;
      if (filters.minActive && s.active < parseInt(filters.minActive)) return false;
      if (filters.suspended === '>0' && s.suspended <= 0) return false;
      if (filters.suspended === '=0' && s.suspended > 0) return false;
      if (filters.inAlert === '>0' && s.in_alert <= 0) return false;
      if (filters.inAlert === '=0' && s.in_alert > 0) return false;
      return true;
    });
  }, [skus, filters]);

  // ── Totals ──
  const totalAssigned = filtered.reduce((a, s) => a + s.assigned, 0);
  const totalActive = filtered.reduce((a, s) => a + s.active, 0);
  const totalCost = filtered.reduce((a, s) => a + (s.cost_brl ?? 0), 0);

  const handleSaveCost = async (sku: TenantSku) => {
    const val = editingCosts[sku.sku_id];
    if (val === undefined) return;
    setSaving(sku.sku_id);
    try {
      const cost = parseFloat(val.replace(/\./g, '').replace(',', '.'));
      await updateTenantSkuCost(tenantId, sku.sku_id, cost);
      toast.success('Custo atualizado!');
      queryClient.invalidateQueries({ queryKey: ['license-costs', tenantId] });
      setEditingCosts(prev => { const n = { ...prev }; delete n[sku.sku_id]; return n; });
    } catch { toast.error('Erro ao salvar custo'); }
    finally { setSaving(null); }
  };

  return (
    <div className="p-6 admin-bg relative admin-grid min-h-full">
      <div className="relative z-10 max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              Custos das Licenças
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Defina o custo anual (R$) de cada licença subscrita
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Seletor de tenant para GlobalAdmin */}
            {isGlobalAdmin && (
              <select
                value={selectedTenantId}
                onChange={e => { setSelectedTenantId(e.target.value); setEditingCosts({}); }}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground h-10 min-w-[180px]"
              >
                <option value="">Selecione o Tenant</option>
                {tenants.map(t => (
                  <option key={t.tenant_id} value={t.tenant_id}>{t.tenant_code}</option>
                ))}
              </select>
            )}
            <Badge variant="secondary" className="text-xs py-1 px-2.5">
              {filtered.length} licenças
            </Badge>
            {totalCost > 0 && (
              <Badge className="bg-primary/20 text-primary text-xs py-1 px-2.5">
                Total: R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Badge>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="glass rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              {/* Column headers */}
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Atribuídas</TableHead>
                <TableHead className="text-right">Ativas</TableHead>
                <TableHead className="text-right">Suspensas</TableHead>
                <TableHead className="text-right">Em Alerta</TableHead>
                <TableHead className="text-right">Custo Anual (R$)</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>

              {/* Filter row */}
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>
                  <Input
                    placeholder="Filtrar nome ou SKU..."
                    value={filters.name}
                    onChange={e => setFilters(f => ({ ...f, name: e.target.value }))}
                    className="h-7 text-xs bg-surface"
                  />
                </TableHead>
                <TableHead>
                  <Input
                    placeholder="Min"
                    type="number"
                    value={filters.minAssigned}
                    onChange={e => setFilters(f => ({ ...f, minAssigned: e.target.value }))}
                    className="h-7 text-xs bg-surface w-16 ml-auto"
                  />
                </TableHead>
                <TableHead>
                  <Input
                    placeholder="Min"
                    type="number"
                    value={filters.minActive}
                    onChange={e => setFilters(f => ({ ...f, minActive: e.target.value }))}
                    className="h-7 text-xs bg-surface w-16 ml-auto"
                  />
                </TableHead>
                <TableHead>
                  <select
                    value={filters.suspended}
                    onChange={e => setFilters(f => ({ ...f, suspended: e.target.value }))}
                    className="h-7 text-xs bg-surface border border-border rounded px-1 text-foreground w-full"
                  >
                    <option value="">Todas</option>
                    <option value=">0">&gt; 0</option>
                    <option value="=0">= 0</option>
                  </select>
                </TableHead>
                <TableHead>
                  <select
                    value={filters.inAlert}
                    onChange={e => setFilters(f => ({ ...f, inAlert: e.target.value }))}
                    className="h-7 text-xs bg-surface border border-border rounded px-1 text-foreground w-full"
                  >
                    <option value="">Todas</option>
                    <option value=">0">&gt; 0</option>
                    <option value="=0">= 0</option>
                  </select>
                </TableHead>
                <TableHead></TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!tenantId ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {isGlobalAdmin ? 'Selecione um tenant para ver as licenças' : 'Tenant não identificado'}
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhuma licença encontrada
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {filtered.map(s => (
                    <TableRow key={s.sku_id} className="border-border hover:bg-surface-hover/50">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{s.display_name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{s.part_number}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{s.assigned}</TableCell>
                      <TableCell className="text-right text-sm">{s.active}</TableCell>
                      <TableCell className="text-right">
                        {s.suspended > 0
                          ? <Badge className="bg-destructive/20 text-destructive">{s.suspended}</Badge>
                          : <span className="text-sm">{s.suspended}</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.in_alert > 0
                          ? <Badge className="bg-yellow-500/20 text-yellow-400">{s.in_alert}</Badge>
                          : <span className="text-sm">{s.in_alert}</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          value={editingCosts[s.sku_id] ?? (s.cost_brl != null ? s.cost_brl.toFixed(2).replace('.', ',') : '')}
                          onChange={e => setEditingCosts(prev => ({ ...prev, [s.sku_id]: e.target.value }))}
                          className="h-7 w-28 text-xs bg-surface ml-auto text-right"
                          placeholder="0,00"
                          onKeyDown={e => e.key === 'Enter' && handleSaveCost(s)}
                        />
                      </TableCell>
                      <TableCell>
                        {editingCosts[s.sku_id] !== undefined && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleSaveCost(s)}
                            disabled={saving === s.sku_id}
                          >
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals row */}
                  <TableRow className="border-t-2 border-border bg-surface/30 font-medium">
                    <TableCell className="text-sm">Total ({filtered.length} licenças)</TableCell>
                    <TableCell className="text-right text-sm">{totalAssigned.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right text-sm">{totalActive.toLocaleString('pt-BR')}</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right text-sm font-semibold text-primary">
                      R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
