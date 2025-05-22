import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Si está autenticado, permite el acceso
    if (this.authService.isLoggedIn) {
      return true;
    }

    // Si no está autenticado y la ruta no es login o register, redirige a login
    this.router.navigate(['/login']);
    return false;
  }
}
