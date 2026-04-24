import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/AdminLayout";
import LoginPage from "@/pages/LoginPage";
import AdminPage from "@/pages/AdminPage";
import SkuCatalogPage from "@/pages/SkuCatalogPage";
import TenantSkusPage from "@/pages/TenantSkusPage";
import OpportunitiesPage from "@/pages/OpportunitiesPage";
import ChatLogsPage from "@/pages/ChatLogsPage";
import VouchersPage from "@/pages/VouchersPage";
import CalcLeadsPage from "@/pages/CalcLeadsPage";
import LicenseCostsPage from "@/pages/LicenseCostsPage";
import ContractDocsPage from "@/pages/ContractDocsPage";
import MicrosoftCatalogPage from "@/pages/MicrosoftCatalogPage";
import AgentConfigPage from "@/pages/AgentConfigPage";
import AgentToolsPage from "@/pages/AgentToolsPage";
import TenantDetailPage from "@/pages/TenantDetailPage";
import PlansPage from "@/pages/PlansPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isGlobalAdmin } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isGlobalAdmin) return (
    <div className="flex items-center justify-center min-h-screen admin-bg">
      <div className="glass rounded-xl p-8 text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground">Esta área é restrita a Administradores Globais.</p>
      </div>
    </div>
  );
  return <>{children}</>;
}

function ConfigGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return (
    <div className="flex items-center justify-center min-h-screen admin-bg">
      <div className="glass rounded-xl p-8 text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground">Esta área é restrita a Administradores.</p>
      </div>
    </div>
  );
  return <>{children}</>;
}

function LoginGuard() {
  const { isAuthenticated } = useAuthContext();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <LoginPage />;
}

const AdminApp = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginGuard />} />

            <Route element={<AdminGuard><AdminLayout /></AdminGuard>}>
              <Route path="/" element={<AdminPage />} />
              <Route path="/tenants" element={<AdminPage />} />
              <Route path="/tenants/:tenantId/:tenantCode" element={<TenantDetailPage />} />
              <Route path="/admin/skus/:tenantId/:tenantCode" element={<TenantSkusPage />} />
              <Route path="/vouchers" element={<VouchersPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/sku-catalog" element={<SkuCatalogPage />} />
              <Route path="/ms-catalog" element={<MicrosoftCatalogPage />} />
              <Route path="/opportunities" element={<OpportunitiesPage />} />
              <Route path="/chat-logs" element={<ChatLogsPage />} />
              <Route path="/calc-leads" element={<CalcLeadsPage />} />
              <Route path="/agent-config" element={<AgentConfigPage />} />
              <Route path="/agent-tools" element={<AgentToolsPage />} />
              <Route path="/config/license-costs" element={<ConfigGuard><LicenseCostsPage /></ConfigGuard>} />
              <Route path="/config/contract-docs" element={<ConfigGuard><ContractDocsPage /></ConfigGuard>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default AdminApp;
