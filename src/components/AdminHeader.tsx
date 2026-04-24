import { useState, useRef, useEffect } from 'react';
import { LogOut, User, Settings, DollarSign, FileStack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { AdminBreadcrumbs } from '@/components/AdminBreadcrumbs';
import { useNavigate } from 'react-router-dom';

export function AdminHeader() {
  const { user, logout, isAdmin } = useAuthContext();
  const navigate = useNavigate();
  const [configOpen, setConfigOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setConfigOpen(false);
      }
    };
    if (configOpen) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [configOpen]);

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-border glass-subtle overflow-visible relative z-50">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      
      <div className="h-5 w-px bg-border" />
      
      <AdminBreadcrumbs />

      <div className="flex-1" />

      {user && (
        <div className="flex items-center gap-2">
          {/* Settings gear – Admin only */}
          {isAdmin && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setConfigOpen(prev => !prev)}
                className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors
                  ${configOpen
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface'}`}
                title="Configurações"
              >
                <Settings className={`h-4 w-4 transition-transform duration-300 ${configOpen ? 'rotate-90' : ''}`} />
              </button>

              {/* Dropdown */}
              {configOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-popover shadow-xl shadow-black/20 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                    Configurações
                  </p>
                  <button
                    onClick={() => { setConfigOpen(false); navigate('/config/license-costs'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-surface transition-colors"
                  >
                    <DollarSign className="h-4 w-4 text-primary/70" />
                    Custos das Licenças
                  </button>
                  <button
                    onClick={() => { setConfigOpen(false); navigate('/config/contract-docs'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-surface transition-colors"
                  >
                    <FileStack className="h-4 w-4 text-primary/70" />
                    Documentos de Contrato
                  </button>
                </div>
              )}
            </div>
          )}

          {/* User info */}
          <div className="flex items-center gap-2 text-sm">
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="hidden sm:block">
              <span className="text-muted-foreground">{user.tenantCode}</span>
              <span className="mx-1.5 text-border">·</span>
              <span className="text-foreground">{user.persona}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Sair</span>
          </Button>
        </div>
      )}
    </header>
  );
}
