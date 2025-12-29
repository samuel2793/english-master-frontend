import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { EnglishLevelService } from '../services/english-level.service';
import { ExerciseCategory } from '../interfaces/exercise-catalog.interfaces';
import { Subscription, combineLatest } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  userLevel: string = '';
  categories: ExerciseCategory[] = [];
  loading: boolean = true;
  private subscription: Subscription | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private englishLevelService: EnglishLevelService
  ) {}

  ngOnInit(): void {
    // Suscribirse a cambios en el nivel Y en el levelId
    this.subscription = combineLatest([
      this.englishLevelService.currentLevel$,
      this.englishLevelService.currentLevelId$
    ]).pipe(
      filter(([level, levelId]) => !!level && !!levelId) // Solo continuar si ambos tienen valor
    ).subscribe(([level, levelId]) => {
      this.userLevel = level;
      this.loadExerciseCatalog();
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  loadExerciseCatalog(): void {
    const levelId = this.englishLevelService.getCurrentLevelId();

    if (!levelId) {
      console.error('No se pudo obtener el ID del nivel');
      this.loading = false;
      return;
    }

    this.loading = true;
    this.englishLevelService.getExerciseCatalog(levelId).subscribe({
      next: (catalog) => {
        this.categories = catalog.categories || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar el catálogo:', error);
        this.loading = false;
      }
    });
  }

  navigateTo(categoryCode: string, typeCode?: string): void {
    if (typeCode) {
      console.log(`Navegando a ${categoryCode}/${typeCode}`);
      this.router.navigate([`/${categoryCode}`, typeCode]);
    } else {
      console.log(`Navegando a ${categoryCode}`);
      this.router.navigate([`/${categoryCode}`]);
    }
  }

  getCategoryIcon(categoryCode: string): string {
    const icons: { [key: string]: string } = {
      'listening': 'headphones',
      'reading': 'menu_book',
      'speaking': 'record_voice_over',
      'use-of-english': 'spellcheck',
      'writing': 'edit'
    };
    return icons[categoryCode] || 'help';
  }
}
