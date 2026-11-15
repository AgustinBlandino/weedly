import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { uid } from './utils';

// Las fotos se copian a una carpeta propia de la app: lo que devuelve el selector puede vivir en una
// carpeta temporal que el sistema limpia. Se guarda la URI absoluta, pero en iOS la ruta del contenedor
// cambia entre actualizaciones, así que al cargar se recalcula con `resolvePhotoUri`.
const DIR_NAME = 'weedly-photos';
const MARKER = `/${DIR_NAME}/`;
const IS_WEB = Platform.OS === 'web';

function photoDir(): Directory {
  const dir = new Directory(Paths.document, DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export function isStoredPhoto(uri: string): boolean {
  return uri.includes(MARKER);
}

/** Apunta una foto guardada a la carpeta actual de la app. Las que no son nuestras quedan igual. */
export function resolvePhotoUri(uri: string): string {
  if (IS_WEB) return uri;
  const i = uri.lastIndexOf(MARKER);
  if (i < 0) return uri;
  return new File(photoDir(), uri.slice(i + MARKER.length)).uri;
}

/** Copia la foto elegida a la carpeta de la app y devuelve la URI nueva. Si ya es nuestra, no la toca. */
export async function persistPhoto(uri: string): Promise<string> {
  if (IS_WEB || isStoredPhoto(uri)) return uri;
  const ext = /\.([a-z0-9]{2,5})$/i.exec(uri.split('?')[0])?.[1]?.toLowerCase() ?? 'jpg';
  const dest = new File(photoDir(), `${uid()}.${ext}`);
  await new File(uri).copy(dest);
  return dest.uri;
}

/** Borra el archivo de una foto nuestra. Si no está o falla, no pasa nada: el registro ya se borró. */
export function deletePhotoFile(uri: string): void {
  if (IS_WEB || !isStoredPhoto(uri)) return;
  try {
    const file = new File(resolvePhotoUri(uri));
    if (file.exists) file.delete();
  } catch {
    // Un archivo huérfano no rompe nada.
  }
}

/** Borra todas las fotos de la app (para "Borrar todo"). */
export function deleteAllPhotoFiles(): void {
  if (IS_WEB) return;
  try {
    const dir = new Directory(Paths.document, DIR_NAME);
    if (dir.exists) dir.delete();
  } catch {
    // Si no se puede borrar, quedan archivos sin registro; no afecta a la app.
  }
}

/**
 * Copia a la carpeta de la app las fotos viejas que todavía apuntan a donde las dejó el selector.
 * Devuelve id → URI nueva solo de las que se pudieron copiar; las que ya no existen quedan como estaban.
 */
export async function adoptExternalPhotos(photos: { id: string; uri: string }[]): Promise<Map<string, string>> {
  const moved = new Map<string, string>();
  if (IS_WEB) return moved;
  for (const p of photos) {
    if (isStoredPhoto(p.uri)) continue;
    try {
      if (!new File(p.uri).exists) continue;
      moved.set(p.id, await persistPhoto(p.uri));
    } catch {
      // Se reintenta en el próximo arranque.
    }
  }
  return moved;
}
