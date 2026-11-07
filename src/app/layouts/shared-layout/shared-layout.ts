import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { ConductorLayout } from '../conductor-layout/conductor-layout';
import { PasajeroLayout } from '../pasajero-layout/pasajero-layout';
@Component({
  selector: 'app-shared-layout',
  imports: [ConductorLayout, PasajeroLayout],
  template: `@if (auth.isPasajero()) {
      <app-pasajero-layout />
    } @else {
      <app-conductor-layout />
    }`,
})
export class SharedLayout {
  protected readonly auth = inject(AuthService);
}
