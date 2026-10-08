import { Routes } from '@angular/router';
import { noAuthGuard } from '../../core/guards/auth.guard';

export const AUTH_ROUTES: Routes = [
  { path: 'login', title: 'AutoCheck - Iniciar sesión', canActivate: [noAuthGuard], loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent) },
  { path: 'register', title: 'AutoCheck - Registro', canActivate: [noAuthGuard], loadComponent: () => import('./register/register.component').then((m) => m.RegisterComponent) },
  { path: 'forgot-password', title: 'AutoCheck - Recuperar contraseña', loadComponent: () => import('./forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent) },
  { path: 'reset-password', title: 'AutoCheck - Nueva contraseña', loadComponent: () => import('./reset-password/reset-password.component').then((m) => m.ResetPasswordComponent) },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
];
