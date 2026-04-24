import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchTenants, createTenant, updateTenant, deleteTenant,
  fetchTenantUsers, createUser, deleteUser, ingestEndpoint,
  fetchTenantSubscriptions,
  fetchDashboardStats, fetchKnowledgeFiles, syncKnowledgeFiles,
  deleteKnowledgeFile, uploadKnowledgeFile, fetchPromptDraft,
  saveDraftPrompt, publishAgentVersion, provisionTenant,
  searchM365Users,
} from '@/lib/api';
import type { Tenant, TenantUser, IngestEndpoint, SastriaUser, M365UserSuggestion } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Pencil, Database, Key, Users, Trash2, Search,
  Brain, FileText, RefreshCw, Upload, Loader2, CheckCircle, Save,
  Copy, Clock, Monitor, ChevronRight, CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { RichTextEditor } from '@/components/RichTextEditor';

// ─── Types ───────────────────────────────────────────────────────────────────

interface KnowledgeFile {
  FileId: string;
  FileName: string;
  OpenAIFileId: string;
  VectorStoreId: string;
  IndexStatus: string;
  CreatedAt: string;
}




const INGEST_ENDPOINTS: { name: string; path: string; timeout_ms: number }[] = [
  { name: 'users', path: '/api/ingest/users', timeout_ms: 60000 },
  { name: 'organization', path: '/api/ingest/organization', timeout_ms: 60000 },
  { name: 'directorysubscriptions', path: '/api/ingest/directorysubscriptions', timeout_ms: 60000 },
  { name: 'subscribedskus', path: '/api/ingest/subscribedskus', timeout_ms: 60000 },
  { name: 'm365appuserdetail', path: '/api/ingest/m365appuserdetail', timeout_ms: 60000 },
  { name: 'mailboxusagedetail', path: '/api/ingest/mailboxusagedetail', timeout_ms: 60000 },
  { name: 'reports/m365activeuserdetail', path: '/api/ingest/reports/m365activeuserdetail', timeout_ms: 120000 },
  { name: 'reports/oneDriveUsageAccountDetail', path: '/api/ingest/reports/oneDriveUsageAccountDetail', timeout_ms: 120000 },
  { name: 'sharepointSiteUsageDetail', path: '/api/ingest/sharepointSiteUsageDetail', timeout_ms: 120000 },
  { name: 'sharepointRecycleBin', path: '/api/ingest/sharepointRecycleBin', timeout_ms: 600000 },
  { name: 'sharepointArchiveState', path: '/api/ingest/sharepointArchiveState', timeout_ms: 120000 },
  { name: 'sharepointLibraryPolicy', path: '/api/ingest/sharepointLibraryPolicy', timeout_ms: 120000 },
  { name: 'usersassignedplans', path: '/api/ingest/usersassignedplans', timeout_ms: 300000 },
  { name: 'usersigninactivity', path: '/api/ingest/usersigninactivity', timeout_ms: 300000 },
  { name: 'intel/userObservedCapabilities', path: '/api/ingest/intel/userObservedCapabilities', timeout_ms: 120000 },
  { name: 'reports/o365ServicesUserCounts', path: '/api/ingest/reports/o365ServicesUserCounts', timeout_ms: 60000 },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const { data: tenantsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['tenants'],
    queryFn: fetchTenants,
    enabled: user?.persona === 'GlobalAdmin',
    staleTime: 60_000,
    retry: 0,
  });
  const tenants: Tenant[] = tenantsData ?? [];

  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    staleTime: 60_000,
  });
  const stats = statsData?.stats;



  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState<Tenant | 'new' | null>(null);
  const [ingestModal, setIngestModal] = useState<Tenant | null>(null);
  const [usersModal, setUsersModal] = useState<Tenant | null>(null);
  const [kbModal, setKbModal] = useState<Tenant | null>(null);
  const [promptModal, setPromptModal] = useState<Tenant | null>(null);
  const [subscriptionsModal, setSubscriptionsModal] = useState<Tenant | null>(null);



  const filtered = useMemo(() => {
    if (!search) return tenants;
    return tenants.filter(t => t.tenant_code.toLowerCase().includes(search.toLowerCase()));
  }, [tenants, search]);

  return (
    <div className="p-6 admin-bg relative admin-grid min-h-full">
      <div className="relative z-10 max-w-7xl mx-auto space-y-6">

        {/* Dashboard stats */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Tenants Ativos" value={stats.activeTenants ?? 0} colorClass="text-blue-400 bg-blue-500/10 border-blue-500/30" icon={<Users className="h-4 w-4" />} />
            <StatCard label="Arquivos KB" value={stats.knowledgeBaseFiles ?? 0} colorClass="text-purple-400 bg-purple-500/10 border-purple-500/30" icon={<Brain className="h-4 w-4" />} />
            <StatCard label="Runs de Provisão" value={stats.totalRuns ?? 0} colorClass="text-emerald-400 bg-emerald-500/10 border-emerald-500/30" icon={<RefreshCw className="h-4 w-4" />} />
          </div>
        )}


        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">Tenants</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tenant..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 w-64 bg-surface border-border"
              />
            </div>
            <Button onClick={() => setEditModal('new')}>
              <Plus className="h-4 w-4 mr-1" /> Novo Tenant
            </Button>
          </div>
        </div>

        {/* Tenant cards grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground text-sm">Carregando tenants...</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <p className="text-destructive text-sm font-medium">Erro ao carregar tenants. Sessão pode ter expirado.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
              <Button size="sm" onClick={() => { localStorage.removeItem('sastria_jwt'); window.location.href = '/login'; }}>Fazer login novamente</Button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-20 text-muted-foreground">Nenhum tenant encontrado</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => (
              <button
                key={t.tenant_id}
                onClick={() => navigate(`/tenants/${t.tenant_id}/${t.tenant_code}`)}
                className="glass rounded-xl p-5 text-left group hover:ring-2 hover:ring-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-200 flex flex-col gap-3"
              >
                {/* Card header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${t.is_enabled ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-zinc-500'}`} />
                    <span className="font-semibold text-foreground truncate">{t.tenant_code}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>

                {/* Badges */}
                <div className="flex gap-1.5 flex-wrap">
                  <Badge variant={t.is_enabled ? 'default' : 'secondary'} className={`text-[10px] px-1.5 py-0 ${t.is_enabled ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25'}`}>
                    {t.is_enabled ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {t.sync_enable && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-blue-500/15 text-blue-400 border-blue-500/25">
                      Sync
                    </Badge>
                  )}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Users className="h-3 w-3 text-blue-400 shrink-0" />
                    <span className="text-muted-foreground">Ativos</span>
                    <span className="ml-auto font-semibold text-foreground">{t.active_users ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Key className="h-3 w-3 text-cyan-400 shrink-0" />
                    <span className="text-muted-foreground">Acessos</span>
                    <span className="ml-auto font-semibold text-foreground">{t.user_count ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Monitor className="h-3 w-3 text-amber-400 shrink-0" />
                    <span className="text-muted-foreground">Abertas</span>
                    <span className={`ml-auto font-semibold ${(t.open_recs ?? 0) > 0 ? 'text-amber-400' : 'text-foreground'}`}>{t.open_recs ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                    <span className="text-muted-foreground">Fechadas</span>
                    <span className="ml-auto font-semibold text-foreground">{t.closed_recs ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Brain className="h-3 w-3 text-purple-400 shrink-0" />
                    <span className="text-muted-foreground">KB</span>
                    <span className="ml-auto font-semibold text-foreground">{t.kb_files ?? 0}</span>
                  </div>
                </div>

                {/* Saving potencial */}
                {(t.potential_savings ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 pt-1 border-t border-border/50 mt-1">
                    <CreditCard className="h-3 w-3 text-emerald-400 shrink-0" />
                    <span className="text-xs text-muted-foreground">Saving anual</span>
                    <span className="ml-auto text-xs font-semibold text-emerald-400">
                      R$ {(t.potential_savings ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Modals */}
        <EditTenantModal tenant={editModal} onClose={() => setEditModal(null)} onSaved={() => { setEditModal(null); queryClient.invalidateQueries({ queryKey: ['tenants'] }); }} />
        {ingestModal && <IngestModal tenant={ingestModal} onClose={() => setIngestModal(null)} />}
        {usersModal && <UsersModal tenant={usersModal} onClose={() => setUsersModal(null)} />}
        {kbModal && <KnowledgeModal tenant={kbModal} onClose={() => { setKbModal(null); queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }); }} />}
        {promptModal && <PromptModal tenant={promptModal} user={user} onClose={() => setPromptModal(null)} />}
        {subscriptionsModal && <SubscriptionsModal tenant={subscriptionsModal} onClose={() => setSubscriptionsModal(null)} />}
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function StatCard({ label, value, colorClass, icon }: { label: string; value: number; colorClass: string; icon: React.ReactNode }) {
  return (
    <div className="glass rounded-xl px-5 py-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-lg border ${colorClass}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value.toLocaleString('pt-BR')}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ActionBtn({ title, onClick, children, className = '' }: { title: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

// ─── EditTenantModal ──────────────────────────────────────────────────────────

export function EditTenantModal({ tenant, onClose, onSaved }: { tenant: Tenant | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const isNew = tenant === 'new';
  const [form, setForm] = useState({ tenant_code: '', is_enabled: true, sync_enable: false, graph_client_id: '', graph_secret: '' });
  const [loading, setLoading] = useState(false);
  const [provisioning, setProvisioning] = useState(false);

  useEffect(() => {
    if (tenant && tenant !== 'new') {
      setForm({ tenant_code: tenant.tenant_code, is_enabled: tenant.is_enabled, sync_enable: tenant.sync_enabled, graph_client_id: tenant.graph_client_id || '', graph_secret: '' });
    } else {
      setForm({ tenant_code: '', is_enabled: true, sync_enable: false, graph_client_id: '', graph_secret: '' });
    }
  }, [tenant]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (isNew) {
        // Envia sync_enable (nome correto no backend, sem 'd')
        const result = await createTenant({
          tenant_code: form.tenant_code,
          is_enabled: form.is_enabled,
          sync_enable: form.sync_enable,
          graph_client_id: form.graph_client_id || undefined,
          graph_secret: form.graph_secret || undefined,
        });
        // Auto-provisionar no motor de IA usando o tenant_id retornado
        const newTenantId = result?.item?.tenant_id;
        if (newTenantId) {
          setProvisioning(true);
          try {
            await provisionTenant(newTenantId);
          } catch (provErr) {
            console.warn('ProvisionTenant partial failure (nao critico):', provErr);
          } finally {
            setProvisioning(false);
          }
        }
        toast.success('Tenant criado e provisionado no motor de IA!');
      } else if (tenant && typeof tenant !== 'string') {
        await updateTenant({
          tenant_id: tenant.tenant_id,
          tenant_code: form.tenant_code,
          is_enabled: form.is_enabled,
          sync_enable: form.sync_enable,
          graph_client_id: form.graph_client_id || undefined,
          graph_secret: form.graph_secret || undefined,
        });
        toast.success('Tenant atualizado!');
      }
      onSaved();
    } catch { toast.error('Erro ao salvar tenant'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={!!tenant} onOpenChange={() => onClose()}>
      <DialogContent className="glass border-border max-w-md">
        <DialogHeader><DialogTitle>{isNew ? 'Novo Tenant' : 'Editar Tenant'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Tenant Code *</Label><Input value={form.tenant_code} onChange={e => setForm(f => ({ ...f, tenant_code: e.target.value }))} className="bg-surface" /></div>
          <div><Label>Graph Client ID</Label><Input value={form.graph_client_id} onChange={e => setForm(f => ({ ...f, graph_client_id: e.target.value }))} className="bg-surface" /></div>
          <div><Label>Graph Secret</Label><Input type="password" value={form.graph_secret} onChange={e => setForm(f => ({ ...f, graph_secret: e.target.value }))} className="bg-surface" placeholder="Deixe vazio para manter" /></div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.is_enabled} onCheckedChange={(v) => setForm(f => ({ ...f, is_enabled: !!v }))} />Sistema Ativo</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.sync_enable} onCheckedChange={(v) => setForm(f => ({ ...f, sync_enable: !!v }))} />Sync Ingestão</label>
          </div>
          {provisioning && <p className="text-xs text-primary animate-pulse">⚙️ Provisionando motor de IA...</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || provisioning || !form.tenant_code}>
            {loading || provisioning ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── SubscriptionsModal ───────────────────────────────────────────────────────
export function SubscriptionsModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const [subs, setSubs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchTenantSubscriptions(tenant.tenant_id)
      .then(data => { setSubs(data as Record<string, unknown>[]); })
      .catch(err => setError(String(err?.message || err)))
      .finally(() => setLoading(false));
  }, [tenant.tenant_id]);

  const filtered = useMemo(() => {
    if (!search) return subs;
    const q = search.toLowerCase();
    return subs.filter(s =>
      String(s.sku_display_name || '').toLowerCase().includes(q) ||
      String(s.sku_part_number || '').toLowerCase().includes(q) ||
      String(s.status || '').toLowerCase().includes(q)
    );
  }, [subs, search]);

  const statusBadge = (status: string) => {
    const s = String(status).toLowerCase();
    if (s === 'enabled') return <Badge className="bg-success/20 text-success border-success/30">Ativo</Badge>;
    if (s === 'suspended') return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Suspenso</Badge>;
    if (s === 'warning') return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Alerta</Badge>;
    if (s === 'lockedout') return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Bloqueado</Badge>;
    if (s === 'deleted') return <Badge variant="secondary">Deletado</Badge>;
    return <Badge variant="secondary">{status || '—'}</Badge>;
  };

  const fmtDate = (v: unknown) => {
    if (!v) return '—';
    try {
      const d = new Date(String(v));
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return '—'; }
  };

  // Summary stats
  const totalLicenses = subs.reduce((acc, s) => acc + (Number(s.total_licenses) || 0), 0);
  const activeSubs = subs.filter(s => String(s.status).toLowerCase() === 'enabled').length;
  const trialSubs = subs.filter(s => s.is_trial).length;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-400" />
            Subscrições: {tenant.tenant_code}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando subscrições...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p className="font-medium">Erro ao carregar subscrições</p>
            <p className="text-sm mt-1 text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* Stats summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{subs.length}</p>
                <p className="text-xs text-muted-foreground">Subscrições</p>
              </div>
              <div className="glass rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{totalLicenses.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">Licenças Totais</p>
              </div>
              <div className="glass rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{activeSubs}</p>
                <p className="text-xs text-muted-foreground">Ativas{trialSubs > 0 ? ` (${trialSubs} trial)` : ''}</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por SKU ou status..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-surface border-border"
              />
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1 rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>SKU</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Licenças</TableHead>
                    <TableHead>Trial</TableHead>
                    <TableHead>Criação</TableHead>
                    <TableHead>Próx. Renovação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {subs.length === 0 ? 'Nenhuma subscrição encontrada. Execute a ingestão primeiro.' : 'Nenhum resultado para o filtro.'}
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((s, i) => (
                    <TableRow key={String(s.commerce_subscription_id || i)} className="border-border hover:bg-surface-hover/50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{String(s.sku_display_name || s.sku_part_number || '—')}</p>
                          {s.sku_display_name && s.sku_part_number && String(s.sku_display_name) !== String(s.sku_part_number) && (
                            <p className="text-xs text-muted-foreground">{String(s.sku_part_number)}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(String(s.status || ''))}</TableCell>
                      <TableCell className="text-right font-mono">{s.total_licenses != null ? Number(s.total_licenses).toLocaleString('pt-BR') : '—'}</TableCell>
                      <TableCell>{s.is_trial ? <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Trial</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(s.created_datetime_utc)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(s.next_lifecycle_datetime_utc)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {subs.length > 0 && (
              <p className="text-xs text-muted-foreground text-right">
                Última sincronização: {fmtDate(subs[0]?.sync_time_utc)}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── extractIngestSummary ─────────────────────────────────────────────────────
/** Cada endpoint do ingestor retorna um campo diferente com a contagem.
 *  Esta função examina os campos conhecidos e retorna uma string legível. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractIngestSummary(res: any): { ok: boolean; text: string } {
  if (!res) return { ok: true, text: 'OK' };

  // Gateway timeout: Azure cortou a conexão browser↔proxy, mas o ingestor continua
  if (res?.modo === 'gateway-timeout' || res?.modo === 'fire-and-forget') {
    return { ok: true, text: '⏳ Rodando no Azure' };
  }

  // O ingestor retorna os dados dentro de per_tenant[]
  const pt = Array.isArray(res?.per_tenant) ? res.per_tenant[0] : res;

  // Erros explícitos
  if (pt?.error) return { ok: false, text: String(pt.error).slice(0, 120) };

  type Entry = [string, string];
  const knownFields: Entry[] = [
    ['users_upserted',               'usuários'],
    ['users_processed',              'usuários'],
    ['users_with_plans_or_licenses', 'usuários'],
    ['skus_upserted',                'SKUs'],
    ['skus_synced',                  'SKUs'],
    ['organization_upserted',        'org'],
    ['licenses_upserted',            'licenças'],
    ['plans_upserted',               'planos'],
    ['rows_upserted',                'registros'],
    ['records_upserted',             'registros'],
    ['upserted',                     'registros'],
    ['total',                        'registros'],
    ['count',                        'registros'],
  ];
  for (const [field, label] of knownFields) {
    const val = pt?.[field];
    if (typeof val === 'number') {
      const warn = pt?.sku_warning ? ` ⚠️ SKU: ${String(pt.sku_warning).slice(0, 60)}` : '';
      return { ok: true, text: `${val} ${label}${warn}` };
    }
  }
  return { ok: true, text: 'OK' };
}

// ─── IngestModal ──────────────────────────────────────────────────────────────

export function IngestModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const [endpoints, setEndpoints] = useState<IngestEndpoint[]>(INGEST_ENDPOINTS.map(e => ({ ...e, status: 'pending' as const })));
  const [runningAll, setRunningAll] = useState(false);
  const [runningSet, setRunningSet] = useState<Set<number>>(new Set());

  const completed = endpoints.filter(e => e.status === 'ok' || e.status === 'error').length;
  const progress = (completed / endpoints.length) * 100;

  // Run a single endpoint by index (independent — doesn't block others)
  const runOne = async (idx: number) => {
    setRunningSet(prev => new Set(prev).add(idx));
    setEndpoints(prev => prev.map((e, i) => i === idx ? { ...e, status: 'running', summary: undefined } : e));
    try {
      const res = await ingestEndpoint(endpoints[idx].path, tenant.tenant_id, endpoints[idx].timeout_ms);
      const { ok, text } = extractIngestSummary(res);
      setEndpoints(prev => prev.map((e, i) => i === idx ? { ...e, status: ok ? 'ok' : 'error', summary: text } : e));
    } catch (err) {
      let errMsg = 'Erro HTTP';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          errMsg = String(parsed?.error || parsed?.erro || err.message).slice(0, 120);
        } catch {
          errMsg = err.message.slice(0, 120);
        }
      }
      setEndpoints(prev => prev.map((e, i) => i === idx ? { ...e, status: 'error', summary: errMsg } : e));
    }
    setRunningSet(prev => { const s = new Set(prev); s.delete(idx); return s; });
  };

  // Run all endpoints sequentially
  const runAll = async () => {
    setRunningAll(true);
    for (let i = 0; i < endpoints.length; i++) {
      await runOne(i);
    }
    setRunningAll(false);
    toast.success('Ingestão concluída!');
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="glass border-border max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Ingestão: {tenant.tenant_code}</DialogTitle></DialogHeader>
        <Progress value={progress} className="h-2" />
        <div className="space-y-1 mt-4">
          {endpoints.map((ep, idx) => (
            <div key={ep.name} className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-surface text-sm group">
              {/* Play / Re-run button per endpoint */}
              <button
                disabled={runningSet.has(idx)}
                onClick={() => runOne(idx)}
                title={ep.status === 'ok' || ep.status === 'error' ? 'Re-executar' : 'Executar'}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md
                  transition-all duration-150
                  disabled:opacity-30 disabled:cursor-not-allowed
                  hover:bg-primary/20 active:scale-90
                  text-muted-foreground hover:text-primary"
              >
                {ep.status === 'running' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : ep.status === 'ok' ? (
                  <CheckCircle className="h-3.5 w-3.5 text-success" />
                ) : ep.status === 'error' ? (
                  <RefreshCw className="h-3.5 w-3.5 text-destructive" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Endpoint name */}
              <span className="font-mono text-xs flex-1 truncate">{ep.name}</span>

              {/* Status badge */}
              <Badge variant="secondary" className={`text-[10px] min-w-[60px] justify-center ${
                ep.status === 'ok'      ? 'bg-success/20 text-success' :
                ep.status === 'error'   ? 'bg-destructive/20 text-destructive' :
                ep.status === 'running' ? 'bg-primary/20 text-primary animate-pulse' :
                'bg-muted/30 text-muted-foreground'
              }`}>
                {ep.status === 'ok'      ? `✓ ${ep.summary ?? 'OK'}` :
                 ep.status === 'error'   ? `✗ ${ep.summary ?? 'Erro'}` :
                 ep.status === 'running' ? '⏳ ...' : 'Pendente'}
              </Badge>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={runAll} disabled={runningAll || runningSet.size > 0}>
            {runningAll ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Processando…</>
            ) : (
              <><Database className="h-4 w-4 mr-1.5" />Iniciar Todos</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── UsersModal ───────────────────────────────────────────────────────────────

/** Autocomplete de usuários M365 do tenant */
function UserSearchInput({
  tenantId, value, onChange
}: {
  tenantId: string;
  value: string;
  onChange: (email: string, suggestion?: M365UserSuggestion) => void;
}) {
  const [q, setQ]               = useState(value);
  const [results, setResults]   = useState<M365UserSuggestion[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const debounce                = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInput = (v: string) => {
    setQ(v);
    onChange(v);
    setOpen(true);
    if (debounce.current) clearTimeout(debounce.current);
    if (v.length < 2) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await searchM365Users(tenantId, v);
        setResults(list);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  };

  const select = (u: M365UserSuggestion) => {
    setQ(u.email);
    onChange(u.email, u);
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        placeholder="Buscar por nome ou e-mail…"
        value={q}
        onChange={e => handleInput(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => q.length >= 2 && setOpen(true)}
        className="bg-surface"
        autoComplete="off"
      />
      {open && (loading || results.length > 0) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-52 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Buscando…</div>
          )}
          {!loading && results.map(u => (
            <button
              key={u.userId}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-surface transition-colors"
              onMouseDown={() => select(u)}
            >
              <div className="text-sm font-medium text-foreground">{u.displayName}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
              {(u.department || u.jobTitle) && (
                <div className="text-xs text-muted-foreground/70">
                  {[u.jobTitle, u.department].filter(Boolean).join(' · ')}
                </div>
              )}
            </button>
          ))}
          {!loading && results.length === 0 && q.length >= 2 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum usuário encontrado</div>
          )}
        </div>
      )}
    </div>
  );
}

export function UsersModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  // AuthManage opera com UUID do tenant
  const tenantUUID = (tenant as any).tenantId || (tenant as any).tenant_id || (tenant as any).TenantId || '';
  const { data, isLoading, refetch } = useQuery({ queryKey: ['tenant-users', tenantUUID], queryFn: () => fetchTenantUsers(tenantUUID) });
  const users: TenantUser[] = data ?? [];
  const [showNew, setShowNew]         = useState(false);
  const [newEmail, setNewEmail]       = useState('');
  const [newPersona, setNewPersona]   = useState('Admin');
  const [newPassword, setNewPassword] = useState('');

  const handleCreate = async () => {
    try {
      await createUser({ email: newEmail, persona: newPersona, password: newPassword, tenantId: tenantUUID });
      toast.success('Usuário criado!');
      setShowNew(false); setNewEmail(''); setNewPassword('');
      refetch();
    } catch (e) {
      toast.error('Erro ao criar usuário: ' + (e as Error).message);
    }
  };
  const handleDelete = async (userId: string) => {
    try { await deleteUser(userId); toast.success('Usuário removido!'); refetch(); }
    catch (e) { toast.error('Erro ao remover: ' + (e as Error).message); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="glass border-border max-w-md">
        <DialogHeader><DialogTitle>Acessos: {tenant.tenant_code}</DialogTitle></DialogHeader>
        <div className="space-y-2">
        {isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> :
            users.length === 0
              ? <p className="text-muted-foreground text-sm">Nenhum acesso cadastrado.</p>
              : users.map(u => (
              <div key={u.userId ?? u.email} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface text-sm">
                <div>
                  <span className="text-foreground">{u.email}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">{u.persona}</Badge>
                  {u.createdAt && <span className="ml-2 text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</span>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(u.userId ?? u.email)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))
          }
        </div>
        {showNew ? (
          <div className="space-y-3 border-t border-border pt-3">
            <UserSearchInput
              tenantId={tenantUUID}
              value={newEmail}
              onChange={(email) => setNewEmail(email)}
            />
            <Input placeholder="Senha" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-surface" />
            <select value={newPersona} onChange={e => setNewPersona(e.target.value)} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground">
              <option value="Admin">Admin</option><option value="CIO">CIO</option><option value="Governança">Governança</option><option value="Finanças">Finanças</option><option value="Compras">Compras</option>
            </select>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowNew(false); setNewEmail(''); setNewPassword(''); }}>Cancelar</Button>
              <Button size="sm" onClick={handleCreate} disabled={!newEmail || !newPassword}>Criar</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowNew(true)} className="w-full"><Plus className="h-4 w-4 mr-1" /> Novo Acesso</Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── KnowledgeModal ───────────────────────────────────────────────────────────

export function KnowledgeModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const tenantId = tenant.azure_tenant_id || tenant.tenant_id;
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    try {
      const r = await fetchKnowledgeFiles(tenantId);
      setFiles(Array.isArray(r.files) ? r.files : []);
    } catch { toast.error('Erro ao carregar arquivos KB'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadFiles(); }, []); // eslint-disable-line

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await syncKnowledgeFiles(tenantId);
      if (Array.isArray(r.files)) setFiles(r.files);
      toast.success(`Sincronizado: ${r.synced ?? 0} arquivo(s) atualizados`);
    } catch { toast.error('Erro ao sincronizar'); }
    finally { setSyncing(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadKnowledgeFile(tenantId, file);
      toast.success('Enviado! Clique em Sincronizar para confirmar a indexação.');
      await loadFiles();
    } catch (err) { toast.error('Erro no upload: ' + (err as Error).message); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!window.confirm(`Remover "${fileName}" do Vector Store?`)) return;
    try {
      await deleteKnowledgeFile(fileId);
      toast.success('Arquivo removido');
      setFiles(prev => prev.filter(f => f.FileId !== fileId));
    } catch { toast.error('Erro ao remover arquivo'); }
  };

  const statusBadge = (status: string) => {
    const cfg: Record<string, { cls: string; label: string }> = {
      completed: { cls: 'bg-success/20 text-success', label: '✓ Indexado' },
      indexing: { cls: 'bg-primary/20 text-primary animate-pulse', label: '⏳ Indexando' },
      in_progress: { cls: 'bg-primary/20 text-primary animate-pulse', label: '⏳ Em progresso' },
      failed: { cls: 'bg-destructive/20 text-destructive', label: '✗ Falha' },
    };
    const c = cfg[status] ?? { cls: 'bg-muted/20 text-muted-foreground', label: status };
    return <Badge variant="secondary" className={c.cls}>{c.label}</Badge>;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="glass border-border max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            Knowledge Base — {tenant.tenant_code}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Actions bar */}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing || loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Status'}
            </Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
              {uploading ? 'Enviando...' : 'Upload Documento'}
            </Button>
            <input ref={fileInputRef} type="file" accept=".txt,.pdf,.md,.docx,.csv" className="hidden" onChange={handleUpload} />
          </div>

          {/* File list */}
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground space-y-2">
              <Brain className="h-10 w-10 mx-auto opacity-20" />
              <p className="text-sm font-medium">Nenhum documento na Knowledge Base</p>
              <p className="text-xs">Faça upload de arquivos para habilitar respostas contextuais (RAG)</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map(f => (
                <div key={f.FileId} className="flex items-center justify-between p-3 rounded-lg bg-surface gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{f.FileName}</p>
                    <p className="text-xs text-muted-foreground">{f.CreatedAt?.replace('T', ' ').slice(0, 16) ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(f.IndexStatus)}
                    <button
                      title="Remover"
                      className="p-1.5 rounded text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={() => handleDelete(f.FileId, f.FileName)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {files.some(f => f.IndexStatus === 'indexing' || f.IndexStatus === 'in_progress') && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  💡 Clique em "Sincronizar Status" para atualizar o status de indexação dos arquivos pendentes
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── PromptModal ──────────────────────────────────────────────────────────────

export function PromptModal({ tenant, user, onClose }: { tenant: Tenant; user: SastriaUser | null; onClose: () => void }) {
  const tenantId = tenant.azure_tenant_id || tenant.tenant_id;
  const [draft, setDraft] = useState('');
  const [published, setPublished] = useState('');
  const [agentStatus, setAgentStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [tab, setTab] = useState<'draft' | 'published'>('draft');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetchPromptDraft(tenantId);
        if (r.ok) {
          setDraft(r.draft || '');
          setPublished(r.published || '');
          setAgentStatus(r.status || '');
        } else {
          setNotFound(true);
        }
      } catch { setNotFound(true); }
      finally { setLoading(false); }
    })();
  }, [tenantId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDraftPrompt(tenantId, draft, true); // true = isHtml
      toast.success('Rascunho salvo com sucesso!');
    } catch { toast.error('Erro ao salvar rascunho'); }
    finally { setSaving(false); }
  };

  const handlePublish = async () => {
    if (!window.confirm(`Publicar prompt para ${tenant.tenant_code}?\nIsso substituirá o prompt ativo e afetará todas as conversas.`)) return;
    setPublishing(true);
    try {
      await saveDraftPrompt(tenantId, draft);
      await publishAgentVersion(tenantId, user?.email || 'admin');
      setPublished(draft);
      toast.success('Versão publicada! O agente já está usando o novo prompt.');
    } catch { toast.error('Erro ao publicar versão'); }
    finally { setPublishing(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="glass border-border max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            Prompt do Agente — {tenant.tenant_code}
            {agentStatus && <Badge variant="secondary" className="ml-2 text-xs">{agentStatus}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : notFound ? (
          <div className="text-center py-10 text-muted-foreground space-y-3">
            <FileText className="h-10 w-10 mx-auto opacity-20" />
            <p className="text-sm font-medium">Tenant não encontrado no sistema de agentes</p>
            <p className="text-xs">Execute <span className="font-mono bg-surface px-1 rounded">ProvisionTenant</span> antes de configurar o prompt</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Tab selector */}
            <div className="flex gap-1 p-1 bg-surface rounded-lg w-fit">
              {(['draft', 'published'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 text-sm rounded-md transition-all ${tab === t ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {t === 'draft' ? 'Rascunho' : 'Publicado'}
                </button>
              ))}
            </div>

            {tab === 'draft' ? (
              <>
                <RichTextEditor
                  value={draft}
                  onChange={setDraft}
                  placeholder={`Defina aqui o comportamento, tom e escopo do agente para ${tenant.tenant_code}.\n\nEste texto é prefixado pelo Prompt Global do agente.`}
                  minHeight="280px"
                />
                <p className="text-xs text-muted-foreground">
                  {draft.replace(/<[^>]+>/g, '').length} chars (plain text) · Prefixado pelo Prompt Global · Afeta todos os usuários do tenant
                </p>
              </>
            ) : (
              <div className="bg-surface rounded-lg overflow-hidden min-h-[280px]">
                {published ? (
                  <RichTextEditor
                    value={published}
                    onChange={() => {}}
                    readOnly
                    minHeight="280px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full py-10 text-muted-foreground">
                    <p className="text-sm">Nenhuma versão publicada ainda</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {!loading && !notFound && tab === 'draft' && (
            <>
              <Button variant="outline" onClick={handleSave} disabled={saving || !draft.trim()}>
                {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                {saving ? 'Salvando...' : 'Salvar Rascunho'}
              </Button>
              <Button onClick={handlePublish} disabled={publishing || !draft.trim()}>
                {publishing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                {publishing ? 'Publicando...' : 'Publicar Versão'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── CreateVoucherModal ────────────────────────────────────────────────────────

function CreateVoucherModal({ onClose, onCreated }: { onClose: () => void; onCreated: (code: string) => void }) {
  const [form, setForm] = useState({ description: '', maxUses: 1, expiresAt: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.description.trim()) { toast.error('Descricao e obrigatoria.'); return; }
    setLoading(true);
    try {
      const res = await createVoucher({
        description: form.description.trim(),
        maxUses: Math.max(1, Number(form.maxUses)),
        expiresAt: form.expiresAt || null,
        notes: form.notes || null,
      }) as any;
      if (res?.code) { onCreated(res.code); onClose(); }
      else { toast.error(res?.erro || 'Erro ao criar voucher.'); }
    } catch { toast.error('Erro ao criar voucher.'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" /> Gerar Novo Voucher
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="v-desc">Descricao <span className="text-destructive">*</span></Label>
            <Input id="v-desc" placeholder="Ex: Cliente AESC - Piloto Q2 2026"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <p className="text-xs text-muted-foreground">Identifica para quem o voucher foi gerado.</p>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="v-uses">Usos maximos</Label>
              <Input id="v-uses" type="number" min={1} max={100} value={form.maxUses}
                onChange={e => setForm(f => ({ ...f, maxUses: Number(e.target.value) }))} />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="v-exp">Validade (opcional)</Label>
              <Input id="v-exp" type="date" value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-notes">Notas internas</Label>
            <Input id="v-notes" placeholder="Anotacoes opcionais" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
            Gerar Voucher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── AttemptDetailModal ────────────────────────────────────────────────────────

function AttemptDetailModal({ attempt, onClose }: { attempt: Record<string, unknown>; onClose: () => void }) {
  const rows: { label: string; value: unknown; mono?: boolean }[] = [
    { label: 'Codigo',           value: attempt.Code, mono: true },
    { label: 'Status',           value: attempt.Status === 'completed' ? 'Completo' : 'Incompleto' },
    { label: 'Step alcancado',   value: `${attempt.StepReached ?? 0} / 8` },
    { label: 'Tenant Name',      value: attempt.TenantName },
    { label: 'Tenant ID',        value: attempt.TenantId, mono: true },
    { label: 'Client ID',        value: attempt.ClientId, mono: true },
    { label: 'Admin e-mail',     value: attempt.AdminEmail },
    { label: 'SharePoint',       value: attempt.IncludeSharePoint ? 'Incluido' : 'Nao' },
    { label: 'Tenant Code',      value: attempt.TenantCode, mono: true },
    { label: 'Protocolo',        value: attempt.Protocol, mono: true },
    { label: 'IP',               value: attempt.IpAddress, mono: true },
    { label: 'Iniciado em',      value: attempt.StartedAt ? new Date(attempt.StartedAt as string).toLocaleString('pt-BR') : null },
    { label: 'Ultima atividade', value: attempt.LastActivityAt ? new Date(attempt.LastActivityAt as string).toLocaleString('pt-BR') : null },
    { label: 'Concluido em',     value: attempt.CompletedAt ? new Date(attempt.CompletedAt as string).toLocaleString('pt-BR') : null },
  ].filter(r => r.value !== null && r.value !== undefined && r.value !== '');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Detalhe da Tentativa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-0.5 py-1">
          {rows.map(r => (
            <div key={r.label} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
              <span className="text-xs text-muted-foreground w-36 shrink-0 pt-0.5">{r.label}</span>
              {r.mono
                ? <code className="text-xs font-mono text-foreground break-all">{String(r.value)}</code>
                : <span className="text-sm text-foreground">{String(r.value)}</span>}
            </div>
          ))}
          {attempt.UserAgent && (
            <div className="py-2 border-b border-border/50">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Monitor className="h-3 w-3" /> User Agent
              </p>
              <p className="text-xs font-mono text-muted-foreground break-all">{String(attempt.UserAgent)}</p>
            </div>
          )}
          {attempt.FormDataJson && (
            <div className="py-2">
              <p className="text-xs text-muted-foreground mb-1">Form Data (snapshot)</p>
              <pre className="text-xs bg-surface rounded-lg p-3 overflow-auto max-h-40 text-foreground">
                {(() => { try { return JSON.stringify(JSON.parse(attempt.FormDataJson as string), null, 2); } catch { return String(attempt.FormDataJson); } })()}
              </pre>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="w-full">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
