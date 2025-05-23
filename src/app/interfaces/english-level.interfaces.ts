// Interfaz para los datos que llegan de la API
export interface EnglishLevelResponse {
  id: number;
  code: string;
  name: string;
  description: string | null;
  orderIndex: number | null;
}
