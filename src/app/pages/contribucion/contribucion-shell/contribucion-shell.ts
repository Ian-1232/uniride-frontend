import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-contribucion-shell',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, RouterLink, RouterOutlet],
  templateUrl: './contribucion-shell.html',
  styleUrl: './contribucion-shell.css',
})
export class ContribucionShell {}
