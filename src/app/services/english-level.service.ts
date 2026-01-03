import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from './auth.service';
import { catchError, map, tap } from 'rxjs/operators';

export interface EnglishLevel {
  id: string;
  code: string;
  name: string;
  description: string;
  orderIndex: number;
}

@Injectable({
  providedIn: 'root',
})
export class EnglishLevelService {
  // Lista de niveles disponibles
  private availableLevels: string[] = [];

  // Nivel actual del usuario
  private currentLevel = new BehaviorSubject<string>('');
  public currentLevel$ = this.currentLevel.asObservable();

  constructor(
    private firestore: AngularFirestore,
    private authService: AuthService
  ) {
    // Suscribirse a cambios en el usuario para cargar su nivel
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        // Usuario autenticado, cargar niveles
        this.loadAvailableLevels().subscribe();

        if (user.englishLevel) {
          this.currentLevel.next(user.englishLevel);
        } else {
          // Si el usuario no tiene nivel, establecer A1 por defecto
          this.setUserLevel('A1');
        }
      } else {
        // Usuario no autenticado, usar niveles por defecto
        this.availableLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        this.currentLevel.next('');
      }
    });
  }

  // Cargar niveles disponibles desde Firestore
  loadAvailableLevels(): Observable<string[]> {
    return this.firestore
      .collection<EnglishLevel>('englishLevels', ref => ref.orderBy('orderIndex'))
      .valueChanges()
      .pipe(
        map((levels) => {
          return levels.map((level) => level.code);
        }),
        tap((levels) => {
          this.availableLevels = levels;

          // Si no hay nivel actual y hay niveles disponibles, establecer el primero
          if (!this.currentLevel.getValue() && levels.length > 0) {
            this.currentLevel.next(levels[0]);
          }
        }),
        catchError((error) => {
          console.error('Error al cargar niveles de inglés:', error);
          // Devolver niveles por defecto si hay error
          this.availableLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
          return of(this.availableLevels);
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

  // Obtener el nivel actual del usuario
  getCurrentLevel(): string {
    return this.currentLevel.getValue();
  }

  // Establecer el nivel del usuario
  setUserLevel(level: string): void {
    if (!this.availableLevels.includes(level)) {
      console.error(
        `Nivel "${level}" no válido, debe ser uno de: ${this.availableLevels.join(', ')}`
      );
      return;
    }

    // Actualizar en el servicio de autenticación
    this.authService.updateEnglishLevel(level).subscribe({
      next: () => {
        this.currentLevel.next(level);
        console.log(`Nivel de inglés establecido a: ${level}`);
      },
      error: (error) => {
        console.error('Error al establecer nivel de inglés:', error);
      }
    });
  }
}
