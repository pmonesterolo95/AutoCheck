import { Injectable, inject, signal } from '@angular/core';
import { supabase } from '../config/supabase.client';
import { AppNotification } from '../models/notification.interface';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly auth = inject(AuthService);

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = signal(0);

  async load(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.warn('Error al cargar notificaciones:', error.message);
      return;
    }
    this.notifications.set((data ?? []) as AppNotification[]);
    this.unreadCount.set((data ?? []).filter((n) => !n.is_read).length);
  }

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (!error) {
      this.notifications.update((list) => list.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      this.unreadCount.update((c) => Math.max(0, c - 1));
    }
  }

  async markAllAsRead(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (!error) {
      this.notifications.update((list) => list.map((n) => ({ ...n, is_read: true })));
      this.unreadCount.set(0);
    }
  }

  clear(): void {
    this.notifications.set([]);
    this.unreadCount.set(0);
  }
}
