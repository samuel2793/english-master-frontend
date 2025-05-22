import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

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
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8080/api/v1/auth';

  constructor(private http: HttpClient) { }

  // Método para registrar un usuario
  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/register`, userData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Método para iniciar sesión
  login(loginData: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, loginData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Método para cerrar sesión
  logout(token: string): Observable<any> {
    return this.http.post(`${this.API_URL}/logout`, {}, {
      headers: {
        'Authorization': token
      }
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Método para manejar errores de HTTP
  private handleError(error: HttpErrorResponse) {
    // Se registra el error en la consola
    console.error('Error HTTP:', error);

    // Se devuelve el error original para mantener la estructura
    return throwError(() => error);
  }
}
