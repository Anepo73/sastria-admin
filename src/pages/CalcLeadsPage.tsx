import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BarChart2, Download, RefreshCw, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = 'https://fn-sastri-graph-proxy1-cufvhzhsc6b0f0dq.brazilsouth-01.azurewebsites.net/api';

async function fetchCalcLeads() {
  const jwt = localStorage.getItem('sastria_jwt') || '';
  const res = await fetch(`${API_BASE}/GetWizardSessions?top=500&format=json`, {
    headers: { 'x-sastria-jwt': jwt },
  });
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}

function downloadCsv(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function CalcLeadsPage() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'leads'>('leads');
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['calc-leads'],
    queryFn: fetchCalcLeads,
    enabled: user?.persona === 'GlobalAdmin',
    staleTime: 60_000,
  });

  const all: any[] = (data as any)?.records ?? [];
  const leadsOnly = all.filter(r => (r.LeadNome && r.LeadNome.trim() !== '') || (r.InteresseEm && r.InteresseEm.trim() !== ''));
  const rows = filter === 'leads' ? leadsOnly : all;

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const jwt = localStorage.getItem('sastria_jwt') || '';
      const hasLead = filter === 'leads';
      const url = `${API_BASE}/GetWizardSessions?top=5000&format=csv${hasLead ? '&hasLead=true' : ''}`;
      const res = await fetch(url, { headers: { 'x-sastria-jwt': jwt } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(blobUrl, `leads-calculadora-${date}.csv`);
      URL.revokeObjectURL(blobUrl);
      toast.success('CSV exportado com sucesso!');
    } catch {
      toast.error('Erro ao exportar CSV.');
    }
    setExporting(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <BarChart2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Leads da Calculadora</h1>
            <p className="text-sm text-muted-foreground">
              Sessões concluídas · {leadsOnly.length} com dados de contato de {all.length} totais
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => { queryClient.invalidateQueries({ queryKey: ['calc-leads'] }); refetch(); }}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
          <Button
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting}
            className="gap-1.5"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessões',       value: all.length,         cls: 'border-border' },
          { label: 'Com Contato',          value: leadsOnly.length,   cls: 'border-success/30 bg-success/5' },
          { label: 'Sem Identificação',   value: all.length - leadsOnly.length, cls: 'border-muted/40' },
          {
            label: 'Taxa de Captura',
            value: all.length ? `${Math.round((leadsOnly.length / all.length) * 100)}%` : '—',
            cls: 'border-primary/20 bg-primary/5',
          },
        ].map(s => (
          <div key={s.label} className={`glass rounded-xl px-4 py-3 border ${s.cls}`}>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <div className="flex rounded-lg overflow-hidden border border-border text-xs">
            <button
              onClick={() => setFilter('leads')}
              className={`px-4 py-2 font-medium transition-colors ${
                filter === 'leads' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-hover'
              }`}
            >
              <User className="h-3.5 w-3.5 inline mr-1.5" />
              Somente com Contato ({leadsOnly.length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 font-medium transition-colors ${
                filter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-hover'
              }`}
            >
              Todos ({all.length})
            </button>
          </div>
          <p className="ml-auto text-xs text-muted-foreground">
            O CSV exportado respeita o filtro ativo
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Fabricante</TableHead>
              <TableHead>Valor Anual</TableHead>
              <TableHead className="text-right">Economia Estimada</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <BarChart2 className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">
                      {filter === 'leads'
                        ? 'Nenhuma sessão com nome preenchido ainda.'
                        : 'Nenhuma sessão registrada ainda.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.map((r: any) => (
              <TableRow key={r.Id} className="border-border hover:bg-surface-hover/50">
                <TableCell className="font-medium text-foreground">
                  {r.LeadNome || <span className="text-muted-foreground italic text-xs">—</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.InteresseEm || <span className="text-muted-foreground italic text-xs">—</span>}
                </TableCell>
                <TableCell className="text-sm text-foreground">{r.Manufacturer || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.AnnualValue || '—'}</TableCell>
                <TableCell className="text-right tabular-nums text-sm font-semibold text-success">
                  {r.MinSavings && r.MaxSavings
                    ? `R$ ${(r.MinSavings / 1000).toFixed(0)}K – R$ ${(r.MaxSavings / 1000).toFixed(0)}K`
                    : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                  {r.UtmSource || r.Referrer || 'direto'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.CreatedAt ? new Date(r.CreatedAt).toLocaleDateString('pt-BR') : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
