import { supabase } from './supabaseClient';

interface UploadOptions {
  bucket?: string;
  folder?: string;
}

interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export const uploadVideoToStorage = async (
  file: Blob | File,
  fileName: string,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  const { bucket = 'videos', folder = 'recordings' } = options;
  
  try {
    // Generate unique file name
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fullPath = `${folder}/${timestamp}-${cleanFileName}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fullPath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'video/webm'
      });
    
    if (error) {
      console.error('Supabase upload error:', error);
      return { success: false, error: error.message };
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fullPath);
    
    return {
      success: true,
      url: urlData.publicUrl,
      path: fullPath
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Upload failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
};

export const uploadThumbnail = async (
  blob: Blob,
  videoPath: string
): Promise<UploadResult> => {
  try {
    const thumbnailPath = videoPath.replace('videos/', 'thumbnails/').replace(/\.[^/.]+$/, '.jpg');
    
    const { data, error } = await supabase.storage
      .from('thumbnails')
      .upload(thumbnailPath, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg'
      });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    const { data: urlData } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(thumbnailPath);
    
    return {
      success: true,
      url: urlData.publicUrl,
      path: thumbnailPath
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

export const deleteVideoFromStorage = async (path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('videos')
      .remove([path]);
    
    return !error;
  } catch (err) {
    console.error('Delete failed:', err);
    return false;
  }
};
