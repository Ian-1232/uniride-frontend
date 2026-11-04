import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type ReportStateTone = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

@Component({
  selector: 'app-reportes-state-panel',
  imports: [MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './reportes-state-panel.html',
  styleUrl: './reportes-state-panel.css',
})
export class ReportesStatePanel {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly tone = input<ReportStateTone>('info');
  readonly loading = input(false);
  readonly actionLabel = input<string>();
  readonly action = output<void>();
}
