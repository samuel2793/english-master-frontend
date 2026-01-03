import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, throwError, of } from 'rxjs';
import { Router } from '@angular/router';
import { User, RegisterRequest, LoginRequest, UserData } from '../interfaces/auth.interfaces';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router
  ) {
    this.initAuthListener();
  }

  private initAuthListener(): void {
    this.afAuth.authState.subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await this.firestore
          .collection('users')
          .doc(firebaseUser.uid)
          .get()
          .toPromise();

        if (userDoc && userDoc.exists) {
          const userData = userDoc.data() as UserData;
          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            username: userData.username,
            englishLevel: userData.englishLevel
          };
          this.currentUserSubject.next(user);
        } else {
          const username = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario';
          const userDoc: UserData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            username: username,
            englishLevel: 'A1',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await this.firestore.collection('users').doc(firebaseUser.uid).set(userDoc);

          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            username: username,
            englishLevel: 'A1'
          };
          this.currentUserSubject.next(user);
        }
      } else {
        this.currentUserSubject.next(null);
      }
    });
  }

  public get isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  public get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  register(userData: RegisterRequest): Observable<User> {
    return from(
      this.afAuth.createUserWithEmailAndPassword(userData.email, userData.password)
    ).pipe(
      switchMap((userCredential) => {
        if (!userCredential.user) {
          return throwError(() => new Error('Error al crear usuario'));
        }

        const userDoc: UserData = {
          uid: userCredential.user.uid,
          email: userData.email,
          username: userData.username,
          englishLevel: 'A1',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        return from(
          this.firestore.collection('users').doc(userCredential.user.uid).set(userDoc)
        ).pipe(
          map(() => ({
            uid: userCredential.user!.uid,
            email: userData.email,
            username: userData.username,
            englishLevel: 'A1'
          }))
        );
      }),
      catchError((error) => {
        console.error('Error en el registro:', error);
        return throwError(() => this.handleFirebaseError(error));
      })
    );
  }

  login(loginData: LoginRequest): Observable<User> {
    return from(
      this.afAuth.signInWithEmailAndPassword(loginData.email, loginData.password)
    ).pipe(
      switchMap((userCredential) => {
        if (!userCredential.user) {
          return throwError(() => new Error('Error al iniciar sesión'));
        }

        return this.firestore
          .collection('users')
          .doc(userCredential.user.uid)
          .get()
          .pipe(
            map((userDoc) => {
              if (userDoc.exists) {
                const userData = userDoc.data() as UserData;
                return {
                  uid: userCredential.user!.uid,
                  email: userCredential.user!.email || '',
                  username: userData.username,
                  englishLevel: userData.englishLevel
                };
              } else {
                return {
                  uid: userCredential.user!.uid,
                  email: userCredential.user!.email || '',
                  username: userCredential.user!.displayName || userCredential.user!.email?.split('@')[0] || 'Usuario'
                };
              }
            })
          );
      }),
      tap((user) => {
        this.currentUserSubject.next(user);
      }),
      catchError((error) => {
        console.error('Error en el login:', error);
        return throwError(() => this.handleFirebaseError(error));
      })
    );
  }

  async loginWithGoogle(): Promise<User> {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await this.afAuth.signInWithPopup(provider);

      if (!result.user) {
        throw new Error('Error al iniciar sesión con Google');
      }

      const userDoc = await this.firestore
        .collection('users')
        .doc(result.user.uid)
        .get()
        .toPromise();

      if (userDoc && userDoc.exists) {
        const userData = userDoc.data() as UserData;
        const user: User = {
          uid: result.user.uid,
          email: result.user.email || '',
          username: userData.username,
          englishLevel: userData.englishLevel
        };
        this.currentUserSubject.next(user);
        return user;
      } else {
        const username = result.user.displayName || result.user.email?.split('@')[0] || 'Usuario';
        const newUserDoc: UserData = {
          uid: result.user.uid,
          email: result.user.email || '',
          username: username,
          englishLevel: 'A1',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await this.firestore.collection('users').doc(result.user.uid).set(newUserDoc);

        const user: User = {
          uid: result.user.uid,
          email: result.user.email || '',
          username: username,
          englishLevel: 'A1'
        };
        this.currentUserSubject.next(user);
        return user;
      }
    } catch (error) {
      console.error('Error en el login con Google:', error);
      throw this.handleFirebaseError(error);
    }
  }

  logout(): Observable<void> {
    return from(this.afAuth.signOut()).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      }),
      catchError((error) => {
        console.error('Error al cerrar sesión:', error);
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
        return of(undefined);
      })
    );
  }

  updateEnglishLevel(level: string): Observable<void> {
    const user = this.currentUserSubject.value;
    if (!user) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    return from(
      this.firestore.collection('users').doc(user.uid).update({
        englishLevel: level,
        updatedAt: new Date()
      })
    ).pipe(
      tap(() => {
        this.currentUserSubject.next({ ...user, englishLevel: level });
      }),
      catchError((error) => {
        console.error('Error al actualizar nivel de inglés:', error);
        return throwError(() => error);
      })
    );
  }

  private handleFirebaseError(error: any): any {
    let message = 'Ha ocurrido un error';

    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Este correo electrónico ya está registrado';
        break;
      case 'auth/invalid-email':
        message = 'Correo electrónico inválido';
        break;
      case 'auth/operation-not-allowed':
        message = 'Operación no permitida';
        break;
      case 'auth/weak-password':
        message = 'La contraseña es demasiado débil';
        break;
      case 'auth/user-disabled':
        message = 'Esta cuenta ha sido deshabilitada';
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        message = 'Credenciales inválidas';
        break;
      case 'auth/too-many-requests':
        message = 'Demasiados intentos. Por favor, intenta más tarde';
        break;
      default:
        message = error.message || 'Error desconocido';
    }

    return { error: { message } };
  }
}
