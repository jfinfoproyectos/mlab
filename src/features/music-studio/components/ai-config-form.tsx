"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { aiConfigSchema, AiConfigInput } from "../schemas/ai-config.schema";
import { saveAiConfigAction } from "../actions/ai-config.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { AiConfig } from "../types/ai-config.types";

interface AiConfigFormProps {
  initialConfigs: AiConfig[];
}

export function AiConfigForm({ initialConfigs }: AiConfigFormProps) {
  const [loading, setLoading] = useState(false);
  
  // Find the active config, or default to the first config, or default to openai
  const defaultProvider = initialConfigs.find(c => c.isActive)?.provider as AiConfigInput["provider"] 
    || (initialConfigs[0]?.provider as AiConfigInput["provider"]) 
    || "openai";

  const activeConfigForDefault = initialConfigs.find(c => c.provider === defaultProvider);

  const form = useForm<AiConfigInput>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      provider: defaultProvider,
      apiKey: activeConfigForDefault?.apiKey || "",
      modelId: activeConfigForDefault?.modelId || "",
      baseUrl: activeConfigForDefault?.baseUrl || "",
      isActive: activeConfigForDefault?.isActive || false,
    },
  });

  const currentProvider = form.watch("provider");

  // Synchronize form when selected provider changes
  const handleProviderChange = (value: AiConfigInput["provider"]) => {
    form.setValue("provider", value);
    
    const existingConfig = initialConfigs.find((c) => c.provider === value);
    if (existingConfig) {
      form.reset({
        provider: value,
        apiKey: existingConfig.apiKey,
        modelId: existingConfig.modelId || "",
        baseUrl: existingConfig.baseUrl || "",
        isActive: existingConfig.isActive,
      });
    } else {
      form.reset({
        provider: value,
        apiKey: "",
        modelId: "",
        baseUrl: "",
        isActive: false,
      });
    }
  };

  // Synchronize form when initialConfigs changes on the server (e.g. after save)
  useEffect(() => {
    const updatedConfig = initialConfigs.find((c) => c.provider === currentProvider);
    if (updatedConfig) {
      form.reset({
        provider: currentProvider,
        apiKey: updatedConfig.apiKey,
        modelId: updatedConfig.modelId || "",
        baseUrl: updatedConfig.baseUrl || "",
        isActive: updatedConfig.isActive,
      });
    }
  }, [initialConfigs]);

  const onSubmit = async (data: AiConfigInput) => {
    setLoading(true);
    try {
      const result = await saveAiConfigAction(data);
      if (result.success) {
        toast.success("Configuración de IA guardada correctamente");
      } else {
        toast.error(result.error || "Error al guardar la configuración");
      }
    } catch (error) {
      toast.error("Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle>Configuración de Proveedores de IA</CardTitle>
        <CardDescription>
          Configura los proveedores de IA para el sistema. Solo un proveedor puede estar activo a la vez.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider">Proveedor</Label>
              <Select 
                value={form.watch("provider")}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Selecciona un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google">Google Generative AI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input 
                id="apiKey" 
                type="password" 
                placeholder="sk-..." 
                {...form.register("apiKey")} 
              />
              {form.formState.errors.apiKey && (
                <p className="text-xs text-destructive">{form.formState.errors.apiKey.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelId">ID del Modelo (Opcional)</Label>
              <Input 
                id="modelId" 
                placeholder="gpt-4o, claude-3-5-sonnet, etc." 
                {...form.register("modelId")} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL (Opcional)</Label>
              <Input 
                id="baseUrl" 
                placeholder="https://api.openai.com/v1" 
                {...form.register("baseUrl")} 
              />
              {form.formState.errors.baseUrl && (
                <p className="text-xs text-destructive">{form.formState.errors.baseUrl.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch 
              id="isActive" 
              checked={form.watch("isActive")}
              onCheckedChange={(checked) => form.setValue("isActive", checked)}
            />
            <Label htmlFor="isActive">Establecer como proveedor activo</Label>
          </div>

          <Button type="submit" disabled={loading} className="w-full md:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </>
            )}
          </Button>
        </form>

        {initialConfigs.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-medium mb-4">Configuraciones Existentes</h3>
            <div className="space-y-2">
              {initialConfigs.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div>
                    <p className="text-sm font-semibold capitalize">{config.provider}</p>
                    <p className="text-xs text-muted-foreground">{config.modelId || "Modelo por defecto"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {config.isActive && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">
                        Activo
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
