import { CalendarDays, Building2, List, FileText, Users, SprayCan, LayoutDashboard, Receipt, KeyRound } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Início", url: "/", icon: LayoutDashboard },
  { title: "Calendário", url: "/calendario", icon: CalendarDays },
  { title: "Reservas", url: "/reservas", icon: List },
  { title: "Longa Temporada / Anual", url: "/longatemporada", icon: KeyRound },
  { title: "Propriedades", url: "/propriedades", icon: Building2 },
  { title: "Proprietários", url: "/proprietarios", icon: Users },
  { title: "Faxina Terceirizada", url: "/faxina-terceirizada", icon: SprayCan },
  { title: "Relatórios", url: "/relatorios", icon: FileText },
  { title: "Recibos", url: "/recibos", icon: Receipt },
]

export function AppSidebar() {
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()

  function isItemActive(url: string) {
    if (url === "/") return pathname === "/"
    return pathname.startsWith(url)
  }

  function handleNavClick() {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          to="/"
          className="flex items-center gap-2 px-2 py-2 hover:opacity-80 transition-opacity"
          onClick={handleNavClick}
        >
          <img src="/lox.svg" alt="Lox" className="h-7 w-7 rounded" />
          <span className="text-lg font-bold">Lox</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isItemActive(item.url)} size="lg">
                    <Link to={item.url} onClick={handleNavClick}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <span className="text-xs text-muted-foreground px-2">
          v{__APP_VERSION__}
        </span>
      </SidebarFooter>
    </Sidebar>
  )
}
