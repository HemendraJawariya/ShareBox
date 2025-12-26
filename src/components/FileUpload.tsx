'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { useFileStore } from '@/lib/store';
import { formatFileSize } from '@/lib/utils';
import { generateFileId, generateAccessToken, calculateExpiryDate, generateShareUrl } from '@/lib/encryption';

interface UploadProgress {
  fileIndex: number;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export default function FileUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [expiryDays, setExpiryDays] = useState(7);
  const [maxDownloads, setMaxDownloads] = useState(5);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [uploadError, setUploadError] = useState<string>('');
  const addFile = useFileStore((state) => state.addFile);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      setSelectedFiles((prev) => [...prev, ...files]);
    },
    []
  );

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File, index: number) => {
    try {
      const fileId = generateFileId();
      const accessToken = generateAccessToken();
      const expiresAt = calculateExpiryDate(expiryDays);
      const shareUrl = generateShareUrl(fileId, accessToken);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileId', fileId);
      formData.append('accessToken', accessToken);
      formData.append('expiryDays', expiryDays.toString());
      formData.append('maxDownloads', maxDownloads.toString());

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          setUploadProgress((prev) =>
            prev.map((p) =>
              p.fileIndex === index
                ? { ...p, uploadedBytes: event.loaded }
                : p
            )
          );
        }
      });

      const uploadPromise = new Promise<{ ok: boolean; data?: any; error?: string }>((resolve) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve({ ok: true, data: JSON.parse(xhr.responseText) });
            } catch {
              resolve({ ok: true, data: {} });
            }
          } else {
            let errorMsg = `Upload failed with status ${xhr.status}`;
            
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMsg = errorData.error || errorMsg;
            } catch {
              // Keep default error message
            }
            
            resolve({ ok: false, error: errorMsg });
          }
        };

        xhr.onerror = () => {
          resolve({ ok: false, error: 'Network error occurred during upload' });
        };

        xhr.ontimeout = () => {
          resolve({ ok: false, error: 'Upload timeout - connection lost' });
        };

        xhr.open('POST', '/api/upload');
        xhr.timeout = 300000; // 5 minute timeout for Vercel
        xhr.send(formData);
      });

      const response = await uploadPromise;

      if (response.ok) {
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.fileIndex === index
              ? { ...p, status: 'completed', uploadedBytes: file.size }
              : p
          )
        );

        addFile({
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          shareUrl,
          expiresAt,
          accessToken,
          maxDownloads,
        });
        return true;
      } else {
        const errorMsg = response.error || 'Upload failed';
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.fileIndex === index
              ? { ...p, status: 'error', error: errorMsg }
              : p
          )
        );
        setUploadError(`${file.name}: ${errorMsg}`);
        return false;
      }
    } catch (fileError) {
      const errorMessage = fileError instanceof Error ? fileError.message : 'Unknown error occurred';
      setUploadProgress((prev) =>
        prev.map((p) =>
          p.fileIndex === index
            ? { ...p, status: 'error', error: errorMessage }
            : p
        )
      );
      setUploadError(`${file.name}: ${errorMessage}`);
      return false;
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadError('');
    const progress: UploadProgress[] = selectedFiles.map((file, index) => ({
      fileIndex: index,
      fileName: file.name,
      fileSize: file.size,
      uploadedBytes: 0,
      status: 'uploading',
    }));
    setUploadProgress(progress);

    try {
      // Upload files in parallel (max 3 concurrent uploads)
      const maxConcurrent = 3;
      for (let i = 0; i < selectedFiles.length; i += maxConcurrent) {
        const batch = selectedFiles.slice(i, i + maxConcurrent);
        const uploadPromises = batch.map((file, batchIndex) =>
          uploadFile(file, i + batchIndex)
        );
        await Promise.all(uploadPromises);
      }

      // Clear selected files if all uploads completed successfully
      const hasErrors = uploadProgress.some((p) => p.status === 'error');
      if (!hasErrors) {
        setTimeout(() => {
          setSelectedFiles([]);
          setUploadProgress([]);
        }, 2000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      console.error('Upload failed:', error);
      setUploadError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 p-12 text-center ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className={`p-4 rounded-2xl transition-colors ${
              isDragging
                ? 'bg-blue-100'
                : 'bg-white'
            }`}
          >
            <Upload
              size={32}
              className={isDragging ? 'text-blue-600' : 'text-gray-600'}
            />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Drop your files here
            </h3>
            <p className="text-gray-500">or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">
              Supports files up to 1Gb. Larger files may take longer to upload.
            </p>
          </div>
          <input
            type="file"
            multiple
            onChange={handleFileInput}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Expiry & Download Settings */}
      {selectedFiles.length > 0 && (
        <div className="mt-8 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-blue-600" />
            Share Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expiry Days */}
            <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 hover:border-amber-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-amber-900">
                  Expires In (days)
                </label>
                <span className="text-2xl font-bold text-amber-600">{expiryDays}</span>
              </div>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white text-gray-900 font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent cursor-pointer hover:border-amber-400 transition-colors"
              >
                <option value={1}>1 Day</option>
                <option value={3}>3 Days</option>
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
              </select>
              <p className="text-xs text-amber-700 mt-2">
                Files will be automatically deleted after expiry
              </p>
            </div>

            {/* Max Downloads */}
            <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 hover:border-green-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-green-900">
                  Max Downloads
                </label>
                <span className="text-2xl font-bold text-green-600">{maxDownloads}</span>
              </div>
              <input
                type="number"
                min="1"
                max="100"
                value={maxDownloads}
                onChange={(e) => setMaxDownloads(Number(e.target.value))}
                className="w-full px-3 py-2 border border-green-300 rounded-lg bg-white text-gray-900 font-medium focus:ring-2 focus:ring-green-500 focus:border-transparent cursor-pointer hover:border-green-400 transition-colors"
                placeholder="5"
              />
              <p className="text-xs text-green-700 mt-2">
                File becomes unavailable after limit
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-pulse">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Upload Error</p>
            <p className="text-sm text-red-700 mt-1">{uploadError}</p>
          </div>
        </div>
      )}

      {/* Upload Progress Display */}
      {uploadProgress.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Upload Progress
          </h3>
          <div className="space-y-4">
            {uploadProgress.map((progress) => (
              <div
                key={progress.fileIndex}
                className="p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 truncate">
                      {progress.fileName}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatFileSize(progress.uploadedBytes)} / {formatFileSize(progress.fileSize)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    {progress.status === 'uploading' && (
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                    )}
                    {progress.status === 'completed' && (
                      <CheckCircle size={24} className="text-green-600" />
                    )}
                    {progress.status === 'error' && (
                      <AlertCircle size={24} className="text-red-600" />
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      progress.status === 'error'
                        ? 'bg-red-500'
                        : progress.status === 'completed'
                        ? 'bg-green-500'
                        : 'bg-blue-600'
                    }`}
                    style={{
                      width: `${
                        progress.fileSize > 0
                          ? (progress.uploadedBytes / progress.fileSize) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>

                {/* Progress Percentage */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-semibold text-gray-600">
                    {progress.fileSize > 0
                      ? Math.round((progress.uploadedBytes / progress.fileSize) * 100)
                      : 0}
                    %
                  </span>
                  <span className="text-xs text-gray-500">
                    {progress.status === 'uploading'
                      ? 'Uploading...'
                      : progress.status === 'completed'
                      ? 'Completed'
                      : 'Failed'}
                  </span>
                </div>

                {/* Error Message */}
                {progress.status === 'error' && progress.error && (
                  <p className="text-xs text-red-600 mt-2">{progress.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && uploadProgress.length === 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Selected Files ({selectedFiles.length})
          </h3>
          <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-800 truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-4 p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                  aria-label="Remove file"
                >
                  <X size={20} />
                </button>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              uploading
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg hover:shadow-blue-200 active:scale-95'
            }`}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload size={20} />
                Share Files
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
