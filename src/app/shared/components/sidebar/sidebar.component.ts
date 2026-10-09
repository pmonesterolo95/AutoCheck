import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LogoComponent } from '../logo/logo.component';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LogoComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);

  @Input() open = false;
  @Input() collapsed = false;
  @Output() close = new EventEmitter<void>();
  @Output() toggleCollapse = new EventEmitter<void>();

  readonly isAdmin = this.auth.isAdmin;

  readonly items: NavItem[] = [
    { label: 'Dashboard', icon: '📊', link: '/dashboard', exact: true },
    { label: 'Mis vehículos', icon: '🚗', link: '/vehicles' },
    { label: 'Mantenimientos', icon: '🔧', link: '/maintenances' },
    { label: 'Gastos', icon: '💰', link: '/expenses' },
    { label: 'Combustible', icon: '⛽', link: '/fuel' },
    { label: 'Documentación', icon: '📄', link: '/documents' },
    { label: 'Recordatorios', icon: '⏰', link: '/reminders' },
    { label: 'Calendario', icon: '📅', link: '/calendar' },
    { label: 'AutoCheck IA', icon: '🤖', link: '/ai' },
  ];

  readonly adminItems: NavItem[] = [
    { label: 'Panel de administración', icon: '🛠️', link: '/admin' },
  ];
}
