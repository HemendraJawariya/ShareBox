import { NextRequest, NextResponse } from 'next/server';
import { getFileShare } from '@/lib/encryption';
import { retrieveFile, incrementDownloadCount, canDownload } from '@/lib/persistent-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const token = searchParams.get('token');
    const encryptedDataParam = searchParams.get('encryptedData');
    const fileName = searchParams.get('fileName');

    // If encryptedData is provided (from sessionStorage), use it directly
    if (encryptedDataParam && fileName) {
      try {
        const decryptedData = Buffer.from(decodeURIComponent(encryptedDataParam), 'base64');

        const headers = new Headers({
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        });

        return new NextResponse(decryptedData, { headers, status: 200 });
      } catch (error) {
        console.error('Failed to decrypt data from client:', error);
        // Fall through to server-side lookup
      }
    }

    if (!fileId || !token) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Try persistent store first
    if (await canDownload(fileId)) {
      const persistedFile = retrieveFile(fileId);
      console.log(`[Download] Checking persistent store for fileId: ${fileId}`);

      if (persistedFile && persistedFile.accessToken === token) {
        await incrementDownloadCount(fileId);

        // Parse encrypted data if it's a string (JSON array format for large files)
        let fileData: Buffer;
        if (typeof persistedFile.encryptedData === 'string') {
          try {
            const chunks = JSON.parse(persistedFile.encryptedData);
            fileData = Buffer.concat(chunks.map((chunk: string) => Buffer.from(chunk, 'base64')));
          } catch {
            fileData = Buffer.from(persistedFile.encryptedData, 'base64');
          }
        } else {
          fileData = persistedFile.encryptedData as any as Buffer;
        }

        const headers = new Headers({
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(persistedFile.fileName)}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        });

        return new NextResponse(new Uint8Array(fileData), { headers, status: 200 });
      }
    }

    // Try in-memory store as fallback
    const fileShare = getFileShare(fileId);

    if (fileShare) {
      if (fileShare.accessToken !== token) {
        return NextResponse.json(
          { error: 'Invalid access token' },
          { status: 403 }
        );
      }

      const headers = new Headers({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileShare.fileName)}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });

      return new NextResponse(fileShare.fileData as any, { headers, status: 200 });
    }

    // File not found
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
