import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, MatToolbarModule, MatButtonModule, MatCardModule, MatIconModule, MatDividerModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {}
