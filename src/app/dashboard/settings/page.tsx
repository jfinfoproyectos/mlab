import { getSession } from "@/proxy";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AiConfigService, AiConfigForm } from "@/features/ai-assistant";

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const aiConfigs = await AiConfigService.getConfigs();

  return (
    <div className="flex flex-col gap-6 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Gestiona las preferencias del sistema, apariencia y tu cuenta.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="general" className="rounded-lg">General</TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-lg">Apariencia</TabsTrigger>
          <TabsTrigger value="ai" className="rounded-lg">IA</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Información de la Plataforma</CardTitle>
              <CardDescription>Configura los detalles básicos de MusicLab Studio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="site-name">Nombre del Sitio</Label>
                <Input id="site-name" defaultValue="MusicLab" className="max-w-md" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-email">Email de Contacto</Label>
                <Input id="contact-email" defaultValue="admin@musiclab.com" className="max-w-md" />
              </div>
              <Separator className="my-4" />
              <Button>Guardar Cambios</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Tema y Estilo</CardTitle>
              <CardDescription>Personaliza la identidad visual de tu dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
               <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Esquema de Colores</Label>
                    <p className="text-sm text-muted-foreground">Visualiza los colores de acento aplicados por el preset.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center gap-1">
                       <div className="w-10 h-10 rounded-2xl bg-primary shadow-lg shadow-primary/20" />
                       <span className="text-[10px] uppercase font-bold text-muted-foreground">Primary</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                       <div className="w-10 h-10 rounded-2xl bg-secondary border border-border" />
                       <span className="text-[10px] uppercase font-bold text-muted-foreground">Second</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                       <div className="w-10 h-10 rounded-2xl bg-accent border border-border" />
                       <span className="text-[10px] uppercase font-bold text-muted-foreground">Accent</span>
                    </div>
                  </div>
               </div>
               
               <Separator />
               
               <div className="space-y-4">
                  <Label className="text-base">Tipografía del Sistema</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 rounded-2xl border-2 border-primary bg-primary/5 flex flex-col gap-2 transition-all hover:bg-primary/10">
                      <span className="text-xl font-sans font-bold text-primary">Space Grotesk</span>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Utilizada para títulos y elementos destacados. Ofrece una lectura clara y moderna.
                      </p>
                    </div>
                    <div className="p-6 rounded-2xl border border-border bg-muted/30 flex flex-col gap-2">
                      <span className="text-xl font-mono font-medium">Geist Mono</span>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Utilizada para datos técnicos y elementos de código.
                      </p>
                    </div>
                  </div>
               </div>

               <div className="rounded-2xl bg-muted/50 p-6 border border-border/50">
                  <p className="text-sm font-medium mb-2">Vista previa de componentes</p>
                  <div className="flex flex-wrap gap-3">
                     <Button size="sm">Botón Primario</Button>
                     <Button variant="outline" size="sm">Bordeado</Button>
                     <Button variant="secondary" size="sm">Secundario</Button>
                     <Button variant="ghost" size="sm">Fantasma</Button>
                  </div>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AiConfigForm initialConfigs={aiConfigs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
