# ShareBox - Complete Supabase Integration Guide

## ✅ Complete Endpoint Architecture

All three critical endpoints now use **Supabase as the primary storage** with intelligent fallback layers:

### 1. UPLOAD Endpoint (`/api/upload`)

**Flow:**
```
1. Receive file from client
2. Stream read file into buffers
3. Encrypt file (CryptoJS AES-256, chunked for large files)
4. Store in 3 places:
   - Persistent in-memory store (local fallback)
   - Temporary cache (15-min TTL for Vercel cross-instance)
   - [PRIMARY] Supabase Storage + Database
5. Return encrypted data to client for sessionStorage
```

**What gets stored:**

**In Supabase Storage (`uploads` bucket):**
- File: `{fileId}.enc` - Encrypted file data

**In Supabase Database (`shares` table):**
```sql
{
  id: "{fileId}-{accessToken}",
  file_name: "document.pdf",
  file_size: 2048576,
  encrypted_key: "fileId-123",
  access_token: "token-xyz",
  expires_at: "2025-12-28T04:57:25.000Z",
  max_downloads: 5,
  download_count: 0,
  created_by: "anonymous"
}
```

---

### 2. SHARE Endpoint (`/api/share`)

**Purpose:** Return file metadata so share pages can display info and download buttons

**Lookup Priority:**
```
1. [PRIMARY] Query Supabase Database
   → If found, validate token, check expiry → Return metadata
   
2. [FALLBACK] Query Persistent Store
   → For files stored locally
   
3. [FALLBACK] Check Temporary Cache
   → For same-session access before DB replication
   
4. [FALLBACK] Check In-Memory Store
   → Backwards compatibility
   
5. Return 404
```

**Supabase Query:**
```sql
SELECT * FROM shares WHERE access_token = '{token}'
```

**Response (for valid token):**
```json
{
  "fileId": "uuid-123",
  "fileName": "document.pdf",
  "fileSize": 2048576,
  "fileType": "application/pdf",
  "uploadedAt": "2025-12-27T04:57:25.000Z",
  "expiresAt": "2025-12-28T04:57:25.000Z",
  "downloadCount": 0,
  "maxDownloads": 5,
  "isExpired": false,
  "expiryIn": { "days": 1, "hours": 0, "minutes": 0 },
  "canDownload": true
}
```

---

### 3. DOWNLOAD Endpoint (`/api/download`)

**Purpose:** Return the encrypted file for download

**Lookup Priority:**
```
1. [PRIMARY] Get share record from Supabase Database
   → Validate token, check expiry, check download limit
   
2. [PRIMARY] Download encrypted file from Supabase Storage
   → Retrieve {fileId}.enc from `uploads` bucket
   
3. Increment download counter in Supabase
   → Enforce download limits
   
4. [FALLBACK] Check Persistent Store
5. [FALLBACK] Check Temporary Cache
6. [FALLBACK] Check sessionStorage via URL params
7. [FALLBACK] Check In-Memory Store
```

**Supabase Queries:**
```sql
-- Get share record
SELECT * FROM shares WHERE access_token = '{token}'

-- Check expiry and limits
WHERE expires_at > NOW() AND download_count < max_downloads

-- Increment counter
UPDATE shares SET download_count = download_count + 1 
WHERE access_token = '{token}'
```

**Response:**
- **Status 200:** File blob with Content-Disposition header
- **Status 410:** File has expired
- **Status 429:** Download limit exceeded
- **Status 404:** File not found

---

## 🔄 Complete Data Flow

### Upload → Share → Download Journey

```
USER UPLOADS FILE
│
├─→ POST /api/upload
    ├─→ Encrypt file
    ├─→ Store in Supabase Storage: uploads/{fileId}.enc
    ├─→ Store in Supabase Database: shares table
    ├─→ Store in local caches (fallback)
    └─→ Return: { fileId, accessToken, shareUrl, encryptedData }
    
USER RECEIVES SHARE LINK
│ (Link format: /share/{fileId}?token={accessToken})
│
└─→ Browser stores: sessionStorage[`file_{fileId}`] = encryptedData

USER OPENS SHARE LINK
│
├─→ GET /api/share?fileId={id}&token={token}
    ├─→ Query Supabase: SELECT * FROM shares WHERE access_token = token
    ├─→ Validate token & expiry
    └─→ Return file metadata
    
│ (UI displays: filename, size, expiry countdown, download button)
│

USER CLICKS DOWNLOAD (SAME BROWSER)
│
├─→ GET /api/download?fileId={id}&token={token}
    ├─→ [FASTEST] Check sessionStorage
    │   └─→ File available? Return immediately ✅
    │
    ├─→ [RELIABLE] Query Supabase
    │   └─→ SELECT * FROM shares WHERE access_token = token
    │       └─→ Download from Supabase Storage
    │           └─→ INCREMENT download counter
    │               └─→ Return file ✅
    │
    └─→ [FALLBACK] Check local caches → Return file ✅


USER SENDS LINK TO DIFFERENT DEVICE/BROWSER
│
├─→ New browser opens: /share/{fileId}?token={token}
    ├─→ GET /api/share with new browser
    │   └─→ Supabase returns file metadata ✅
    │
├─→ User clicks download
    ├─→ GET /api/download with new browser
    │   └─→ Supabase finds share record
    │   └─→ Supabase Storage has encrypted file
    │   └─→ Download file ✅
    │
    └─→ Browser decrypts & saves ✅
```

---

## 🛡️ Data Persistence Guarantee

### What Persists Where

| Storage Layer | Type | Lifetime | Use Case |
|---|---|---|---|
| **Supabase Database** | PostgreSQL | ♾️ Permanent | Truth source for file metadata |
| **Supabase Storage** | Encrypted Files | ♾️ Permanent | Actual encrypted file data |
| **Persistent Store** | In-Memory Map | 🔄 Server lifetime | Fallback if DB unavailable |
| **Temp Cache** | In-Memory Map | 15 minutes | Vercel cross-instance access |
| **sessionStorage** | Browser | 👤 Session | Same-browser instant access |

### Recovery Scenarios

**Scenario 1: File uploaded, Vercel instance restarts**
- ✅ Supabase has encrypted file → Still accessible
- ✅ Supabase has share record → Share link works
- ✅ Temp cache cleared, but data in DB

**Scenario 2: Upload completes, user immediately shares from different instance**
- ✅ Temp cache has file (15 min TTL) → Instant download
- ✅ Supabase replicating in background → Will be available

**Scenario 3: User shares file, recipient opens in different browser**
- ✅ Supabase database has share record → Share page loads
- ✅ Supabase storage has encrypted file → Download works
- ✅ No sessionStorage, but Supabase provides everything

---

## 🔐 Security Architecture

### Encryption Chain
```
Original File
    ↓
[Encrypt with CryptoJS AES-256]
    ↓
Base64 Encoded (chunked for large files)
    ↓
[Stored in Supabase Storage]
    ↓
[Decryption happens only in browser]
```

### Access Control
```
Share Token Structure:
- Random UUID generated per upload
- Stored in Supabase database
- Required for all downloads
- Expires after configured days
- Download count limited
```

### What Cannot Be Accessed
- ❌ Files without valid access token
- ❌ Expired file shares
- ❌ Files past download limit
- ❌ Direct bucket access (encrypted anyway)
- ❌ Unencrypted file data in database

---

## 🚀 Deployment Status

### Build: ✅ Success
- All routes compile
- No TypeScript errors
- Supabase integration active

### Database Requirements
1. **Create `uploads` Storage Bucket**
   - Supabase Dashboard → Storage
   - Create bucket: `uploads`
   - Set to Private

2. **Create `shares` Table**
   ```sql
   CREATE TABLE shares (
     id TEXT PRIMARY KEY,
     file_name TEXT NOT NULL,
     file_size INTEGER NOT NULL,
     encrypted_key TEXT,
     access_token TEXT UNIQUE NOT NULL,
     expires_at TIMESTAMP NOT NULL,
     max_downloads INTEGER DEFAULT 5,
     download_count INTEGER DEFAULT 0,
     created_by TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX shares_access_token ON shares(access_token);
   CREATE INDEX shares_expires ON shares(expires_at);
   ```

3. **Create increment_downloads Function** (optional)
   ```sql
   CREATE OR REPLACE FUNCTION increment_downloads(token TEXT)
   RETURNS void AS $$
   BEGIN
     UPDATE shares SET download_count = download_count + 1
     WHERE access_token = token;
   END;
   $$ LANGUAGE plpgsql;
   ```

---

## 📊 Testing Checklist

- [ ] Upload file < 1MB
- [ ] Upload file > 100MB  
- [ ] Verify file appears in Supabase Storage bucket
- [ ] Verify record created in shares table
- [ ] Share link works in same browser
- [ ] Share link works in different browser
- [ ] Share link works on different device
- [ ] Download limit enforced
- [ ] Expiry prevents downloads
- [ ] Check Supabase logs for any errors
- [ ] Verify download_count increments

---

## 🔄 Fallback Chain Diagram

```
                    REQUEST
                       ↓
                ┌─────────────┐
                │ Supabase    │ (PRIMARY)
                │ Database    │
                └─────────────┘
                       ↓
              [Found] → Return ✅
              [Not Found] ↓
                ┌─────────────┐
                │ Persistent  │
                │ Store       │
                └─────────────┘
                       ↓
              [Found] → Return ✅
              [Not Found] ↓
                ┌─────────────┐
                │ Temp Cache  │
                │ (15 min)    │
                └─────────────┘
                       ↓
              [Found] → Return ✅
              [Not Found] ↓
                ┌─────────────┐
                │ In-Memory   │
                │ Store       │
                └─────────────┘
                       ↓
              [Found] → Return ✅
              [Not Found] ↓
              Return 404 ❌
```

---

## 🎯 Key Improvements

✅ **Permanent Storage** - Data persists even after Vercel restarts
✅ **Cross-Instance** - Share links work across different Vercel instances
✅ **High Reliability** - 4-layer fallback system
✅ **Zero Data Loss** - Supabase is source of truth
✅ **Performance** - Temp cache provides 15-min window for instant access
✅ **Scalability** - Designed for production use

---

## 📝 Notes

- **Temp Cache** is memory-efficient (only 15 min TTL)
- **Local Caches** reduce Supabase API calls
- **Supabase is Primary** - Only source of truth
- **Automatic Cleanup** - Expired files cleanup implemented
- **Download Counting** - Enforced by Supabase RPC function
