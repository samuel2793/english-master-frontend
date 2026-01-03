import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ActivitiesService } from '../../services/activities.service';
import {
  CourseType,
  LevelType,
  Exercise,
} from '../../interfaces/activity.interfaces';

@Component({
  selector: 'app-exercise-viewer',
  templateUrl: './exercise-viewer.component.html',
  styleUrls: ['./exercise-viewer.component.scss'],
})
export class ExerciseViewerComponent implements OnInit {
  course: CourseType | null = null;
  level: LevelType | null = null;
  activity: string | null = null;
  exerciseId: string | null = null;
  exercise$: Observable<Exercise | null> | null = null;
  loading = false;
  error: string | null = null;

  // Flags para mostrar diferentes secciones según el tipo
  showAnswers = false;

  // Para ejercicios interactivos (Cross Matching, etc.)
  userAnswers: { [key: string]: string } = {};
  showResults = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private activitiesService: ActivitiesService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.course = params['course'] as CourseType;
      this.level = params['level'] as LevelType;
      this.activity = params['activity'];
      this.exerciseId = params['exerciseId'];

      if (this.course && this.level && this.activity && this.exerciseId) {
        this.loadExercise();
      }
    });
  }

  loadExercise(): void {
    if (!this.course || !this.level || !this.activity || !this.exerciseId) return;

    this.loading = true;
    this.error = null;

    this.exercise$ = this.activitiesService
      .getExercise(this.course, this.level, this.activity, this.exerciseId)
      .pipe(
        catchError((err) => {
          this.loading = false;
          this.error = 'Error loading exercise. Please try again.';
          console.error('Error loading exercise:', err);
          return of(null);
        })
      );

    this.exercise$.subscribe(() => {
      this.loading = false;
    });
  }

  goBack(): void {
    if (this.course && this.level && this.activity) {
      this.router.navigate(['/activities', this.course, this.level, this.activity]);
    }
  }

  toggleAnswers(): void {
    this.showAnswers = !this.showAnswers;
  }

  // Helpers para tipos específicos
  isGrammarTest(): boolean {
    return this.course === 'grammar-tests';
  }

  isSpeaking(): boolean {
    return this.course === 'speaking';
  }

  isWriting(): boolean {
    return this.course === 'writing';
  }

  parseGrammarChoices(choicesString: string): string[] {
    return this.activitiesService.parseGrammarChoices(choicesString);
  }

  getSpeakingImageUrl(imageNumber: string): string {
    if (!this.level || !this.activity) return '';
    return this.activitiesService.getSpeakingImageUrl(
      this.level,
      this.activity,
      imageNumber
    );
  }

  getCourseName(): string {
    return this.course
      ? this.activitiesService.getCourseName(this.course)
      : '';
  }

  getActivityDisplayName(): string {
    return this.activity
      ? this.activity.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
      : '';
  }

  // Helper para renderizar JSON de manera legible
  formatJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }

  // Helper para obtener letras (A, B, C, D...)
  getChoiceLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  // Helper para obtener las keys de un objeto (usado en preguntas tipo Cross Matching)
  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj).sort((a, b) => parseInt(a) - parseInt(b)) : [];
  }

  // Helper para verificar si algo es un array
  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  // Seleccionar respuesta para una pregunta
  selectAnswer(questionKey: string, answer: string): void {
    this.userAnswers[questionKey] = answer;
  }

  // Verificar si la respuesta del usuario es correcta
  isCorrectAnswer(questionKey: string, solutions: any): boolean {
    if (!solutions || !this.userAnswers[questionKey]) return false;
    return this.userAnswers[questionKey] === solutions[questionKey];
  }

  // Verificar respuestas y mostrar resultados
  checkAnswers(): void {
    this.showResults = true;
  }

  // Reiniciar ejercicio
  resetExercise(): void {
    this.userAnswers = {};
    this.showResults = false;
    this.showAnswers = false;
  }

  // Contar respuestas correctas
  getCorrectCount(solutions: any): number {
    let count = 0;
    for (const key in solutions) {
      if (this.userAnswers[key] === solutions[key]) {
        count++;
      }
    }
    return count;
  }

  // Manejar error de carga de imagen
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
