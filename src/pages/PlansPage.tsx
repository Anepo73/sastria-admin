import { useQuery } from '@tanstack/react-query';
import { fetchSubscriptionPlans } from '@/lib/api';
import type { SubscriptionPlan } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Crown, Cpu, Wrench, Users, Database, MessageSquare, FileText, Loader2 } from 'lucide-react';

const TOOL_LABELS: Record<string, string> = {
  get_subscribed_skus: 'Licenças contratadas',
  get_opportunities_summary: 'Resumo de oportunidades',
  get_opportunities_list: 'Lista de oportunidades',
  get_opportunities_teaser: 'Teaser de oportunidades',
  get_office_desktop_usage: 'Uso do Office Desktop',
  get_user_assigned_skus: 'SKUs por usuário',
  get_assigned_licenses: 'Licenças atribuídas',
  get_users: 'Usuários do tenant',
  get_license_prices: 'Preços de licenças',
  get_sku_catalog: 'Catálogo de SKUs',
  update_opportunity_status: 'Atualizar oportunidade',
  get_audit_trail: 'Audit trail',
  send_email_report: 'Envio de e-mail',
  get_services_user_counts: 'Contagem por serviço',
};

export default function PlansPage() {
  const { data: plans = [], isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['subscription-plans'],
    queryFn: fetchSubscriptionPlans,
    staleTime: 60_000,
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Crown className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Catálogo de Planos</h1>
          <p className="text-sm text-muted-foreground">Planos de assinatura disponíveis e suas configurações</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <PlanCard key={plan.PlanCode} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan }: { plan: SubscriptionPlan }) {
  const isPro = plan.PlanCode === 'pro';

  return (
    <div className={`glass rounded-xl border overflow-hidden ${
      isPro ? 'border-violet-500/30 ring-1 ring-violet-500/20' : 'border-border'
    }`}>
      {/* Plan header */}
      <div className={`px-6 py-5 ${isPro ? 'bg-violet-500/5' : 'bg-surface'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{isPro ? '⭐' : '🆓'}</span>
            <div>
              <h2 className="text-lg font-bold text-foreground">{plan.DisplayName}</h2>
              <p className="text-sm text-muted-foreground">{plan.Description}</p>
            </div>
          </div>
          <Badge variant="outline" className={isPro
            ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
            : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
          }>
            {plan.PlanCode}
          </Badge>
        </div>
      </div>

      {/* Limits */}
      <div className="px-6 py-4 border-t border-border/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Limites</h3>
        <div className="grid grid-cols-2 gap-3">
          <LimitItem icon={Users} label="Usuários" value={plan.MaxUsersPerTenant === 0 ? 'Ilimitado' : String(plan.MaxUsersPerTenant)} />
          <LimitItem icon={MessageSquare} label="Msgs/dia" value={plan.MaxChatMsgsPerDay === 0 ? 'Ilimitado' : String(plan.MaxChatMsgsPerDay)} />
          <LimitItem icon={Database} label="KB Arquivos" value={plan.MaxKbFiles === 0 ? 'Ilimitado' : String(plan.MaxKbFiles)} />
          <LimitItem icon={FileText} label="KB Tamanho" value={plan.MaxKbSizeMb === 0 ? 'Ilimitado' : `${plan.MaxKbSizeMb} MB`} />
        </div>
      </div>

      {/* Model */}
      <div className="px-6 py-4 border-t border-border/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Modelo IA</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-mono text-foreground">{plan.DefaultChatModel}</span>
          </div>
          <div className="flex gap-2">
            {plan.AllowCustomPrompt && (
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Prompt Custom
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tools */}
      <div className="px-6 py-4 border-t border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tools ({plan.AllowedTools?.length ?? 0})
          </h3>
          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(plan.AllowedTools ?? []).map(tool => (
            <Badge key={tool} variant="outline" className="text-xs font-mono bg-surface border-border">
              {TOOL_LABELS[tool] ?? tool}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function LimitItem({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm font-semibold text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
