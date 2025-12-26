# 🚀 ShareBox - Quick Start Guide

## Installation (2 minutes)

```bash
# Navigate to project
cd /workspaces/test1

# Start development server
npm run dev

# Open browser
# http://localhost:3000
```

## How to Use (5 minutes)

### Upload & Share

1. **Select Files**
   - Drag files onto upload area
   - Or click to browse
   - Select multiple files at once

2. **Configure Settings**
   - **Expires In**: Choose 1-30 days
   - **Max Downloads**: Set limit (1-100)

3. **Share**
   - Click "Share Files"
   - Files encrypt and upload
   - QR codes generate automatically

4. **Send to Recipients**
   - Copy share link
   - Download QR code
   - Use Email/WhatsApp/SMS/Telegram buttons
   - Or share link directly

### Receive & Download

1. **Access Link**
   - Click share link or scan QR code
   - Verify file information
   - Check expiration countdown

2. **Download**
   - Click "Download File" button
   - File auto-decrypts
   - Saves to your downloads folder

---

## Key Features

| Feature | Details |
|---------|---------|
| **Encryption** | AES-256 end-to-end encryption |
| **Expiry** | Auto-delete after 1-30 days |
| **Downloads** | Limit downloads per file (1-100) |
| **QR Codes** | Scan with phone camera |
| **Social** | Email, WhatsApp, SMS, Telegram |
| **Security** | Access tokens + unique URLs |

---

## Environment Variables

Required in `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ENCRYPTION_KEY=sharebox-secret-2025
NEXT_PUBLIC_MAX_DOWNLOAD_COUNT=5
NEXT_PUBLIC_DEFAULT_EXPIRY_DAYS=7
```

For production, change `ENCRYPTION_KEY` to a strong key:
```bash
NEXT_PUBLIC_ENCRYPTION_KEY=your-strong-key-here-min-32-chars
```

---

## How It Works

### Upload Process
```
File Upload
    ↓
Generate File ID + Token
    ↓
Encrypt file with AES-256
    ↓
Store encrypted data + metadata
    ↓
Generate share URL + QR code
    ↓
Display in ShareBox
```

### Download Process
```
Click share link
    ↓
Verify token + expiry + download count
    ↓
Decrypt file on-demand
    ↓
Stream to browser
    ↓
Increment download counter
    ↓
File still encrypted at rest
```

### Security
```
Files are:
✅ Encrypted at storage (AES-256)
✅ Decrypted only on download
✅ Protected by unique tokens
✅ Auto-deleted after expiry
✅ Limited by download count
✅ Never logged or tracked
```

---

## API Endpoints

### POST /api/upload
Upload and encrypt file
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@document.pdf" \
  -F "fileId=ABC123" \
  -F "accessToken=token123" \
  -F "expiryDays=7" \
  -F "maxDownloads=5"
```

### GET /api/share
Get file information
```bash
curl "http://localhost:3000/api/share?fileId=ABC123&token=token123"
```

### GET /api/download
Download encrypted file
```bash
curl "http://localhost:3000/api/download?fileId=ABC123&token=token123" \
  -o file.pdf
```

---

## Project Structure

```
sharebox/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── upload/      # File encryption & storage
│   │   │   ├── download/    # File decryption & download
│   │   │   └── share/       # File metadata & validation
│   │   ├── share/[id]/      # Recipient page
│   │   └── page.tsx         # Uploader home
│   ├── components/
│   │   ├── FileUpload.tsx   # Upload + settings
│   │   ├── SharedFileCard.tsx # File card + sharing
│   │   └── SharedFilesList.tsx # Files gallery
│   └── lib/
│       ├── encryption.ts    # AES + utilities
│       ├── store.ts         # State management
│       └── utils.ts         # Helpers
├── .env.local               # Configuration
├── .env.example             # Template
├── README.md                # Features
├── DEVELOPMENT.md           # Dev guide
├── ARCHITECTURE.md          # Technical details
├── USER_GUIDE.md           # User manual
└── package.json            # Dependencies
```

---

## Common Tasks

### Change Encryption Key
Edit `.env.local`:
```bash
NEXT_PUBLIC_ENCRYPTION_KEY=your-new-key-min-32-chars
```

### Change App URL
Edit `.env.local`:
```bash
NEXT_PUBLIC_APP_URL=https://sharebox.example.com
```

### Customize Expiry Options
Edit `src/components/FileUpload.tsx`:
```jsx
<option value={60}>60 Days</option>
<option value={90}>90 Days</option>
```

### Add New Social Channel
Edit `src/lib/encryption.ts` and `src/components/SharedFileCard.tsx`:
```typescript
export function generateLinkedInShareUrl(...) {
  // Implementation
}
```

---

## Testing

### Upload a File
1. Go to http://localhost:3000
2. Drag a small test file
3. Keep default settings (7 days, 5 downloads)
4. Click "Share Files"

### Share & Download
1. Copy the share link or scan QR code
2. Open link in new tab/window
3. Click "Download File"
4. Verify file downloads correctly

### Test Expiry
1. Change expiry to 1 second (edit FileUpload.tsx)
2. Wait 2 seconds
3. Try to access share link
4. Should show "expired"

### Test Download Limit
1. Set max downloads to 1
2. Download file once
3. Try to download again
4. Should show "limit exceeded"

---

## Production Deployment

### Vercel
```bash
npm install -g vercel
vercel
```

### Docker
```bash
docker build -t sharebox .
docker run -p 3000:3000 sharebox
```

### Environment Setup
```bash
# Set production encryption key (32+ characters)
NEXT_PUBLIC_ENCRYPTION_KEY=your-prod-key-here

# Set production URL
NEXT_PUBLIC_APP_URL=https://sharebox.example.com
```

---

## Troubleshooting

### "Cannot find module 'crypto-js'"
```bash
npm install crypto-js @types/crypto-js
```

### Build fails
```bash
npm run build 2>&1 | tail -50
# Check last 50 lines of output
```

### File won't decrypt
- Check ENCRYPTION_KEY matches upload
- Verify file not corrupted
- Try re-uploading

### QR code not generating
- Check file URL is valid
- Verify QRCodeSVG component loaded
- Check browser console for errors

---

## File Size Limits

| Size | Status | Notes |
|------|--------|-------|
| < 10MB | ✅ Recommended | Fast upload/download |
| 10-100MB | ⚠️ Works | May be slow |
| > 100MB | ❌ Not recommended | Browser timeout risk |

For large files:
1. Compress before uploading (ZIP)
2. Split into multiple shares
3. Use cloud storage integration (S3, etc.)

---

## Security Checklist

For Production:
- [ ] Change ENCRYPTION_KEY to strong value
- [ ] Update NEXT_PUBLIC_APP_URL
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS headers
- [ ] Add rate limiting
- [ ] Set up monitoring
- [ ] Enable audit logging
- [ ] Use strong encryption key rotation
- [ ] Add file virus scanning
- [ ] Back up database

---

## Performance Tips

- Keep files < 50MB for best experience
- Compress before sharing
- Use stable internet connection
- Modern browser recommended
- Clear browser cache if issues

---

## Next Steps

1. **Customize UI**
   - Change colors in Tailwind classes
   - Update logo/branding
   - Modify copy/messaging

2. **Add Features**
   - User authentication
   - File preview
   - Password protection
   - Email notifications

3. **Integrate Storage**
   - AWS S3
   - Google Cloud Storage
   - Supabase
   - Azure Blob

4. **Setup Database**
   - PostgreSQL
   - MongoDB
   - Firebase
   - Supabase

---

## Supabase Integration (Optional)

### Setup Supabase

1. **Create Supabase Project**
   ```bash
   # Go to https://supabase.com
   # Create new project
   # Copy API credentials
   ```

2. **Configure Environment**
   ```env
   SUPABASE_URL=your-supabase-url
   SUPABASE_KEY=your-supabase-key
   ```

3. **Create Storage Bucket**
   ```bash
   # In Supabase Dashboard:
   # Storage → Create new bucket
   # Name: "uploads"
   # Public: false (for security)
   ```

4. **Database Setup (Optional)**
   ```sql
   -- Create shares table
   CREATE TABLE shares (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     file_name TEXT NOT NULL,
     file_size INTEGER,
     encrypted_key TEXT NOT NULL,
     access_token TEXT UNIQUE NOT NULL,
     expires_at TIMESTAMP NOT NULL,
     max_downloads INTEGER DEFAULT 5,
     download_count INTEGER DEFAULT 0,
     created_at TIMESTAMP DEFAULT NOW(),
     created_by TEXT
   );
   ```

### Use in Code

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Upload encrypted file
const { data, error } = await supabase.storage
  .from('uploads')
  .upload(`${fileId}.enc`, encryptedFile);

// Download encrypted file
const { data, error } = await supabase.storage
  .from('uploads')
  .download(`${fileId}.enc`);
```

---

## Documentation

- **README.md** - Features & overview
- **QUICKSTART.md** - This file
- **VERCEL_DEPLOYMENT.md** - Deployment guide
- **.env.example** - Configuration template

---

## Support

Issues? Check:
1. Browser console (F12) for errors
2. Server terminal for API logs
3. .env.local configuration
4. File permissions on /public/uploads

---

Made with ❤️ using Next.js 16
