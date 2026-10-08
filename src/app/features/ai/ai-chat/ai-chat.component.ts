import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiService, AiMessage } from '../../../core/services/ai.service';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.scss',
})
export class AiChatComponent {
  private readonly ai = inject(AiService);

  readonly messages = signal<AiMessage[]>([]);
  readonly input = signal('');
  readonly typing = signal(false);
  readonly showSuggestions = signal(true);

  readonly suggestionCategories = this.ai.suggestionCategories;

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLElement>;

  constructor() {
    const temas = this.ai.suggestionCategories.map((c) => c.title).join(', ');
    this.messages.set([
      {
        role: 'assistant',
        text: `¡Hola! Soy **AutoCheck IA**, tu asistente de mantenimiento vehicular.\n\nConsultame sobre **${temas}** usando tus datos registrados. Elegí una de las preguntas sugeridas o escribime la tuya.`,
      },
    ]);
  }

  format(text: string): string {
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }

  async send(question?: string): Promise<void> {
    const q = (question ?? this.input()).trim();
    if (!q || this.typing()) return;

    this.messages.update((list) => [...list, { role: 'user', text: q }]);
    this.input.set('');
    this.typing.set(true);
    this.scrollToBottom();

    const text = await this.ai.answer(q);
    this.messages.update((list) => [...list, { role: 'assistant', text }]);
    this.typing.set(false);
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.scrollContainer?.nativeElement.scrollTo({ top: this.scrollContainer.nativeElement.scrollHeight, behavior: 'smooth' });
    }, 50);
  }

  useSuggestion(q: string): void {
    void this.send(q);
  }

  toggleSuggestions(): void {
    this.showSuggestions.update((v) => !v);
  }
}