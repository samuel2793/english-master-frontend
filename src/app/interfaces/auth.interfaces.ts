// Interfaces para request y response
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Interfaz para el usuario autenticado
export interface User {
  uid: string;
  email: string;
  username: string;
  englishLevel?: string;
}

// Interfaz para datos de usuario en Firestore
export interface UserData {
  uid: string;
  email: string;
  username: string;
  englishLevel: string;
  createdAt: any;
  updatedAt: any;
}
