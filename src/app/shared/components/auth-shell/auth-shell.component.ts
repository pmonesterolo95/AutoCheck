import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../logo/logo.component';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterLink, LogoComponent, ThemeToggleComponent],
  templateUrl: './auth-shell.component.html',
  styleUrl: './auth-shell.component.scss',
})
export class AuthShellComponent {
  @Input() title = '';
  @Input() subtitle = '';
}