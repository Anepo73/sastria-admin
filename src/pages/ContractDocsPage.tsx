import { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  fetchKnowledgeFiles, syncKnowledgeFiles,
  uploadKnowledgeFile, deleteKnowledgeFile, fetchTenants,
} from '@/lib/api';
import type { Tenant } from '@/types';
import { FileStack, Upload, Trash2, Loader2, RefreshCw, FileText, Brain } from 'lucide-react';
import { toast } from 'sonner';

interface KnowledgeFile {
  FileId: string;
  FileName: string;
  OpenAIFileId: string;
  VectorStoreId: string;
  IndexStatus: string;
  CreatedAt: string;
}

export default function ContractDocsPage() {
  const { user, isGlobalAdmin } = useAuthContext();

  // GlobalAdmin: seletor de tenant. Admin: usa azureTenantId do login.
  const [selectedTenantId, setSelectedTenantId] = useState('');

  // Buscar tenants apenas para GlobalAdmin (selector)
  const { data: tenantsList } = useQuery({
    queryKey: ['tenants'],
    queryFn: fetchTenants,
    enabled: isGlobalAdmin,
  });
  const tenants: Tenant[] = tenantsList ?? [];

  // Para GlobalAdmin, resolve azure_tenant_id do tenant selecionado
  // Para Admin, usa o azureTenantId retornado no login
  const kbTenantId = isGlobalAdmin
    ? (tenants.find(t => t.tenant_id === selectedTenantId)?.azure_tenant_id || '')
    : (user?.azureTenantId || '');

  // ── State ──
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load files when tenant is resolved ──
  const loadFiles = async () => {
    if (!kbTenantId) return;
    setLoading(true);
    try {
      const r = await fetchKnowledgeFiles(kbTenantId);
      setFiles(Array.isArray(r?.files) ? r.files : []);
    } catch { toast.error('Erro ao carregar arquivos KB'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (kbTenantId) loadFiles();
    else setFiles([]);
  }, [kbTenantId]); // eslint-disable-line

  // ── Sync ──
  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await syncKnowledgeFiles(kbTenantId);
      if (Array.isArray(r?.files)) setFiles(r.files);
      toast.success(`Sincronizado: ${r?.synced ?? 0} arquivo(s) atualizados`);
    } catch { toast.error('Erro ao sincronizar'); }
    finally { setSyncing(false); }
  };

  // ── Upload ──
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadKnowledgeFile(kbTenantId, file);
      toast.success('Enviado! Clique em Sincronizar para confirmar a indexação.');
      await loadFiles();
    } catch (err) { toast.error('Erro no upload: ' + (err as Error).message); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  // ── Delete ──
  const handleDelete = async (fileId: string, fileName: string) => {
    if (!window.confirm(`Remover "${fileName}" do Knowledge Base?`)) return;
    try {
      await deleteKnowledgeFile(fileId);
      toast.success('Documento removido');
      setFiles(prev => prev.filter(f => f.FileId !== fileId));
    } catch { toast.error('Erro ao remover'); }
  };

  // ── Status badge ──
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
    <div className="p-6 admin-bg relative admin-grid min-h-full">
      <div className="relative z-10 max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileStack className="h-6 w-6 text-primary" />
              Documentos de Contrato
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os documentos da Knowledge Base do agente para respostas contextuais (RAG)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de tenant para GlobalAdmin */}
            {isGlobalAdmin && (
              <select
                value={selectedTenantId}
                onChange={e => setSelectedTenantId(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground h-10 min-w-[180px]"
              >
                <option value="">Selecione o Tenant</option>
                {tenants.map(t => (
                  <option key={t.tenant_id} value={t.tenant_id}>{t.tenant_code}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Actions bar */}
        {kbTenantId && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing || loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Status'}
            </Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
              {uploading ? 'Enviando...' : 'Upload Documento'}
            </Button>
            <input ref={fileInputRef} type="file" accept=".txt,.pdf,.md,.docx,.csv,.xlsx" className="hidden" onChange={handleUpload} />
            <Badge variant="secondary" className="text-xs py-1 px-2.5 ml-auto">
              {files.length} documento(s)
            </Badge>
          </div>
        )}

        {/* File list */}
        <div className="glass rounded-xl p-4">
          {!kbTenantId ? (
            <div className="text-center py-16">
              <Brain className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {isGlobalAdmin ? 'Selecione um tenant para gerenciar seus documentos' : 'Tenant não identificado'}
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground text-sm">Carregando...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Nenhum documento na Knowledge Base</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Faça upload de contratos, aditivos ou documentos de licenciamento para habilitar respostas contextuais
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map(f => (
                <div key={f.FileId} className="flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-surface/80 transition-colors gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-primary/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{f.FileName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {f.CreatedAt?.replace('T', ' ').slice(0, 16) ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(f.IndexStatus)}
                    <button
                      title="Remover"
                      className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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
      </div>
    </div>
  );
}
