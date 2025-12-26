import { NextRequest, NextResponse } from 'next/server';
import { getFileShare, isExpired, getExpiryIn } from '@/lib/encryption';
import { getShareRecord, isSupabaseConfigured } from '@/lib/supabase';

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

    const fileShare = getFileShare(fileId);

    if (!fileShare) {
      // File not in any storage - return a placeholder response
      // Client will need to have the encrypted data in sessionStorage or browser storage
      return NextResponse.json(
        {
          fileId,
          fileName: 'File',
          fileSize: 0,
          fileType: 'application/octet-stream',
          uploadedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          downloadCount: 0,
          maxDownloads: 5,
          isExpired: false,
          expiryIn: { days: 7, hours: 0, minutes: 0 },
          canDownload: true,
          // Signal that client needs to provide encrypted data
          requiresClientData: true,
        },
        { status: 200 }
      );
    }

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
