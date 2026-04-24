import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTenantSkus, updateTenantSkuCost } from '@/lib/api';
import type { TenantSku } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TenantSkusPage() {
  const { tenantId, tenantCode } = useParams<{ tenantId: string; tenantCode: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-skus', tenantId],
    queryFn: () => fetchTenantSkus(tenantId!),
    enabled: !!tenantId,
  });
  const skus: TenantSku[] = (data as any)?.data || data || [];

  const [filters, setFilters] = useState({ sku: '', name: '', minAssigned: '', minActive: '', suspended: '', inAlert: '' });
  const [editingCosts, setEditingCosts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return skus.filter(s => {
      if (filters.sku && !s.part_number.toLowerCase().includes(filters.sku.toLowerCase())) return false;
      if (filters.name && !s.display_name.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.minAssigned && s.assigned < parseInt(filters.minAssigned)) return false;
      if (filters.minActive && s.active < parseInt(filters.minActive)) return false;
      if (filters.suspended === '>0' && s.suspended <= 0) return false;
      if (filters.suspended === '=0' && s.suspended > 0) return false;
      if (filters.inAlert === '>0' && s.in_alert <= 0) return false;
      if (filters.inAlert === '=0' && s.in_alert > 0) return false;
      return true;
    });
  }, [skus, filters]);

  const handleSaveCost = async (sku: TenantSku) => {
    const val = editingCosts[sku.sku_id];
    if (val === undefined) return;
    setSaving(sku.sku_id);
    try {
      const cost = parseFloat(val.replace(/\./g, '').replace(',', '.'));
      await updateTenantSkuCost(tenantId!, sku.sku_id, cost);
      toast.success('Custo atualizado!');
      queryClient.invalidateQueries({ queryKey: ['tenant-skus', tenantId] });
      setEditingCosts(prev => { const n = { ...prev }; delete n[sku.sku_id]; return n; });
    } catch { toast.error('Erro ao salvar custo'); }
    finally { setSaving(null); }
  };

  if (!tenantId || !tenantCode) {
    return (
      <div className="p-6 flex items-center justify-center min-h-full">
        <div className="glass rounded-xl p-8 text-center max-w-md">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-foreground">Acesse esta página a partir do painel de Tenants.</p>
          <Link to="/admin" className="text-primary text-sm mt-2 inline-block hover:underline">Ir para Tenants</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 admin-bg relative admin-grid min-h-full">
      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">SKUs — {tenantCode}</h1>
            <p className="text-sm text-muted-foreground mt-1">Licenças consumidas por este tenant</p>
          </div>
        </div>

        <div className="glass rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>SKU (Part Number)</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Atribuídas</TableHead>
                <TableHead className="text-right">Ativas</TableHead>
                <TableHead className="text-right">Suspensas</TableHead>
                <TableHead className="text-right">Em Alerta</TableHead>
                <TableHead className="text-right">Custo BRL</TableHead>
                <TableHead></TableHead>
              </TableRow>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead><Input placeholder="Filtrar..." value={filters.sku} onChange={e => setFilters(f => ({ ...f, sku: e.target.value }))} className="h-7 text-xs bg-surface" /></TableHead>
                <TableHead><Input placeholder="Filtrar..." value={filters.name} onChange={e => setFilters(f => ({ ...f, name: e.target.value }))} className="h-7 text-xs bg-surface" /></TableHead>
                <TableHead><Input placeholder="Min" type="number" value={filters.minAssigned} onChange={e => setFilters(f => ({ ...f, minAssigned: e.target.value }))} className="h-7 text-xs bg-surface w-16 ml-auto" /></TableHead>
                <TableHead><Input placeholder="Min" type="number" value={filters.minActive} onChange={e => setFilters(f => ({ ...f, minActive: e.target.value }))} className="h-7 text-xs bg-surface w-16 ml-auto" /></TableHead>
                <TableHead>
                  <select value={filters.suspended} onChange={e => setFilters(f => ({ ...f, suspended: e.target.value }))} className="h-7 text-xs bg-surface border border-border rounded px-1 text-foreground w-full">
                    <option value="">Todas</option><option value=">0">&gt; 0</option><option value="=0">= 0</option>
                  </select>
                </TableHead>
                <TableHead>
                  <select value={filters.inAlert} onChange={e => setFilters(f => ({ ...f, inAlert: e.target.value }))} className="h-7 text-xs bg-surface border border-border rounded px-1 text-foreground w-full">
                    <option value="">Todas</option><option value=">0">&gt; 0</option><option value="=0">= 0</option>
                  </select>
                </TableHead>
                <TableHead></TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.sku_id} className="border-border hover:bg-surface-hover/50">
                  <TableCell className="font-mono text-xs">
                    {s.part_number}
                    {!s.in_catalog && (
                      <Link to={`/sku-catalog?action=new&sku_id=${s.sku_id}&part_number=${s.part_number}`} className="ml-2 text-primary hover:underline inline-flex items-center gap-0.5">
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{s.display_name}</TableCell>
                  <TableCell className="text-right">{s.assigned}</TableCell>
                  <TableCell className="text-right">{s.active}</TableCell>
                  <TableCell className="text-right">
                    {s.suspended > 0 ? <Badge className="bg-destructive/20 text-destructive">{s.suspended}</Badge> : s.suspended}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.in_alert > 0 ? <Badge className="bg-yellow-500/20 text-yellow-400">{s.in_alert}</Badge> : s.in_alert}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      value={editingCosts[s.sku_id] ?? (s.cost_brl != null ? s.cost_brl.toFixed(2).replace('.', ',') : '')}
                      onChange={e => setEditingCosts(prev => ({ ...prev, [s.sku_id]: e.target.value }))}
                      className="h-7 w-24 text-xs bg-surface ml-auto text-right"
                      placeholder="0,00"
                    />
                  </TableCell>
                  <TableCell>
                    {editingCosts[s.sku_id] !== undefined && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveCost(s)} disabled={saving === s.sku_id}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                    )}
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
