import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  hidePassword = true;
  hideConfirm  = true;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm: ['', [Validators.required, this.matchPassword.bind(this)]]
    });
  }

  private passwordsMatch(group: AbstractControl) {
    const pass = group.get('password')?.value;
    const conf = group.get('confirm')?.value;
    return pass === conf ? null : { notMatching: true };
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
    // Lógica de registro con el servicio de autenticación… (cuando suba el backend)
    console.log('Registro con', name, email, password);
    // Tras registro, redirigir, por ejemplo:
    this.router.navigate(['/login']);
  }
}
