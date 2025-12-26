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

// Store chunks temporarily in memory (per-upload session)
const uploadSessions = new Map<string, {
  chunks: Map<number, Buffer>;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  accessToken: string;
  expiryDays: number;
  maxDownloads: number;
  createdAt: number;
}>();

// Clean up old sessions every hour
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  
  for (const [fileId, session] of uploadSessions.entries()) {
    if (session.createdAt < oneHourAgo) {
      uploadSessions.delete(fileId);
      console.log(`Cleaned up upload session: ${fileId}`);
    }
  }
}, 3600000); // 1 hour

// Correct way to set maxDuration in Next.js App Router
export const maxDuration = 300; // 5 minutes per chunk

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const chunk = formData.get('chunk') as File;
    const fileId = formData.get('fileId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const fileName = formData.get('fileName') as string;
    const fileSize = parseInt(formData.get('fileSize') as string);
    const accessToken = formData.get('accessToken') as string;
    const expiryDays = parseInt(formData.get('expiryDays') as string) || 7;
    const maxDownloads = parseInt(formData.get('maxDownloads') as string) || 5;

    if (!chunk || !fileId || chunkIndex === undefined || totalChunks === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get or create upload session
    let session = uploadSessions.get(fileId);
    if (!session) {
      session = {
        chunks: new Map(),
        fileName,
        fileSize,
        totalChunks,
        accessToken,
        expiryDays,
        maxDownloads,
        createdAt: Date.now(),
      };
      uploadSessions.set(fileId, session);
    }

    // Store this chunk
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
    session.chunks.set(chunkIndex, chunkBuffer);

    console.log(`Received chunk ${chunkIndex + 1}/${totalChunks} for file ${fileId} (${(chunkBuffer.length / 1024 / 1024).toFixed(2)}MB)`);

    // Check if all chunks received
    if (session.chunks.size === totalChunks) {
      console.log(`All chunks received for ${fileId}, assembling...`);

      // Combine chunks in order
      const chunkBuffers: Buffer[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const buf = session.chunks.get(i);
        if (!buf) {
          return NextResponse.json(
            { error: `Missing chunk ${i}` },
            { status: 400 }
          );
        }
        chunkBuffers.push(buf);
      }

      // Combine all chunks
      const buffer = Buffer.concat(chunkBuffers);
      console.log(`Combined buffer size: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);

      // Encrypt the complete file
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
        fileName,
        fileSize,
        fileType: 'application/octet-stream',
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

      // Upload to Supabase if configured (background)
      if (isSupabaseConfigured()) {
        const encryptedBuffer = Buffer.from(encryptedData, 'utf-8');
        uploadToSupabase(
          fileId,
          encryptedBuffer,
          {
            fileName,
            fileSize: fileSize.toString(),
            accessToken,
          }
        )
          .then(() => {
            createShareRecord({
              id: fileId,
              fileName,
              fileSize,
              encryptedKey: accessToken,
              accessToken,
              expiresAt: expiryDate.toISOString(),
              maxDownloads,
              createdBy: 'anonymous',
            }).catch(err => console.error('DB record creation failed:', err));
          })
          .catch(err => console.error('Supabase upload failed:', err));
      }

      // Clean up session
      uploadSessions.delete(fileId);

      return NextResponse.json(
        {
          success: true,
          fileId,
          accessToken,
          fileName,
          expiresAt: fileShareData.expiresAt,
          storage: isSupabaseConfigured() ? 'supabase' : 'memory',
        },
        { status: 200 }
      );
    }

    // Chunk received, waiting for more
    return NextResponse.json(
      { success: true, message: `Chunk ${chunkIndex + 1}/${totalChunks} received` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Chunk upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload chunk' },
      { status: 500 }
    );
  }
}
