import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs';
import { User } from 'src/app/interfaces/auth.interfaces';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  level: string = 'A1'; // Valor por defecto
  levelsAvaliable: string[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  // Propiedades para controlar la autenticación
  isLoggedIn: boolean = false;
  currentUser: User | null = null;
  private authSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Subscribirse a los cambios en el estado de autenticación
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      this.currentUser = user;
    });
  }

  ngOnDestroy(): void {
    // Limpiar la subscripción cuando el componente se destruya
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // Método para cambiar el nivel
  setLevel(level: string): void {
    this.level = level;
  }

  // Método para mostrar el nombre de usuario
  getUserDisplayName(): string {
    if (!this.currentUser) return 'Usuario';

    // Si el username es igual al email, extraer solo la parte antes del @
    if (this.currentUser.username && this.currentUser.email &&
        this.currentUser.username === this.currentUser.email) {
      return this.currentUser.email.split('@')[0];
    }

    return this.currentUser.username || this.currentUser.email?.split('@')[0] || 'Usuario';
  }

  // Método para cerrar sesión
  logout(): void {
    this.authService.logout();
  }
}
