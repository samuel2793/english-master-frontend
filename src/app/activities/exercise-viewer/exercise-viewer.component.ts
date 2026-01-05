import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ActivitiesService } from '../../services/activities.service';
import { AuthService } from '../../services/auth.service';
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
  shuffledChoices: any[] = []; // Opciones aleatorizadas para Missing Paragraphs
  shuffledAnswers: { [questionKey: string]: string[] } = {}; // Respuestas aleatorizadas para Long Text
  gappedTextLines: any[] = []; // Líneas procesadas para Gapped Text (cacheadas)
  isAdmin = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private activitiesService: ActivitiesService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.isAdmin = user?.email === 'padillasamuel2793@gmail.com';
    });

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

    this.exercise$.subscribe((exercise) => {
      this.loading = false;
      // Aleatorizar opciones para Missing Paragraphs/Sentences (solo si choices es un array)
      if (exercise?.payload?.choices && Array.isArray(exercise.payload.choices)) {
        this.shuffledChoices = this.shuffleAndRelabelChoices([...exercise.payload.choices]);
      }
      // Aleatorizar respuestas para Long Text
      if (exercise?.payload?.compact_answers) {
        this.shuffledAnswers = this.shuffleCompactAnswers(exercise.payload.compact_answers);
      }
      // Procesar líneas para Gapped Text (cachear para evitar recalcular)
      if (exercise?.payload?.text && exercise?.payload?.audio && exercise?.payload?.solutions && !exercise?.payload?.questions) {
        this.gappedTextLines = this.processGappedTextLines(exercise.payload.text);
      }
    });
  }

  shuffleAndRelabelChoices(choices: any[]): any[] {
    // Primero aleatorizamos el orden
    const shuffled = [...choices];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Luego reasignamos las letras en orden alfabético
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    return shuffled.map((choice, index) => ({
      ...choice,
      displayKey: alphabet[index] // Nueva clave para mostrar
    }));
  }

  shuffleCompactAnswers(compactAnswers: any): { [questionKey: string]: string[] } {
    const shuffled: { [questionKey: string]: string[] } = {};
    for (const key in compactAnswers) {
      if (compactAnswers.hasOwnProperty(key)) {
        const answers = [...compactAnswers[key]];
        // Aleatorizar usando Fisher-Yates
        for (let i = answers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [answers[i], answers[j]] = [answers[j], answers[i]];
        }
        shuffled[key] = answers;
      }
    }
    return shuffled;
  }

  getShuffledAnswers(questionKey: string): string[] {
    return this.shuffledAnswers[questionKey] || [];
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
    // Lista de actividades que deben mostrar solo "Exercise" dentro del ejercicio
    const activitiesWithSimpleTitle = [
      'signs',
      'extracts',
      'multiple-choice',
      'pictures',
      'key-word-transformations'
    ];

    const activityLower = this.activity?.toLowerCase() || '';

    if (activitiesWithSimpleTitle.includes(activityLower)) {
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

  getDisplayKey(originalKey: string): string {
    // Buscar en shuffledChoices la displayKey correspondiente
    const choice = this.shuffledChoices.find(c => c.key === originalKey);
    return choice?.displayKey || originalKey;
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
    // Detectar tipo de ejercicio: Missing Sentences (1) ... o Missing Paragraphs []
    const isMissingSentences = exercise.payload.text?.match(/\(\d+\)\s*\.{3,}/g);
    const isMissingParagraphs = exercise.payload.text?.includes('[]');

    // Para Missing Sentences con solutions o compact_solutions
    if (isMissingSentences && (exercise.payload.solutions || exercise.payload.compact_solutions)) {
      const userAnswerKey = this.userAnswers[gapIndex];
      if (!userAnswerKey) return false;

      // Buscar el texto de la respuesta del usuario (puede venir de shuffledChoices)
      let userAnswerText: string | undefined;
      if (this.shuffledChoices.length > 0) {
        userAnswerText = this.shuffledChoices.find((c: any) => c.key?.toString() === userAnswerKey?.toString())?.value;
      }
      if (!userAnswerText && exercise.payload.choices) {
        userAnswerText = exercise.payload.choices.find((c: any) => c.key?.toString() === userAnswerKey?.toString())?.value;
      }

      // Obtener la solución correcta
      let correctAnswerText: string | undefined;
      if (exercise.payload.compact_solutions && exercise.payload.compact_solutions[gapIndex]) {
        correctAnswerText = exercise.payload.compact_solutions[gapIndex];
      } else if (exercise.payload.solutions && Array.isArray(exercise.payload.solutions)) {
        const solution = exercise.payload.solutions.find((s: any) => s.key?.toString() === gapIndex);
        correctAnswerText = solution?.value;
      }

      return userAnswerText === correctAnswerText;
    }

    // Para Missing Paragraphs, el orden correcto es alfabético: gap 1=a, gap 2=b, etc.
    if (isMissingParagraphs && exercise.payload.choices) {
      const userAnswerKey = this.userAnswers[gapIndex];
      if (!userAnswerKey) return false;

      // Obtener el texto de la respuesta del usuario
      let userAnswerText: string | undefined;
      if (this.shuffledChoices.length > 0) {
        userAnswerText = this.shuffledChoices.find((c: any) => c.key?.toString() === userAnswerKey?.toString())?.value;
      }
      if (!userAnswerText && exercise.payload.choices) {
        userAnswerText = exercise.payload.choices.find((c: any) => c.key?.toString() === userAnswerKey?.toString())?.value;
      }

      // Obtener la solución correcta (orden alfabético)
      const expectedKey = this.getExpectedAnswerForGap(parseInt(gapIndex));
      const correctAnswerText = exercise.payload.choices.find((c: any) => c.key?.toString() === expectedKey)?.value;

      return userAnswerText === correctAnswerText;
    }

    return !!this.userAnswers[gapIndex];
  }

  getExpectedAnswerForGap(gapNumber: number): string {
    // Gap 1 -> 'a', Gap 2 -> 'b', etc.
    return String.fromCharCode(96 + gapNumber); // 97 es 'a' en ASCII
  }

  getCorrectGapAnswer(gapIndex: string, exercise: Exercise): string {
    // Detectar tipo de ejercicio
    const isMissingSentences = exercise.payload.text?.match(/\(\d+\)\s*\.{3,}/g);
    const isMissingParagraphs = exercise.payload.text?.includes('[]');

    // Para Missing Sentences
    if (isMissingSentences && (exercise.payload.solutions || exercise.payload.compact_solutions)) {
      let correctAnswerText: string | undefined;
      if (exercise.payload.compact_solutions && exercise.payload.compact_solutions[gapIndex]) {
        correctAnswerText = exercise.payload.compact_solutions[gapIndex];
      } else if (exercise.payload.solutions && Array.isArray(exercise.payload.solutions)) {
        const solution = exercise.payload.solutions.find((s: any) => s.key?.toString() === gapIndex);
        correctAnswerText = solution?.value;
      }

      // Encontrar la displayKey de la respuesta correcta
      if (correctAnswerText && this.shuffledChoices.length > 0) {
        const correctChoice = this.shuffledChoices.find((c: any) => c.value === correctAnswerText);
        return correctChoice?.displayKey || correctChoice?.key || '';
      }
      return '';
    }

    // Para Missing Paragraphs (orden alfabético)
    if (isMissingParagraphs && exercise.payload.choices) {
      const expectedKey = this.getExpectedAnswerForGap(parseInt(gapIndex));
      const correctChoice = this.shuffledChoices.find((c: any) => c.key === expectedKey);
      return correctChoice?.displayKey || expectedKey;
    }

    return '';
  }

  getCorrectGapsCount(exercise: Exercise): number {
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
    // Formato con pregunta: "Pregunta||opción1//opción2//opción3"
    // Formato sin pregunta: "opción1//opción2//opción3"
    if (!choiceText) return '';
    if (choiceText.includes('||')) {
      return choiceText.split('||')[0];
    }
    // Si no hay pregunta explícita, devolver string vacío
    return '';
  }

  getSignChoices(choiceText: string): string[] {
    // Formato con pregunta: "Pregunta||opción1//opción2//opción3"
    // Formato sin pregunta: "opción1//opción2//opción3"
    if (!choiceText) return [];

    if (choiceText.includes('||')) {
      // Tiene pregunta, extraer las opciones después de ||
      const parts = choiceText.split('||');
      if (parts.length < 2) return [];
      return parts[1].split('//').map(c => c.trim());
    } else {
      // No tiene pregunta, todo el texto son las opciones separadas por //
      return choiceText.split('//').map(c => c.trim());
    }
  }

  getImageByKey(images: any[], key: string): string {
    const image = images?.find(img => img.key?.toString() === key);
    return image ? image.value : '';
  }

  // Método para obtener las opciones de Listening Extracts
  getExtractChoices(choicesText: string): string[] {
    if (!choicesText) return [];
    return choicesText.split('//').map(c => c.trim());
  }

  // Métodos para agrupar preguntas por extractos
  groupQuestionsByExtracts(questions: any, headline?: string): any[] {
    const questionKeys = this.getObjectKeys(questions);
    const extracts = headline ? headline.split('//').map(e => e.trim()) : [];
    const questionsPerExtract = extracts.length > 0 ? Math.ceil(questionKeys.length / extracts.length) : questionKeys.length;

    const groups = [];
    for (let i = 0; i < questionKeys.length; i += questionsPerExtract) {
      const groupKeys = questionKeys.slice(i, i + questionsPerExtract);
      const extractIndex = Math.floor(i / questionsPerExtract);
      groups.push({
        extract: extracts[extractIndex] || null,
        questionKeys: groupKeys
      });
    }
    return groups;
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

  // Funciones para Gapped Text
  processGappedTextLines(text: string): any[] {
    const lines = text.split('\n');
    return lines.map(line => {
      const segments: any[] = [];
      // Patrón para detectar huecos: (1) ..., (2) ..., etc.
      const gapPattern = /\((\d+)\)\s*\.{3,}/g;
      let lastIndex = 0;
      let match;

      while ((match = gapPattern.exec(line)) !== null) {
        // Agregar texto antes del hueco
        if (match.index > lastIndex) {
          segments.push({
            type: 'text',
            content: line.substring(lastIndex, match.index)
          });
        }

        // Agregar el hueco
        segments.push({
          type: 'gap',
          gapNumber: match[1]
        });

        lastIndex = match.index + match[0].length;
      }

      // Agregar el texto restante después del último hueco
      if (lastIndex < line.length) {
        segments.push({
          type: 'text',
          content: line.substring(lastIndex)
        });
      }

      return { segments };
    });
  }

  isGapCorrect(gapNumber: string, solutions?: any): boolean {
    if (!solutions) return false;

    const userAnswer = this.userAnswers[gapNumber]?.trim().toLowerCase();
    if (!userAnswer) return false;

    const correctAnswer = solutions[gapNumber]?.trim().toLowerCase();
    if (!correctAnswer) return false;

    // Si la respuesta correcta contiene "/", significa que cualquiera de las opciones es válida
    if (correctAnswer.includes('/')) {
      const validAnswers = correctAnswer.split('/').map(ans => ans.trim());
      return validAnswers.some(validAns => userAnswer === validAns);
    }

    // Si no hay "/", comparación directa
    return userAnswer === correctAnswer;
  }

  getGappedTextCorrectCount(solutions: any): number {
    if (!solutions) return 0;
    let count = 0;
    for (const key of Object.keys(solutions)) {
      if (this.isGapCorrect(key, solutions)) {
        count++;
      }
    }
    return count;
  }

  // Funciones para Multiple Matching
  getMultipleMatchingCorrectCount(solutions1: any, solutions2: any): number {
    let count = 0;

    // Contar correctas de task 1
    if (solutions1) {
      for (const key of Object.keys(solutions1)) {
        if (this.userAnswers['task1_' + key] === solutions1[key]) {
          count++;
        }
      }
    }

    // Contar correctas de task 2
    if (solutions2) {
      for (const key of Object.keys(solutions2)) {
        if (this.userAnswers['task2_' + key] === solutions2[key]) {
          count++;
        }
      }
    }

    return count;
  }

  // Funciones para Listening Pictures
  getPictureChoices(choicesString: string): string[] {
    // Dividir por "/" para obtener las 3 opciones de imagen
    return choicesString.split('/').map(choice => choice.trim());
  }

  getPictureUrl(basePath: string, imageKey: string): string {
    // Construir la URL completa de la imagen
    // imageKey tiene formato "9_1_1", la URL final es "base_path/9_1_1.jpeg"
    return `${basePath}/${imageKey}.jpeg`;
  }

  getPictureLabel(imageKey: string): string {
    // Extraer la última parte del key para mostrar la letra (1=A, 2=B, 3=C)
    const parts = imageKey.split('_');
    const lastPart = parseInt(parts[parts.length - 1]);
    return String.fromCharCode(64 + lastPart); // 1=A, 2=B, 3=C
  }

  selectPictureAnswer(questionKey: string, imageKey: string): void {
    this.userAnswers[questionKey] = imageKey;
  }

  getPicturesCorrectCount(solutions: any): number {
    if (!solutions) return 0;
    let count = 0;
    for (const key of Object.keys(solutions)) {
      if (this.userAnswers[key] === solutions[key]) {
        count++;
      }
    }
    return count;
  }

  // Funciones para Key Word Transformations
  isKeyWordTransformationCorrect(key: string, solutions: any): boolean {
    if (!solutions || !solutions[key]) return false;

    const userAnswer = this.userAnswers[key]?.trim().toLowerCase();
    if (!userAnswer) return false;

    const correctAnswers = solutions[key].split('/').map((ans: string) => ans.trim().toLowerCase());
    return correctAnswers.includes(userAnswer);
  }

  getKeyWordTransformationsCorrectCount(solutions: any): number {
    if (!solutions) return 0;
    let count = 0;
    for (const key of Object.keys(solutions)) {
      if (this.isKeyWordTransformationCorrect(key, solutions)) {
        count++;
      }
    }
    return count;
  }
}
