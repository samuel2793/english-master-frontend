import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AdminUser {
  uid: string;
  email: string;
  username: string;
  englishLevel?: string;
  createdAt: any;
}

export interface EnglishLevelStatus {
  id: string;
  name: string;
  enabled: boolean;
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
}
