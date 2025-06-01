import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  User,
} from '../interfaces/auth.interfaces';
import { EnglishLevelService } from './english-level.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8080/api/v1/auth';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_DATA_KEY = 'auth_user_data'; // Clave para datos de usuario

  // BehaviorSubject para mantener el estado de autenticación
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router, private injector: Injector) {
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
            username: userInfo.username || userInfo.email, // Fallback al email si no hay username
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
    return this.http
      .post<AuthResponse>(`${this.API_URL}/register`, userData)
      .pipe(catchError(this.handleError));
  }

  // Método para iniciar sesión
  login(loginData: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/login`, loginData)
      .pipe(
        tap((response) => {
          // Guardar token en localStorage
          localStorage.setItem(this.TOKEN_KEY, response.jwt);

          // Guardar datos del usuario
          const userInfo = {
            email: response.email,
            username: response.username || response.email, // Si no hay username, usar email
          };
          localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userInfo));

          // Actualizar el estado de autenticación
          const user: User = {
            token: response.jwt,
            email: response.email,
            username: response.username || response.email, // Si no hay username, usar email
          };
          this.currentUserSubject.next(user);

          // Cargar el nivel de inglés del usuario autenticado
          this.injector
            .get(EnglishLevelService)
            .loadUserEnglishLevel()
            .subscribe();
        }),
        catchError(this.handleError)
      );
  }

  // Método para cerrar sesión
  logout(): void {
    // Obtener el token del localStorage
    const token = localStorage.getItem(this.TOKEN_KEY);

    if (token) {
      // Configurar el encabezado con el token JWT
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      // Enviar petición POST a logout
      this.http
        .post(`${this.API_URL}/logout`, {}, { headers })
        .pipe(
          catchError((error) => {
            console.error('Error al cerrar sesión:', error);
            return throwError(() => error);
          })
        )
        .subscribe({
          next: () => {
            // Limpieza y redirección
            this.handleLogoutSuccess();
          },
          error: () => {
            // En caso de error, continuar con logout local de todas formas
            this.handleLogoutSuccess();
          },
        });
    } else {
      // Si no hay token, simplemente limpiar y redirigir
      this.handleLogoutSuccess();
    }
  }

  // Método privado para ejecutar el proceso de logout local
  private handleLogoutSuccess(): void {
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
