import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchChatLogs } from '@/lib/api';
import type { ChatLogEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, MessageSquare, User, Clock, ChevronRight,
  Loader2, ArrowLeft, Hash, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionGroup {
  sessionId: string;
  messages: ChatLogEntry[];
  firstDate: string;
  lastDate: string;
  messageCount: number;
  preview: string; // first question truncated
}

interface UserGroup {
  email: string;
  tenantCode: string;
  sessions: SessionGroup[];
  totalMessages: number;
  lastActivity: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(raw: string): string {
  try {
    const d = new Date(raw);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
      ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return raw; }
}

function formatDateShort(raw: string): string {
  try {
    const d = new Date(raw);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch { return raw; }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function groupByUserAndSession(logs: ChatLogEntry[]): UserGroup[] {
  const userMap = new Map<string, { email: string; tenantCode: string; sessionsMap: Map<string, ChatLogEntry[]> }>();

  for (const log of logs) {
    const key = log.user_email;
    if (!userMap.has(key)) {
      userMap.set(key, { email: log.user_email, tenantCode: log.tenant_code, sessionsMap: new Map() });
    }
    const user = userMap.get(key)!;
    const sid = log.session_id || 'sem-sessao';
    if (!user.sessionsMap.has(sid)) {
      user.sessionsMap.set(sid, []);
    }
    user.sessionsMap.get(sid)!.push(log);
  }

  const users: UserGroup[] = [];
  for (const [, u] of userMap) {
    const sessions: SessionGroup[] = [];
    for (const [sid, msgs] of u.sessionsMap) {
      // Sort messages by date within session
      msgs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      sessions.push({
        sessionId: sid,
        messages: msgs,
        firstDate: msgs[0].date,
        lastDate: msgs[msgs.length - 1].date,
        messageCount: msgs.length,
        preview: truncate(msgs[0].question, 80),
      });
    }
    // Sort sessions by last activity (newest first)
    sessions.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());

    const totalMessages = sessions.reduce((acc, s) => acc + s.messageCount, 0);
    const lastActivity = sessions[0]?.lastDate ?? '';

    users.push({ email: u.email, tenantCode: u.tenantCode, sessions, totalMessages, lastActivity });
  }

  // Sort users by last activity (newest first)
  users.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  return users;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatLogsPage() {
  const [email, setEmail] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [keyword, setKeyword] = useState('');
  const [topN, setTopN] = useState('200');
  const [feedbackFilter, setFeedbackFilter] = useState('');

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['chat-logs', email, tenantCode, keyword, topN, feedbackFilter],
    queryFn: () => fetchChatLogs({
      userEmail: email || undefined,
      tenantCode: tenantCode || undefined,
      search: keyword || undefined,
      top: parseInt(topN),
      feedback: feedbackFilter || undefined,
    }),
    enabled: false,
  });
  const logs: ChatLogEntry[] = data ?? [];

  const userGroups = useMemo(() => groupByUserAndSession(logs), [logs]);

  const activeUser = useMemo(
    () => userGroups.find(u => u.email === selectedUser) ?? null,
    [userGroups, selectedUser],
  );

  const activeSession = useMemo(
    () => activeUser?.sessions.find(s => s.sessionId === selectedSession) ?? null,
    [activeUser, selectedSession],
  );

  // Auto-scroll to bottom of conversation
  const conversationEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    conversationEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession]);

  // Reset selections when data changes
  useEffect(() => {
    setSelectedUser(null);
    setSelectedSession(null);
  }, [logs]);

  const handleSearch = () => refetch();

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 admin-bg relative admin-grid min-h-full">
      <div className="relative z-10 max-w-7xl mx-auto space-y-5">

        {/* Header + Filters */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Chat Logs</h1>

          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <Input
                id="chatlog-filter-email"
                placeholder="usuario@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-56 bg-surface"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tenant</label>
              <Input
                id="chatlog-filter-tenant"
                placeholder="CONTOSO"
                value={tenantCode}
                onChange={e => setTenantCode(e.target.value)}
                className="w-40 bg-surface"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Palavra-chave</label>
              <Input
                id="chatlog-filter-keyword"
                placeholder="Buscar..."
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                className="w-40 bg-surface"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Feedback</label>
              <select
                id="chatlog-filter-feedback"
                value={feedbackFilter}
                onChange={e => setFeedbackFilter(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground h-10"
              >
                <option value="">Todos</option>
                <option value="positive">👍 Positivo</option>
                <option value="negative">👎 Negativo</option>
                <option value="none">Sem feedback</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Top N</label>
              <select
                id="chatlog-filter-topn"
                value={topN}
                onChange={e => setTopN(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground h-10"
              >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="500">500</option>
              </select>
            </div>
            <Button id="chatlog-search-btn" onClick={handleSearch} disabled={isLoading}>
              {isLoading
                ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                : <Search className="h-4 w-4 mr-1" />}
              Buscar
            </Button>
            {logs.length > 0 && (
              <span className="text-xs text-muted-foreground self-center ml-2">
                {logs.length} msgs · {userGroups.length} usuários
              </span>
            )}
          </div>
        </div>

        {/* 3-Panel Layout */}
        {logs.length === 0 && !isLoading ? (
          <div className="glass rounded-xl p-16 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Clique em <strong>Buscar</strong> para carregar as conversas</p>
          </div>
        ) : isLoading ? (
          <div className="glass rounded-xl p-16 text-center">
            <Loader2 className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
            <p className="text-muted-foreground text-sm">Carregando logs...</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4" style={{ minHeight: '60vh' }}>

            {/* Panel 1: Users */}
            <div className={`${selectedUser ? 'hidden lg:block' : ''} col-span-12 lg:col-span-3 glass rounded-xl overflow-hidden flex flex-col`}>
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Usuários</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">{userGroups.length}</Badge>
              </div>
              <div className="flex-1 overflow-y-auto">
                {userGroups.map(u => (
                  <button
                    key={u.email}
                    onClick={() => { setSelectedUser(u.email); setSelectedSession(null); }}
                    className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors hover:bg-surface-hover/50 ${
                      selectedUser === u.email ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{u.email}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">{u.tenantCode}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[10px] text-muted-foreground">{formatDateShort(u.lastActivity)}</span>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                            {u.sessions.length} {u.sessions.length === 1 ? 'sessão' : 'sessões'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Panel 2: Sessions */}
            <div className={`${
              !selectedUser ? 'hidden lg:flex' :
              selectedSession ? 'hidden lg:flex' : ''
            } col-span-12 lg:col-span-3 glass rounded-xl overflow-hidden flex flex-col`}>
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                {selectedUser && (
                  <button
                    onClick={() => { setSelectedUser(null); setSelectedSession(null); }}
                    className="lg:hidden p-1 rounded hover:bg-surface-hover mr-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <Hash className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Sessões</span>
                {activeUser && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">{activeUser.sessions.length}</Badge>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {!activeUser ? (
                  <div className="p-6 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Selecione um usuário</p>
                  </div>
                ) : activeUser.sessions.map(s => (
                  <button
                    key={s.sessionId}
                    onClick={() => setSelectedSession(s.sessionId)}
                    className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors hover:bg-surface-hover/50 ${
                      selectedSession === s.sessionId ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-foreground leading-snug line-clamp-2">{s.preview}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {s.sessionId.slice(0, 8)}…
                          </span>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                            {s.messageCount} msg{s.messageCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1">
                        <span className="text-[10px] text-muted-foreground">{formatDateShort(s.lastDate)}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Panel 3: Conversation */}
            <div className={`${
              !selectedSession ? 'hidden lg:flex' : ''
            } col-span-12 lg:col-span-6 glass rounded-xl overflow-hidden flex flex-col`}>
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                {selectedSession && (
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="lg:hidden p-1 rounded hover:bg-surface-hover mr-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Conversa</span>
                {activeSession && (
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                    {activeSession.sessionId.slice(0, 12)}…
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!activeSession ? (
                  <div className="h-full flex flex-col items-center justify-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/15 mb-3" />
                    <p className="text-sm text-muted-foreground">Selecione uma sessão para ver a conversa</p>
                  </div>
                ) : activeSession.messages.map((msg, i) => (
                  <div key={i} className="space-y-3">
                    {/* User message */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] space-y-1">
                        <div className="bg-primary/15 border border-primary/20 rounded-2xl rounded-tr-md px-4 py-2.5">
                          <p className="text-sm text-foreground whitespace-pre-wrap">{msg.question}</p>
                        </div>
                        <div className="flex justify-end items-center gap-1.5 px-1">
                          <Clock className="h-2.5 w-2.5 text-muted-foreground/50" />
                          <span className="text-[10px] text-muted-foreground/60">{formatDate(msg.date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Assistant reply */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%] space-y-1">
                        <div className="bg-surface border border-border rounded-2xl rounded-tl-md px-4 py-2.5">
                          <div className="text-sm text-foreground prose prose-invert prose-sm max-w-none
                            prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
                            prose-headings:mt-3 prose-headings:mb-1
                            prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1
                            prose-code:text-xs prose-code:bg-background/50 prose-code:px-1 prose-code:rounded">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.response}</ReactMarkdown>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-1">
                          <span className="text-[9px] font-medium text-primary/60 uppercase tracking-wide">SastrIA</span>
                          {msg.feedback === 1 && (
                            <span className="flex items-center gap-0.5 text-[9px] text-emerald-400" title="Feedback positivo">
                              <ThumbsUp className="h-2.5 w-2.5" /> Positivo
                            </span>
                          )}
                          {msg.feedback === -1 && (
                            <span className="flex items-center gap-0.5 text-[9px] text-red-400" title="Feedback negativo">
                              <ThumbsDown className="h-2.5 w-2.5" /> Negativo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={conversationEnd} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
