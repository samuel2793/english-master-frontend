import { Component, OnInit } from '@angular/core';
import { AdminService, AdminUser, EnglishLevelStatus } from '../../services/admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss']
})
export class AdminPanelComponent implements OnInit {
  users: AdminUser[] = [];
  levels: EnglishLevelStatus[] = [];

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadLevels();
  }

  loadUsers(): void {
    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users.sort((a, b) =>
          b.createdAt?.toDate() - a.createdAt?.toDate()
        );
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        this.snackBar.open('Error al cargar usuarios', 'Cerrar', { duration: 3000 });
      }
    });
  }

  loadLevels(): void {
    this.adminService.getAllLevels().subscribe({
      next: (levels) => {
        this.levels = levels.sort((a, b) => a.name.localeCompare(b.name));
      },
      error: (error) => {
        console.error('Error al cargar niveles:', error);
        this.snackBar.open('Error al cargar niveles', 'Cerrar', { duration: 3000 });
      }
    });
  }

  confirmDeleteUser(user: AdminUser): void {
    if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${user.username}?`)) {
      this.deleteUser(user.uid);
    }
  }

  deleteUser(uid: string): void {
    this.adminService.deleteUser(uid).subscribe({
      next: () => {
        this.snackBar.open('Usuario eliminado correctamente', 'Cerrar', { duration: 3000 });
        this.loadUsers(); // Recargar la lista
      },
      error: (error) => {
        console.error('Error al eliminar usuario:', error);
        this.snackBar.open('Error al eliminar usuario', 'Cerrar', { duration: 3000 });
      }
    });
  }

  toggleLevel(level: EnglishLevelStatus, enabled: boolean): void {
    this.adminService.updateLevelStatus(level.id, enabled).subscribe({
      next: () => {
        level.enabled = enabled;
        this.snackBar.open(
          `Nivel ${level.name} ${enabled ? 'habilitado' : 'deshabilitado'}`,
          'Cerrar',
          { duration: 3000 }
        );
      },
      error: (error) => {
        console.error('Error al actualizar nivel:', error);
        this.snackBar.open('Error al actualizar nivel', 'Cerrar', { duration: 3000 });
      }
    });
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
