import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { SastrIALogo } from '@/components/SastrIALogo';
import { SastrIAAvatar } from '@/components/SastrIAAvatar';
import { resetPassword } from '@/lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const validation = useMemo(() => {
    const checks = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      match: password.length > 0 && password === confirmPassword,
    };
    const isValid = checks.length && checks.upper && checks.lower && checks.number && checks.match;
    return { checks, isValid };
  }, [password, confirmPassword]);

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center admin-bg relative admin-grid">
        <div className="w-full max-w-sm mx-4 animate-fade-in">
          <div className="glass rounded-2xl p-8 glow-md text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">Link Inválido</h2>
            <p className="text-sm text-muted-foreground">
              O link de redefinição está incompleto ou expirado.
              Solicite um novo link.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Solicitar novo link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid) return;

    setError('');
    setLoading(true);
    try {
      const result = await resetPassword(email, token, password);
      if (result.ok) {
        setSuccess(true);
      } else {
        setError(result.error || result.message || 'Erro ao redefinir senha.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg || 'Erro ao redefinir. O link pode ter expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center admin-bg relative admin-grid">
      <div className="w-full max-w-sm mx-4 animate-fade-in">
        <div className="glass rounded-2xl p-8 glow-md">
          <div className="text-center mb-6 flex flex-col items-center">
            <SastrIAAvatar size="lg" glow />
            <h1 className="mt-4"><SastrIALogo className="text-3xl" /></h1>
            <p className="text-muted-foreground text-sm mt-2">
              Nova Senha
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <ShieldCheck className="h-8 w-8 text-emerald-400" />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-foreground">Senha Redefinida!</h2>
              <p className="text-sm text-muted-foreground">
                Sua senha foi alterada com sucesso. Faça login com a nova senha.
              </p>
              <Link to="/login">
                <Button className="w-full mt-2">Ir para o Login</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-muted-foreground text-center truncate">
                Redefinindo para <strong className="text-foreground">{email}</strong>
              </p>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-surface border-border focus:border-primary"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirmar nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 bg-surface border-border focus:border-primary"
                  required
                />
              </div>

              {/* Password requirements */}
              <div className="space-y-1 text-xs">
                <Requirement met={validation.checks.length} label="Mínimo 8 caracteres" />
                <Requirement met={validation.checks.upper} label="Uma letra maiúscula" />
                <Requirement met={validation.checks.lower} label="Uma letra minúscula" />
                <Requirement met={validation.checks.number} label="Um número" />
                <Requirement met={validation.checks.match} label="Senhas coincidem" />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !validation.isValid}>
                {loading ? 'Salvando...' : 'Redefinir Senha'}
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

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 transition-colors ${met ? 'text-emerald-400' : 'text-muted-foreground'}`}>
      <CheckCircle2 className={`h-3.5 w-3.5 transition-all ${met ? 'opacity-100' : 'opacity-30'}`} />
      {label}
    </div>
  );
}
