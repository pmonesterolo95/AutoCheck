import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase.client';
import { Profile } from '../models/profile.interface';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  /** Usuario de Supabase Auth (null si no hay sesión). */
  readonly user = signal<User | null>(null);
  /** Perfil completo (rol, nombre) cargado desde la tabla profiles. */
  readonly profile = signal<Profile | null>(null);
  readonly loading = signal(true);
  readonly isAdmin = computed(() => this.profile()?.role === 'ADMIN');
  readonly isAuthenticated = computed(() => !!this.user());

  /** Se resuelve cuando terminó de restaurar la sesión inicial. */
  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  /** Espera a que se restaure la sesión (útil en guards). */
  async whenReady(): Promise<void> {
    await this.ready;
  }

  private async init(): Promise<void> {
    const { data } = await supabase.auth.getSession();
    this.user.set(data.session?.user ?? null);
    if (data.session?.user) {
      await this.loadProfile(data.session.user.id);
    }
    this.loading.set(false);

    supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      this.user.set(session?.user ?? null);
      if (session?.user) {
        this.loadProfile(session.user.id);
      } else {
        this.profile.set(null);
      }
    });
  }

  private async loadProfile(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('No se pudo cargar el perfil:', error.message);
      return;
    }
    this.profile.set(data as Profile);
  }

  async signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? this.translate(error.message) : null };
  }

  async signUp(fullName: string, email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error ? this.translate(error.message) : null };
  }

  async resetPassword(email: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { error: error ? this.translate(error.message) : null };
  }

  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error ? this.translate(error.message) : null };
  }

  async updateProfile(changes: { full_name?: string }): Promise<{ error: string | null }> {
    const user = this.user();
    if (!user) return { error: 'No hay sesión activa.' };

    const { error } = await supabase.from('profiles').update(changes).eq('id', user.id);
    if (error) return { error: this.translate(error.message) };

    await this.loadProfile(user.id);
    return { error: null };
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    this.profile.set(null);
    this.user.set(null);
    this.router.navigate(['/auth/login']);
  }

  /** Traduce los mensajes más comunes de Supabase Auth al español. */
  private translate(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('invalid login credentials')) return 'Email o contraseña incorrectos.';
    if (msg.includes('email not confirmed')) return 'Debés confirmar tu email antes de iniciar sesión.';
    if (msg.includes('user already registered')) return 'Ese email ya está registrado.';
    if (msg.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
    if (msg.includes('rate limit') || msg.includes('too many')) return 'Demasiados intentos. Esperá unos minutos y volvé a intentar.';
    if (msg.includes('fetch') || msg.includes('network')) return 'Error de conexión. Verificá tu internet.';
    if (msg.includes('signup')) return 'No se pudo completar el registro. Verificá los datos.';
    return message;
  }

  /** Traduce errores de operaciones sobre la base de datos. */
  static dbError(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('row-level security')) return 'No tenés permisos para realizar esta operación.';
    if (msg.includes('duplicate key')) return 'Ya existe un registro con esos datos.';
    if (msg.includes('violates foreign key')) return 'El registro está relacionado con otros datos y no puede eliminarse.';
    if (msg.includes('failed to fetch') || msg.includes('network')) return 'Error de conexión con el servidor.';
    return `Error al guardar: ${message}`;
  }
}
