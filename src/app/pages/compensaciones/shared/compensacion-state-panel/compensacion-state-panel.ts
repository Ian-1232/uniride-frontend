import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type CompensationPanelTone = 'info' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-compensacion-state-panel',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './compensacion-state-panel.html',
  styleUrl: './compensacion-state-panel.css',
})
export class CompensacionStatePanel {
  readonly tone = input<CompensationPanelTone>('info');
  readonly icon = input('info');
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly actionLabel = input<string>();
  readonly action = output<void>();
}
