import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';
import { map, take, filter, switchMap } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private afAuth: AngularFireAuth,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    // Usa authState que espera a que Firebase inicialice
    return this.afAuth.authState.pipe(
      take(1),
      map(firebaseUser => {
        if (firebaseUser) {
          return true;
        }

        // Si no está autenticado, redirige a login
        this.router.navigate(['/login']);
        return false;
      })
    );
  }
}
