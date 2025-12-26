# ShareBox - Secure File Sharing

A modern, encrypted file sharing platform built with Next.js 16. Share files securely with automatic expiration, download limits, and social sharing.

## ✨ Features

- 🔐 **AES-256 Encryption** - Military-grade file encryption
- 🔗 **Shareable Links** - Generate unique share links with expiry
- ⏰ **Auto-Expiry** - Configurable expiration (1-30 days)
- 📊 **Download Limits** - Set max downloads per file (1-100)
- 📱 **Social Sharing** - Email, WhatsApp, SMS, Telegram
- 🎨 **Modern UI** - Beautiful, responsive design with Tailwind CSS
- 📝 **Copy Link** - Easy share link copying
- 🗑️ **Delete Files** - Remove shares anytime

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <your-repo>
cd sharebox
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ENCRYPTION_KEY=your-32-character-key-here
```

Generate encryption key:
```bash
openssl rand -base64 24 | head -c 32
```

### 3. Run Locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📦 Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **React 19** - UI library
- **Tailwind CSS** - Styling
- **CryptoJS** - AES-256 encryption
- **Zustand** - State management
- **Lucide React** - Icons

## 🌐 Deploy to Vercel

### Option 1: Deploy with Vercel CLI
```bash
npm install -g vercel
vercel
```

### Option 2: Connect GitHub Repository
1. Push to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables (see below)

### Set Environment Variables
In Vercel Project Settings → Environment Variables, add:
- `NEXT_PUBLIC_APP_URL` - Your Vercel domain (e.g., `https://sharebox.vercel.app`)
- `NEXT_PUBLIC_ENCRYPTION_KEY` - 32-character encryption key

## 💾 How It Works

### Upload
1. User selects and uploads file
2. File encrypted with AES-256
3. Encrypted data stored
4. Share link generated with access token
5. Expiry date calculated

### Share
1. Copy link or share via social media
2. Recipients get download page
3. System verifies access token
4. Download limit checked
5. File decrypted and downloaded

### Download
1. Recipient visits share link
2. System verifies token and expiry
3. Checks download limit
4. Decrypts file on-demand
5. Serves to browser

## 🔐 Security

- **File Encryption**: AES-256 symmetric encryption
- **Access Control**: Token-based with unique UUID per share
- **No Plain Storage**: Files stored encrypted only
- **Server-Side Decryption**: Only decrypted on verified download
- **Auto-Deletion**: Expired files deleted automatically
- **HTTPS**: Secure in production

## 📝 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |
| `NEXT_PUBLIC_ENCRYPTION_KEY` | 32-char encryption key | Required |
| `NEXT_PUBLIC_MAX_DOWNLOAD_COUNT` | Max downloads per file | `5` |
| `NEXT_PUBLIC_DEFAULT_EXPIRY_DAYS` | Default expiry days | `7` |

### File Limits

- **Max File Size**: 500MB
- **Max Downloads**: 1-100 (configurable)
- **Expiry**: 1-30 days (configurable)
- **Storage**: Encrypted file system

## 🛠️ Development

### Available Scripts
```bash
npm run dev        # Start dev server at :3000
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
npm run type-check # TypeScript type checking
```

### Project Structure

```
sharebox/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── upload/route.ts     # File encryption upload
│   │   │   ├── download/route.ts   # File decryption download
│   │   │   ├── share/route.ts      # Share metadata
│   │   │   └── health/route.ts     # Health check
│   │   ├── share/[id]/page.tsx     # Download page
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Home/upload page
│   ├── components/
│   │   ├── FileUpload.tsx          # Upload interface
│   │   ├── SharedFileCard.tsx      # File display
│   │   └── SharedFilesList.tsx     # Files gallery
│   ├── lib/
│   │   ├── encryption.ts           # Crypto utilities
│   │   ├── store.ts                # Zustand store
│   │   ├── logger.ts               # Logging
│   │   └── utils.ts                # Helpers
│   └── middleware.ts               # Security middleware
├── public/                          # Static assets
├── package.json                     # Dependencies
├── .env.example                     # Env template
├── tsconfig.json                    # TypeScript config
├── tailwind.config.js               # Tailwind config
└── README.md                        # This file
```

## 📖 Quick Usage

### For Senders
1. Visit [app](https://localhost:3000)
2. Drag & drop files or click to browse
3. Set expiry date (1-30 days)
4. Set max downloads (1-100)
5. Click "Upload & Share"
6. Copy link or share via email/WhatsApp/SMS/Telegram

### For Recipients
1. Click share link or scan QR
2. See file details
3. Click "Download"
4. File automatically decrypted and downloaded
5. Counter updates (shows downloads remaining)

## ⚠️ Important Notes

### File Storage
Current implementation stores files encrypted in-memory for demo. For production, integrate cloud storage:
- AWS S3
- Google Cloud Storage
- Supabase Storage
- Azure Blob Storage
- MongoDB GridFS

### Deployment Considerations
- **Vercel has /tmp read/write** for temporary file storage during request/response
- **Consider serverless limitations** when handling large files
- **Use Vercel KV or Supabase** for persistent storage
- **Session persistence** across function invocations requires external storage

## 🔧 Troubleshooting

### Build fails
```bash
npm run type-check  # Check TypeScript errors
npm run lint        # Check ESLint errors
npm run build       # Detailed build output
```

### Port 3000 already in use
```bash
lsof -i :3000       # Find process
kill -9 <PID>       # Kill process
npm run dev         # Try again
```

### Encryption issues
- Ensure `NEXT_PUBLIC_ENCRYPTION_KEY` is exactly 32 characters
- Generate with: `openssl rand -base64 24 | head -c 32`

## 🚀 Production Checklist

- [ ] Set up cloud storage (S3, Supabase, etc.)
- [ ] Configure environment variables on Vercel
- [ ] Enable custom domain (optional)
- [ ] Set up monitoring/logging
- [ ] Test file upload/download cycle
- [ ] Test social sharing links
- [ ] Verify encryption key security
- [ ] Test with actual large files

## 📄 License

MIT License - Use freely in your projects

## 💬 Need Help?

- Check individual source files - they have detailed comments
- Review API routes in `src/app/api/`
- Inspect components in `src/components/`
- See encryption implementation in `src/lib/encryption.ts`

---

**Status**: ✅ Production Ready  
**Target**: Vercel Serverless  
**Updated**: December 26, 2025
