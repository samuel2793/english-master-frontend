export interface ExerciseType {
  code: string;
  name: string;
}

export interface ExerciseCategory {
  code: string;
  name: string;
  types: ExerciseType[];
}

export interface ExerciseCatalogResponse {
  levelId: number;
  levelCode: string;
  categories: ExerciseCategory[];
}
