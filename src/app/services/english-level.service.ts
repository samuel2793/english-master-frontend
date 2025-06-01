import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap, of, catchError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EnglishLevelResponse } from '../interfaces/english-level.interfaces';

@Injectable({
  providedIn: 'root',
})
export class EnglishLevelService {
  private readonly API_URL = 'http://localhost:8080/api/english-levels';
  private readonly USER_LEVEL_API_URL =
    'http://localhost:8080/api/users/me/english-level';
  private readonly TOKEN_KEY = 'auth_token'; // La misma clave que usa AuthService

  // Lista de niveles disponibles (se cargará desde la API)
  private availableLevels: string[] = [];

  // Nivel actual del usuario
  private currentLevel = new BehaviorSubject<string>('');
  public currentLevel$ = this.currentLevel.asObservable();

  constructor(private http: HttpClient) {
    // Al iniciar, intentamos cargar el nivel del usuario si está autenticado
    // y luego cargamos la lista de niveles disponibles
    this.loadUserEnglishLevel().subscribe(() => {
      this.loadAvailableLevels().subscribe();
    });
  }

  // Obtener todos los niveles disponibles desde la API
  loadAvailableLevels(): Observable<string[]> {
    // Obtener el token del localStorage
    const token = localStorage.getItem(this.TOKEN_KEY);

    if (!token) {
      return of([]);
    }

    // Crear los headers con el token
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http
      .get<EnglishLevelResponse[]>(this.API_URL, { headers })
      .pipe(
        map((response) => response.map((level) => level.code)),
        tap((levels) => {
          this.availableLevels = levels;

          // Si el nivel actual está vacío y tenemos niveles disponibles, establecer el primero
          if (!this.currentLevel.getValue() && levels.length > 0) {
            this.currentLevel.next(levels[0]);
          }
        }),
        catchError((error) => {
          console.error('Error al cargar niveles de inglés:', error);
          return of([]);
        })
      );
  }

  // Cargar el nivel de inglés del usuario desde la API
  loadUserEnglishLevel(): Observable<string> {
    const token = localStorage.getItem(this.TOKEN_KEY);

    if (!token) {
      return of(this.currentLevel.getValue());
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    console.log('Solicitando nivel de inglés del usuario...');

    return this.http.get<any>(this.USER_LEVEL_API_URL, { headers }).pipe(
      tap((response) =>
        console.log('Respuesta del servidor (nivel inglés):', response)
      ),
      map((response) => {
        // Adaptamos para aceptar diferentes formatos de respuesta posibles
        let level = '';
        if (typeof response === 'string') {
          level = response;
        } else if (response && response.level) {
          level = response.level;
        } else if (response && response.englishLevel) {
          level = response.englishLevel;
        } else if (response && response.code) {
          level = response.code;
        }
        return level;
      }),
      tap((level) => {
        // console.log('Nivel de inglés obtenido:', level);
        if (level) {
          this.currentLevel.next(level);
        }
      }),
      catchError((error) => {
        console.error('Error al obtener nivel de inglés del usuario:', error);
        return of(this.currentLevel.getValue());
      })
    );
  }

  // Obtener todos los niveles disponibles
  getAvailableLevels(): Observable<string[]> {
    if (this.availableLevels.length === 0) {
      return this.loadAvailableLevels();
    }
    return of([...this.availableLevels]);
  }

  // Obtener el nivel actual del usuario como string
  getCurrentLevel(): string {
    return this.currentLevel.getValue();
  }

  // Establecer el nivel del usuario
  setUserLevel(level: string): void {
    if (this.availableLevels.includes(level)) {
      this.currentLevel.next(level);
    }
  }
}
