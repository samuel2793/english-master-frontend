import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  ContentFile,
  Exercise,
  CourseType,
  LevelType,
  ActivityFilter,
  ActivityList,
  ActivityIndex,
} from '../interfaces/activity.interfaces';

@Injectable({
  providedIn: 'root',
})
export class ActivitiesService {
  private readonly COLLECTION = 'contentFiles';

  // Mapeo de cursos a nombres amigables
  private readonly COURSE_NAMES: Record<CourseType, string> = {
    listening: 'Listening',
    reading: 'Reading',
    'use-of-english': 'Use of English',
    writing: 'Writing',
    speaking: 'Speaking',
    'grammar-tests': 'Grammar Tests',
  };

  constructor(private firestore: AngularFirestore) {}

  /**
   * Obtiene un documento JSON específico desde Firestore
   * @param path Ruta del archivo (ej: "listening/b1/Extracts/1.json")
   */
  getJson(path: string): Observable<any> {
    return this.firestore
      .collection<ContentFile>(this.COLLECTION, (ref) =>
        ref.where('relpath', '==', path).limit(1)
      )
      .valueChanges()
      .pipe(
        map((docs) => {
          if (!docs || docs.length === 0) {
            throw new Error(`No se encontró el archivo: ${path}`);
          }
          const doc = docs[0];
          if (doc.storedInStorage) {
            // TODO: Implementar descarga desde Storage si es necesario
            throw new Error('Archivo almacenado en Storage, no implementado aún');
          }
          return doc.data;
        }),
        catchError((error) => {
          console.error(`Error al cargar JSON ${path}:`, error);
          throw error;
        })
      );
  }

  /**
   * Lista todos los niveles disponibles para un curso
   * @param course Tipo de curso
   */
  listLevels(course: CourseType): Observable<LevelType[]> {
    // Grammar tests solo tiene B2, C1, C2
    if (course === 'grammar-tests') {
      return of(['b2', 'c1', 'c2'] as LevelType[]);
    }

    return this.firestore
      .collection<ContentFile>(this.COLLECTION, (ref) =>
        ref
          .where('module', '==', course)
          .orderBy('level')
      )
      .valueChanges()
      .pipe(
        map((docs) => {
          const levels = new Set<string>();
          docs.forEach((doc) => {
            if (doc.level) {
              levels.add(doc.level);
            }
          });
          return Array.from(levels).sort() as LevelType[];
        }),
        catchError((error) => {
          console.error(`Error al listar niveles de ${course}:`, error);
          return of(['b1', 'b2', 'c1', 'c2'] as LevelType[]); // Fallback
        })
      );
  }

  /**
   * Lista todas las actividades/partes disponibles para un curso y nivel
   * @param course Tipo de curso
   * @param level Nivel
   */
  listActivities(course: CourseType, level: LevelType): Observable<ActivityList<ActivityIndex>> {
    // Consultar directamente los grupos desde Firestore
    return this.listActivitiesFromFirestore(course, level);
  }

  /**
   * Lista actividades consultando directamente Firestore (fallback)
   */
  private listActivitiesFromFirestore(
    course: CourseType,
    level: LevelType
  ): Observable<ActivityList<ActivityIndex>> {
    return this.firestore
      .collection<ContentFile>(this.COLLECTION, (ref) =>
        ref.where('module', '==', course).where('level', '==', level)
      )
      .valueChanges()
      .pipe(
        map((docs) => {
          const groups = new Map<string, number>();

          docs.forEach((doc) => {
            // Extraer el grupo del relpath si group no es un string válido
            let groupName = '';

            if (doc.group && typeof doc.group === 'string') {
              groupName = doc.group;
            } else if (doc.relpath) {
              // Extraer del relpath: "reading/b2/Signs/1.json" -> "Signs"
              const parts = doc.relpath.split('/');
              if (parts.length >= 3) {
                groupName = parts[2];
              }
            }

            // Filtrar Exercise bare
            const title = doc.data?.title || '';
            const isBareExercise = title.toLowerCase().includes('exercise bare') ||
                                  title.toLowerCase() === 'bare' ||
                                  doc.filename.toLowerCase().includes('bare');

            // Filtrar archivos de índice y cantidades
            if (groupName &&
                !doc.filename.includes('index') &&
                !doc.filename.includes('quantities') &&
                !doc.filename.includes('activities') &&
                !isBareExercise) {
              const count = groups.get(groupName) || 0;
              groups.set(groupName, count + 1);
            }
          });

          const items = Array.from(groups.entries()).map(([name, count]) => ({
            name,
            slug: name.toLowerCase().replace(/\s+/g, '-'),
            count,
          }));

          return {
            items: items.sort((a, b) => a.name.localeCompare(b.name)),
            total: items.length,
            hasMore: false,
          };
        }),
        catchError((error) => {
          console.error(`Error al listar actividades de ${course}/${level}:`, error);
          return of({ items: [], total: 0, hasMore: false });
        })
      );
  }

  /**
   * Lista todos los ejercicios de una actividad específica
   * @param course Tipo de curso
   * @param level Nivel
   * @param activity Nombre de la actividad (puede ser slug o nombre completo)
   * @param limit Límite de resultados (default: 500)
   */
  listExercises(
    course: CourseType,
    level: LevelType,
    activity: string,
    limit: number = 500
  ): Observable<ActivityList<Exercise>> {
    // Normalizar el activity para comparación
    const activityNormalized = activity.toLowerCase().replace(/\s+/g, '-');

    // Query simple sin índices compuestos
    return this.firestore
      .collection<ContentFile>(this.COLLECTION, (ref) =>
        ref
          .where('module', '==', course)
          .where('level', '==', level)
      )
      .valueChanges()
      .pipe(
        map((docs) => {
          // Filtrar en memoria para evitar índices compuestos
          const items: Exercise[] = docs
            .filter((doc) => {
              // Verificar que el relpath coincida con la actividad
              const parts = doc.relpath.split('/');
              const groupName = parts[2] || '';
              const groupSlug = groupName.toLowerCase().replace(/\s+/g, '-');

              // Comparar tanto por nombre exacto como por slug
              const matches = groupName === activity || groupSlug === activityNormalized;

              // Filtrar "Exercise bare" o ejercicios sin título válido
              const title = doc.data?.title || '';
              const isBareExercise = title.toLowerCase().includes('exercise bare') ||
                                    title.toLowerCase() === 'bare' ||
                                    doc.filename.toLowerCase().includes('bare');

              return matches &&
                     !doc.filename.includes('index') &&
                     !doc.filename.includes('quantities') &&
                     !doc.filename.includes('activities') &&
                     !isBareExercise;
            })
            .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }))
            .slice(0, limit)
            .map((doc) => {
              // Usar el campo 'id' del JSON si existe, sino extraer del filename
              const exerciseId = doc.data?.id?.toString() || this.extractIdFromFilename(doc.filename);
              return {
                id: exerciseId,
                course: course,
                level: level,
                activity: activity,
                relpath: doc.relpath,
                payload: doc.data || {},
              };
            });

          return {
            items,
            total: items.length,
            hasMore: items.length >= limit,
          };
        }),
        catchError((error) => {
          console.error(`Error al listar ejercicios de ${activity}:`, error);
          return of({ items: [], total: 0, hasMore: false });
        })
      );
  }

  /**
   * Obtiene un ejercicio específico
   * @param course Tipo de curso
   * @param level Nivel
   * @param activity Actividad (puede ser slug o nombre real)
   * @param exerciseId ID del ejercicio (campo 'id' del JSON)
   */
  getExercise(
    course: CourseType,
    level: LevelType,
    activity: string,
    exerciseId: string
  ): Observable<Exercise> {
    // Normalizar el activity para comparación
    const activityNormalized = activity.toLowerCase().replace(/\s+/g, '-');

    // Buscar el documento en Firestore
    return this.firestore
      .collection<ContentFile>(this.COLLECTION, (ref) =>
        ref
          .where('module', '==', course)
          .where('level', '==', level)
      )
      .valueChanges()
      .pipe(
        map((docs) => {
          // Filtrar por activity (comparando slug) y el campo 'id' del JSON
          const doc = docs.find((d) => {
            const parts = d.relpath.split('/');
            const groupName = parts[2] || '';
            const groupSlug = groupName.toLowerCase().replace(/\s+/g, '-');
            const activityMatches = groupSlug === activityNormalized || groupName === activity;

            // Comparar por el campo 'id' del JSON
            const docId = d.data?.id?.toString();
            const idMatches = docId === exerciseId;

            return activityMatches && idMatches;
          });          if (!doc) {
            throw new Error(`No se encontró el ejercicio: ${course}/${level}/${activity}/${exerciseId}`);
          }

          if (doc.storedInStorage) {
            throw new Error('Archivo almacenado en Storage, no implementado aún');
          }

          return {
            id: exerciseId,
            course,
            level,
            activity,
            relpath: doc.relpath,
            payload: doc.data || {},
          };
        }),
        catchError((error) => {
          console.error(`Error al cargar ejercicio ${exerciseId}:`, error);
          throw error;
        })
      );
  }

  /**
   * Obtiene la URL de una imagen de Speaking
   * @param level Nivel
   * @param part Parte/actividad
   * @param imageNumber Número de imagen (1, 2, etc.)
   */
  getSpeakingImageUrl(level: LevelType, part: string, imageNumber: string): string {
    // Normalizar el nombre de la parte para URL
    const partSlug = part.toLowerCase().replace(/\s+/g, '-');
    return `https://englishapps.app/img/speaking/${level}/${partSlug}/${imageNumber}.jpeg`;
  }

  /**
   * Parsea las opciones de Grammar Tests (separadas por //)
   * @param choicesString String con opciones separadas por //
   */
  parseGrammarChoices(choicesString: string): string[] {
    return choicesString.split('//').map((choice) => choice.trim());
  }

  /**
   * Obtiene el nombre amigable de un curso
   */
  getCourseName(course: CourseType): string {
    return this.COURSE_NAMES[course] || course;
  }

  /**
   * Extrae el ID del nombre del archivo (sin extensión)
   */
  private extractIdFromFilename(filename: string): string {
    return filename.replace(/\.json$/i, '');
  }

  /**
   * Obtiene la ruta del archivo índice según el curso
   */
  private getIndexPath(course: CourseType, level: LevelType): string {
    switch (course) {
      case 'writing':
        return `${course}/${level}/activities.json`;
      case 'speaking':
        return `${course}/${level}/activities.json`;
      case 'grammar-tests':
        // Grammar tests tiene subcarpetas por dificultad
        const difficulty = this.getGrammarDifficulty(level);
        return `${course}/${level}/${difficulty}/index.json`;
      default:
        return `${course}/${level}/index.json`;
    }
  }

  /**
   * Mapea nivel a dificultad en Grammar Tests
   */
  private getGrammarDifficulty(level: LevelType): string {
    const map: Record<LevelType, string> = {
      b1: 'Beginner',
      b2: 'Beginner',
      c1: 'Intermediate',
      c2: 'Expert',
    };
    return map[level] || 'Beginner';
  }

  /**
   * Obtiene todos los cursos disponibles
   */
  getAvailableCourses(): CourseType[] {
    return [
      'listening',
      'reading',
      'use-of-english',
      'writing',
      'speaking',
      'grammar-tests',
    ];
  }
}
