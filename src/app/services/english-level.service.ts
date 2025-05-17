import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type EnglishLevel = 'B1' | 'B2' | 'C1' | 'C2';

@Injectable({
  providedIn: 'root'
})
export class EnglishLevelService {
  // Lista de niveles disponibles
  private availableLevels: EnglishLevel[] = ['B1', 'B2', 'C1', 'C2'];

  // Nivel actual del usuario (con valor por defecto C1)
  private currentLevel = new BehaviorSubject<EnglishLevel>('C1');

  constructor() { }

  // Obtener todos los niveles disponibles
  getAvailableLevels(): EnglishLevel[] {
    return [...this.availableLevels];
  }

  // Obtener el nivel actual del usuario como string
  getCurrentLevel(): EnglishLevel {
    return this.currentLevel.getValue();
  }

  // Establecer el nivel del usuario
  setUserLevel(level: EnglishLevel): void {
    if (this.availableLevels.includes(level)) {
      this.currentLevel.next(level);
    }
  }
}
