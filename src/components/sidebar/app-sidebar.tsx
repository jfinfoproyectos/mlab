"use client"

import { authClient } from "@/lib/auth-client"
import { NavUser } from "@/components/sidebar/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { 
  UsersIcon, 
  SettingsIcon, 
  MonitorIcon, 
  ShieldCheckIcon, 
  TvIcon, 
  FileTextIcon, 
  CalendarIcon, 
  ImageIcon, 
  FilePieChartIcon, 
  LockIcon, 
  AlertTriangleIcon, 
  HistoryIcon,
  LayoutDashboardIcon,
  CommandIcon,
  MusicIcon,
  ListMusic
} from "lucide-react"

import Link from "next/link"
import Image from "next/image"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = authClient.useSession()

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  }

  const roleLabel = "Estudio Armónico"

  const currentNav = [
    { title: "Estudio Creativo", icon: LayoutDashboardIcon, url: "/dashboard" },
    { title: "Generador de Acordes", icon: MusicIcon, url: "/dashboard/chord-generator" },
    { title: "Organizador de Canciones", icon: ListMusic, url: "/dashboard/song-generator" },
    { title: "Ajustes de IA", icon: SettingsIcon, url: "/dashboard/settings" },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/" className="flex items-center gap-2 leading-tight">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary-foreground">
                  <Image 
                    src="/logo.png" 
                    alt="MusicLab Logo" 
                    width={24} 
                    height={24} 
                    className="rounded-sm object-contain"
                  />
                </div>
                <div className="flex flex-col items-start gap-0">
                  <span className="text-lg font-bold tracking-tight">MusicLab</span>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground/80 tracking-widest leading-none">
                    {roleLabel}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="p-2 gap-1">
          {currentNav.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title} className="rounded-xl h-10">
                <Link href={item.url} className="flex items-center gap-3">
                  <item.icon className="size-4.5 text-muted-foreground" />
                  <span className="font-medium text-sm text-foreground">
                    {item.title}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ ...user, role: roleLabel }} />
      </SidebarFooter>
    </Sidebar>
  )
}
