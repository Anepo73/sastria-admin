import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSubscriptionPlans, updatePlanConfig, getAgentTools, getAgentConfig } from '@/lib/api';
import type { SubscriptionPlan } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Crown, Cpu, Wrench, Users, Database, MessageSquare, FileText, Loader2, Save, Check, X, Pencil, ChevronDown, Type } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { RichTextEditor, stripHtml } from '@/components/RichTextEditor';

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
  get_storage_usage_list: 'Uso de armazenamento',
  get_user_storage_detail: 'Storage por usuário',
  lookup_license_name: 'Pesquisa de licenças',
};

const TOOL_CATEGORIES: Record<string, string[]> = {
  'Licenças & SKUs': [
    'get_subscribed_skus', 'get_user_assigned_skus', 'get_assigned_licenses',
    'get_license_prices', 'get_sku_catalog', 'lookup_license_name',
  ],
  'Oportunidades': [
    'get_opportunities_summary', 'get_opportunities_list', 'get_opportunities_teaser',
    'update_opportunity_status',
  ],
  'Usuários & Uso': [
    'get_users', 'get_office_desktop_usage', 'get_services_user_counts',
    'get_storage_usage_list', 'get_user_storage_detail',
  ],
  'Governança': [
    'get_audit_trail', 'send_email_report',
  ],
};

export default function PlansPage() {
  const queryClient = useQueryClient();
  const { data: plans = [], isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['subscription-plans'],
    queryFn: fetchSubscriptionPlans,
    staleTime: 60_000,
  });

  // Fetch all available tools from backend
  const { data: toolsData } = useQuery({
    queryKey: ['agent-tools'],
    queryFn: getAgentTools,
    staleTime: 120_000,
  });

  // Fetch allowed models
  const { data: configData } = useQuery({
    queryKey: ['agent-config'],
    queryFn: getAgentConfig,
    staleTime: 120_000,
  });

  const allowedModels: string[] = configData?.allowedModels ?? [];

  const allToolNames: string[] = (toolsData?.tools ?? []).map(
    (t: { function: { name: string } }) => t.function.name
  );

  // Track which plan is being edited
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editingTools, setEditingTools] = useState<string[]>([]);

  const saveMutation = useMutation({
    mutationFn: ({ planCode, tools }: { planCode: string; tools: string[] }) =>
      updatePlanConfig(planCode, { allowedTools: tools }),
    onSuccess: (_data, vars) => {
      toast.success(`Tools do plano "${vars.planCode}" atualizadas com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      setEditingPlan(null);
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  function startEditing(plan: SubscriptionPlan) {
    setEditingPlan(plan.PlanCode);
    setEditingTools([...(plan.AllowedTools ?? [])]);
  }

  function cancelEditing() {
    setEditingPlan(null);
    setEditingTools([]);
  }

  function toggleTool(toolName: string) {
    setEditingTools(prev =>
      prev.includes(toolName) ? prev.filter(t => t !== toolName) : [...prev, toolName]
    );
  }

  function toggleCategory(categoryTools: string[]) {
    const allSelected = categoryTools.every(t => editingTools.includes(t));
    if (allSelected) {
      setEditingTools(prev => prev.filter(t => !categoryTools.includes(t)));
    } else {
      setEditingTools(prev => [...new Set([...prev, ...categoryTools])]);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Crown className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Catálogo de Planos</h1>
          <p className="text-sm text-muted-foreground">Planos de assinatura e configuração de tools por plano</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.PlanCode}
              plan={plan}
              isEditing={editingPlan === plan.PlanCode}
              editingTools={editingTools}
              allToolNames={allToolNames}
              allowedModels={allowedModels}
              isSaving={saveMutation.isPending}
              onStartEdit={() => startEditing(plan)}
              onCancelEdit={cancelEditing}
              onSave={() => saveMutation.mutate({ planCode: plan.PlanCode, tools: editingTools })}
              onToggleTool={toggleTool}
              onToggleCategory={toggleCategory}
              onSaveModel={(model) => saveMutation.mutate({ planCode: plan.PlanCode, tools: plan.AllowedTools ?? [] } as any)}
              queryClient={queryClient}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PlanCardProps {
  plan: SubscriptionPlan;
  isEditing: boolean;
  editingTools: string[];
  allToolNames: string[];
  allowedModels: string[];
  isSaving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onToggleTool: (toolName: string) => void;
  onToggleCategory: (tools: string[]) => void;
  onSaveModel: (model: string) => void;
  queryClient: ReturnType<typeof useQueryClient>;
}

function PlanCard({
  plan, isEditing, editingTools, allToolNames, allowedModels, isSaving,
  onStartEdit, onCancelEdit, onSave, onToggleTool, onToggleCategory,
  onSaveModel, queryClient,
}: PlanCardProps) {
  const isPro = plan.PlanCode === 'pro';
  const tools = isEditing ? editingTools : (plan.AllowedTools ?? []);

  // Use allToolNames if available (dynamic), otherwise fall back to static TOOL_CATEGORIES
  const allKnownTools = allToolNames.length > 0
    ? allToolNames
    : Object.values(TOOL_CATEGORIES).flat();

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
      <ModelSection
        plan={plan}
        allowedModels={allowedModels}
        queryClient={queryClient}
      />

      {/* Prompt do Plano */}
      <PromptSection plan={plan} queryClient={queryClient} />

      {/* Tools */}
      <div className="px-6 py-4 border-t border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tools ({tools.length})
          </h3>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={onCancelEdit}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md
                             bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  <X className="h-3 w-3" /> Cancelar
                </button>
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md
                             bg-emerald-600/80 text-white hover:bg-emerald-600 transition-colors
                             disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Salvar
                </button>
              </>
            ) : (
              <button
                onClick={onStartEdit}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md
                           bg-violet-600/30 text-violet-300 hover:bg-violet-600/50 transition-colors
                           border border-violet-500/20"
              >
                <Wrench className="h-3 w-3" /> Editar
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          /* ─── Edit Mode: grouped checkboxes ─── */
          <div className="space-y-4">
            {Object.entries(TOOL_CATEGORIES).map(([category, categoryTools]) => {
              const catCount = categoryTools.filter(t => editingTools.includes(t)).length;
              const allSelected = catCount === categoryTools.length;
              const someSelected = catCount > 0 && !allSelected;
              return (
                <div key={category}>
                  <button
                    onClick={() => onToggleCategory(categoryTools)}
                    className="flex items-center gap-2 mb-1.5 group cursor-pointer w-full text-left"
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                      allSelected
                        ? 'bg-violet-500 border-violet-500'
                        : someSelected
                          ? 'bg-violet-500/40 border-violet-500/60'
                          : 'border-zinc-600 group-hover:border-zinc-500'
                    }`}>
                      {(allSelected || someSelected) && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {category} ({catCount}/{categoryTools.length})
                    </span>
                  </button>
                  <div className="grid grid-cols-1 gap-1 pl-5">
                    {categoryTools.map(toolName => {
                      const isChecked = editingTools.includes(toolName);
                      return (
                        <label
                          key={toolName}
                          className="flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer
                                     hover:bg-zinc-800/50 transition-colors group"
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-zinc-600 group-hover:border-zinc-500'
                          }`}>
                            {isChecked && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <span className={`text-sm transition-colors ${
                            isChecked ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {TOOL_LABELS[toolName] ?? toolName}
                          </span>
                          <span className="text-[10px] text-zinc-600 font-mono ml-auto">
                            {toolName}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {/* Uncategorized tools */}
            {allKnownTools
              .filter(t => !Object.values(TOOL_CATEGORIES).flat().includes(t))
              .length > 0 && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Outras
                </span>
                <div className="grid grid-cols-1 gap-1 pl-5">
                  {allKnownTools
                    .filter(t => !Object.values(TOOL_CATEGORIES).flat().includes(t))
                    .map(toolName => {
                      const isChecked = editingTools.includes(toolName);
                      return (
                        <label
                          key={toolName}
                          className="flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer
                                     hover:bg-zinc-800/50 transition-colors group"
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-zinc-600 group-hover:border-zinc-500'
                          }`}>
                            {isChecked && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <span className={`text-sm transition-colors ${
                            isChecked ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {TOOL_LABELS[toolName] ?? toolName}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ─── View Mode: badges ─── */
          <div className="flex flex-wrap gap-1.5">
            {tools.map(tool => (
              <Badge key={tool} variant="outline" className="text-xs font-mono bg-surface border-border">
                {TOOL_LABELS[tool] ?? tool}
              </Badge>
            ))}
            {tools.length === 0 && (
              <span className="text-xs text-muted-foreground italic">Nenhuma tool configurada</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PromptSection ────────────────────────────────────────────────────────────
function PromptSection({ plan, queryClient }: {
  plan: SubscriptionPlan;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [promptHtml, setPromptHtml] = useState(plan.PlanPromptHtml ?? '');
  const [expanded, setExpanded] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (html: string) =>
      updatePlanConfig(plan.PlanCode, { promptHtml: html }),
    onSuccess: () => {
      toast.success(`Prompt do plano "${plan.PlanCode}" atualizado com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      setIsEditing(false);
    },
    onError: (err: Error) => toast.error(`Erro ao salvar prompt: ${err.message}`),
  });

  const hasPrompt = !!(plan.PlanPromptHtml && stripHtml(plan.PlanPromptHtml).length > 0);
  const plainTextLen = stripHtml(promptHtml).length;

  return (
    <div className="px-6 py-4 border-t border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Type className="h-3.5 w-3.5" />
          Prompt do Plano
        </h3>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => { setIsEditing(false); setPromptHtml(plan.PlanPromptHtml ?? ''); }}
                disabled={saveMutation.isPending}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md
                           bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <X className="h-3 w-3" /> Cancelar
              </button>
              <button
                onClick={() => saveMutation.mutate(promptHtml)}
                disabled={saveMutation.isPending || plainTextLen === 0}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md
                           bg-emerald-600/80 text-white hover:bg-emerald-600 transition-colors
                           disabled:opacity-50"
              >
                {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Salvar
              </button>
            </>
          ) : (
            <button
              onClick={() => { setPromptHtml(plan.PlanPromptHtml ?? ''); setIsEditing(true); }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md
                         bg-violet-600/30 text-violet-300 hover:bg-violet-600/50 transition-colors
                         border border-violet-500/20"
            >
              <Pencil className="h-3 w-3" /> Editar
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <RichTextEditor
            value={promptHtml}
            onChange={setPromptHtml}
            placeholder="Defina aqui o prompt específico para este plano. Ele é injetado no system prompt quando um tenant com este plano usa o chat."
            minHeight="200px"
          />
          <p className="text-xs text-muted-foreground">
            {plainTextLen} chars (plain text) · Injetado como sufixo do system prompt · Afeta todos os tenants com plano {plan.DisplayName}
          </p>
        </div>
      ) : hasPrompt ? (
        <div className="space-y-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`} />
            {expanded ? 'Ocultar preview' : 'Mostrar preview'}
            <span className="ml-auto text-[10px] font-mono text-zinc-600">
              {stripHtml(plan.PlanPromptHtml!).length} chars
            </span>
          </button>
          {expanded && (
            <div className="rounded-lg border border-border overflow-hidden">
              <RichTextEditor
                value={plan.PlanPromptHtml!}
                onChange={() => {}}
                readOnly
                minHeight="120px"
              />
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Nenhum prompt configurado — o agente usa apenas o prompt global + prompt do tenant
        </p>
      )}
    </div>
  );
}

function ModelSection({ plan, allowedModels, queryClient }: {
  plan: SubscriptionPlan;
  allowedModels: string[];
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [isEditingModel, setIsEditingModel] = useState(false);
  const [selectedModel, setSelectedModel] = useState(plan.DefaultChatModel);

  const modelMutation = useMutation({
    mutationFn: (model: string) =>
      updatePlanConfig(plan.PlanCode, { defaultChatModel: model }),
    onSuccess: () => {
      toast.success(`Modelo do plano "${plan.PlanCode}" alterado para ${selectedModel}.`);
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      setIsEditingModel(false);
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  return (
    <div className="px-6 py-4 border-t border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Modelo IA</h3>
        {isEditingModel ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setIsEditingModel(false); setSelectedModel(plan.DefaultChatModel); }}
              disabled={modelMutation.isPending}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md
                         bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              <X className="h-3 w-3" /> Cancelar
            </button>
            <button
              onClick={() => modelMutation.mutate(selectedModel)}
              disabled={modelMutation.isPending || selectedModel === plan.DefaultChatModel}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md
                         bg-emerald-600/80 text-white hover:bg-emerald-600 transition-colors
                         disabled:opacity-50"
            >
              {modelMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Salvar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditingModel(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md
                       bg-violet-600/30 text-violet-300 hover:bg-violet-600/50 transition-colors
                       border border-violet-500/20"
          >
            <Pencil className="h-3 w-3" /> Editar
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        {isEditingModel ? (
          <div className="relative flex-1">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full appearance-none bg-zinc-800/80 border border-zinc-700 rounded-lg
                         px-3 py-2 text-sm font-mono text-foreground
                         focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60
                         cursor-pointer pr-8"
            >
              {allowedModels.length > 0 ? (
                allowedModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))
              ) : (
                <option value={plan.DefaultChatModel}>{plan.DefaultChatModel}</option>
              )}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-mono text-foreground">{plan.DefaultChatModel}</span>
          </div>
        )}
        <div className="flex gap-2">
          {plan.AllowCustomPrompt && (
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              Prompt Custom
            </Badge>
          )}
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
