# Vercel Deployment Checklist

Project is **Vercel-ready**! Follow these steps to deploy.

## ✅ Pre-Deployment

### 1. Verify Project
- [x] No Docker files (Dockerfile, docker-compose.yml removed)
- [x] No Kubernetes files (k8s/ removed)
- [x] No CI/CD workflows (.github/workflows removed)
- [x] No deployment scripts (scripts/deploy.sh, etc. removed)
- [x] Only 2 markdown docs (README.md, QUICKSTART.md)
- [x] Build successful (0 errors)
- [x] All npm scripts working

### 2. Local Testing
```bash
# Run locally first
npm run dev

# Test upload/download cycle
# Test social sharing (Email, WhatsApp, SMS, Telegram)
# Test expiry countdown
# Test delete functionality
```

## 🚀 Deploy to Vercel

### Option A: CLI Deployment (Recommended)
```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Option B: GitHub Integration
1. Push to GitHub: `git push`
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Select your GitHub repository
5. Click "Import"
6. Vercel auto-detects Next.js configuration

## ⚙️ Environment Variables (Required)

Set these in Vercel Project Settings → Environment Variables:

```env
NEXT_PUBLIC_APP_URL=https://yourproject.vercel.app
NEXT_PUBLIC_ENCRYPTION_KEY=your-32-character-key-here
NEXT_PUBLIC_MAX_DOWNLOAD_COUNT=5
NEXT_PUBLIC_DEFAULT_EXPIRY_DAYS=7
```

### Generate Encryption Key
```bash
# Generate random 32-character key
openssl rand -base64 24 | head -c 32
```

## 📋 Deployment Checklist

- [ ] Git repo created and pushed
- [ ] Vercel account created
- [ ] Project linked to Vercel
- [ ] Build command: `npm run build` ✅
- [ ] Start command: `npm start` ✅
- [ ] Node version: 18.x or higher
- [ ] Environment variables set (all 4)
- [ ] Encryption key copied (32 characters)
- [ ] Build succeeds on Vercel
- [ ] Home page loads (`/`)
- [ ] Upload works
- [ ] Share link works
- [ ] Download works
- [ ] Social sharing works
- [ ] Expiry countdown works
- [ ] Delete works

## 🔒 Important Security Notes

### Encryption Key
- Generate a NEW 32-character key for production
- **Never commit** `.env.local` to git (already in .gitignore)
- Use a secure random generator: `openssl rand -base64 24`
- Keep backup of encryption key somewhere safe

### File Storage
⚠️ **Current Implementation**: Uses in-memory storage
- Good for: Demo, testing, development
- Not good for: Production with multiple requests

**Recommended for Production**:
- AWS S3 + Lambda
- Google Cloud Storage
- Supabase Storage
- Azure Blob Storage
- MongoDB Atlas with GridFS
- Vercel KV for sessions

Current code structure allows easy integration of any cloud storage.

## 📊 Expected Build Time

- Initial build: ~2-3 minutes
- Subsequent builds: ~1-2 minutes
- Build size: ~800KB

## ✅ Post-Deployment

### Test Live
1. Visit your Vercel domain
2. Upload a test file
3. Copy share link
4. Open in incognito window
5. Download file
6. Verify it decrypts correctly
7. Test social sharing
8. Verify expiry countdown

### Monitor
- Check Vercel dashboard for errors
- Monitor Function execution time
- Watch for failed deployments
- Set up Vercel alerts (optional)

## 🔗 Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Your Project URL**: Will appear after deployment
- **Logs**: Vercel Dashboard → Your Project → Deployments → Logs
- **Analytics**: Vercel Dashboard → Analytics
- **Environment Variables**: Vercel Dashboard → Settings → Environment Variables

## 🆘 Troubleshooting

### Build Fails
```bash
# Check locally first
npm run build

# Check for TypeScript errors
npm run type-check

# Check ESLint
npm run lint
```

### Deployment Stuck
- Check Vercel logs in dashboard
- Verify environment variables are set
- Ensure all required env vars are present
- Try canceling and redeploying

### File Upload Not Working
- Check browser console for errors
- Verify `NEXT_PUBLIC_APP_URL` is correct
- Check API route logs in Vercel dashboard
- Verify encryption key is 32 characters

### Social Sharing Not Working
- Verify `NEXT_PUBLIC_APP_URL` is your production URL
- Test share links in incognito window
- Check that links include `?token=...`
- Verify all 4 environment variables are set

## 📚 Documentation

- **README.md** - Project overview and quick start
- **QUICKSTART.md** - Detailed setup instructions
- **.env.example** - Environment template

## 🎯 Next Steps

1. ✅ Deploy to Vercel
2. ✅ Test all features
3. ✅ Share with users
4. 🔄 Monitor and iterate
5. 💾 Consider cloud storage integration

## 📞 Support

- Check logs: Vercel Dashboard → Deployments
- Review code: Check `src/app/api/` for API logic
- Debug locally: `npm run dev` + browser DevTools
- See comments in source files for implementation details

---

**Status**: Ready for Vercel Deployment ✅  
**Build Time**: ~2-3 minutes initial  
**Maintenance**: Minimal - mostly monitoring  
**Scaling**: Vercel auto-scales serverless functions
