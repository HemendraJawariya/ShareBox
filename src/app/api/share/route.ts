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

    // If not in memory and Supabase is configured, try Supabase
    if (isSupabaseConfigured()) {
      const { data: shareRecord, error: recordError } = await getShareRecord(token);

      if (recordError || !shareRecord) {
        return NextResponse.json(
          { error: 'This file share may have expired, been deleted, or the link is invalid.' },
          { status: 404 }
        );
      }

      // Check expiry
      if (new Date(shareRecord.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'This file share may have expired, been deleted, or the link is invalid.' },
          { status: 410 }
        );
      }

      // Calculate expiry info
      const now = new Date();
      const expiresAt = new Date(shareRecord.expires_at);
      const diffMs = expiresAt.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return NextResponse.json({
        fileId,
        fileName: shareRecord.file_name,
        fileSize: shareRecord.file_size,
        fileType: shareRecord.file_type || 'application/octet-stream',
        uploadedAt: shareRecord.created_at,
        expiresAt: shareRecord.expires_at,
        downloadCount: shareRecord.download_count || 0,
        maxDownloads: shareRecord.max_downloads,
        isExpired: false,
        expiryIn: { 
          days: diffDays, 
          hours: diffHours, 
          minutes: diffMinutes 
        },
        canDownload:
          shareRecord.download_count < shareRecord.max_downloads,
      });
    }

    // File not found in any storage
    return NextResponse.json(
      { error: 'This file share may have expired, been deleted, or the link is invalid.' },
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
