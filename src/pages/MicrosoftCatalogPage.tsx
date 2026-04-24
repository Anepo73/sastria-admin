import { useState, useEffect, useCallback } from 'react';
import { fetchMsCatalogStats, fetchMsProducts, fetchMsServicePlans, fetchMsProductDetail, fetchMsServicePlanDetail, refreshMsCatalog } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Search, RefreshCw, Package, Layers, ChevronLeft, ChevronRight,
  Hash, ArrowRight, Copy, ExternalLink, CloudDownload, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'products' | 'service_plans';

interface Stats {
  products: number; service_plans: number; relationships: number;
  product_aliases: number; sp_name_aliases: number; sp_friendly_aliases: number;
}

export default function MicrosoftCatalogPage() {
  const [tab, setTab] = useState<Tab>('products');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<Stats | null>(null);

  // Products
  const [products, setProducts] = useState<any[]>([]);
  const [prodTotal, setProdTotal] = useState(0);
  const [prodLoading, setProdLoading] = useState(false);

  // Service Plans
  const [plans, setPlans] = useState<any[]>([]);
  const [planTotal, setPlanTotal] = useState(0);
  const [planLoading, setPlanLoading] = useState(false);

  // Detail
  const [detail, setDetail] = useState<any>(null);
  const [detailType, setDetailType] = useState<'product' | 'service_plan'>('product');
  const [detailLoading, setDetailLoading] = useState(false);

  // Refresh from MS
  const [refreshing, setRefreshing] = useState(false);

  const pageSize = 30;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Load stats
  useEffect(() => {
    fetchMsCatalogStats().then(setStats).catch(() => {});
  }, []);

  // Load products
  const loadProducts = useCallback(async () => {
    setProdLoading(true);
    try {
      const r = await fetchMsProducts(debouncedSearch || undefined, page, pageSize);
      setProducts(r.items || []);
      setProdTotal(r.total || 0);
    } catch { toast.error('Erro ao carregar produtos'); }
    finally { setProdLoading(false); }
  }, [debouncedSearch, page]);

  // Load service plans
  const loadPlans = useCallback(async () => {
    setPlanLoading(true);
    try {
      const r = await fetchMsServicePlans(debouncedSearch || undefined, page, pageSize);
      setPlans(r.items || []);
      setPlanTotal(r.total || 0);
    } catch { toast.error('Erro ao carregar service plans'); }
    finally { setPlanLoading(false); }
  }, [debouncedSearch, page]);

  useEffect(() => {
    if (tab === 'products') loadProducts();
    else loadPlans();
  }, [tab, loadProducts, loadPlans]);

  const totalPages = Math.ceil((tab === 'products' ? prodTotal : planTotal) / pageSize);
  const isLoading = tab === 'products' ? prodLoading : planLoading;

  const openProductDetail = async (guid: string) => {
    setDetailType('product');
    setDetailLoading(true);
    setDetail({});
    try {
      const r = await fetchMsProductDetail(guid);
      setDetail(r);
    } catch { toast.error('Erro ao carregar detalhes'); }
    finally { setDetailLoading(false); }
  };

  const openPlanDetail = async (id: string) => {
    setDetailType('service_plan');
    setDetailLoading(true);
    setDetail({});
    try {
      const r = await fetchMsServicePlanDetail(id);
      setDetail(r);
    } catch { toast.error('Erro ao carregar detalhes'); }
    finally { setDetailLoading(false); }
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID copiado!');
  };

  return (
    <div className="p-6 admin-bg relative admin-grid min-h-full">
      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Catálogo Microsoft
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Referência oficial de produtos e service plans Microsoft 365 / Dynamics 365
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={async () => {
              if (!confirm('Isso vai baixar o CSV oficial da Microsoft e reprocessar todas as 6 tabelas. Continuar?')) return;
              setRefreshing(true);
              const toastId = toast.loading('Atualizando catálogo da Microsoft... (pode levar ~30s)');
              try {
                const r = await refreshMsCatalog();
                toast.success(
                  `Catálogo atualizado! ${r.stats?.products || 0} produtos, ${r.stats?.service_plans || 0} service plans, ${r.stats?.relationships || 0} relações.`,
                  { id: toastId, duration: 8000 }
                );
                // Reload stats + current list
                fetchMsCatalogStats().then(setStats);
                if (tab === 'products') loadProducts(); else loadPlans();
              } catch (err: any) {
                toast.error(`Erro na atualização: ${err.message || 'desconhecido'}`, { id: toastId });
              } finally {
                setRefreshing(false);
              }
            }}
            className="gap-2"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}
            {refreshing ? 'Atualizando...' : 'Atualizar da Microsoft'}
          </Button>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Produtos" value={stats.products} icon="📦" />
            <StatCard label="Service Plans" value={stats.service_plans} icon="⚙️" />
            <StatCard label="Relações" value={stats.relationships} icon="🔗" />
            <StatCard label="Aliases Produto" value={stats.product_aliases} icon="🏷️" />
            <StatCard label="Aliases Plan" value={stats.sp_name_aliases} icon="📝" />
            <StatCard label="Friendly Names" value={stats.sp_friendly_aliases} icon="💬" />
          </div>
        )}

        {/* Tab bar + search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => { setTab('products'); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                tab === 'products' ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="h-4 w-4" /> Produtos
              <Badge variant="secondary" className="text-[10px] ml-1">{prodTotal || stats?.products || 0}</Badge>
            </button>
            <button
              onClick={() => { setTab('service_plans'); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                tab === 'service_plans' ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="h-4 w-4" /> Service Plans
              <Badge variant="secondary" className="text-[10px] ml-1">{planTotal || stats?.service_plans || 0}</Badge>
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={tab === 'products' ? 'Buscar produto, string_id ou alias...' : 'Buscar service plan, friendly name ou alias...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-surface border-border"
            />
          </div>

          <Button variant="outline" size="icon" onClick={() => { tab === 'products' ? loadProducts() : loadPlans(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <div className="glass rounded-xl overflow-hidden">
          {tab === 'products' ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>String ID</TableHead>
                  <TableHead className="text-center">Service Plans</TableHead>
                  <TableHead className="text-center">Aliases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />Carregando...
                  </TableCell></TableRow>
                ) : products.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Nenhum resultado</TableCell></TableRow>
                ) : products.map((p, idx) => (
                  <TableRow
                    key={p.product_guid}
                    className="border-border hover:bg-surface-hover/50 cursor-pointer transition-colors"
                    onClick={() => openProductDetail(p.product_guid)}
                  >
                    <TableCell className="text-xs text-muted-foreground">{(page - 1) * pageSize + idx + 1}</TableCell>
                    <TableCell>
                      <span className="font-medium text-sm">{p.canonical_product_display_name}</span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{p.string_id}</code>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">{p.service_plan_count}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">{p.product_display_name_variants}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Friendly Name</TableHead>
                  <TableHead>Service Plan Name</TableHead>
                  <TableHead className="text-center">Produtos</TableHead>
                  <TableHead className="text-center">Aliases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />Carregando...
                  </TableCell></TableRow>
                ) : plans.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Nenhum resultado</TableCell></TableRow>
                ) : plans.map((sp, idx) => (
                  <TableRow
                    key={sp.service_plan_id}
                    className="border-border hover:bg-surface-hover/50 cursor-pointer transition-colors"
                    onClick={() => openPlanDetail(sp.service_plan_id)}
                  >
                    <TableCell className="text-xs text-muted-foreground">{(page - 1) * pageSize + idx + 1}</TableCell>
                    <TableCell>
                      <span className="font-medium text-sm">{sp.canonical_friendly_name}</span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{sp.canonical_service_plan_name}</code>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">{sp.product_count}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">{(sp.service_plan_name_variants || 0) + (sp.friendly_name_variants || 0)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Próxima <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
          <DialogContent className="glass border-border max-w-2xl max-h-[85vh] overflow-y-auto">
            {detailLoading ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : detailType === 'product' && detail?.product ? (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    {detail.product.canonical_product_display_name}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* IDs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">GUID</label>
                      <div className="flex items-center gap-1 mt-1">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">{detail.product.product_guid}</code>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => copyId(detail.product.product_guid)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">String ID</label>
                      <div className="flex items-center gap-1 mt-1">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1">{detail.product.string_id}</code>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => copyId(detail.product.string_id)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Aliases */}
                  {detail.aliases?.length > 0 && (
                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium flex items-center gap-1">
                        🏷️ Aliases ({detail.aliases.length})
                      </label>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {detail.aliases.map((a: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Service Plans */}
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium flex items-center gap-1">
                      <Layers className="h-3 w-3" /> Service Plans ({detail.service_plans?.length || 0})
                    </label>
                    <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                      {detail.service_plans?.map((sp: any) => (
                        <button
                          key={sp.service_plan_id}
                          className="w-full text-left px-3 py-2 rounded-md border border-border hover:bg-surface-hover/50 transition-colors flex items-center gap-2"
                          onClick={() => openPlanDetail(sp.service_plan_id)}
                        >
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-sm flex-1 truncate">{sp.canonical_friendly_name}</span>
                          <code className="text-[10px] font-mono text-muted-foreground shrink-0">{sp.canonical_service_plan_name}</code>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : detailType === 'service_plan' && detail?.service_plan ? (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    {detail.service_plan.canonical_friendly_name}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* IDs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Service Plan ID</label>
                      <div className="flex items-center gap-1 mt-1">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 truncate">{detail.service_plan.service_plan_id}</code>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => copyId(detail.service_plan.service_plan_id)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Plan Name</label>
                      <div className="flex items-center gap-1 mt-1">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1">{detail.service_plan.canonical_service_plan_name}</code>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => copyId(detail.service_plan.canonical_service_plan_name)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Name Aliases */}
                  {detail.name_aliases?.length > 0 && (
                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">📝 Name Aliases ({detail.name_aliases.length})</label>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {detail.name_aliases.map((a: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs font-mono">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Friendly Aliases */}
                  {detail.friendly_aliases?.length > 0 && (
                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">💬 Friendly Aliases ({detail.friendly_aliases.length})</label>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {detail.friendly_aliases.map((a: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products that include this plan */}
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium flex items-center gap-1">
                      <Package className="h-3 w-3" /> Produtos que incluem ({detail.products?.length || 0})
                    </label>
                    <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                      {detail.products?.map((p: any) => (
                        <button
                          key={p.product_guid}
                          className="w-full text-left px-3 py-2 rounded-md border border-border hover:bg-surface-hover/50 transition-colors flex items-center gap-2"
                          onClick={() => openProductDetail(p.product_guid)}
                        >
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-sm flex-1 truncate">{p.canonical_product_display_name}</span>
                          <code className="text-[10px] font-mono text-muted-foreground shrink-0">{p.string_id}</code>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="glass rounded-lg p-3 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-lg font-bold text-foreground">{value.toLocaleString('pt-BR')}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
