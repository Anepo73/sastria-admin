import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  fetchVouchers, createVoucher, revokeVoucher, fetchVoucherAttempts,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Ticket, Copy, Ban, Clock, Monitor, Plus, RefreshCw, Loader2, ChevronRight, Share2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function VouchersPage() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const [voucherTab, setVoucherTab] = useState<'vouchers' | 'attempts'>('vouchers');
  const [showCreateVoucher, setShowCreateVoucher] = useState(false);
  const [newVoucherCode, setNewVoucherCode] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<Record<string, unknown> | null>(null);

  const { data: vouchersData, refetch: refetchVouchers, isLoading: vouchersLoading } = useQuery({
    queryKey: ['vouchers'],
    queryFn: fetchVouchers,
    enabled: user?.persona === 'GlobalAdmin',
    staleTime: 30_000,
  });
  const vouchers = (vouchersData as any)?.vouchers ?? [];

  const { data: attemptsData, refetch: refetchAttempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['voucher-attempts'],
    queryFn: fetchVoucherAttempts,
    enabled: user?.persona === 'GlobalAdmin' && voucherTab === 'attempts',
    staleTime: 30_000,
  });
  const attempts = (attemptsData as any)?.attempts ?? [];

  const handleRevokeVoucher = async (id: string) => {
    if (!confirm('Revogar este voucher? Ele não poderá mais ser usado.')) return;
    setRevokingId(id);
    try {
      await revokeVoucher(id);
      toast.success('Voucher revogado.');
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
    } catch { toast.error('Erro ao revogar voucher.'); }
    finally { setRevokingId(null); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Código ${code} copiado!`);
  };

  const WIZARD_URL = 'https://chat.sastria.com.br/wizard';

  const shareOnWhatsApp = (code: string) => {
    const link = `${WIZARD_URL}?code=${code}`;
    const text = [
      '\uD83C\uDF9F\uFE0F *Voucher de ativa\u00e7\u00e3o SastrIA*',
      '',
      'Ol\u00e1! Seu acesso est\u00e1 pronto. Use o c\u00f3digo abaixo para iniciar o onboarding:',
      '',
      `*${code}*`,
      '',
      'Ou acesse diretamente pelo link:',
      link,
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const statusMap: Record<string, { label: string; cls: string }> = {
    active:    { label: '● Ativo',    cls: 'bg-success/20 text-success border-success/30' },
    exhausted: { label: '⚫ Esgotado', cls: 'bg-muted/30 text-muted-foreground border-border' },
    revoked:   { label: '✕ Revogado', cls: 'bg-destructive/20 text-destructive border-destructive/30' },
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <Ticket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Vouchers de Onboarding</h1>
            <p className="text-sm text-muted-foreground">Gere, gerencie e acompanhe os códigos de ativação</p>
          </div>
        </div>
        <Button onClick={() => { setNewVoucherCode(null); setShowCreateVoucher(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Gerar Voucher
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',     value: vouchers.length,                                         cls: 'border-border' },
          { label: 'Ativos',    value: vouchers.filter((v: any) => v.Status === 'active').length,    cls: 'border-success/30 bg-success/5' },
          { label: 'Esgotados', value: vouchers.filter((v: any) => v.Status === 'exhausted').length, cls: 'border-muted/40' },
          { label: 'Revogados', value: vouchers.filter((v: any) => v.Status === 'revoked').length,   cls: 'border-destructive/30 bg-destructive/5' },
        ].map(s => (
          <div key={s.label} className={`glass rounded-xl px-4 py-3 border ${s.cls}`}>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {/* Tabs header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <div className="flex rounded-lg overflow-hidden border border-border text-xs">
            <button
              onClick={() => setVoucherTab('vouchers')}
              className={`px-4 py-2 transition-colors font-medium ${
                voucherTab === 'vouchers' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-hover'
              }`}
            >
              Vouchers ({vouchers.filter((v: any) => v.Status === 'active').length} ativos)
            </button>
            <button
              onClick={() => setVoucherTab('attempts')}
              className={`px-4 py-2 transition-colors font-medium ${
                voucherTab === 'attempts' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-hover'
              }`}
            >
              Tentativas de Onboarding
            </button>
          </div>
          <Button
            variant="outline" size="sm"
            onClick={() => voucherTab === 'attempts' ? refetchAttempts() : refetchVouchers()}
            className="ml-auto gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>

        {/* ── Tab: Vouchers ── */}
        {voucherTab === 'vouchers' && (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead className="text-center">Usos</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchersLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell></TableRow>
              ) : vouchers.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Ticket className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">Nenhum voucher criado ainda.</p>
                    <Button size="sm" variant="outline" onClick={() => setShowCreateVoucher(true)} className="mt-2 gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> Gerar primeiro voucher
                    </Button>
                  </div>
                </TableCell></TableRow>
              ) : vouchers.map((v: any) => {
                const s = statusMap[v.Status] ?? statusMap.active;
                return (
                  <TableRow key={v.VoucherId} className="border-border hover:bg-surface-hover/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-primary tracking-[0.2em] text-base">{v.Code}</code>
                        <button
                          onClick={() => copyCode(v.Code)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                          title="Copiar código"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {v.Status === 'active' && (
                          <button
                            onClick={() => shareOnWhatsApp(v.Code)}
                            className="p-1 rounded text-[#25D366] hover:text-[#128C7E] hover:bg-green-500/10 transition-colors"
                            title="Compartilhar no WhatsApp"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground max-w-[200px] truncate">{v.Description ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={v.PlanCode === 'pro'
                        ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                        : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                      }>
                        {v.PlanCode === 'pro' ? '⭐ Professional' : '🆓 Trial'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{v.CreatedBy ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      <span className="tabular-nums font-semibold">{v.UsesCount ?? 0}</span>
                      <span className="text-muted-foreground text-xs">/{v.MaxUses}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.ExpiresAt ? new Date(v.ExpiresAt).toLocaleDateString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={s.cls}>{s.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {v.Status === 'active' && (
                        <button
                          onClick={() => handleRevokeVoucher(v.VoucherId)}
                          title="Revogar"
                          className="p-1.5 rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          {revokingId === v.VoucherId
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Ban className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* ── Tab: Tentativas ── */}
        {voucherTab === 'attempts' && (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Código</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead className="text-center">Step</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Iniciado em</TableHead>
                <TableHead>Última atividade</TableHead>
                <TableHead className="text-right">Detalhe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attemptsLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell></TableRow>
              ) : attempts.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Clock className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">Nenhuma tentativa registrada ainda.</p>
                  </div>
                </TableCell></TableRow>
              ) : attempts.map((a: any) => {
                const isComplete = a.Status === 'completed';
                return (
                  <TableRow key={a.UseId} className="border-border hover:bg-surface-hover/50">
                    <TableCell>
                      <code className="font-mono text-xs font-bold text-primary">{a.Code}</code>
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.TenantName ?? <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.AdminEmail ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="tabular-nums text-sm font-semibold">{a.StepReached ?? 0}</span>
                        <span className="text-muted-foreground text-xs">/8</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        isComplete
                          ? 'bg-success/20 text-success border-success/30'
                          : 'bg-warning/20 text-warning border-warning/30'
                      }>
                        {isComplete ? '✅ Completo' : '⚠️ Incompleto'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.StartedAt ? new Date(a.StartedAt).toLocaleString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.LastActivityAt ? new Date(a.LastActivityAt).toLocaleString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => setSelectedAttempt(a)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                        title="Ver detalhes"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modals */}
      {showCreateVoucher && (
        <CreateVoucherModal
          onClose={() => setShowCreateVoucher(false)}
          onCreated={(code) => { setNewVoucherCode(code); queryClient.invalidateQueries({ queryKey: ['vouchers'] }); }}
        />
      )}
      {newVoucherCode && (
        <Dialog open onOpenChange={() => setNewVoucherCode(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" /> Voucher Gerado com Sucesso
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-5">
              <p className="text-sm text-muted-foreground mb-5">Compartilhe este código com o novo cliente:</p>
              <div className="flex items-center justify-center gap-3 mb-4">
                <code className="text-4xl font-mono font-bold tracking-[0.5em] text-primary">{newVoucherCode}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(newVoucherCode); toast.success('Copiado!'); }}
                  className="p-2 rounded-lg border border-border hover:bg-surface-hover transition-colors"
                  title="Copiar código"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Link de ativação: 
                <a
                  href={`${WIZARD_URL}?code=${newVoucherCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline font-medium break-all"
                >
                  chat.sastria.com.br/wizard?code={newVoucherCode}
                </a>
              </p>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <button
                onClick={() => shareOnWhatsApp(newVoucherCode)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm text-white transition-colors"
                style={{ backgroundColor: '#25D366' }}
              >
                {/* WhatsApp icon inline SVG */}
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Compartilhar no WhatsApp
              </button>
              <Button variant="outline" onClick={() => setNewVoucherCode(null)} className="w-full">Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {selectedAttempt && (
        <AttemptDetailModal attempt={selectedAttempt} onClose={() => setSelectedAttempt(null)} />
      )}
    </div>
  );
}

// ─── CreateVoucherModal ────────────────────────────────────────────────────────

function CreateVoucherModal({ onClose, onCreated }: { onClose: () => void; onCreated: (code: string) => void }) {
  const [form, setForm] = useState({ description: '', maxUses: 1, expiresAt: '', notes: '', planCode: 'trial' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.description.trim()) { toast.error('Descrição é obrigatória.'); return; }
    setLoading(true);
    try {
      const res = await createVoucher({
        description: form.description.trim(),
        maxUses: Math.max(1, Number(form.maxUses)),
        expiresAt: form.expiresAt || null,
        notes: form.notes || null,
        planCode: form.planCode,
      }) as any;
      if (res?.code) { onCreated(res.code); onClose(); toast.success(`Voucher ${res.code} criado!`); }
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
            <Label htmlFor="v-desc">Descrição <span className="text-destructive">*</span></Label>
            <Input id="v-desc" placeholder="Ex: Cliente AESC — Piloto Q2 2026"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <p className="text-xs text-muted-foreground">Identifica para quem o voucher foi gerado.</p>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="v-uses">Usos máximos</Label>
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
            <Input id="v-notes" placeholder="Anotações opcionais" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Plano de Assinatura</Label>
            <div className="flex gap-2">
              {[
                { code: 'trial', label: '🆓 Trial', desc: '3 usuários, teaser' },
                { code: 'pro', label: '⭐ Professional', desc: 'Ilimitado, todos tools' },
              ].map(p => (
                <button key={p.code} type="button"
                  onClick={() => setForm(f => ({ ...f, planCode: p.code }))}
                  className={`flex-1 rounded-lg border p-3 text-left transition-all ${
                    form.planCode === p.code
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                      : 'border-border hover:border-primary/40 hover:bg-surface-hover'
                  }`}
                >
                  <p className="font-medium text-sm">{p.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
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
    { label: 'Código',           value: attempt.Code, mono: true },
    { label: 'Status',           value: attempt.Status === 'completed' ? '✅ Completo' : '⚠️ Incompleto' },
    { label: 'Step alcançado',   value: `${attempt.StepReached ?? 0} / 8` },
    { label: 'Tenant Name',      value: attempt.TenantName },
    { label: 'Tenant ID',        value: attempt.TenantId, mono: true },
    { label: 'Client ID',        value: attempt.ClientId, mono: true },
    { label: 'Admin e-mail',     value: attempt.AdminEmail },
    { label: 'SharePoint',       value: attempt.IncludeSharePoint ? 'Incluído' : 'Não' },
    { label: 'Tenant Code',      value: attempt.TenantCode, mono: true },
    { label: 'Protocolo',        value: attempt.Protocol, mono: true },
    { label: 'IP',               value: attempt.IpAddress, mono: true },
    { label: 'Origem',           value: attempt.OriginUrl, mono: true },
    { label: 'Iniciado em',      value: attempt.StartedAt ? new Date(attempt.StartedAt as string).toLocaleString('pt-BR') : null },
    { label: 'Última atividade', value: attempt.LastActivityAt ? new Date(attempt.LastActivityAt as string).toLocaleString('pt-BR') : null },
    { label: 'Concluído em',     value: attempt.CompletedAt ? new Date(attempt.CompletedAt as string).toLocaleString('pt-BR') : null },
  ].filter(r => r.value !== null && r.value !== undefined && r.value !== '');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Detalhe da Tentativa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-0 py-1">
          {rows.map(r => (
            <div key={r.label} className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
              <span className="text-xs text-muted-foreground w-36 shrink-0 pt-0.5">{r.label}</span>
              {r.mono
                ? <code className="text-xs font-mono text-foreground break-all">{String(r.value)}</code>
                : <span className="text-sm text-foreground">{String(r.value)}</span>}
            </div>
          ))}
          {attempt.UserAgent && (
            <div className="py-2.5 border-b border-border/50">
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Monitor className="h-3 w-3" /> User Agent
              </p>
              <p className="text-xs font-mono text-muted-foreground break-all leading-relaxed">{String(attempt.UserAgent)}</p>
            </div>
          )}
          {attempt.FormDataJson && (
            <div className="py-2.5">
              <p className="text-xs text-muted-foreground mb-1.5">Form Data (snapshot completo)</p>
              <pre className="text-xs bg-surface rounded-lg p-3 overflow-auto max-h-44 text-foreground leading-relaxed">
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
