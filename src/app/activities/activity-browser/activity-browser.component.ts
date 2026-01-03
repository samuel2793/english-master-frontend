import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ActivitiesService } from '../../services/activities.service';
import { EnglishLevelService } from '../../services/english-level.service';
import {
  CourseType,
  LevelType,
  ActivityIndex,
  ActivityList,
} from '../../interfaces/activity.interfaces';

@Component({
  selector: 'app-activity-browser',
  templateUrl: './activity-browser.component.html',
  styleUrls: ['./activity-browser.component.scss'],
})
export class ActivityBrowserComponent implements OnInit {
  course: CourseType | null = null;
  level: LevelType | null = null;
  courseName: string = '';
  activities$: Observable<ActivityList<ActivityIndex>> | null = null;
  loading = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private activitiesService: ActivitiesService,
    private levelService: EnglishLevelService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.course = params['course'] as CourseType;

      if (this.course) {
        this.courseName = this.activitiesService.getCourseName(this.course);

        // Obtener el nivel del usuario
        this.levelService.currentLevel$.subscribe((userLevel) => {
          if (userLevel) {
            this.level = userLevel.toLowerCase() as LevelType;
            this.loadActivities();
          }
        });
      }
    });
  }

  loadActivities(): void {
    if (!this.course || !this.level) return;

    this.loading = true;
    this.error = null;

    this.activities$ = this.activitiesService.listActivities(
      this.course,
      this.level
    );

    this.activities$.subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Error loading activities. Please try again.';
        console.error('Error loading activities:', err);
      },
    });
  }

  navigateToActivity(activity: ActivityIndex): void {
    if (!this.course || !this.level) return;

    const activitySlug = activity.slug || activity.name.toLowerCase().replace(/\s+/g, '-');
    this.router.navigate(['/activities', this.course, this.level, activitySlug]);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
