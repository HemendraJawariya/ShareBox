import { NextRequest, NextResponse } from 'next/server';
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

    // Require Supabase
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Cloud storage not configured' },
        { status: 503 }
      );
    }

    // Query Supabase database for share record
    console.log(`[Share] Querying Supabase for token: ${token}`);
    
    const shareRecordResult = await getShareRecord(token);
    
    if (shareRecordResult.error) {
      console.error(`[Share] Database error:`, shareRecordResult.error);
      return NextResponse.json(
        { error: 'Failed to retrieve share information' },
        { status: 500 }
      );
    }

    if (!shareRecordResult.data) {
      console.log(`[Share] No record found for token: ${token}`);
      return NextResponse.json(
        { error: 'File not found or invalid access token' },
        { status: 404 }
      );
    }

    const record = shareRecordResult.data;
    const expiresAt = new Date(record.expires_at);
    const isFileExpired = new Date() > expiresAt;
    
    if (isFileExpired) {
      console.log(`[Share] File expired: ${record.file_name}`);
      return NextResponse.json(
        { error: 'This file share has expired' },
        { status: 410 }
      );
    }

    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    console.log(`[Share] Found in Supabase: ${record.file_name}`);
    return NextResponse.json({
      fileId,
      fileName: record.file_name,
      fileSize: record.file_size,
      fileType: record.file_type || 'application/octet-stream',
      uploadedAt: record.created_at,
      expiresAt: record.expires_at,
      downloadCount: record.download_count || 0,
      maxDownloads: record.max_downloads,
      isExpired: false,
      expiryIn: { days: diffDays, hours: diffHours, minutes: diffMinutes },
      canDownload: record.download_count < record.max_downloads,
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
