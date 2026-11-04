import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type ContribucionStateTone = 'info' | 'warning' | 'danger' | 'neutral';

@Component({
  selector: 'app-contribucion-state-panel',
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './contribucion-state-panel.html',
  styleUrl: './contribucion-state-panel.css',
})
export class ContribucionStatePanel {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly tone = input<ContribucionStateTone>('info');
  readonly icon = input('info');
  readonly loading = input(false);
  readonly actionLabel = input<string>();
  readonly action = output<void>();
}
