import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-asistente-launcher',
  imports: [RouterLink],
  templateUrl: './asistente-launcher.html',
  styleUrl: './asistente-launcher.css',
})
export class AsistenteLauncher {
  private readonly router = inject(Router);

  protected get oculto(): boolean {
    return this.router.url.startsWith('/asistente');
  }
}
