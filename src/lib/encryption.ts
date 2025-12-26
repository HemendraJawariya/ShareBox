import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'sharebox-secret-2025';

export interface FileShareData {
  id: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileData: string; // encrypted base64
  uploadedBy: string;
  uploadedAt: Date;
  expiresAt: Date;
  downloadCount: number;
  maxDownloads?: number;
  accessToken: string;
  isDownloaded: boolean;
}

// Encryption Functions
export function encryptData(data: string): string {
  try {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

export function decryptData(encryptedData: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

// File Operations
export async function encryptFileBuffer(buffer: Buffer): Promise<string> {
  // For large files (>10MB), encrypt in chunks to avoid memory issues
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  
  if (buffer.length > 10 * 1024 * 1024) {
    console.log(`Encrypting large file (${(buffer.length / 1024 / 1024).toFixed(2)}MB) in chunks...`);
    const encryptedChunks: string[] = [];
    
    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE, buffer.length);
      const chunk = buffer.slice(i, end);
      const base64Chunk = chunk.toString('base64');
      const encryptedChunk = encryptData(base64Chunk);
      encryptedChunks.push(encryptedChunk);
      
      if ((i / CHUNK_SIZE) % 10 === 0) {
        console.log(`Encrypted ${((i / buffer.length) * 100).toFixed(1)}%`);
      }
    }
    
    // Join chunks with a delimiter
    return JSON.stringify(encryptedChunks);
  }
  
  // For small files, encrypt normally
  const base64 = buffer.toString('base64');
  return encryptData(base64);
}

export async function decryptFileBuffer(encryptedData: string): Promise<Buffer> {
  // Check if it's chunked encryption (JSON array)
  if (encryptedData.startsWith('[')) {
    console.log('Decrypting chunked file...');
    const encryptedChunks: string[] = JSON.parse(encryptedData);
    const decryptedChunks: Buffer[] = [];
    
    for (let i = 0; i < encryptedChunks.length; i++) {
      const base64Chunk = decryptData(encryptedChunks[i]);
      const chunk = Buffer.from(base64Chunk, 'base64');
      decryptedChunks.push(chunk);
      
      if (i % 10 === 0) {
        console.log(`Decrypted ${((i / encryptedChunks.length) * 100).toFixed(1)}%`);
      }
    }
    
    return Buffer.concat(decryptedChunks);
  }
  
  // For small files, decrypt normally
  const base64 = decryptData(encryptedData);
  return Buffer.from(base64, 'base64');
}

// Share ID Generation
export function generateAccessToken(): string {
  return uuidv4();
}

export function generateFileId(): string {
  return uuidv4(); // Return full UUID for database compatibility
}

// Expiry Calculations
export function calculateExpiryDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function isExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate;
}

export function getExpiryIn(expiryDate: Date): {
  days: number;
  hours: number;
  minutes: number;
  expired: boolean;
} {
  const now = new Date();
  if (now > expiryDate) {
    return { days: 0, hours: 0, minutes: 0, expired: true };
  }

  const diff = expiryDate.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, expired: false };
}

// Formatting
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Share URL Generation
export function generateShareUrl(
  fileId: string,
  token: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/share/${fileId}?token=${token}`;
}

// Social Share URLs
export function generateEmailShareUrl(
  shareUrl: string,
  fileName: string,
  expiresAt: Date
): string {
  const subject = encodeURIComponent(`Download: ${fileName}`);
  const body = encodeURIComponent(
    `I've shared a file with you. Access it here: ${shareUrl}\n\nExpires: ${formatDate(expiresAt)}`
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

export function generateWhatsAppShareUrl(
  shareUrl: string,
  fileName: string,
  expiresAt: Date
): string {
  const message = encodeURIComponent(
    `📦 Download "${fileName}"\n\n${shareUrl}\n\n⏰ Expires: ${formatDate(expiresAt)}`
  );
  return `https://api.whatsapp.com/send?text=${message}`;
}

export function generateSMSShareUrl(
  shareUrl: string,
  fileName: string
): string {
  const message = encodeURIComponent(
    `Download "${fileName}": ${shareUrl}`
  );
  return `sms:?body=${message}`;
}

export function generateTelegramShareUrl(
  shareUrl: string,
  fileName: string
): string {
  const message = encodeURIComponent(
    `📦 Download "${fileName}"\n\n${shareUrl}`
  );
  return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${message}`;
}

// Database Simulation (use real DB in production)
export const inMemoryDatabase: Map<string, FileShareData> = new Map();

// Temporary file store for Vercel - stores metadata and encrypted data for limited time
const temporaryFileStore: Map<string, { data: FileShareData; timestamp: number }> = new Map();
const TEMP_STORE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function saveFileShare(fileShare: FileShareData): void {
  inMemoryDatabase.set(fileShare.fileId, fileShare);
  // Also save to temporary store for Vercel  
  temporaryFileStore.set(fileShare.fileId, { data: fileShare, timestamp: Date.now() });
}

export function getFileShare(fileId: string): FileShareData | null {
  // Check memory first
  const memFile = inMemoryDatabase.get(fileId);
  if (memFile) return memFile;
  
  // Check temporary store
  const tempFile = temporaryFileStore.get(fileId);
  if (tempFile && (Date.now() - tempFile.timestamp) < TEMP_STORE_TTL) {
    return tempFile.data;
  }
  
  // Clean up expired entries
  if (tempFile) {
    temporaryFileStore.delete(fileId);
  }
  
  return null;
}

export function getAllFileShares(): FileShareData[] {
  // Merge both stores, prioritizing memory
  const allFiles = Array.from(inMemoryDatabase.values());
  
  // Add temporary store files not in memory
  for (const [fileId, { data }] of temporaryFileStore.entries()) {
    if (!inMemoryDatabase.has(fileId) && (Date.now() - data.uploadedAt.getTime()) < TEMP_STORE_TTL) {
      allFiles.push(data);
    }
  }
  
  return allFiles;
}

export function deleteFileShare(fileId: string): boolean {
  return inMemoryDatabase.delete(fileId);
}

export function updateDownloadCount(fileId: string): void {
  const file = inMemoryDatabase.get(fileId);
  if (file) {
    file.downloadCount += 1;
    file.isDownloaded = true;
  }
}

// Cleanup expired files
export function cleanupExpiredFiles(): number {
  let deletedCount = 0;
  const allFiles = getAllFileShares();

  for (const file of allFiles) {
    if (isExpired(file.expiresAt)) {
      deleteFileShare(file.fileId);
      deletedCount++;
    }
  }

  return deletedCount;
}
