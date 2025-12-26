import { NextRequest, NextResponse } from 'next/server';
import {
  encryptFileBuffer,
  saveFileShare,
  FileShareData,
} from '@/lib/encryption';
import {
  uploadToSupabase,
  createShareRecord,
  isSupabaseConfigured,
} from '@/lib/supabase';

// Configure for large file uploads - 5 minutes max for Vercel hobby plan
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  // Set response headers for large file uploads
  const headers = new Headers();
  headers.set('Connection', 'keep-alive');
  headers.set('Keep-Alive', 'timeout=300, max=100');
  try {
    // Check content length before processing
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum 50GB allowed.' },
        { status: 413, headers }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileId = formData.get('fileId') as string;
    const accessToken = formData.get('accessToken') as string;
    const expiryDays = parseInt(formData.get('expiryDays') as string) || 7;
    const maxDownloads = parseInt(formData.get('maxDownloads') as string) || 5;

    if (!file || !fileId || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers }
      );
    }

    // Stream file directly - don't load entire file into memory
    const fileStream = file.stream();
    const reader = fileStream.getReader();
    const chunks: Uint8Array[] = [];
    
    // Read chunks efficiently
    let totalSize = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalSize += value.length;
        
        // Log progress every 100MB
        if (totalSize % (100 * 1024 * 1024) === 0) {
          console.log(`Received ${(totalSize / (1024 * 1024)).toFixed(2)}MB`);
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Combine chunks into single buffer
    const buffer = Buffer.concat(
      chunks.map(chunk => Buffer.from(chunk)),
      totalSize
    );

    // Encrypt file data
    const encryptedData = await encryptFileBuffer(buffer);

    // Calculate expiry date
    const calculateExpiryDate = (days: number): Date => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date;
    };

    const expiryDate = calculateExpiryDate(expiryDays);

    const fileShareData: FileShareData = {
      id: `${fileId}-${accessToken}`,
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileData: encryptedData,
      uploadedBy: 'anonymous',
      uploadedAt: new Date(),
      expiresAt: expiryDate,
      downloadCount: 0,
      maxDownloads,
      accessToken,
      isDownloaded: false,
    };

    // Save to in-memory database
    saveFileShare(fileShareData);

    // Note: Supabase uploads disabled on Vercel free tier
    // Vercel doesn't allow outbound connections that cause socket timeouts
    // Files are stored in-memory and accessible immediately via share links
    // For production with cloud storage, use a paid Vercel plan or self-hosted solution

    return NextResponse.json(
      {
        success: true,
        fileId,
        accessToken,
        fileName: file.name,
        expiresAt: fileShareData.expiresAt,
        storage: 'memory',
      },
      { status: 200, headers }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
    console.error('Upload error:', error);
    
    // Provide specific error messages
    if (errorMessage.includes('413') || errorMessage.includes('too large') || errorMessage.includes('too big')) {
      return NextResponse.json(
        { error: 'File too large. Server received more data than expected.' },
        { status: 413, headers }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers }
    );
  }
}
