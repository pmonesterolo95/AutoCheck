import { Component, DestroyRef, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AiChatComponent } from '../../../features/ai/ai-chat/ai-chat.component';
import { LogoComponent } from '../logo/logo.component';

/**
 * AutoCheck IA como asistente flotante: FAB abajo a la derecha que despliega
 * un panel con el chat. Disponible en toda la app (se monta en AppLayout).
 * Se oculta en la página de chat completo (/ai) para evitar duplicados.
 */
@Component({
  selector: 'app-floating-chat',
  standalone: true,
  imports: [AiChatComponent, LogoComponent],
  templateUrl: './floating-chat.component.html',
  styleUrl: './floating-chat.component.scss',
})
export class FloatingChatComponent {
  readonly open = signal(false);
  readonly openedOnce = signal(false);
  readonly onAiPage = signal(false);

  private readonly fabBtn = viewChild<ElementRef<HTMLButtonElement>>('fabBtn');
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.syncWithRoute());
    this.destroyRef.onDestroy(() => sub.unsubscribe());
    this.syncWithRoute();
  }

  private syncWithRoute(): void {
    const onPage = this.router.url.startsWith('/ai');
    this.onAiPage.set(onPage);
    if (onPage) this.open.set(false);
  }

  toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) this.openedOnce.set(true);
  }

  close(): void {
    this.open.set(false);
    this.fabBtn()?.nativeElement.focus();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close();
  }
}