import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ActivitiesService } from '../../services/activities.service';
import {
  CourseType,
  LevelType,
  Exercise,
  ActivityList,
} from '../../interfaces/activity.interfaces';

@Component({
  selector: 'app-exercise-list',
  templateUrl: './exercise-list.component.html',
  styleUrls: ['./exercise-list.component.scss'],
})
export class ExerciseListComponent implements OnInit {
  course: CourseType | null = null;
  level: LevelType | null = null;
  activity: string | null = null;
  courseName: string = '';
  exercises$: Observable<ActivityList<Exercise>> | null = null;
  loading = false;
  error: string | null = null;

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

      if (this.course) {
        this.courseName = this.activitiesService.getCourseName(this.course);
      }

      if (this.course && this.level && this.activity) {
        this.loadExercises();
      }
    });
  }

  loadExercises(): void {
    if (!this.course || !this.level || !this.activity) return;

    this.loading = true;
    this.error = null;

    this.exercises$ = this.activitiesService.listExercises(
      this.course,
      this.level,
      this.activity,
      100 // Cargar hasta 100 ejercicios
    );

    this.exercises$.subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Error loading exercises. Please try again.';
        console.error('Error loading exercises:', err);
      },
    });
  }

  navigateToExercise(exercise: Exercise): void {
    if (!this.course || !this.level || !this.activity) return;

    this.router.navigate([
      '/activities',
      this.course,
      this.level,
      this.activity,
      exercise.id,
    ]);
  }

  goBack(): void {
    if (this.course) {
      this.router.navigate(['/activities', this.course]);
    }
  }

  getActivityDisplayName(): string {
    return this.activity
      ? this.activity.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
      : '';
  }

  getExerciseTitle(exercise: Exercise, index: number): string {
    // Grammar Tests usa el campo 'number' del payload
    if (this.course?.toLowerCase() === 'grammar-tests' && exercise.payload?.number) {
      return `Exercise ${exercise.payload.number}`;
    }

    // Writing siempre usa numeración
    if (this.course?.toLowerCase() === 'writing') {
      return `Exercise ${index + 1}`;
    }

    // Lista de actividades que deben mostrar "Exercise N" en la lista
    const activitiesWithNumbering = [
      'signs',
      'extracts',
      'pictures'
    ];

    const activityLower = this.activity?.toLowerCase() || '';

    // Special case: 'multiple-choice' solo usa numeración si es de Listening
    if (activityLower === 'multiple-choice' && this.course?.toLowerCase() === 'listening') {
      return `Exercise ${index + 1}`;
    }

    if (activitiesWithNumbering.includes(activityLower)) {
      return `Exercise ${index + 1}`;
    }
    // Para otros ejercicios, usar el título del payload o el ID
    return exercise.payload?.title || `Exercise ${exercise.id}`;
  }
}
