'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Download, ArrowLeft, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { formatFileSize, formatDate } from '@/lib/encryption';

interface ShareInfo {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: Date;
  expiresAt: Date;
  downloadCount: number;
  maxDownloads?: number;
  isExpired: boolean;
  canDownload: boolean;
  expiryIn: {
    days: number;
    hours: number;
    minutes: number;
  };
}

export default function SharePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const fileId = params.id as string;
  const token = searchParams.get('token');

  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchShareInfo = async () => {
      try {
        if (!token) {
          setError('Invalid access token');
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/share?fileId=${fileId}&token=${token}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError('File not found');
          } else if (response.status === 403) {
            setError('Invalid or expired access link');
          } else if (response.status === 410) {
            setError('This file share has expired');
          } else {
            setError('Failed to load share information');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setShareInfo(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching share info:', err);
        setError('Failed to load share information');
        setLoading(false);
      }
    };

    fetchShareInfo();
  }, [fileId, token]);

  const handleDownload = async () => {
    if (!shareInfo?.canDownload || !token) return;

    setDownloading(true);
    try {
      const response = await fetch(
        `/api/download?fileId=${fileId}&token=${token}`
      );

      if (!response.ok) {
        if (response.status === 410) {
          setError('File share has expired');
        } else if (response.status === 429) {
          setError('Download limit exceeded');
        } else {
          setError('Failed to download file');
        }
        setDownloading(false);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = shareInfo.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Update local state
      if (shareInfo) {
        setShareInfo({
          ...shareInfo,
          downloadCount: shareInfo.downloadCount + 1,
        });
      }
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download file');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Link href="/">
          <button className="flex items-center gap-2 mb-8 px-4 py-2 text-blue-600 hover:bg-white rounded-lg transition-colors">
            <ArrowLeft size={20} />
            Back to Upload
          </button>
        </Link>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading file information...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle size={48} className="text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {error}
            </h2>
            <p className="text-gray-600 mb-6">
              This file share may have expired, been deleted, or the link is invalid.
            </p>
            <Link href="/">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Start a New Share
              </button>
            </Link>
          </div>
        ) : shareInfo ? (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-8">
              {/* File Status */}
              <div className="flex items-center gap-3 mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <CheckCircle size={24} className="text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">File Ready</p>
                  <p className="text-sm text-blue-700">
                    This file is available for download
                  </p>
                </div>
              </div>

              {/* File Info */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 break-all mb-4">
                  📦 {shareInfo.fileName}
                </h1>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">File Size</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatFileSize(shareInfo.fileSize)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">File Type</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {shareInfo.fileType || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Uploaded</p>
                    <p className="text-sm text-gray-900">
                      {formatDate(new Date(shareInfo.uploadedAt))}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Downloads</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {shareInfo.downloadCount}
                      {shareInfo.maxDownloads
                        ? `/${shareInfo.maxDownloads}`
                        : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expiry Info */}
              {!shareInfo.isExpired && (
                <div className="mb-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex items-start gap-3">
                  <Clock size={20} className="text-yellow-600 mt-1 flex-shrink-0" />
                  <div>
                    {shareInfo.isExpired ? (
                      <p className="font-semibold text-red-900">
                        ⚠️ This share has expired
                      </p>
                    ) : (
                      <p className="font-semibold text-yellow-900">
                        Expires in {shareInfo.expiryIn && shareInfo.expiryIn.days}d{' '}
                        {shareInfo.expiryIn && shareInfo.expiryIn.hours}h{' '}
                        {shareInfo.expiryIn && shareInfo.expiryIn.minutes}m
                      </p>
                    )}
                    <p className={`text-sm ${
                      shareInfo.isExpired
                        ? 'text-red-800'
                        : 'text-yellow-800'
                    }`}>
                      {shareInfo.isExpired ? 'Expired on' : 'Expires on'} {formatDate(new Date(shareInfo.expiresAt))}
                    </p>
                  </div>
                </div>
              )}

              {/* Download Button */}
              <button
                onClick={handleDownload}
                disabled={!shareInfo.canDownload || downloading}
                className={`w-full py-4 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 text-lg ${
                  shareInfo.canDownload && !downloading
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg hover:shadow-blue-200 active:scale-95'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                }`}
              >
                {downloading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download size={24} />
                    Download File
                  </>
                )}
              </button>

              {!shareInfo.canDownload && shareInfo.isExpired && (
                <p className="text-center text-red-600 mt-4 font-medium">
                  ⚠️ This share has expired and is no longer available
                </p>
              )}

              {!shareInfo.canDownload &&
                !shareInfo.isExpired &&
                shareInfo.maxDownloads && (
                  <p className="text-center text-red-600 mt-4 font-medium">
                    ⚠️ Download limit has been reached
                  </p>
                )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
