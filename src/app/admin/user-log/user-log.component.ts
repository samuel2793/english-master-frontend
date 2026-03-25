import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminService, AdminUser, UserExerciseLog } from '../../services/admin.service';

@Component({
  selector: 'app-user-log',
  templateUrl: './user-log.component.html',
  styleUrls: ['./user-log.component.scss']
})
export class UserLogComponent implements OnInit {
  user: AdminUser | null = null;
  logs: UserExerciseLog[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private adminService: AdminService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const uid = params.get('uid');
      if (!uid) {
        this.loading = false;
        this.snackBar.open('Usuario no encontrado', 'Cerrar', { duration: 3000 });
        return;
      }

      this.loadUser(uid);
      this.loadLogs(uid);
    });
  }

  private loadUser(uid: string): void {
    this.adminService.getUserById(uid).subscribe({
      next: (user) => {
        this.user = user;
      },
      error: (error) => {
        console.error('Error al cargar usuario:', error);
        this.snackBar.open('Error al cargar usuario', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private loadLogs(uid: string): void {
    this.loading = true;
    this.adminService.getUserExerciseLogs(uid).subscribe({
      next: (logs) => {
        this.logs = logs;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar log de usuario:', error);
        this.loading = false;
        this.snackBar.open('Error al cargar el log de usuario', 'Cerrar', { duration: 3000 });
      }
    });
  }

  formatDateTime(timestamp: any): string {
    if (!timestamp) return 'Fecha no disponible';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return 'Fecha no disponible';
    }

    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  formatText(value: string): string {
    if (!value) return 'N/A';
    return value
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
