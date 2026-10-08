import { Injectable } from '@angular/core';
import { supabase } from '../config/supabase.client';

const BUCKET_VEHICLES = 'vehicle-images';
const BUCKET_DOCUMENTS = 'documents';

/**
 * Servicio de almacenamiento (Supabase Storage).
 * Cada archivo se guarda en la carpeta del usuario: {userId}/{nombre}.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  async uploadFile(bucket: string, folder: string, file: File): Promise<{ path: string | null; error: string | null }> {
    const path = `${folder}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) return { path: null, error: error.message };
    return { path, error: null };
  }

  uploadVehicleImage(userId: string, file: File) {
    return this.uploadFile(BUCKET_VEHICLES, userId, file);
  }

  uploadDocument(userId: string, file: File) {
    return this.uploadFile(BUCKET_DOCUMENTS, userId, file);
  }

  /** URL pública (bucket público: imágenes de vehículos). */
  getPublicUrl(path: string): string {
    return supabase.storage.from(BUCKET_VEHICLES).getPublicUrl(path).data.publicUrl;
  }

  /** URL firmada (bucket privado: documentos). */
  async getDocumentUrl(path: string): Promise<string | null> {
    const { data, error } = await supabase.storage.from(BUCKET_DOCUMENTS).createSignedUrl(path, 3600);
    if (error) {
      console.warn('Error al generar URL del documento:', error.message);
      return null;
    }
    return data.signedUrl;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    await supabase.storage.from(bucket).remove([path]);
  }
}