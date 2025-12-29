import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap, of, catchError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EnglishLevelResponse } from '../interfaces/english-level.interfaces';
import { ExerciseCatalogResponse } from '../interfaces/exercise-catalog.interfaces';

@Injectable({
  providedIn: 'root',
})
export class EnglishLevelService {
  private readonly API_URL = 'http://localhost:8080/api/english-levels';
  private readonly USER_LEVEL_API_URL =
    'http://localhost:8080/api/users/me/english-level';
  private readonly TOKEN_KEY = 'auth_token';

  // Lista de niveles disponibles (se cargará desde la API)
  private availableLevels: string[] = [];
  private availableLevelsData: EnglishLevelResponse[] = []; // Guardamos la data completa

  // Nivel actual del usuario
  private currentLevel = new BehaviorSubject<string>('');
  public currentLevel$ = this.currentLevel.asObservable();

  // Nuevo: ID del nivel actual
  private currentLevelId = new BehaviorSubject<number | null>(null);
  public currentLevelId$ = this.currentLevelId.asObservable();

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
        map((response) => {
          // Guardar la respuesta completa
          this.availableLevelsData = response;

          // Guardar la respuesta completa para poder acceder a los IDs
          const currentCode = this.currentLevel.getValue();
          const currentLevelData = response.find((l) => l.code === currentCode);
          if (currentLevelData) {
            this.currentLevelId.next(currentLevelData.id);
          }
          return response.map((level) => level.code);
        }),
        tap((levels) => {
          this.availableLevels = levels;

          // Si el nivel actual está vacío y tenemos niveles disponibles, establecer el primero
          if (!this.currentLevel.getValue() && levels.length > 0) {
            this.currentLevel.next(levels[0]);
            // También establecer el ID del primer nivel
            if (this.availableLevelsData.length > 0) {
              this.currentLevelId.next(this.availableLevelsData[0].id);
            }
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
        let levelId = null;

        if (typeof response === 'string') {
          level = response;
        } else if (response && response.level) {
          level = response.level;
        } else if (response && response.englishLevel) {
          level = response.englishLevel;
        } else if (response && response.code) {
          level = response.code;
        }

        // Intentar obtener el ID también
        if (response && response.id) {
          levelId = response.id;
          this.currentLevelId.next(levelId);
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
      // Obtener el token para autorizar la petición
      const token = localStorage.getItem(this.TOKEN_KEY);

      if (!token) {
        console.error(
          'No se puede establecer el nivel: usuario no autenticado'
        );
        return;
      }

      // NUEVO: Buscar el levelData ANTES de hacer la petición
      const levelData = this.availableLevelsData.find((l) => l.code === level);

      if (!levelData) {
        console.error(`No se encontró el nivel ${level} en los datos disponibles`);
        return;
      }

      // Crear los headers con el token
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      // URL para establecer el nivel de inglés
      const url = `http://localhost:8080/api/users/me/english-level/${level}`;

      // Realizar la petición PUT al endpoint
      this.http.put<any>(url, {}, { headers }).subscribe({
        next: () => {
          // IMPORTANTE: Actualizar primero el ID, luego el código
          // Esto asegura que cuando el componente reaccione al cambio del código,
          // el ID ya esté actualizado
          this.currentLevelId.next(levelData.id);
          this.currentLevel.next(level);

          console.log(`Nivel de inglés establecido a: ${level} (ID: ${levelData.id})`);
        },
        error: (error) => {
          console.error('Error al establecer nivel de inglés:', error);
        },
      });
    } else {
      console.error(
        `Nivel "${level}" no válido, debe ser uno de: ${this.availableLevels.join(
          ', '
        )}`
      );
    }
  }

  // Nuevo: Obtener catálogo de ejercicios por nivel
  getExerciseCatalog(levelId: number): Observable<ExerciseCatalogResponse> {
    const token = localStorage.getItem(this.TOKEN_KEY);

    if (!token) {
      return of({} as ExerciseCatalogResponse);
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http
      .get<ExerciseCatalogResponse>(
        `${this.API_URL}/${levelId}/exercise-catalog`,
        { headers }
      )
      .pipe(
        catchError((error) => {
          console.error('Error al cargar catálogo de ejercicios:', error);
          return of({} as ExerciseCatalogResponse);
        })
      );
  }

  // Obtener el ID del nivel actual
  getCurrentLevelId(): number | null {
    return this.currentLevelId.getValue();
  }
}
