import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { HeaderComponent } from '../components/header/header.component';
import { ConfirmHostComponent } from '../components/confirm-dialog/confirm-host.component';
import { FloatingChatComponent } from '../components/floating-chat/floating-chat.component';

/** Shell de la aplicación autenticada: sidebar + header + contenido. */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, ConfirmHostComponent, FloatingChatComponent],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
})
export class AppLayoutComponent {
  readonly sidebarOpen = signal(false);
  readonly sidebarCollapsed = signal(localStorage.getItem('autocheck.sidebarCollapsed') === '1');

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  toggleCollapse(): void {
    this.sidebarCollapsed.update((v) => {
      localStorage.setItem('autocheck.sidebarCollapsed', v ? '0' : '1');
      return !v;
    });
  }
}
