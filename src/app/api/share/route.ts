import { NextRequest, NextResponse } from 'next/server';
import { getFileShare, isExpired, getExpiryIn } from '@/lib/encryption';
import { retrieveFile } from '@/lib/persistent-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const token = searchParams.get('token');

    // If no parameters provided, return helpful error
    if (!fileId || !token) {
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          message: 'Please provide fileId and token as query parameters',
          example: '/api/share?fileId=your-file-id&token=your-access-token'
        },
        { status: 400 }
      );
    }

    // Try persistent store first
    const persistedFile = retrieveFile(fileId);
    console.log(`[Share] Querying persistent store for fileId: ${fileId}`);
    
    if (persistedFile && persistedFile.accessToken === token) {
      const isFileExpired = new Date() > persistedFile.expiresAt;
      const now = new Date();
      const diffMs = persistedFile.expiresAt.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return NextResponse.json({
        fileId: persistedFile.fileId,
        fileName: persistedFile.fileName,
        fileSize: persistedFile.fileSize,
        fileType: persistedFile.fileType,
        uploadedAt: persistedFile.uploadedAt.toISOString(),
        expiresAt: persistedFile.expiresAt.toISOString(),
        downloadCount: persistedFile.downloadCount,
        maxDownloads: persistedFile.maxDownloads,
        isExpired: isFileExpired,
        expiryIn: { 
          days: diffDays > 0 ? diffDays : 0, 
          hours: diffHours, 
          minutes: diffMinutes 
        },
        canDownload:
          !isFileExpired &&
          persistedFile.downloadCount < persistedFile.maxDownloads,
      });
    }

    // Try in-memory store as fallback
    const fileShare = getFileShare(fileId);

    if (fileShare) {
      // File found in local memory
      if (fileShare.accessToken !== token) {
        return NextResponse.json(
          { error: 'Invalid access token' },
          { status: 403 }
        );
      }

      const expired = isExpired(fileShare.expiresAt);
      const expiryInfo = getExpiryIn(fileShare.expiresAt);

      return NextResponse.json({
        fileId: fileShare.fileId,
        fileName: fileShare.fileName,
        fileSize: fileShare.fileSize,
        fileType: fileShare.fileType,
        uploadedAt: fileShare.uploadedAt,
        expiresAt: fileShare.expiresAt,
        downloadCount: fileShare.downloadCount,
        maxDownloads: fileShare.maxDownloads,
        isExpired: expired,
        expiryIn: expiryInfo,
        canDownload:
          !expired &&
          (!fileShare.maxDownloads ||
            fileShare.downloadCount < fileShare.maxDownloads),
      });
    }

    // File not found
    return NextResponse.json(
      { 
        error: 'File not found - it may have expired or the link is invalid'
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('Share info error:', error);
    return NextResponse.json(
      { error: 'Failed to get share info' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    { 
      message: 'Share API endpoint',
      usage: 'GET /api/share?fileId=file-id&token=access-token',
      description: 'Retrieve file share metadata and download permissions'
    },
    { status: 200 }
  );
}
