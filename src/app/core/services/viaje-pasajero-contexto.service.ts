import { effect, inject, Injectable, untracked } from '@angular/core';
import { AuthService } from './auth.service';
import { ContextoViaje } from '../models/viajes.models';

/** Only the selected real response, in memory; not a source of availability or authorization. */
@Injectable({ providedIn: 'root' })
export class ViajePasajeroContextoService {
  private readonly auth = inject(AuthService);
  private owner = this.auth.currentUser();
  private value?: ContextoViaje;
  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      untracked(() => {
        if (this.owner !== user) {
          this.value = undefined;
          this.owner = user;
        }
      });
    });
  }
  seleccionar(value: ContextoViaje) {
    this.owner = this.auth.currentUser();
    this.value = value;
  }
  obtener(id: number) {
    return this.owner && this.owner === this.auth.currentUser() && this.value?.viaje.id === id
      ? this.value
      : undefined;
  }
}
