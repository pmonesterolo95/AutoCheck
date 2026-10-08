import { Component, ElementRef, EventEmitter, HostListener, Output, inject, signal } from '@angular/core';
import { DatePipe, SlicePipe, UpperCasePipe } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [DatePipe, SlicePipe, UpperCasePipe, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  @Output() toggleSidebar = new EventEmitter<void>();

  readonly pageTitle = signal('Dashboard');
  readonly openNotifications = signal(false);
  readonly openUserMenu = signal(false);

  readonly user = this.auth.user;
  readonly profile = this.auth.profile;
  readonly isAdmin = this.auth.isAdmin;

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      const title = this.router.routerState.snapshot.root.firstChild?.data?.['title'];
      this.pageTitle.set(typeof title === 'string' ? title : 'AutoCheck');
    });
    this.notifications.load();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.openNotifications.set(false);
      this.openUserMenu.set(false);
    }
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.openUserMenu.set(false);
    this.openNotifications.update((v) => !v);
    if (this.openNotifications()) this.notifications.load();
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.openNotifications.set(false);
    this.openUserMenu.update((v) => !v);
  }

  closeMenus(): void {
    this.openNotifications.set(false);
    this.openUserMenu.set(false);
  }

  async readNotification(id: string): Promise<void> {
    await this.notifications.markAsRead(id);
  }
}
