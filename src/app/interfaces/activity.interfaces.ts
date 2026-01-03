// Tipos de cursos disponibles
export type CourseType = 'listening' | 'reading' | 'use-of-english' | 'writing' | 'speaking' | 'grammar-tests';

// Niveles disponibles
export type LevelType = 'b1' | 'b2' | 'c1' | 'c2';

// Documento en Firestore contentFiles
export interface ContentFile {
  relpath: string;           // Ruta del archivo en dump (ej: "listening/b1/Extracts/1.json")
  filename: string;          // Nombre del archivo (ej: "1.json")
  module: string | null;     // Curso (ej: "listening")
  level: string | null;      // Nivel (ej: "b1")
  group: string | null;      // Grupo/actividad (ej: "Extracts")
  sha256: string;            // Hash del contenido
  size_bytes: number;        // Tamaño en bytes
  updatedAt: any;            // Timestamp de Firestore
  source: string;            // "dump"
  schemaVersion: number;     // Versión del esquema
  data?: any;                // JSON parseado (si no está en Storage)
  storedInStorage: boolean;  // true si está en Storage
  storage?: {                // Info de Storage si aplica
    bucket: string;
    path: string;
  };
}

// Estructura general de un ejercicio
export interface Exercise {
  id: string;                // ID único del ejercicio
  course: CourseType;        // Curso al que pertenece
  level: LevelType;          // Nivel
  activity: string;          // Nombre de la actividad/parte
  relpath: string;           // Ruta completa en Firestore
  payload: any;              // Datos específicos del ejercicio
}

// Índice de actividades (común en varios cursos)
export interface ActivityIndex {
  name: string;
  slug?: string;
  count?: number;
  description?: string;
}

// Estructura específica para Writing
export interface WritingExercise {
  opening: string;
  subject?: string;
  closure: string;
  paragraphs?: string[];
  points?: string[];
  type?: string;
}

// Estructura específica para Speaking
export interface SpeakingExercise {
  questions: string[];
  image?: string;  // "1", "2", etc.
  notes?: string;
}

// Estructura específica para Grammar Tests
export interface GrammarQuestion {
  text: string;              // Texto con [] como hueco
  choices: string;           // Opciones separadas por //
  solution: string;          // Respuesta correcta
  explanation?: string;      // Explicación
  topic?: {
    name: string;
    slug: string;
  };
}

// Estructura para Listening/Reading/Use of English
export interface ComprehensionExercise {
  headline?: string;
  text?: string;
  questions?: Array<{
    question: string;
    options?: string[];
    answer?: string;
  }>;
  // Campos adicionales según el tipo de ejercicio
  [key: string]: any;
}

// Filtros para búsqueda
export interface ActivityFilter {
  course: CourseType;
  level: LevelType;
  activity?: string;
  limit?: number;
}

// Resultado de listado con metadata
export interface ActivityList<T = any> {
  items: T[];
  total: number;
  hasMore: boolean;
}
