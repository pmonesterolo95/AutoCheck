import { Routes } from '@angular/router';

export const VEHICLES_ROUTES: Routes = [
  { path: '', title: 'AutoCheck - Mis vehículos', data: { title: 'Mis vehículos' }, loadComponent: () => import('./vehicles-list/vehicles-list.component').then((m) => m.VehiclesListComponent) },
  { path: 'new', title: 'AutoCheck - Registrar vehículo', data: { title: 'Registrar vehículo' }, loadComponent: () => import('./vehicle-form/vehicle-form.component').then((m) => m.VehicleFormComponent) },
  { path: ':id/edit', title: 'AutoCheck - Editar vehículo', data: { title: 'Editar vehículo' }, loadComponent: () => import('./vehicle-form/vehicle-form.component').then((m) => m.VehicleFormComponent) },

  { path: ':id', title: 'AutoCheck - Detalle del vehículo', data: { title: 'Detalle del vehículo' }, loadComponent: () => import('./vehicle-detail/vehicle-detail.component').then((m) => m.VehicleDetailComponent) },

  { path: ':id/maintenances', title: 'AutoCheck - Historial de mantenimientos', data: { title: 'Historial de mantenimientos' }, loadComponent: () => import('../maintenance/maintenance-history/maintenance-history.component').then((m) => m.MaintenanceHistoryComponent) },
  { path: ':id/expenses', title: 'AutoCheck - Gastos del vehículo', data: { title: 'Gastos' }, loadComponent: () => import('../expenses/expenses-list/expenses-list.component').then((m) => m.ExpensesListComponent) },
  { path: ':id/fuel', title: 'AutoCheck - Combustible del vehículo', data: { title: 'Combustible' }, loadComponent: () => import('../fuel/fuel-list/fuel-list.component').then((m) => m.FuelListComponent) },
  { path: ':id/documents', title: 'AutoCheck - Documentación del vehículo', data: { title: 'Documentación' }, loadComponent: () => import('../documents/documents-list/documents-list.component').then((m) => m.DocumentsListComponent) },
  { path: ':id/reminders', title: 'AutoCheck - Recordatorios del vehículo', data: { title: 'Recordatorios' }, loadComponent: () => import('../reminders/reminder-list/reminder-list.component').then((m) => m.ReminderListComponent) },

  { path: ':id/maintenance/new', title: 'AutoCheck - Registrar mantenimiento', data: { title: 'Registrar mantenimiento' }, loadComponent: () => import('../maintenance/maintenance-form/maintenance-form.component').then((m) => m.MaintenanceFormComponent) },
  { path: ':id/maintenance/:mid/edit', title: 'AutoCheck - Editar mantenimiento', data: { title: 'Editar mantenimiento' }, loadComponent: () => import('../maintenance/maintenance-form/maintenance-form.component').then((m) => m.MaintenanceFormComponent) },
];