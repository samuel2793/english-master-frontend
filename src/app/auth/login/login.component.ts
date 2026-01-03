import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from 'src/app/interfaces/auth.interfaces';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  hidePassword = true;
  error: string | null = null;
  isLoggedIn = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Verificar si ya hay un usuario autenticado
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
    });

    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;

    const loginData: LoginRequest = {
      email,
      password
    };

    this.authService.login(loginData).subscribe({
      next: (user) => {
        console.log('Login exitoso', user);

        // Mostrar toast de éxito
        this.snackBar.open('¡Inicio de sesión exitoso!', 'Cerrar', {
          duration: 5000,
          panelClass: ['success-snackbar'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });

        // Redirigir a la página principal
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Error en el login', err);
        this.error = err.error?.message || 'Error al iniciar sesión';

        // Mostrar toast de error
        this.snackBar.open(this.error!, 'Cerrar', {
          duration: 7000,
          panelClass: ['error-snackbar'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  // Método para iniciar sesión con Google
  async loginWithGoogle(): Promise<void> {
    console.log('Método loginWithGoogle llamado');

    try {
      const user = await this.authService.loginWithGoogle();
      console.log('Login con Google exitoso', user);

      // Mostrar toast de éxito
      this.snackBar.open('¡Inicio de sesión con Google exitoso!', 'Cerrar', {
        duration: 5000,
        panelClass: ['success-snackbar'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });

      // Redirigir a la página principal
      this.router.navigate(['/']);
    } catch (err: any) {
      console.error('Error en el login con Google', err);
      this.error = err.message || 'Error al iniciar sesión con Google';

      // Mostrar toast de error
      this.snackBar.open(this.error!, 'Cerrar', {
        duration: 7000,
        panelClass: ['error-snackbar'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    }
  }
}
