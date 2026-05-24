export interface AiConfig {
  id: string;
  provider: string;
  apiKey: string;
  modelId: string | null;
  baseUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
