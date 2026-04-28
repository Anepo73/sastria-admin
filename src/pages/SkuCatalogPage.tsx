import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { fetchSkuCatalog, createSkuCatalog, updateSkuCatalog, deleteSkuCatalog, fetchSkuOverlaps, createSkuOverlap, updateSkuOverlap, deleteSkuOverlap } from '@/lib/api';
import type { SkuCatalogItem } from '@/types';
import type { SkuOverlap } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, RefreshCw, Pencil, Trash2, Layers, X, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function SkuCatalogPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { data, isLoading, refetch } = useQuery({ queryKey: ['sku-catalog'], queryFn: fetchSkuCatalog });
  const skus: SkuCatalogItem[] = (data as any)?.data || data || [];

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modal, setModal] = useState<SkuCatalogItem | 'new' | null>(null);

  // Handle query params for pre-fill
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      setModal('new');
    }
  }, [searchParams]);

  const categories = useMemo(() => [...new Set(skus.map(s => s.category).filter(Boolean))], [skus]);

  const filtered = useMemo(() => {
    return skus.filter(s => {
      if (search && !s.display_name.toLowerCase().includes(search.toLowerCase()) && !s.part_number.toLowerCase().includes(search.toLowerCase())) return false;
      if (catFilter && s.category !== catFilter) return false;
      return true;
    });
  }, [skus, search, catFilter]);

  const handleDelete = async (sku_id: string) => {
    if (!confirm('Remover este SKU?')) return;
    try {
      await deleteSkuCatalog(sku_id);
      toast.success('SKU removido');
      queryClient.invalidateQueries({ queryKey: ['sku-catalog'] });
    } catch { toast.error('Erro ao remover'); }
  };

  return (
    <div className="p-6 admin-bg relative admin-grid min-h-full">
      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">Catálogo Global de SKUs</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar SKU..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56 bg-surface border-border" />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground h-10">
              <option value="">Todas categorias</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
            <Button onClick={() => setModal('new')}><Plus className="h-4 w-4 mr-1" /> Novo SKU</Button>
          </div>
        </div>

        <div className="glass rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Part Number</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço Unit.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum SKU encontrado</TableCell></TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.sku_id} className="border-border hover:bg-surface-hover/50">
                  <TableCell className="font-mono text-xs">{s.part_number}</TableCell>
                  <TableCell>{s.display_name}</TableCell>
                  <TableCell><Badge variant="secondary">{s.category || '—'}</Badge></TableCell>
                  <TableCell>{s.price_unit != null ? `R$ ${s.price_unit.toFixed(2).replace('.', ',')}` : '—'}</TableCell>
                  <TableCell>
                    <Badge className={s.is_active ? 'bg-success/20 text-success border-success/30' : 'bg-muted text-muted-foreground'}>
                      {s.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {(s as any).is_business && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 ml-1">Business</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setModal(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s.sku_id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <SkuModal
          sku={modal}
          defaultSkuId={searchParams.get('sku_id') || ''}
          defaultPartNumber={searchParams.get('part_number') || ''}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); queryClient.invalidateQueries({ queryKey: ['sku-catalog'] }); }}
        />
      </div>
    </div>
  );
}

function SkuModal({ sku, defaultSkuId, defaultPartNumber, onClose, onSaved }: {
  sku: SkuCatalogItem | 'new' | null;
  defaultSkuId: string;
  defaultPartNumber: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = sku === 'new';

  const emptyForm = {
    sku_id: '', part_number: '', display_name: '', product_family: '', source: '',
    is_deprecated: false, is_free_trial: false, is_business: false, is_active: true,
    Price_ERP: '', Price_EAS: '', Price_NCE: '',
    supports_desktop_apps: false, supports_web_apps: false,
    supports_exchange: false, supports_exchange_archive: false,
    supports_onedrive: false, supports_teams: false, supports_teams_voice: false,
    supports_sharepoint: false, supports_power_bi: false, supports_power_bi_pro: false,
    max_exchange_mailbox_gb: '', max_exchange_archive_gb: '', max_onedrive_gb: '',
    notes: '',
  };

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sku === 'new') {
      setForm({ ...emptyForm, sku_id: defaultSkuId, part_number: defaultPartNumber });
    } else if (sku) {
      const s = sku as any;
      setForm({
        sku_id: s.sku_id || '',
        part_number: s.part_number || s.sku_part_number || '',
        display_name: s.display_name || s.product_display_name || '',
        product_family: s.product_family || '',
        source: s.source || '',
        is_deprecated: !!s.is_deprecated,
        is_free_trial: !!s.is_free_trial,
        is_business: !!s.is_business,
        is_active: s.is_active !== false,
        Price_ERP: s.Price_ERP != null ? String(s.Price_ERP) : '',
        Price_EAS: s.Price_EAS != null ? String(s.Price_EAS) : '',
        Price_NCE: s.Price_NCE != null ? String(s.Price_NCE) : '',
        supports_desktop_apps: !!s.supports_desktop_apps,
        supports_web_apps: !!s.supports_web_apps,
        supports_exchange: !!s.supports_exchange,
        supports_exchange_archive: !!s.supports_exchange_archive,
        supports_onedrive: !!s.supports_onedrive,
        supports_teams: !!s.supports_teams,
        supports_teams_voice: !!s.supports_teams_voice,
        supports_sharepoint: !!s.supports_sharepoint,
        supports_power_bi: !!s.supports_power_bi,
        supports_power_bi_pro: !!s.supports_power_bi_pro,
        max_exchange_mailbox_gb: s.max_exchange_mailbox_gb != null ? String(s.max_exchange_mailbox_gb) : '',
        max_exchange_archive_gb: s.max_exchange_archive_gb != null ? String(s.max_exchange_archive_gb) : '',
        max_onedrive_gb: s.max_onedrive_gb != null ? String(s.max_onedrive_gb) : '',
        notes: s.notes || '',
      });
    }
  }, [sku, defaultSkuId, defaultPartNumber]); // eslint-disable-line

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const parseNum = (v: string) => { const n = parseFloat(v.replace(',', '.')); return isNaN(n) ? undefined : n; };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        sku_id: form.sku_id,
        sku_part_number: form.part_number,
        product_display_name: form.display_name,
        product_family: form.product_family || null,
        source: form.source || null,
        is_deprecated: form.is_deprecated,
        is_free_trial: form.is_free_trial,
        is_business: form.is_business,
        Price_ERP: parseNum(form.Price_ERP) ?? null,
        Price_EAS: parseNum(form.Price_EAS) ?? null,
        Price_NCE: parseNum(form.Price_NCE) ?? null,
        supports_desktop_apps: form.supports_desktop_apps,
        supports_web_apps: form.supports_web_apps,
        supports_exchange: form.supports_exchange,
        supports_exchange_archive: form.supports_exchange_archive,
        supports_onedrive: form.supports_onedrive,
        supports_teams: form.supports_teams,
        supports_teams_voice: form.supports_teams_voice,
        supports_sharepoint: form.supports_sharepoint,
        supports_power_bi: form.supports_power_bi,
        supports_power_bi_pro: form.supports_power_bi_pro,
        max_exchange_mailbox_gb: parseNum(form.max_exchange_mailbox_gb) ?? null,
        max_exchange_archive_gb: parseNum(form.max_exchange_archive_gb) ?? null,
        max_onedrive_gb: parseNum(form.max_onedrive_gb) ?? null,
        notes: form.notes || null,
      };
      if (isNew) await createSkuCatalog(payload);
      else await updateSkuCatalog(payload);
      toast.success(isNew ? 'SKU criado!' : 'SKU atualizado!');
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao salvar SKU: ${msg}`);
    }
    finally { setLoading(false); }
  };

  const Toggle = ({ label, field }: { label: string; field: string }) => (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={!!(form as any)[field]}
        onChange={e => set(field, e.target.checked)}
        className="rounded border-border bg-surface h-4 w-4 text-primary accent-primary"
      />
      <span className="text-sm">{label}</span>
    </label>
  );

  return (
    <Dialog open={!!sku} onOpenChange={onClose}>
      <DialogContent className="glass border-border max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isNew ? 'Novo SKU' : 'Editar SKU'}</DialogTitle></DialogHeader>
        <div className="space-y-5">

          {/* ── Identificação ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium mb-1">Identificação</legend>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SKU ID</Label><Input value={form.sku_id} onChange={e => set('sku_id', e.target.value)} className="bg-surface font-mono text-xs" readOnly={!isNew} /></div>
              <div><Label>Part Number</Label><Input value={form.part_number} onChange={e => set('part_number', e.target.value)} className="bg-surface" /></div>
            </div>
            <div><Label>Display Name</Label><Input value={form.display_name} onChange={e => set('display_name', e.target.value)} className="bg-surface" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Product Family</Label><Input value={form.product_family} onChange={e => set('product_family', e.target.value)} className="bg-surface" placeholder="ex: Microsoft 365" /></div>
              <div><Label>Source</Label><Input value={form.source} onChange={e => set('source', e.target.value)} className="bg-surface" placeholder="ex: Graph, Manual" /></div>
            </div>
          </fieldset>

          {/* ── Flags ── */}
          <fieldset className="space-y-2">
            <legend className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium mb-1">Flags</legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Toggle label="Descontinuado (Deprecated)" field="is_deprecated" />
              <Toggle label="Free Trial" field="is_free_trial" />
              <Toggle label="Business (limite 300 users)" field="is_business" />
            </div>
          </fieldset>

          {/* ── Preços ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium mb-1">Preços (R$ / usuário / mês)</legend>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>ERP</Label><Input value={form.Price_ERP} onChange={e => set('Price_ERP', e.target.value)} className="bg-surface" placeholder="0,00" /></div>
              <div><Label>EAS</Label><Input value={form.Price_EAS} onChange={e => set('Price_EAS', e.target.value)} className="bg-surface" placeholder="0,00" /></div>
              <div><Label>NCE</Label><Input value={form.Price_NCE} onChange={e => set('Price_NCE', e.target.value)} className="bg-surface" placeholder="0,00" /></div>
            </div>
          </fieldset>

          {/* ── Capability Matrix ── */}
          <fieldset className="space-y-2">
            <legend className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium mb-1">Matriz de Capacidades</legend>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <Toggle label="Desktop Apps (Office)" field="supports_desktop_apps" />
              <Toggle label="Web Apps (Office Online)" field="supports_web_apps" />
              <Toggle label="Exchange Online" field="supports_exchange" />
              <Toggle label="Exchange Archive" field="supports_exchange_archive" />
              <Toggle label="OneDrive for Business" field="supports_onedrive" />
              <Toggle label="Teams" field="supports_teams" />
              <Toggle label="Teams Voice (PSTN)" field="supports_teams_voice" />
              <Toggle label="SharePoint Online" field="supports_sharepoint" />
              <Toggle label="Power BI (Free)" field="supports_power_bi" />
              <Toggle label="Power BI Pro" field="supports_power_bi_pro" />
            </div>
          </fieldset>

          {/* ── Limites de Storage ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium mb-1">Limites de Armazenamento (GB)</legend>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Mailbox (GB)</Label><Input value={form.max_exchange_mailbox_gb} onChange={e => set('max_exchange_mailbox_gb', e.target.value)} className="bg-surface" placeholder="50" /></div>
              <div><Label>Archive (GB)</Label><Input value={form.max_exchange_archive_gb} onChange={e => set('max_exchange_archive_gb', e.target.value)} className="bg-surface" placeholder="∞" /></div>
              <div><Label>OneDrive (GB)</Label><Input value={form.max_onedrive_gb} onChange={e => set('max_onedrive_gb', e.target.value)} className="bg-surface" placeholder="1024" /></div>
            </div>
          </fieldset>

          {/* ── Notas ── */}
          <fieldset>
            <legend className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium mb-1">Observações</legend>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground min-h-[60px] resize-y"
              placeholder="Notas adicionais sobre este SKU..."
            />
          </fieldset>

          {/* ── Sobreposições de Licenças ── */}
          {!isNew && sku && typeof sku === 'object' && (
            <SkuOverlapsPanel skuId={(sku as SkuCatalogItem).sku_id} skuName={(sku as SkuCatalogItem).display_name || (sku as any).product_display_name || ''} />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
 * SKU Overlaps Panel — CRUD de sobreposições dentro do modal de SKU
 * ══════════════════════════════════════════════════════════════════════════════ */
function SkuOverlapsPanel({ skuId, skuName }: { skuId: string; skuName: string }) {
  const [overlaps, setOverlaps] = useState<SkuOverlap[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAdvice, setEditAdvice] = useState('');

  // Load overlaps
  const loadOverlaps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSkuOverlaps(skuId);
      setOverlaps(data);
    } catch (err) {
      console.error('Failed to load overlaps', err);
    } finally {
      setLoading(false);
    }
  }, [skuId]);

  useEffect(() => { loadOverlaps(); }, [loadOverlaps]);

  const handleDelete = async (overlap: SkuOverlap) => {
    if (!confirm(`Remover sobreposição com "${overlap.product_display_name || overlap.sku_part_number}"?`)) return;
    try {
      await deleteSkuOverlap(skuId, overlap.sku_id_that_overlaps);
      toast.success('Sobreposição removida');
      loadOverlaps();
    } catch { toast.error('Erro ao remover sobreposição'); }
  };

  const handleStartEdit = (overlap: SkuOverlap) => {
    setEditingId(overlap.sku_id_that_overlaps);
    setEditAdvice(overlap.advice_when_overlaping || '');
  };

  const handleSaveAdvice = async (overlap: SkuOverlap) => {
    try {
      await updateSkuOverlap(skuId, overlap.sku_id_that_overlaps, editAdvice);
      toast.success('Recomendação atualizada');
      setEditingId(null);
      loadOverlaps();
    } catch { toast.error('Erro ao atualizar'); }
  };

  const handleAdded = () => {
    setShowAdd(false);
    loadOverlaps();
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium mb-1 flex items-center gap-2">
        <Layers className="h-3.5 w-3.5" />
        Sobreposições de Licenças
      </legend>

      <p className="text-xs text-muted-foreground">
        SKUs que se sobrepõem a <span className="font-semibold text-foreground">{skuName || skuId}</span>.
        Quando um usuário possui ambas, uma recomendação de otimização é gerada.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" /> Carregando sobreposições...
        </div>
      ) : overlaps.length === 0 && !showAdd ? (
        <div className="border border-dashed border-border rounded-lg py-6 flex flex-col items-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-5 w-5 opacity-50" />
          <span className="text-sm">Nenhuma sobreposição cadastrada</span>
        </div>
      ) : (
        <div className="space-y-2">
          {overlaps.map(o => (
            <div key={o.sku_id_that_overlaps} className="flex items-start gap-2 p-3 rounded-lg border border-border bg-surface/50 group hover:border-primary/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{o.product_display_name || o.sku_part_number}</span>
                  <Badge variant="secondary" className="text-[10px] font-mono shrink-0">{o.sku_part_number}</Badge>
                </div>
                {editingId === o.sku_id_that_overlaps ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      value={editAdvice}
                      onChange={e => setEditAdvice(e.target.value)}
                      className="bg-surface text-xs h-8 flex-1"
                      placeholder="Recomendação quando houver sobreposição..."
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveAdvice(o); if (e.key === 'Escape') setEditingId(null); }}
                    />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleSaveAdvice(o)}>
                      <Check className="h-3.5 w-3.5 text-success" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  o.advice_when_overlaping && (
                    <p className="text-xs text-muted-foreground mt-1 italic">💡 {o.advice_when_overlaping}</p>
                  )
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleStartEdit(o)} title="Editar recomendação">
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDelete(o)} title="Remover sobreposição">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd ? (
        <AddOverlapForm skuId={skuId} existingOverlaps={overlaps} onAdded={handleAdded} onCancel={() => setShowAdd(false)} />
      ) : (
        <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar sobreposição
        </Button>
      )}
    </fieldset>
  );
}

/* ── Add Overlap Form ── */
function AddOverlapForm({ skuId, existingOverlaps, onAdded, onCancel }: {
  skuId: string;
  existingOverlaps: SkuOverlap[];
  onAdded: () => void;
  onCancel: () => void;
}) {
  const { data } = useQuery({ queryKey: ['sku-catalog'], queryFn: fetchSkuCatalog });
  const allSkus: SkuCatalogItem[] = (data as any)?.data || data || [];

  const [search, setSearch] = useState('');
  const [selectedSku, setSelectedSku] = useState<SkuCatalogItem | null>(null);
  const [advice, setAdvice] = useState('');
  const [saving, setSaving] = useState(false);

  const existingIds = useMemo(() => new Set([skuId, ...existingOverlaps.map(o => o.sku_id_that_overlaps)]), [skuId, existingOverlaps]);

  const candidates = useMemo(() => {
    return allSkus
      .filter(s => !existingIds.has(s.sku_id))
      .filter(s => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (s.display_name || '').toLowerCase().includes(q) || (s.part_number || '').toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [allSkus, existingIds, search]);

  const handleSave = async () => {
    if (!selectedSku) return;
    setSaving(true);
    try {
      await createSkuOverlap(skuId, selectedSku.sku_id, advice);
      toast.success(`Sobreposição com "${selectedSku.display_name}" cadastrada!`);
      onAdded();
    } catch (err) {
      toast.error('Erro ao cadastrar sobreposição');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-primary/30 rounded-lg p-3 space-y-3 bg-primary/5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-primary">Nova sobreposição</span>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {selectedSku ? (
        <div className="flex items-center gap-2 p-2 rounded-md bg-surface border border-border">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">{selectedSku.display_name}</span>
            <Badge variant="secondary" className="text-[10px] font-mono ml-2">{selectedSku.part_number}</Badge>
          </div>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setSelectedSku(null); setSearch(''); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 bg-surface text-sm h-9"
              placeholder="Buscar SKU para sobrepor..."
              autoFocus
            />
          </div>
          {search.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-surface divide-y divide-border">
              {candidates.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">Nenhum SKU encontrado</div>
              ) : candidates.map(s => (
                <button
                  key={s.sku_id}
                  className="w-full text-left px-3 py-2 hover:bg-surface-hover/50 transition-colors flex items-center gap-2"
                  onClick={() => { setSelectedSku(s); setSearch(''); }}
                >
                  <span className="text-sm truncate flex-1">{s.display_name}</span>
                  <Badge variant="secondary" className="text-[10px] font-mono shrink-0">{s.part_number}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <Label className="text-xs">Recomendação (opcional)</Label>
        <Input
          value={advice}
          onChange={e => setAdvice(e.target.value)}
          className="bg-surface text-sm h-9 mt-1"
          placeholder="Ex: Considere manter apenas o E5 que já inclui as funcionalidades do E3."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={!selectedSku || saving}>
          {saving ? 'Salvando...' : 'Adicionar'}
        </Button>
      </div>
    </div>
  );
}

