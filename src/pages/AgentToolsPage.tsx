import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Wrench, Search, ChevronDown, ChevronRight, Code2,
  Hash, ToggleLeft, ListFilter, Info, Zap,
} from 'lucide-react';
import { getAgentTools } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────
interface ToolParam {
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
}

interface ToolFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, ToolParam>;
    required: string[];
  };
}

interface ToolDef {
  type: string;
  function: ToolFunction;
}

// ── Param type icon ─────────────────────────────────────────────────────────
function ParamIcon({ type }: { type: string }) {
  if (type === 'integer' || type === 'number') return <Hash className="h-3 w-3 text-blue-400" />;
  if (type === 'boolean') return <ToggleLeft className="h-3 w-3 text-amber-400" />;
  if (type === 'string')  return <Code2 className="h-3 w-3 text-emerald-400" />;
  return <Code2 className="h-3 w-3 text-muted-foreground" />;
}

// ── Tool Card ───────────────────────────────────────────────────────────────
function ToolCard({ tool, index }: { tool: ToolDef; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const fn = tool.function;
  const params = fn.parameters?.properties ?? {};
  const required = new Set(fn.parameters?.required ?? []);
  const paramCount = Object.keys(params).length;

  return (
    <div
      className="group rounded-xl border border-border/60 bg-surface/50 hover:bg-surface/80 hover:border-violet-500/30 transition-all duration-200 overflow-hidden"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 p-4 text-left cursor-pointer"
      >
        <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
          <Wrench className="h-4 w-4 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground font-mono">{fn.name}</h3>
            {paramCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
                {paramCount} param{paramCount !== 1 ? 's' : ''}
              </span>
            )}
            {paramCount === 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                sem parâmetros
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
            {fn.description}
          </p>
        </div>
        <div className="shrink-0 mt-1 text-muted-foreground/40">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && paramCount > 0 && (
        <div className="px-4 pb-4 border-t border-border/40 pt-3 animate-fade-in">
          <div className="flex items-center gap-1.5 mb-2">
            <ListFilter className="h-3 w-3 text-muted-foreground/60" />
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">
              Parâmetros
            </span>
          </div>
          <div className="space-y-2">
            {Object.entries(params).map(([name, param]) => (
              <div
                key={name}
                className="rounded-lg bg-background/50 border border-border/30 px-3 py-2"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <ParamIcon type={param.type} />
                  <span className="text-xs font-mono font-semibold text-foreground">{name}</span>
                  <span className="text-[10px] px-1 py-px rounded bg-muted/50 text-muted-foreground font-mono">
                    {param.type}
                  </span>
                  {required.has(name) && (
                    <span className="text-[10px] px-1 py-px rounded bg-red-500/10 text-red-400 border border-red-500/20">
                      obrigatório
                    </span>
                  )}
                  {param.default !== undefined && (
                    <span className="text-[10px] px-1 py-px rounded bg-muted/50 text-muted-foreground">
                      padrão: {String(param.default)}
                    </span>
                  )}
                </div>
                {param.description && (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {param.description}
                  </p>
                )}
                {param.enum && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {param.enum.map(v => (
                      <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/15 font-mono">
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AgentToolsPage() {
  const [search, setSearch] = useState('');
  const [expandAll, setExpandAll] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['agent-tools'],
    queryFn: getAgentTools,
    staleTime: 5 * 60_000,
  });

  const tools: ToolDef[] = data?.tools ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return tools;
    const q = search.toLowerCase();
    return tools.filter(t =>
      t.function.name.toLowerCase().includes(q) ||
      t.function.description.toLowerCase().includes(q)
    );
  }, [tools, search]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-violet-400" />
            Tools do Agente
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ferramentas disponíveis para a SastrIA durante as conversas com os usuários.
          </p>
        </div>
        {!isLoading && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-surface border border-border rounded-lg px-3 py-1.5">
              {filtered.length} de {tools.length} tools
            </span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou descrição..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
          />
        </div>
        <button
          onClick={() => setExpandAll(e => !e)}
          className="text-xs px-3 py-2 rounded-lg border border-border bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
        >
          {expandAll ? 'Recolher tudo' : 'Expandir tudo'}
        </button>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-2 p-3 rounded-lg border border-violet-500/15 bg-violet-500/5 text-xs text-violet-300/80">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-violet-400" />
        <span>
          Estas tools são invocadas automaticamente pelo modelo de linguagem durante as conversas.
          Cada tool tem acesso ao <span className="font-medium text-violet-300">tenant_id</span> do
          usuário logado e consulta os dados diretamente no banco SQL.
        </span>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="h-5 w-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Carregando tools...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Erro ao carregar tools: {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && (
        <div className="space-y-3">
          {filtered.map((tool, i) => (
            <ToolCard key={tool.function.name} tool={tool} index={i} />
          ))}
          {filtered.length === 0 && search && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhuma tool encontrada para "{search}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
