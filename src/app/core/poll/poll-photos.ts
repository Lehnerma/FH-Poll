import { Service, inject } from '@angular/core';
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';
import { FIREBASE_STORAGE } from '../firebase/firebase';
import { SurveyPhoto, SurveyQuestion } from './survey';

/** Maximale Größe eines Fotos (wie in `firebase/storage.rules`). */
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

const EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Prüft Format und Größe eines Fotos vor dem Upload.
 * @param file Gewählte Datei
 * @returns Fehlermeldung oder null, wenn die Datei passt
 */
export function photoProblem(file: Pick<File, 'type' | 'size'>): string | null {
  if (!(file.type in EXTENSIONS)) {
    return 'Bitte ein JPG-, PNG- oder WebP-Foto wählen.';
  }
  return file.size > PHOTO_MAX_BYTES ? 'Das Foto ist größer als 10 MB.' : null;
}

/**
 * Pfade der Fotos in einer Fragenliste.
 * @param questions Fragen
 * @returns Speicherpfade aller Fotos, die einen Pfad haben
 */
function photoPaths(questions: readonly SurveyQuestion[]): string[] {
  return questions.flatMap((question) => (question.photo?.path ? [question.photo.path] : []));
}

/** Fotos der Umfragen in Cloud Storage (`polls/<umfrage>/<uuid>.<endung>`), nur der Admin schreibt. */
@Service()
export class PollPhotos {
  private readonly storage = inject(FIREBASE_STORAGE);

  /**
   * Lädt ein Foto hoch (Original, unverändert).
   * @param surveyId Schlüssel der Umfrage
   * @param file Gewähltes Foto
   * @param alt Bildbeschreibung
   * @returns Download-Link, Speicherpfad und Bildbeschreibung
   */
  async upload(surveyId: string, file: File, alt: string): Promise<SurveyPhoto> {
    const path = `polls/${surveyId}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
    const photoRef = ref(this.storage, path);
    await uploadBytes(photoRef, file, { contentType: file.type });
    return { url: await getDownloadURL(photoRef), alt, path };
  }

  /**
   * Löscht Fotos, die nach dem Speichern von keiner Frage mehr gebraucht werden.
   * @param previous Fragen vor dem Speichern
   * @param current Fragen nach dem Speichern
   */
  async removeUnused(
    previous: readonly SurveyQuestion[],
    current: readonly SurveyQuestion[],
  ): Promise<void> {
    const kept = new Set(photoPaths(current));
    const unused = photoPaths(previous).filter((path) => !kept.has(path));
    await Promise.all(unused.map((path) => deleteObject(ref(this.storage, path))));
  }

  /**
   * Löscht alle Fotos einer Umfrage.
   * @param surveyId Schlüssel der Umfrage
   */
  async removeAll(surveyId: string): Promise<void> {
    const { items } = await listAll(ref(this.storage, `polls/${surveyId}`));
    await Promise.all(items.map((item) => deleteObject(item)));
  }
}
