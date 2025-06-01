import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { EnglishLevelService } from '../services/english-level.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  userLevel: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private englishLevelService: EnglishLevelService
  ) {
    // Obtener el nivel actual del usuario
    this.englishLevelService.currentLevel$.subscribe((level) => {
      this.userLevel = level;
    });
  }

  navigateTo(skill: string): void {
    // Implementar la navegación a las respectivas páginas cuando estén disponibles
    console.log(`Navegando a la sección de ${skill}`);
    this.router.navigate([`/${skill}`]);
  }
}
