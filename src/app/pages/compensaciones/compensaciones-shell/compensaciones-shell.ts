import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-compensaciones-shell',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './compensaciones-shell.html',
  styleUrl: './compensaciones-shell.css',
})
export class CompensacionesShell {}
