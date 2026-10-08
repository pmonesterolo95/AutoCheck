import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AppLayoutComponent } from './shared/layout/app-layout.component';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [noAuthGuard],
    title: 'AutoCheck - Gestión inteligente de mantenimiento vehicular',
    loadComponent: () => import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', title: 'AutoCheck - Dashboard', data: { title: 'Dashboard' }, loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'vehicles', loadChildren: () => import('./features/vehicles/vehicles.routes').then((m) => m.VEHICLES_ROUTES) },
      { path: 'maintenances', title: 'AutoCheck - Mantenimientos', data: { title: 'Mantenimientos' }, loadComponent: () => import('./features/maintenance/maintenance-history/maintenance-history.component').then((m) => m.MaintenanceHistoryComponent) },
      { path: 'expenses', title: 'AutoCheck - Gastos', data: { title: 'Gastos' }, loadComponent: () => import('./features/expenses/expenses-list/expenses-list.component').then((m) => m.ExpensesListComponent) },
      { path: 'documents', title: 'AutoCheck - Documentación', data: { title: 'Documentación' }, loadComponent: () => import('./features/documents/documents-list/documents-list.component').then((m) => m.DocumentsListComponent) },
      { path: 'reminders', title: 'AutoCheck - Recordatorios', data: { title: 'Recordatorios' }, loadComponent: () => import('./features/reminders/reminder-list/reminder-list.component').then((m) => m.ReminderListComponent) },
      { path: 'ai', title: 'AutoCheck - AutoCheck IA', data: { title: 'AutoCheck IA' }, loadComponent: () => import('./features/ai/ai-chat/ai-chat.component').then((m) => m.AiChatComponent) },
      { path: 'profile', title: 'AutoCheck - Mi perfil', data: { title: 'Mi perfil' }, loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent) },
      { path: 'admin', title: 'AutoCheck - Administración', canActivate: [roleGuard], data: { title: 'Panel de administración' }, loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];