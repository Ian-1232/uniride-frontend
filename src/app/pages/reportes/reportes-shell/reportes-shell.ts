import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-reportes-shell',
  imports: [
    MatIconModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './reportes-shell.html',
  styleUrl: './reportes-shell.css',
})
export class ReportesShell {}
