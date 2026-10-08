import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AuthShellComponent } from '../../../shared/components/auth-shell/auth-shell.component';
import { CustomValidators, errorMessage } from '../../../shared/forms/validators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [AuthShellComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, CustomValidators.password]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [this.passwordsMatch] },
  );

  private passwordsMatch(group: AbstractControl) {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
  }

  fieldError(name: 'fullName' | 'email' | 'password' | 'confirmPassword'): string | null {
    const control = this.form.get(name);
    if (!control?.invalid || !control?.touched) return null;
    if (name === 'confirmPassword' && this.form.errors?.['passwordMismatch']) {
      return 'Las contraseñas no coinciden.';
    }
    const labels: Record<string, string> = {
      fullName: 'El nombre',
      email: 'El email',
      password: 'La contraseña',
      confirmPassword: 'La confirmación',
    };
    return errorMessage(control.errors, labels[name]);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    const { fullName, email, password } = this.form.getRawValue();
    const { error } = await this.auth.signUp(fullName, email, password);

    this.loading.set(false);
    if (error) {
      this.error.set(error);
      return;
    }
    this.success.set('Cuenta creada correctamente. Ya podés iniciar sesión.');
    setTimeout(() => this.router.navigate(['/auth/login']), 1500);
  }
}
