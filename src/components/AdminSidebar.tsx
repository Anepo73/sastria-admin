import {
  Building2, Package, Layers, FileText,
  ChevronLeft, Ticket, BarChart2, MessageSquare, ExternalLink, Bot, Wrench, Crown
} from 'lucide-react';
import { SastrIALogo } from '@/components/SastrIALogo';
import { SastrIAAvatar } from '@/components/SastrIAAvatar';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const adminItems = [
  { title: 'Tenants',             url: '/',              icon: Building2  },
  { title: 'Vouchers',            url: '/vouchers',      icon: Ticket     },
  { title: 'Planos',              url: '/plans',         icon: Crown      },
  { title: 'Leads Calculadora',   url: '/calc-leads',    icon: BarChart2  },
  { title: 'Catálogo SKUs',       url: '/sku-catalog',   icon: Package    },
  { title: 'Catálogo Microsoft',  url: '/ms-catalog',    icon: Layers     },
  { title: 'Chat Logs',           url: '/chat-logs',     icon: FileText   },
  { title: 'Config do Agente',    url: '/agent-config',  icon: Bot        },
  { title: 'Tools do Agente',     url: '/agent-tools',   icon: Wrench     },
];

export function AdminSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <SastrIAAvatar size={collapsed ? 'xs' : 'sm'} />
          {!collapsed && (
            <div className="flex items-center gap-1.5">
              <SastrIALogo className="text-lg" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/60 mt-0.5">Admin</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/60 text-xs uppercase tracking-wider">
            Administração
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Link back to user chat */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/60 text-xs uppercase tracking-wider">
            Aplicação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Abrir Chat">
                  <a
                    href="/chat-ai"
                    className="hover:bg-sidebar-accent transition-colors flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">Ir para Chat</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground/40" />
                      </>
                    )}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="w-full h-8 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
