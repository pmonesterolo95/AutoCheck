import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Validadores personalizados (mensajes en español). */
export class CustomValidators {
  /** Patente/dominio: alfanumérico de 4 a 10 caracteres (autos, motos, camiones, remolques, maquinaria). */
  static licensePlate: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '').toString().trim().toUpperCase().replace(/\s/g, '');
    if (!value) return null;
    return /^[A-Z0-9]{4,10}$/.test(value) ? null : { licensePlate: true };
  };

  /** Año entre 1950 y el próximo año. */
  static vehicleYear: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const value = Number(control.value);
    if (control.value === null || control.value === '') return null;
    const max = new Date().getFullYear() + 1;
    return value >= 1950 && value <= max ? null : { vehicleYear: true };
  };

  /** Kilometraje (o equivalente) entero >= 0. */
  static kilometers: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === '') return null;
    const value = Number(control.value);
    return Number.isInteger(value) && value >= 0 ? null : { kilometers: true };
  };

  /** Costo / monto >= 0. */
  static money: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === '') return null;
    const value = Number(control.value);
    return value >= 0 && !Number.isNaN(value) ? null : { money: true };
  };

  /** Contraseña mínima de 6 caracteres (requerido por Supabase). */
  static password: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value ?? '';
    if (!value) return null;
    return value.length >= 6 ? null : { password: true };
  };

  /** Fechas: no puede ser anterior a 1950. */
  static notTooOld: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    return new Date(control.value) >= new Date('1950-01-01') ? null : { notTooOld: true };
  };
}

/** Mensajes de error en español para los errores usados en los formularios. */
export function errorMessage(errors: ValidationErrors | null, label = 'Este campo'): string | null {
  if (!errors) return null;
  if (errors['required']) return `${label} es obligatorio.`;
  if (errors['email']) return 'Ingresá un email válido.';
  if (errors['minlength']) return `${label} debe tener al menos ${errors['minlength'].requiredLength} caracteres.`;
  if (errors['maxlength']) return `${label} debe tener como máximo ${errors['maxlength'].requiredLength} caracteres.`;
  if (errors['min']) return `${label} debe ser como mínimo ${errors['min'].min}.`;
  if (errors['max']) return `${label} debe ser como máximo ${errors['max'].max}.`;
  if (errors['password']) return 'La contraseña debe tener al menos 6 caracteres.';
  if (errors['licensePlate']) return 'Formato de patente/dominio inválido (4 a 10 caracteres alfanuméricos).';
  if (errors['vehicleYear']) return 'Ingresá un año entre 1950 y el próximo.';
  if (errors['kilometers']) return 'Ingresá un kilometraje entero mayor o igual a 0.';
  if (errors['money']) return 'Ingresá un importe mayor o igual a 0.';
  if (errors['notTooOld']) return 'La fecha no puede ser anterior a 1950.';
  if (errors['pattern']) return 'El formato ingresado no es válido.';
  return `${label} inválido.`;
}
