import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly profile = this.auth.profile;

  readonly form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
  });

  constructor() {
    this.form.patchValue({ full_name: this.profile()?.full_name ?? '' });
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    const { error } = await this.auth.updateProfile({ full_name: this.form.getRawValue().full_name.trim() });

    this.saving.set(false);
    if (error) {
      this.error.set(error);
      return;
    }
    this.success.set('Perfil actualizado correctamente.');
    setTimeout(() => this.success.set(null), 3000);
  }
}