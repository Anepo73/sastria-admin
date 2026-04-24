import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getAgentConfig, saveAgentConfig,
  getGlobalPrompt, saveGlobalPrompt,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, FileText, Save, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { RichTextEditor } from '@/components/RichTextEditor';

// ─── Model pricing catalogue ─────────────────────────────────────────────────
const MODEL_PRICING: { id: string; label: string; inputPer1M: string; outputPer1M: string }[] = [
  { id: 'gpt-4.1',      label: 'gpt-4.1',       inputPer1M: '$2.00',  outputPer1M: '$8.00'   },
  { id: 'gpt-4.1-mini', label: 'gpt-4.1-mini',  inputPer1M: '$0.40',  outputPer1M: '$1.60'   },
  { id: 'gpt-4.1-nano', label: 'gpt-4.1-nano',  inputPer1M: '$0.10',  outputPer1M: '$0.40'   },
  { id: 'gpt-4o',       label: 'gpt-4o',         inputPer1M: '$2.50',  outputPer1M: '$10.00'  },
  { id: 'gpt-4o-mini',  label: 'gpt-4o-mini',    inputPer1M: '$0.15',  outputPer1M: '$0.60'   },
  { id: 'o4-mini',      label: 'o4-mini',         inputPer1M: '$1.10',  outputPer1M: '$4.40'   },
  { id: 'gpt-5-nano',   label: 'gpt-5-nano',     inputPer1M: '$0.05',  outputPer1M: '$0.40'   },
  { id: 'gpt-5-mini',   label: 'gpt-5-mini',     inputPer1M: '$0.25',  outputPer1M: '$2.00'   },
  { id: 'gpt-5',        label: 'gpt-5',           inputPer1M: '$1.25',  outputPer1M: '$10.00'  },
  { id: 'gpt-5.1',      label: 'gpt-5.1',         inputPer1M: '$1.25',  outputPer1M: '$10.00'  },
  { id: 'gpt-5-pro',    label: 'gpt-5-pro',       inputPer1M: '$15.00', outputPer1M: '$120.00' },
  { id: 'gpt-5.2',      label: 'gpt-5.2',         inputPer1M: '$1.75',  outputPer1M: '$14.00'  },
  { id: 'gpt-5.2-pro',  label: 'gpt-5.2-pro',    inputPer1M: '$21.00', outputPer1M: '$168.00' },
];

export default function AgentConfigPage() {
  const { user } = useAuthContext();

  // ─── Agent Config (model selection) ─────────────────────────────────────────
  const { data: agentConfigData, refetch: refetchConfig } = useQuery({
    queryKey: ['agent-config'],
    queryFn: getAgentConfig,
    enabled: user?.persona === 'GlobalAdmin',
    staleTime: 60_000,
  });
  const agentConfig: Record<string, string> = agentConfigData?.config ?? {};
  const [pendingModel,    setPendingModel]    = useState<string>('');
  const [pendingRagModel, setPendingRagModel] = useState<string>('');
  const [savingConfig,    setSavingConfig]    = useState(false);

  useEffect(() => {
    if (agentConfig.CHAT_MODEL && !pendingModel)    setPendingModel(agentConfig.CHAT_MODEL);
    if (agentConfig.RAG_MODEL  && !pendingRagModel) setPendingRagModel(agentConfig.RAG_MODEL);
  }, [agentConfig.CHAT_MODEL, agentConfig.RAG_MODEL]);

  const handleSaveConfig = async () => {
    if (!user?.email) return;
    setSavingConfig(true);
    try {
      const saves: Promise<unknown>[] = [];
      if (pendingModel    && pendingModel    !== agentConfig.CHAT_MODEL)
        saves.push(saveAgentConfig('CHAT_MODEL', pendingModel,    user.email));
      if (pendingRagModel && pendingRagModel !== agentConfig.RAG_MODEL)
        saves.push(saveAgentConfig('RAG_MODEL',  pendingRagModel, user.email));
      if (saves.length === 0) return;
      await Promise.all(saves);
      await refetchConfig();
      toast.success('Configuração do agente salva.');
    } catch { toast.error('Erro ao salvar configuração.'); }
    finally { setSavingConfig(false); }
  };

  // ─── Global Prompt ──────────────────────────────────────────────────────────
  const { data: globalPromptData, refetch: refetchGlobalPrompt } = useQuery({
    queryKey: ['global-prompt'],
    queryFn: getGlobalPrompt,
    enabled: user?.persona === 'GlobalAdmin',
    staleTime: 30_000,
  });
  const [globalPromptHtml,  setGlobalPromptHtml]  = useState('');
  const [savingGlobal,      setSavingGlobal]       = useState(false);

  useEffect(() => {
    if (globalPromptData?.contentHtml !== undefined)
      setGlobalPromptHtml(globalPromptData.contentHtml);
  }, [globalPromptData?.contentHtml]);

  const handleSaveGlobal = async () => {
    if (!user?.email) return;
    setSavingGlobal(true);
    try {
      await saveGlobalPrompt(globalPromptHtml, user.email);
      await refetchGlobalPrompt();
      toast.success('Prompt global salvo.');
    } catch { toast.error('Erro ao salvar prompt global.'); }
    finally { setSavingGlobal(false); }
  };

  return (
    <div className="p-6 admin-bg relative admin-grid min-h-full">
      <div className="relative z-10 max-w-5xl mx-auto space-y-6">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Configurações do Agente
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Modelo de IA, temperatura e prompt global compartilhado entre todos os tenants
          </p>
        </div>

        {/* ─── Model Configuration ─────────────────────────────────────────── */}
        {agentConfigData && (
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Modelo de IA</h2>
              <Badge variant="outline" className="ml-auto text-xs text-muted-foreground">
                Config global — afeta todos os tenants
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Modelo de Chat (Tool Calling)</label>
                <select
                  id="agent-chat-model"
                  value={pendingModel || agentConfig.CHAT_MODEL || ''}
                  onChange={e => setPendingModel(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="" disabled>Selecione um modelo...</option>
                  {MODEL_PRICING.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label}  —  in {m.inputPer1M} / out {m.outputPer1M} p/1M tokens
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Modelo RAG (Knowledge Base)</label>
                <select
                  id="agent-rag-model"
                  value={pendingRagModel || agentConfig.RAG_MODEL || ''}
                  onChange={e => setPendingRagModel(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="" disabled>Selecione um modelo...</option>
                  {MODEL_PRICING.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label}  —  in {m.inputPer1M} / out {m.outputPer1M} p/1M tokens
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Temperatura</label>
                <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  {agentConfig.AGENT_TEMPERATURE ?? '0.5'}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                id="save-agent-model"
                onClick={handleSaveConfig}
                disabled={savingConfig
                  || (pendingModel    === agentConfig.CHAT_MODEL
                   && pendingRagModel === agentConfig.RAG_MODEL)}
                size="sm"
                className="gap-1.5"
              >
                {savingConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar Modelo
              </Button>
            </div>
          </div>
        )}

        {/* ─── Global Prompt ───────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2 border-b border-border">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Prompt Global do Agente</h2>
            <span className="ml-1 text-xs text-muted-foreground">base compartilhada para todos os tenants</span>
            {globalPromptData?.updatedAt && (
              <span className="ml-auto text-xs text-muted-foreground hidden sm:block">
                Editado por {globalPromptData.updatedBy || '—'}
              </span>
            )}
          </div>
          <div className="px-5 pb-5 space-y-3">
            <p className="text-xs text-muted-foreground pt-3">
              Este prompt é <strong className="text-foreground">prefixado</strong> ao prompt específico de cada tenant.
              Use para instruções gerais, tom, regras de segurança e identidade do assistente.
              O texto enviado à OpenAI é <strong className="text-foreground">plain text</strong> (formatação removida).
            </p>
            <RichTextEditor
              value={globalPromptHtml}
              onChange={setGlobalPromptHtml}
              placeholder="Digite as instruções globais do agente SastrIA..."
              minHeight="300px"
            />
            <div className="flex justify-end">
              <Button
                id="save-global-prompt"
                onClick={handleSaveGlobal}
                disabled={savingGlobal}
                size="sm"
                className="gap-1.5"
              >
                {savingGlobal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar Prompt Global
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
