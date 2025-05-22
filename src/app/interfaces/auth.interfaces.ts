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

export interface AuthResponse {
  jwt: string;
  email: string;
  username: string;
}

// Interfaz para el usuario autenticado
export interface User {
  token: string;
  email?: string;
  username?: string;
}
