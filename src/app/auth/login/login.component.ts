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

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
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
      next: (response) => {
        console.log('Login exitoso', response);

        // Almacenar token JWT de momento en localStorage pero quiero en un futuro usar una sesión
        // o un servicio de almacenamiento seguro
        localStorage.setItem('auth_token', response.jwt);

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

        // Verificar si el error recibido es un array
        if (Array.isArray(err.error) && err.error.length > 0) {
          this.error = err.error[0].message || 'Error al iniciar sesión';
        } else {
          this.error = err.error?.message || 'Error al iniciar sesión';
        }

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
}
