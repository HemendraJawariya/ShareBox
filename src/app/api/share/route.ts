import { NextRequest, NextResponse } from 'next/server';
import { getFileShare, isExpired, getExpiryIn } from '@/lib/encryption';
import { getShareRecord, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const token = searchParams.get('token');

    if (!fileId || !token) {
      return NextResponse.json(
        { error: 'Missing fileId or token' },
        { status: 400 }
      );
    }

    const fileShare = getFileShare(fileId);

    if (!fileShare) {
      // If not in memory and Supabase configured, try Supabase
      if (isSupabaseConfigured()) {
        const { data: shareRecord, error } = await getShareRecord(token);

        if (error || !shareRecord) {
          return NextResponse.json(
            { error: 'File not found' },
            { status: 404 }
          );
        }

        const expired = new Date(shareRecord.expires_at) < new Date();
        const expiryDate = new Date(shareRecord.expires_at);
        const now = new Date();
        const diffMs = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        return NextResponse.json({
          fileId: fileId,
          fileName: shareRecord.file_name,
          fileSize: shareRecord.file_size,
          fileType: 'application/octet-stream',
          uploadedAt: shareRecord.created_at,
          expiresAt: shareRecord.expires_at,
          downloadCount: shareRecord.download_count,
          maxDownloads: shareRecord.max_downloads,
          isExpired: expired,
          expiryIn: { days: diffDays > 0 ? diffDays : 0, hours: diffHours, minutes: diffMinutes },
          canDownload:
            !expired &&
            (!shareRecord.max_downloads ||
              shareRecord.download_count < shareRecord.max_downloads),
        });
      }

      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
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
