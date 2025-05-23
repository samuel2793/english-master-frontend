import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap, of } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EnglishLevelResponse } from '../interfaces/english-level.interfaces';


@Injectable({
  providedIn: 'root',
})
export class EnglishLevelService {
  private readonly API_URL = 'http://localhost:8080/api/english-levels';
  private readonly TOKEN_KEY = 'auth_token'; // La misma clave que usa AuthService

  // Lista de niveles disponibles (se cargará desde la API)
  private availableLevels: string[] = [];

  // Nivel actual del usuario (con valor por defecto C1, en un futuro debe ser cargado desde los datos del usuario)
  private currentLevel = new BehaviorSubject<string>('C1');
  public currentLevel$ = this.currentLevel.asObservable();

  constructor(private http: HttpClient) {
    // Cargar niveles al inicio
    this.loadAvailableLevels().subscribe();
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

          // Si el nivel actual no está en la lista, establecer el primero
          if (
            levels.length > 0 &&
            !levels.includes(this.currentLevel.getValue())
          ) {
            this.currentLevel.next(levels[0]);
          }
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
