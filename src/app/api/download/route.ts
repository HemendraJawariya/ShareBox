import { NextRequest, NextResponse } from 'next/server';
import { downloadFromSupabase, getShareRecord, incrementDownloadCount, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const token = searchParams.get('token');

    if (!fileId || !token) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
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

    // Get share record from Supabase
    console.log(`[Download] Checking Supabase for token: ${token}`);
    
    const shareRecordResult = await getShareRecord(token);
    
    if (shareRecordResult.error) {
      console.error(`[Download] Database error:`, shareRecordResult.error);
      return NextResponse.json(
        { error: 'Failed to retrieve file information' },
        { status: 500 }
      );
    }

    if (!shareRecordResult.data) {
      console.log(`[Download] No record found for token: ${token}`);
      return NextResponse.json(
        { error: 'File not found or invalid access token' },
        { status: 404 }
      );
    }

    const record = shareRecordResult.data;
    
    // Check expiry
    if (new Date(record.expires_at) < new Date()) {
      console.log(`[Download] File expired: ${record.file_name}`);
      return NextResponse.json(
        { error: 'File has expired' },
        { status: 410 }
      );
    }

    // Check download limit
    if (record.download_count >= record.max_downloads) {
      console.log(`[Download] Download limit exceeded for: ${record.file_name}`);
      return NextResponse.json(
        { error: 'Download limit exceeded' },
        { status: 429 }
      );
    }

    // Download file from Supabase Storage
    console.log(`[Download] Downloading from Supabase: ${record.file_name}`);
    const downloadResult = await downloadFromSupabase(record.encrypted_key || fileId);

    if (downloadResult.error || !downloadResult.data) {
      console.error(`[Download] Supabase download failed:`, downloadResult.error);
      return NextResponse.json(
        { error: 'Failed to download file' },
        { status: 500 }
      );
    }

    // Increment download counter in Supabase
    const incrementResult = await incrementDownloadCount(token);
    if (incrementResult.error) {
      console.error(`[Download] Failed to increment counter:`, incrementResult.error);
      // Don't fail the download if counter update fails
    }

    const headers = new Headers({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(record.file_name)}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    return new NextResponse(new Uint8Array(downloadResult.data), { headers, status: 200 });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
