import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { Router } from '@angular/router';

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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8080/api/v1/auth';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_DATA_KEY = 'auth_user_data';  // Clave para datos de usuario

  // BehaviorSubject para mantener el estado de autenticación
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Verificar si hay un token guardado al iniciar la app
    this.checkUserSession();
  }

  // Verifica si el usuario tiene una sesión activa
  private checkUserSession(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);

    if (token) {
      // Intentar recuperar los datos del usuario
      const userDataStr = localStorage.getItem(this.USER_DATA_KEY);
      let userData: User = { token };

      if (userDataStr) {
        try {
          const userInfo = JSON.parse(userDataStr);
          userData = {
            ...userData,
            email: userInfo.email,
            username: userInfo.username || userInfo.email // Fallback al email si no hay username
          };
        } catch (e) {
          console.error('Error al parsear datos del usuario', e);
        }
      }

      this.currentUserSubject.next(userData);
    }
  }

  // Getter para saber si el usuario está autenticado
  public get isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  // Obtener el usuario actual
  public get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

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
        tap(response => {
          // Guardar token en localStorage
          localStorage.setItem(this.TOKEN_KEY, response.jwt);

          // Guardar datos del usuario
          const userInfo = {
            email: response.email,
            username: response.username || response.email // Si no hay username, usar email
          };
          localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userInfo));

          // Actualizar el estado de autenticación
          const user: User = {
            token: response.jwt,
            email: response.email,
            username: response.username || response.email // Si no hay username, usar email
          };
          this.currentUserSubject.next(user);
        }),
        catchError(this.handleError)
      );
  }

  // Método para cerrar sesión
  logout(): void {
    // Limpiar localStorage
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_DATA_KEY);

    // Actualizar el estado de autenticación
    this.currentUserSubject.next(null);

    // Redirigir al login
    this.router.navigate(['/login']);
  }

  // Método para manejar errores de HTTP
  private handleError(error: HttpErrorResponse) {
    console.error('Error HTTP:', error);
    return throwError(() => error);
  }
}
