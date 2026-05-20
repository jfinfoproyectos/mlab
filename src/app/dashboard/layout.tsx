import { ModeToggle } from "@/components/theme/mode-toggle"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-svh w-screen flex flex-col overflow-hidden bg-background">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
        <div className="flex items-center gap-4 flex-grow min-w-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-black text-sm tracking-widest text-primary uppercase">MusicLab</span>
            <span className="text-[10px] font-black uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/40">Studio</span>
          </div>
          <div id="header-portal" className="flex-1 flex items-center gap-2 justify-end overflow-x-auto no-scrollbar py-1" />
        </div>
        <div className="flex items-center gap-4 flex-shrink-0 border-l border-border/30 pl-4">
          <ModeToggle />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden w-full relative">
        {children}
      </div>
    </div>
  )
}
