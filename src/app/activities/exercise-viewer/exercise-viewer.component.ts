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

  isMatching(): boolean {
    // Detectar ejercicios de tipo Matching por su estructura (personas con textos)
    // NO por el nombre de la actividad
    return false; // Se detectará por la presencia de people y texts en el HTML
  }

  hasMissingGaps(text: string): boolean {
    if (!text) return false;
    // Detectar si tiene patrón (1) ........... o []
    return /\(\d+\)\s*\.{3,}/.test(text) || text.includes('[]');
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

  getExerciseDisplayTitle(exercise: Exercise): string {
    // Para "matching" (no "multiple-matching") y "signs", siempre mostrar solo "Exercise"
    if ((this.activity?.toLowerCase() === 'matching' || this.activity?.toLowerCase() === 'signs')) {
      return 'Exercise';
    }
    // Para otros ejercicios, usar el título del payload o "Exercise + ID"
    return exercise.payload?.title || `Exercise ${this.exerciseId}`;
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

  // Métodos para Missing Paragraphs y Missing Sentences
  getTextSegments(text: string): Array<{type: string, content?: string, index?: string}> {
    if (!text) return [];
    const segments: Array<{type: string, content?: string, index?: string}> = [];

    // Detectar si usa patrón (1) ........... o []
    const hasMissingSentencesPattern = /\(\d+\)\s*\.{3,}/g.test(text);

    if (hasMissingSentencesPattern) {
      // Patrón para Missing Sentences: (1) ...........
      const regex = /(.*?)\((\d+)\)\s*\.{3,}/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        if (match[1]) {
          segments.push({ type: 'text', content: match[1] });
        }
        segments.push({ type: 'gap', index: match[2] });
        lastIndex = regex.lastIndex;
      }

      // Añadir texto restante
      if (lastIndex < text.length) {
        segments.push({ type: 'text', content: text.substring(lastIndex) });
      }
    } else {
      // Patrón para Missing Paragraphs: []
      const parts = text.split('[]');
      parts.forEach((part, index) => {
        if (part.trim()) {
          segments.push({ type: 'text', content: part.trim() });
        }
        if (index < parts.length - 1) {
          segments.push({ type: 'gap', index: (index + 1).toString() });
        }
      });
    }

    return segments;
  }

  getTotalGaps(text: string): number {
    // Contar gaps de patrón (1) ........... o []
    const missingSentencesGaps = (text.match(/\(\d+\)\s*\.{3,}/g) || []).length;
    const missingParagraphsGaps = (text.match(/\[\]/g) || []).length;
    return missingSentencesGaps > 0 ? missingSentencesGaps : missingParagraphsGaps;
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
    // Para Missing Sentences con solutions
    if (exercise.payload.solutions && Array.isArray(exercise.payload.solutions)) {
      const solution = exercise.payload.solutions.find((s: any) => s.key?.toString() === gapIndex);
      if (solution) {
        const userAnswerKey = this.userAnswers[gapIndex];
        const userAnswerText = exercise.payload.choices?.find((c: any) => c.key?.toString() === userAnswerKey)?.value;
        return userAnswerText === solution.value;
      }
    }
    // Para Missing Sentences con compact_solutions
    if (exercise.payload.compact_solutions && exercise.payload.compact_solutions[gapIndex]) {
      const userAnswerKey = this.userAnswers[gapIndex];
      const userAnswerText = exercise.payload.choices?.find((c: any) => c.key?.toString() === userAnswerKey)?.value;
      return userAnswerText === exercise.payload.compact_solutions[gapIndex];
    }
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

  // Métodos para ejercicios de Signs
  getSignQuestion(choiceText: string): string {
    // Formato: "Pregunta||opción1//opción2//opción3"
    if (!choiceText || !choiceText.includes('||')) return choiceText;
    return choiceText.split('||')[0];
  }

  getSignChoices(choiceText: string): string[] {
    // Formato: "Pregunta||opción1//opción2//opción3"
    if (!choiceText || !choiceText.includes('||')) return [];
    const parts = choiceText.split('||');
    if (parts.length < 2) return [];
    return parts[1].split('//').map(c => c.trim());
  }

  getImageByKey(images: any[], key: string): string {
    const image = images?.find(img => img.key?.toString() === key);
    return image ? image.value : '';
  }

  // Métodos para ejercicios de Matching (personas con opciones)
  selectMatchingAnswer(personName: string, optionTitle: string): void {
    if (this.showResults) return;
    this.userAnswers[personName] = optionTitle;
  }

  getMatchingAnswer(personName: string): string | null {
    return this.userAnswers[personName] || null;
  }

  isMatchingOptionUsed(optionTitle: string, currentPerson: string): boolean {
    // Una opción está "usada" si ya está asignada a otra persona (no a la actual)
    for (const [person, selectedOption] of Object.entries(this.userAnswers)) {
      if (person !== currentPerson && selectedOption === optionTitle) {
        return true;
      }
    }
    return false;
  }

  isCorrectMatchingAnswer(personName: string, solutions: any[]): boolean {
    if (!solutions || !this.userAnswers[personName]) return false;
    const solution = solutions.find(s => s.person === personName);
    return solution && this.userAnswers[personName] === solution.title;
  }

  getCorrectMatchingCount(solutions: any[]): number {
    if (!solutions) return 0;
    let count = 0;
    for (const solution of solutions) {
      if (this.userAnswers[solution.person] === solution.title) {
        count++;
      }
    }
    return count;
  }

  getCorrectMatchingSolution(personName: string, solutions: any[]): string | null {
    if (!solutions) return null;
    const solution = solutions.find(s => s.person === personName);
    return solution ? solution.title : null;
  }
}
