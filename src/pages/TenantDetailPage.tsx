import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTenants, fetchTenantSubscription, fetchSubscriptionPlans, updateTenantSubscription } from '@/lib/api';
import type { Tenant } from '@/types';
import type { TenantSubscription, SubscriptionPlan } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft, Database, CreditCard, Key, Users, Brain,
  FileText, TrendingUp, Pencil, Package, Crown, RefreshCw, Loader2,
} from 'lucide-react';

import {
  EditTenantModal, IngestModal, UsersModal,
  KnowledgeModal, PromptModal, SubscriptionsModal,
} from '@/pages/AdminPage';

const ACTIONS = [
  { id: 'opportunities', label: 'Oportunidades',    desc: 'Recomendações de otimização e saving',       icon: TrendingUp,  color: 'text-amber-400   bg-amber-500/10   border-amber-500/30' },
  { id: 'ingest',        label: 'Ingestão M365',    desc: 'Sincronizar dados do Microsoft Graph',       icon: Database,     color: 'text-cyan-400    bg-cyan-500/10    border-cyan-500/30' },
  { id: 'subscriptions', label: 'Subscrições',      desc: 'Assinaturas ativas no tenant',               icon: CreditCard,   color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'skus',          label: 'SKUs Atribuídas',   desc: 'Licenças atribuídas por usuário',            icon: Key,          color: 'text-violet-400  bg-violet-500/10  border-violet-500/30' },
  { id: 'users',         label: 'Usuários',         desc: 'Gestão de acessos do tenant',                icon: Users,        color: 'text-blue-400    bg-blue-500/10    border-blue-500/30' },
  { id: 'kb',            label: 'Knowledge Base',   desc: 'Arquivos de contexto para o agente IA',      icon: Brain,        color: 'text-purple-400  bg-purple-500/10  border-purple-500/30' },
  { id: 'prompt',        label: 'Prompt do Agente', desc: 'Instrução específica deste tenant para a IA', icon: FileText,     color: 'text-pink-400    bg-pink-500/10    border-pink-500/30' },
  { id: 'edit',          label: 'Editar Tenant',    desc: 'Alterar código, status e configurações',      icon: Pencil,       color: 'text-gray-400    bg-gray-500/10    border-gray-500/30' },
] as const;

type ModalKey = 'ingest' | 'subscriptions' | 'users' | 'kb' | 'prompt' | 'edit' | 'changePlan' | null;

export default function TenantDetailPage() {
  const { tenantId, tenantCode } = useParams<{ tenantId: string; tenantCode: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const [activeModal, setActiveModal] = useState<ModalKey>(null);

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: fetchTenants,
    staleTime: 60_000,
  });

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['tenant-subscription', tenantId],
    queryFn: () => fetchTenantSubscription(tenantId!),
    enabled: !!tenantId,
    staleTime: 30_000,
  });

  const tenant = tenants.find(t => t.tenant_id === tenantId) ?? null;

  const handleAction = (id: string) => {
    if (!tenant) return;
    switch (id) {
      case 'opportunities': navigate(`/opportunities?tenant=${tenantId}`); break;
      case 'skus':          navigate(`/admin/skus/${tenantId}/${tenantCode}`); break;
      default:              setActiveModal(id as ModalKey);
    }
  };

  const planBadgeClass = subscription?.PlanCode === 'pro'
    ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
    : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';

  return (
    <div className="p-6 admin-bg relative admin-grid min-h-full">
      <div className="relative z-10 max-w-5xl mx-auto space-y-6">

        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}
          className="gap-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        {/* Header */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground truncate">{tenantCode}</h1>
              <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{tenantId}</p>
            </div>
            {tenant && (
              <div className="flex gap-2">
                <Badge variant="outline" className={tenant.is_enabled ? 'bg-success/20 text-success border-success/30' : ''}>
                  {tenant.is_enabled ? '● Ativo' : '○ Inativo'}
                </Badge>
                <Badge variant="outline" className={tenant.sync_enabled ? 'bg-primary/20 text-primary border-primary/30' : ''}>
                  Sync {tenant.sync_enabled ? 'Ativo' : 'Off'}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Subscription Card */}
        <div className="glass rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              <h2 className="font-semibold text-foreground">Assinatura</h2>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5"
              onClick={() => setActiveModal('changePlan')}>
              <RefreshCw className="h-3.5 w-3.5" /> Alterar Plano
            </Button>
          </div>
          {subLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : subscription ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Plano</p>
                <Badge variant="outline" className={planBadgeClass}>
                  {subscription.PlanCode === 'pro' ? '⭐ Professional' : '🆓 Trial'}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Modelo</p>
                <p className="text-sm font-mono text-foreground">{subscription.DefaultChatModel}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tools</p>
                <p className="text-sm text-foreground">{subscription.AllowedTools?.length ?? 0} ativos</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge variant="outline" className={
                  subscription.Status === 'active'
                    ? 'bg-success/20 text-success border-success/30'
                    : 'bg-destructive/20 text-destructive border-destructive/30'
                }>
                  {subscription.Status === 'active' ? '● Ativo' : subscription.Status}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem assinatura ativa. Fallback: Trial.</p>
          )}
        </div>

        {/* Action grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACTIONS.map(a => {
            const Icon = a.icon;
            return (
              <button key={a.id} onClick={() => handleAction(a.id)}
                className="glass rounded-xl p-5 text-left group hover:ring-1 hover:ring-primary/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg border ${a.color}`}><Icon className="h-5 w-5" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{a.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {tenant && (
        <>
          {activeModal === 'edit' && (
            <EditTenantModal tenant={tenant} onClose={() => setActiveModal(null)}
              onSaved={() => { setActiveModal(null); queryClient.invalidateQueries({ queryKey: ['tenants'] }); }} />
          )}
          {activeModal === 'ingest' && <IngestModal tenant={tenant} onClose={() => setActiveModal(null)} />}
          {activeModal === 'users' && <UsersModal tenant={tenant} onClose={() => setActiveModal(null)} />}
          {activeModal === 'kb' && <KnowledgeModal tenant={tenant} onClose={() => setActiveModal(null)} />}
          {activeModal === 'prompt' && <PromptModal tenant={tenant} user={user} onClose={() => setActiveModal(null)} />}
          {activeModal === 'subscriptions' && <SubscriptionsModal tenant={tenant} onClose={() => setActiveModal(null)} />}
        </>
      )}
      {activeModal === 'changePlan' && tenantId && (
        <ChangePlanModal
          tenantId={tenantId}
          currentPlan={subscription?.PlanCode ?? null}
          onClose={() => setActiveModal(null)}
          onChanged={() => {
            setActiveModal(null);
            queryClient.invalidateQueries({ queryKey: ['tenant-subscription', tenantId] });
            toast.success('Plano alterado com sucesso!');
          }}
        />
      )}
    </div>
  );
}


// ─── ChangePlanModal ─────────────────────────────────────────────────────────

function ChangePlanModal({ tenantId, currentPlan, onClose, onChanged }: {
  tenantId: string;
  currentPlan: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [selected, setSelected] = useState(currentPlan ?? 'trial');
  const [loading, setLoading] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: fetchSubscriptionPlans,
    staleTime: 60_000,
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await updateTenantSubscription({
        tenantId,
        planCode: selected,
        action: 'upsert',
        updatedBy: 'admin-ui',
      });
      onChanged();
    } catch {
      toast.error('Erro ao alterar plano.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" /> Alterar Plano
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {plans.map((p: SubscriptionPlan) => (
            <button key={p.PlanCode} type="button"
              onClick={() => setSelected(p.PlanCode)}
              className={`w-full rounded-xl border p-4 text-left transition-all ${
                selected === p.PlanCode
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                  : 'border-border hover:border-primary/40 hover:bg-surface-hover'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-foreground">
                  {p.PlanCode === 'pro' ? '⭐' : '🆓'} {p.DisplayName}
                </span>
                {p.PlanCode === currentPlan && (
                  <Badge variant="outline" className="text-xs bg-primary/20 text-primary border-primary/30">
                    Atual
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{p.Description}</p>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>Modelo: {p.DefaultChatModel}</span>
                <span>Tools: {p.AllowedTools?.length ?? 0}</span>
                <span>Users: {p.MaxUsersPerTenant === 0 ? '∞' : p.MaxUsersPerTenant}</span>
              </div>
            </button>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || selected === currentPlan} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
