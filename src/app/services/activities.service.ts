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
            // Para grammar-tests, usar una lógica diferente
            if (course === 'grammar-tests') {
              // grammar-tests/c2/expert/1.json -> grupo "Expert"
              const parts = doc.relpath.split('/');
              if (parts.length >= 4) {
                const groupName = parts[2]; // "expert", "intermediate", "beginner"
                // Capitalizar primera letra
                const capitalizedGroup = groupName.charAt(0).toUpperCase() + groupName.slice(1);

                // Solo contar archivos que son ejercicios (números o con 'questions' en el nombre del archivo)
                const filename = doc.filename.toLowerCase();
                const isExerciseFile = /^\d+\.json$/.test(doc.filename) || filename.includes('questions');

                if (isExerciseFile && !filename.includes('index') && !filename.includes('quantities')) {
                  const count = groups.get(capitalizedGroup) || 0;
                  groups.set(capitalizedGroup, count + 1);
                }
              }
              return;
            }

            // Lógica original para otros cursos
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

            // Filtrar Exercise bare y Exercise list
            const title = doc.data?.title || '';
            const isBareExercise = title.toLowerCase().includes('exercise bare') ||
                                  title.toLowerCase() === 'bare' ||
                                  doc.filename.toLowerCase().includes('bare');
            const isListExercise = title.toLowerCase().includes('exercise list') ||
                                  title.toLowerCase() === 'exercise list' ||
                                  doc.filename.toLowerCase().includes('list');

            // Filtrar archivos "exercises.json" (metadatos de lista de ejercicios)
            const isExercisesFile = doc.filename.toLowerCase() === 'exercises.json' ||
                                   doc.filename.toLowerCase().includes('exercises');

            // Filtrar archivos de metadatos de Writing que tienen quantity, course_id, percentage
            const isWritingMetadata = course === 'writing' &&
                                     doc.data &&
                                     (doc.data.quantity !== undefined || doc.data.course_id !== undefined);

            // Filtrar archivos de índice y cantidades
            if (groupName &&
                !doc.filename.includes('index') &&
                !doc.filename.includes('quantities') &&
                !doc.filename.includes('activities') &&
                !isBareExercise &&
                !isListExercise &&
                !isExercisesFile &&
                !isWritingMetadata) {
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
              const parts = doc.relpath.split('/');

              // Para grammar-tests: grammar-tests/c2/expert/1.json
              if (course === 'grammar-tests') {
                if (parts.length < 4) return false;
                const groupName = parts[2]; // "expert", "intermediate", "beginner"
                const capitalizedGroup = groupName.charAt(0).toUpperCase() + groupName.slice(1);
                const groupSlug = groupName.toLowerCase().replace(/\s+/g, '-');

                const matches = capitalizedGroup === activity ||
                               groupSlug === activityNormalized ||
                               groupName === activity.toLowerCase();

                // Solo archivos meta.json (que contienen el ID del ejercicio)
                const isMetaFile = doc.filename === 'meta.json';
                const hasValidData = doc.data && (doc.data.id || doc.data.number);

                return matches && isMetaFile && hasValidData;
              }

              // Lógica original para otros cursos
              const groupName = parts[2] || '';
              const groupSlug = groupName.toLowerCase().replace(/\s+/g, '-');

              // Comparar tanto por nombre exacto como por slug
              const matches = groupName === activity || groupSlug === activityNormalized;

              // Filtrar "Exercise bare" y "Exercise list" o ejercicios sin título válido
              const title = doc.data?.title || '';
              const isBareExercise = title.toLowerCase().includes('exercise bare') ||
                                    title.toLowerCase() === 'bare' ||
                                    doc.filename.toLowerCase().includes('bare');
              const isListExercise = title.toLowerCase().includes('exercise list') ||
                                    title.toLowerCase() === 'exercise list' ||
                                    doc.filename.toLowerCase().includes('list');

              // Filtrar archivos "exercises.json" (metadatos de lista de ejercicios)
              const isExercisesFile = doc.filename.toLowerCase() === 'exercises.json' ||
                                     doc.filename.toLowerCase().includes('exercises');

              // Para Writing, filtrar archivos de metadatos que tienen quantity o course_id
              // (archivos de configuración, no ejercicios reales)
              const isWritingMetadata = course === 'writing' &&
                                       doc.data &&
                                       (doc.data.quantity !== undefined || doc.data.course_id !== undefined);

              return matches &&
                     !doc.filename.includes('index') &&
                     !doc.filename.includes('quantities') &&
                     !doc.filename.includes('activities') &&
                     !isBareExercise &&
                     !isListExercise &&
                     !isExercisesFile &&
                     !isWritingMetadata;
            })
            .sort((a, b) => {
              // Para grammar-tests, ordenar por el campo 'number' del payload
              if (course === 'grammar-tests') {
                const numA = a.data?.number || 0;
                const numB = b.data?.number || 0;
                return numA - numB;
              }
              // Para otros cursos, ordenar por nombre de archivo
              return a.filename.localeCompare(b.filename, undefined, { numeric: true });
            })
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
          // Para grammar-tests, buscar el meta.json y questions.json
          if (course === 'grammar-tests') {
            // Buscar el meta.json que contiene el ID
            const metaDoc = docs.find((d) => {
              const parts = d.relpath.split('/');
              const groupName = parts[2] || '';
              const groupSlug = groupName.toLowerCase().replace(/\s+/g, '-');
              const activityMatches = groupSlug === activityNormalized || groupName === activity;
              const docId = d.data?.id?.toString();
              const idMatches = docId === exerciseId;
              const isMeta = d.filename === 'meta.json';

              return activityMatches && idMatches && isMeta;
            });

            if (!metaDoc) {
              throw new Error(`No se encontró el ejercicio: ${course}/${level}/${activity}/${exerciseId}`);
            }

            // Buscar el questions.json en la misma carpeta
            const folderPath = metaDoc.relpath.substring(0, metaDoc.relpath.lastIndexOf('/'));
            const questionsDoc = docs.find((d) =>
              d.relpath.startsWith(folderPath) && d.filename === 'questions.json'
            );

            // Combinar meta y questions
            const payload = {
              ...metaDoc.data,
              questions: questionsDoc?.data || []
            };

            return {
              id: exerciseId,
              course,
              level,
              activity,
              relpath: metaDoc.relpath,
              payload,
            };
          }

          // Lógica original para otros cursos
          const doc = docs.find((d) => {
            const parts = d.relpath.split('/');
            const groupName = parts[2] || '';
            const groupSlug = groupName.toLowerCase().replace(/\s+/g, '-');
            const activityMatches = groupSlug === activityNormalized || groupName === activity;

            // Comparar por el campo 'id' del JSON
            const docId = d.data?.id?.toString();
            const idMatches = docId === exerciseId;

            return activityMatches && idMatches;
          });

          if (!doc) {
            throw new Error(`No se encontró el ejercicio: ${course}/${level}/${activity}/${exerciseId}`);
          }

          if (doc.storedInStorage) {
            throw new Error('Archivo almacenado en Storage, no implementado aún');
          }

          // Para Writing, verificar si el payload está anidado
          let payload = doc.data || {};
          if (course === 'writing' && doc.data?.payload) {
            payload = doc.data.payload;
          }

          return {
            id: exerciseId,
            course,
            level,
            activity,
            relpath: doc.relpath,
            payload,
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
