import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeNames: Record<string, string> = {
  '/': 'Tenants',
  '/tenants': 'Tenants',
  '/vouchers': 'Vouchers',
  '/calc-leads': 'Leads Calculadora',
  '/sku-catalog': 'Catálogo SKUs',
  '/ms-catalog': 'Catálogo Microsoft',
  '/opportunities': 'Oportunidades',
  '/chat-logs': 'Chat Logs',
  '/agent-config': 'Config do Agente',
  '/config/license-costs': 'Custos das Licenças',
  '/config/contract-docs': 'Documentos de Contrato',
};

export function AdminBreadcrumbs() {
  const location = useLocation();
  const path = location.pathname;

  // Try exact match first
  const exactName = routeNames[path];
  if (exactName && path === '/') return null;

  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs: { label: string; path: string }[] = [];
  let currentPath = '';

  for (const seg of segments) {
    currentPath += `/${seg}`;
    const name = routeNames[currentPath] || decodeURIComponent(seg);
    crumbs.push({ label: name, path: currentPath });
  }

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link to="/" className="hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3" />
          {i === crumbs.length - 1 ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
