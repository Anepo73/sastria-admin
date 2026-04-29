import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { SastrIALogo } from '@/components/SastrIALogo';
import { SastrIAAvatar } from '@/components/SastrIAAvatar';
import { requestPasswordReset } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg || 'Erro ao enviar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center admin-bg relative admin-grid">
      <div className="w-full max-w-sm mx-4 animate-fade-in">
        <div className="glass rounded-2xl p-8 glow-md">
          <div className="text-center mb-8 flex flex-col items-center">
            <SastrIAAvatar size="lg" glow />
            <h1 className="mt-4"><SastrIALogo className="text-3xl" /></h1>
            <p className="text-muted-foreground text-sm mt-2">
              Recuperação de Senha
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-fade-in">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-foreground">Email Enviado!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Se <strong className="text-foreground">{email}</strong> estiver cadastrado,
                você receberá um link para redefinir sua senha.
              </p>
              <p className="text-xs text-muted-foreground">
                Verifique também a pasta de spam. O link expira em 1 hora.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mt-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Informe seu email e enviaremos um link para redefinir sua senha.
              </p>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-surface border-border focus:border-primary"
                  required
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
