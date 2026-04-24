import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTenants } from '@/lib/api';
import type { Tenant } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  ArrowLeft, Database, CreditCard, Key, Users, Brain,
  FileText, TrendingUp, Pencil, Package,
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

type ModalKey = 'ingest' | 'subscriptions' | 'users' | 'kb' | 'prompt' | 'edit' | null;

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

  const tenant = tenants.find(t => t.tenant_id === tenantId) ?? null;

  const handleAction = (id: string) => {
    if (!tenant) return;
    switch (id) {
      case 'opportunities': navigate(`/opportunities?tenant=${tenantId}`); break;
      case 'skus':          navigate(`/admin/skus/${tenantId}/${tenantCode}`); break;
      default:              setActiveModal(id as ModalKey);
    }
  };

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
    </div>
  );
}
