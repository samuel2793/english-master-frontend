import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import firebase from 'firebase/compat/app';

export interface AdminUser {
  uid: string;
  email: string;
  username: string;
  englishLevel?: string;
  createdAt: any;
  exerciseAccessLogs?: UserExerciseLog[];
}

export interface EnglishLevelStatus {
  id: string;
  name: string;
  enabled: boolean;
}

export interface UserExerciseLog {
  id?: string;
  uid: string;
  email: string;
  username: string;
  course: string;
  level: string;
  activity: string;
  exerciseId: string;
  exerciseTitle?: string;
  relpath?: string;
  accessedAt: any;
}

export interface UserExerciseLogInput {
  uid: string;
  email: string;
  username: string;
  course: string;
  level: string;
  activity: string;
  exerciseId: string;
  exerciseTitle?: string;
  relpath?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  constructor(private firestore: AngularFirestore) {}

  // Obtener todos los usuarios
  getAllUsers(): Observable<AdminUser[]> {
    return this.firestore.collection<AdminUser>('users').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as AdminUser;
        const uid = a.payload.doc.id;
        return { uid, ...data };
      }))
    );
  }

  // Eliminar un usuario
  deleteUser(uid: string): Observable<void> {
    return from(this.firestore.collection('users').doc(uid).delete());
  }

  // Obtener un usuario por ID
  getUserById(uid: string): Observable<AdminUser | null> {
    return this.firestore.collection<AdminUser>('users').doc(uid).snapshotChanges().pipe(
      map((snapshot) => {
        const data = snapshot.payload.data();
        if (!data) return null;
        return { uid, ...data };
      })
    );
  }

  // Obtener todos los niveles de inglés
  getAllLevels(): Observable<EnglishLevelStatus[]> {
    return this.firestore.collection<any>('englishLevels').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data();
        const id = a.payload.doc.id;
        return {
          id,
          name: data.name || id,
          enabled: data.enabled !== false // Por defecto true
        };
      }))
    );
  }

  // Actualizar el estado de un nivel
  updateLevelStatus(levelId: string, enabled: boolean): Observable<void> {
    return from(
      this.firestore.collection('englishLevels').doc(levelId).update({ enabled })
    );
  }

  // Registrar acceso de usuario a un ejercicio
  registerUserExerciseAccess(log: UserExerciseLogInput): Observable<void> {
    const payload: UserExerciseLog = {
      ...log,
      accessedAt: firebase.firestore.Timestamp.now(),
    };

    return from(
      this.firestore.collection('users').doc(log.uid).set(
        {
          exerciseAccessLogs: firebase.firestore.FieldValue.arrayUnion(payload),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      )
    ).pipe(
      map(() => void 0)
    );
  }

  // Obtener log de ejercicios visitados por un usuario
  getUserExerciseLogs(uid: string): Observable<UserExerciseLog[]> {
    return this.getUserById(uid).pipe(
      map((user) => {
        const logs = user?.exerciseAccessLogs || [];
        return logs
          .map((log, index) => ({ ...log, id: `${uid}-${index}` }))
          .sort((a, b) => {
            const dateA = a.accessedAt?.toDate ? a.accessedAt.toDate().getTime() : new Date(a.accessedAt || 0).getTime();
            const dateB = b.accessedAt?.toDate ? b.accessedAt.toDate().getTime() : new Date(b.accessedAt || 0).getTime();
            return dateB - dateA;
          });
      })
    );
  }
}
