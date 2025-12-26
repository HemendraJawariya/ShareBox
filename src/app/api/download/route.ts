import { NextRequest, NextResponse } from 'next/server';
import {
  downloadFromSupabase,
  getShareRecord,
  incrementDownloadCount,
  isSupabaseConfigured,
} from '@/lib/supabase';
import { getFileShare } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId') as string;
    const token = searchParams.get('token') as string;

    if (!fileId || !token) {
      return NextResponse.json(
        { error: 'Missing fileId or token' },
        { status: 400 }
      );
    }

    // Try to get from in-memory storage first (works offline)
    const fileShare = getFileShare(fileId);

    if (fileShare && fileShare.accessToken === token) {
      // Check expiry
      if (new Date(fileShare.expiresAt) < new Date()) {
        return NextResponse.json(
          { error: 'File has expired' },
          { status: 410 }
        );
      }

      // Check download limit
      if (fileShare.maxDownloads && fileShare.downloadCount >= fileShare.maxDownloads) {
        return NextResponse.json(
          { error: 'Download limit exceeded' },
          { status: 429 }
        );
      }

      // Increment counter
      fileShare.downloadCount += 1;
      fileShare.isDownloaded = true;

      const headers = new Headers({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileShare.fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });

      return new NextResponse(fileShare.fileData as any, { headers, status: 200 });
    }

    // If not in memory and Supabase is configured, try Supabase
    if (isSupabaseConfigured()) {
      const { data: shareRecord, error: recordError } = await getShareRecord(token);

      if (recordError || !shareRecord) {
        return NextResponse.json(
          { error: 'File not found or invalid token' },
          { status: 404 }
        );
      }

      // Check expiry
      if (new Date(shareRecord.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'File has expired' },
          { status: 410 }
        );
      }

      // Check download limit
      if (
        shareRecord.download_count >=
        shareRecord.max_downloads
      ) {
        return NextResponse.json(
          { error: 'Download limit exceeded' },
          { status: 429 }
        );
      }

      // Download file from Supabase
      const { data: fileBuffer, error: downloadError } = await downloadFromSupabase(
        fileId
      );

      if (downloadError || !fileBuffer) {
        return NextResponse.json(
          { error: 'Failed to download file' },
          { status: 500 }
        );
      }

      // Increment download count
      await incrementDownloadCount(token);

      // Return file
      const headers = new Headers({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${shareRecord.file_name}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });

      return new NextResponse(fileBuffer as any, { headers, status: 200 });
    }

    // File not found in either storage
    return NextResponse.json(
      { error: 'File not found or invalid token' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
