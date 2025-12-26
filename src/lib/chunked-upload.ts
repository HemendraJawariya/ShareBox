// Chunked upload utility for large files
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export interface ChunkUploadConfig {
  fileId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  accessToken: string;
  expiryDays: number;
  maxDownloads: number;
}

export interface ChunkUploadProgress {
  chunkIndex: number;
  totalChunks: number;
  uploadedBytes: number;
  totalBytes: number;
}

export async function uploadFileInChunks(
  file: File,
  config: ChunkUploadConfig,
  onProgress: (progress: ChunkUploadProgress) => void
): Promise<{ ok: boolean; error?: string }> {
  try {
    let uploadedBytes = 0;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const chunkFormData = new FormData();
      chunkFormData.append('chunk', chunk);
      chunkFormData.append('fileId', config.fileId);
      chunkFormData.append('chunkIndex', chunkIndex.toString());
      chunkFormData.append('totalChunks', totalChunks.toString());
      chunkFormData.append('fileName', config.fileName);
      chunkFormData.append('fileSize', config.fileSize.toString());
      chunkFormData.append('accessToken', config.accessToken);
      chunkFormData.append('expiryDays', config.expiryDays.toString());
      chunkFormData.append('maxDownloads', config.maxDownloads.toString());

      // Upload this chunk
      const result = await uploadChunk(chunkFormData);

      if (!result.ok) {
        return { ok: false, error: result.error };
      }

      uploadedBytes = end;
      onProgress({
        chunkIndex,
        totalChunks,
        uploadedBytes,
        totalBytes: file.size,
      });
    }

    // All chunks uploaded successfully
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Chunked upload failed',
    };
  }
}

function uploadChunk(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({ ok: true });
        } catch {
          resolve({ ok: true });
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          resolve({ ok: false, error: errorData.error || `Upload failed with status ${xhr.status}` });
        } catch {
          resolve({ ok: false, error: `Upload failed with status ${xhr.status}` });
        }
      }
    };

    xhr.onerror = () => {
      resolve({ ok: false, error: 'Network error occurred during chunk upload' });
    };

    xhr.ontimeout = () => {
      resolve({ ok: false, error: 'Chunk upload timeout' });
    };

    xhr.open('POST', '/api/upload-chunk');
    xhr.timeout = 300000; // 5 minute timeout per chunk
    xhr.send(formData);
  });
}
