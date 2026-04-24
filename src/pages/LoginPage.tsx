import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { SastrIALogo } from '@/components/SastrIALogo';
import { SastrIAAvatar } from '@/components/SastrIAAvatar';

export default function LoginPage() {
  const { login } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.ok) setError(result.error || 'Credenciais inválidas');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(msg || 'Erro de conexão. Tente novamente.');
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
              Plataforma de Governança Microsoft 365
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-surface border-border focus:border-primary"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-surface border-border focus:border-primary"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
