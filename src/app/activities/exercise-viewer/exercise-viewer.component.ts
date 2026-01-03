import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
  selectedGap: string | null = null; // Gap seleccionado para Missing Paragraphs

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private activitiesService: ActivitiesService,
    private cdr: ChangeDetectorRef
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

  // Helper para formatear texto con saltos de línea
  formatTextWithBreaks(text: string): string {
    if (!text) return '';
    return text.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n');
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

  // Métodos para Missing Paragraphs
  getTextSegments(text: string): Array<{type: string, content?: string, index?: string}> {
    if (!text) return [];
    const segments: Array<{type: string, content?: string, index?: string}> = [];
    const parts = text.split('[]');

    parts.forEach((part, index) => {
      if (part.trim()) {
        segments.push({ type: 'text', content: part.trim() });
      }
      if (index < parts.length - 1) {
        segments.push({ type: 'gap', index: (index + 1).toString() });
      }
    });

    return segments;
  }

  getTotalGaps(text: string): number {
    return (text.match(/\[\]/g) || []).length;
  }

  getChoiceText(choices: any[], key: string): string {
    const choice = choices.find(c => c.key === key);
    return choice ? choice.value : '';
  }

  getAvailableChoices(choices: any[]): any[] {
    return choices.filter(c => !this.isChoiceUsed(c.key));
  }

  isChoiceUsed(key: string): boolean {
    return Object.values(this.userAnswers).includes(key);
  }

  removeAnswer(gapIndex: string): void {
    delete this.userAnswers[gapIndex];
  }

  checkGapAnswer(gapIndex: string, exercise: Exercise): boolean {
    // Para Missing Paragraphs, el orden correcto es alfabético: gap 1=a, gap 2=b, etc.
    if (exercise.payload.choices && exercise.payload.text?.includes('[]')) {
      const expectedAnswer = this.getExpectedAnswerForGap(parseInt(gapIndex));
      return this.userAnswers[gapIndex] === expectedAnswer;
    }
    return !!this.userAnswers[gapIndex];
  }

  getExpectedAnswerForGap(gapNumber: number): string {
    // Gap 1 -> 'a', Gap 2 -> 'b', etc.
    return String.fromCharCode(96 + gapNumber); // 97 es 'a' en ASCII
  }

  getCorrectGapsCount(exercise: Exercise): number {
    if (!exercise.payload.choices || !exercise.payload.text?.includes('[]')) {
      return Object.keys(this.userAnswers).filter(key => this.userAnswers[key]).length;
    }

    // Contar cuántos gaps tienen la respuesta correcta
    let correctCount = 0;
    for (const gapIndex in this.userAnswers) {
      if (this.checkGapAnswer(gapIndex, exercise)) {
        correctCount++;
      }
    }
    return correctCount;
  }

  // Métodos para Missing Paragraphs con sistema de clicks
  selectGap(gapIndex: string): void {
    if (this.showResults) return;
    this.selectedGap = gapIndex;
  }

  assignParagraphToGap(choiceKey: string): void {
    if (this.showResults || !this.selectedGap) return;

    // Si el párrafo ya está usado en otro hueco, quitarlo de ahí
    if (this.isChoiceUsed(choiceKey)) {
      const oldGap = this.getGapForChoice(choiceKey);
      if (oldGap && oldGap !== this.selectedGap) {
        delete this.userAnswers[oldGap];
      }
    }

    // Asignar el párrafo al hueco seleccionado
    this.userAnswers[this.selectedGap] = choiceKey;
    this.selectedGap = null; // Deseleccionar después de asignar
  }

  getGapForChoice(choiceKey: string): string | null {
    for (const [gapIndex, value] of Object.entries(this.userAnswers)) {
      if (value === choiceKey) {
        return gapIndex;
      }
    }
    return null;
  }

  // Manejar error de carga de imagen
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
