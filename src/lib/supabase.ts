/**
 * Supabase Integration Utility
 * 
 * Optional cloud storage integration for ShareBox
 * Requires SUPABASE_URL and SUPABASE_KEY environment variables
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize Supabase client
 * Returns null if credentials not configured
 */
export function initializeSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    console.warn(
      'Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY to enable cloud storage.'
    );
    return null;
  }

  supabaseClient = createClient(url, key);
  return supabaseClient;
}

/**
 * Get Supabase client (lazy initialization)
 */
export function getSupabase(): SupabaseClient | null {
  return supabaseClient || initializeSupabase();
}

/**
 * Upload encrypted file to Supabase Storage
 * 
 * @param fileId - Unique file identifier
 * @param fileBuffer - Encrypted file data
 * @param metadata - Optional file metadata
 */
export async function uploadToSupabase(
  fileId: string,
  fileBuffer: Buffer,
  metadata?: Record<string, string>
): Promise<{ path: string; error?: string }> {
  const supabase = getSupabase();

  if (!supabase) {
    return { path: '', error: 'Supabase not configured' };
  }

  try {
    const fileName = `${fileId}.enc`;
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(fileName, fileBuffer, {
        metadata,
        upsert: false,
        cacheControl: '3600',
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return { path: '', error: error.message };
    }

    return { path: data.path };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Upload error:', message);
    return { path: '', error: message };
  }
}

/**
 * Download encrypted file from Supabase Storage
 * 
 * @param fileId - File identifier
 */
export async function downloadFromSupabase(
  fileId: string
): Promise<{ data: Buffer | null; error?: string }> {
  const supabase = getSupabase();

  if (!supabase) {
    return { data: null, error: 'Supabase not configured' };
  }

  try {
    const fileName = `${fileId}.enc`;
    const { data, error } = await supabase.storage
      .from('uploads')
      .download(fileName);

    if (error) {
      console.error('Supabase download error:', error);
      return { data: null, error: error.message };
    }

    const buffer = await data.arrayBuffer();
    return { data: Buffer.from(buffer) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Download error:', message);
    return { data: null, error: message };
  }
}

/**
 * Delete file from Supabase Storage
 * 
 * @param fileId - File identifier
 */
export async function deleteFromSupabase(fileId: string): Promise<{ error?: string }> {
  const supabase = getSupabase();

  if (!supabase) {
    return { error: 'Supabase not configured' };
  }

  try {
    const fileName = `${fileId}.enc`;
    const { error } = await supabase.storage.from('uploads').remove([fileName]);

    if (error) {
      console.error('Supabase delete error:', error);
      return { error: error.message };
    }

    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delete error:', message);
    return { error: message };
  }
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);
}

/**
 * Database Operations (PostgreSQL via Supabase)
 */

/**
 * Create share record in database
 */
export async function createShareRecord(shareData: {
  id: string;
  fileName: string;
  fileSize: number;
  encryptedKey: string;
  accessToken: string;
  expiresAt: string;
  maxDownloads: number;
  createdBy?: string;
}): Promise<{ error?: string }> {
  const supabase = getSupabase();

  if (!supabase) {
    return { error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase.from('shares').insert([
      {
        id: shareData.id,
        file_name: shareData.fileName,
        file_size: shareData.fileSize,
        encrypted_key: shareData.encryptedKey,
        access_token: shareData.accessToken,
        expires_at: shareData.expiresAt,
        max_downloads: shareData.maxDownloads,
        created_by: shareData.createdBy,
      },
    ]);

    if (error) {
      console.error('Database insert error:', error);
      return { error: error.message };
    }

    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create share error:', message);
    return { error: message };
  }
}

/**
 * Get share record from database
 */
export async function getShareRecord(
  accessToken: string
): Promise<{ data?: any; error?: string }> {
  const supabase = getSupabase();

  if (!supabase) {
    return { error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('shares')
      .select('*')
      .eq('access_token', accessToken)
      .single();

    if (error) {
      console.error('Database query error:', error);
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get share error:', message);
    return { error: message };
  }
}

/**
 * Increment download counter
 */
export async function incrementDownloadCount(
  accessToken: string
): Promise<{ error?: string }> {
  const supabase = getSupabase();

  if (!supabase) {
    return { error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase.rpc('increment_downloads', {
      token: accessToken,
    });

    if (error) {
      console.error('Download count error:', error);
      return { error: error.message };
    }

    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Increment download error:', message);
    return { error: message };
  }
}

/**
 * Delete share record (cascades to storage if configured)
 */
export async function deleteShareRecord(accessToken: string): Promise<{ error?: string }> {
  const supabase = getSupabase();

  if (!supabase) {
    return { error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase
      .from('shares')
      .delete()
      .eq('access_token', accessToken);

    if (error) {
      console.error('Database delete error:', error);
      return { error: error.message };
    }

    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delete share error:', message);
    return { error: message };
  }
}
