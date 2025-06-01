import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs';
import { User } from 'src/app/interfaces/auth.interfaces';
import { EnglishLevelService } from 'src/app/services/english-level.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  level: string = 'C1'; // Valor por defecto
  levelsAvaliable: string[] = [];

  // Propiedades para controlar la autenticación
  isLoggedIn: boolean = false;
  currentUser: User | null = null;
  private authSubscription: Subscription | null = null;
  private levelSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private englishLevelService: EnglishLevelService
  ) {}

  ngOnInit(): void {
    // Subscribirse a los cambios en el estado de autenticación
    this.authSubscription = this.authService.currentUser$.subscribe((user) => {
      this.isLoggedIn = !!user;
      this.currentUser = user;

      // Cargar niveles cuando el usuario está autenticado
      if (this.isLoggedIn) {
        this.loadLevels();
        // Cargar el nivel de inglés del usuario actual
        this.englishLevelService.loadUserEnglishLevel().subscribe();
      }
    });

    // Suscribirse al nivel actual
    this.levelSubscription = this.englishLevelService.currentLevel$.subscribe(
      (level) => {
        this.level = level;
      }
    );
  }

  ngOnDestroy(): void {
    // Limpiar las subscripciones cuando el componente se destruya
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }

    if (this.levelSubscription) {
      this.levelSubscription.unsubscribe();
    }
  }

  // Cargar los niveles disponibles desde el servicio
  loadLevels(): void {
    this.englishLevelService.getAvailableLevels().subscribe((levels) => {
      this.levelsAvaliable = levels.sort();
    });
  }

  // Método para cambiar el nivel
  setLevel(level: string): void {
    this.englishLevelService.setUserLevel(level);
  }

  // Método para mostrar el nombre de usuario
  getUserDisplayName(): string {
    if (!this.currentUser) return 'Usuario';

    // Si el username es igual al email, extraer solo la parte antes del @
    if (
      this.currentUser.username &&
      this.currentUser.email &&
      this.currentUser.username === this.currentUser.email
    ) {
      return this.currentUser.email.split('@')[0];
    }

    return (
      this.currentUser.username ||
      this.currentUser.email?.split('@')[0] ||
      'Usuario'
    );
  }

  // Método para cerrar sesión
  logout(): void {
    this.authService.logout();
  }
}
