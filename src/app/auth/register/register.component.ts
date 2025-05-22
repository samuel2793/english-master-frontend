import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { RegisterRequest } from 'src/app/interfaces/auth.interfaces';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  hidePassword = true;
  hideConfirm  = true;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm: ['', [Validators.required, this.matchPassword.bind(this)]]
    });
  }

  private matchPassword(control: AbstractControl): {[key: string]: boolean} | null {
    if (!this.registerForm) return null;
    const password = this.registerForm.get('password')?.value;
    const confirmPassword = control.value;

    return password === confirmPassword ? null : { notMatching: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      console.log('Formulario inválido');
      return;
    }

    const { name, email, password } = this.registerForm.value;

    const registerData: RegisterRequest = {
      username: name,
      email,
      password
    };

    this.authService.register(registerData).subscribe({
      next: (response) => {
        console.log('Registro exitoso', response);
        // Mostrar toast de éxito
        this.snackBar.open('¡Registro completado con éxito!', 'Cerrar', {
          duration: 5000,
          panelClass: ['success-snackbar'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });

        // Redirigir al login
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Error en el registro', err);
        this.error = err.error.message || 'Error al registrar el usuario';

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
