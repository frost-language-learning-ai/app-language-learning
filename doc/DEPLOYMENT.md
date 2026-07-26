# Deployment Guide

## Overview

Language Learning App can be deployed to multiple platforms:
- **Windows** - Desktop executable (.exe)
- **macOS** - DMG installer or App Bundle
- **Linux** - Executable or Docker container
- **Web** - Static HTML + Node.js backend
- **Android** - APK package
- **iOS** - IPA package

All deployments use the same codebase with platform-specific build tools.

## Prerequisites for All Builds

```bash
# Install dependencies
npm install

# Build frontend first
npm run react:build

# Database setup (required for all deployments)
psql "postgres://postgres:postgres@localhost:5432/language_learning" -f server/migrations/001_language_learning_init.sql
```

## Environment Configuration

Create `.env.production` for production settings:

```env
# Database (use managed database for production)
DATABASE_URL=postgres://user:password@db-host:5432/language_learning

# Ollama (must be accessible from deployment environment)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b
OLLAMA_EMBEDDING_MODEL=embeddinggemma

# API Server
API_PORT=3000
API_HOST=0.0.0.0
NODE_ENV=production

# Security
SECURE_COOKIES=true
HTTPS_ONLY=true
```

## Windows Desktop Build

### Requirements
- Windows 10/11
- Node.js 20+
- Electron Builder
- Visual Studio Build Tools (for some dependencies)

### Build Steps

1. **Prepare the build**:
```bash
npm run react:build
npm run server:build
```

2. **Create Windows installer**:
```bash
npm run dist:win
```

3. **Output files**:
```
release/
├── LanguageLearning-x.x.x.exe         # Installer
├── LanguageLearning-x.x.x-ia32.exe    # 32-bit version
└── LanguageLearning-x.x.x.exe.blockmap
```

### Configuration

Modify `Desktop/electron/main.js` for Windows-specific settings:

```javascript
// Desktop/electron/main.js
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    nodeIntegration: false,
    contextIsolation: true
  }
});
```

### Distribution

1. **Direct Download**:
   - Upload `.exe` to GitHub Releases
   - Users download and run installer

2. **Windows Store**:
   - Package as MSIX
   - Submit to Microsoft Store (requires account)

3. **Auto-Update**:
   - Configure electron-updater in `main.js`
   - Host releases on GitHub/S3

### Code Signing (Optional)

```bash
# Sign the executable
signtool sign /f certificate.pfx /p password release/LanguageLearning-x.x.x.exe
```

## macOS Build

### Requirements
- macOS 11+
- Node.js 20+
- Xcode Command Line Tools
- Apple Developer Account (for code signing)

### Build Steps

1. **Build bundle**:
```bash
npm run dist:mac
```

2. **Output files**:
```
release/
├── LanguageLearning-x.x.x.dmg        # DMG installer
├── LanguageLearning-x.x.x.app        # App bundle
└── LanguageLearning-x.x.x-arm64.dmg  # Apple Silicon version
```

### Code Signing

```bash
# Sign the application
codesign --deep --force --verify --verbose --sign - release/LanguageLearning.app
```

### Notarization (for App Store/Gatekeeper)

```bash
# Submit for notarization
xcrun altool --notarize-app -f release/LanguageLearning-x.x.x.dmg \
  -t osx -u apple-id@example.com -p app-password
```

## Linux Build

### AppImage Format

```bash
npm run dist:linux
```

Creates portable AppImage that works on most Linux distributions.

### Snap Package

```bash
# Install snapcraft
sudo apt install snapcraft

# Create snap.yaml in root directory
# Then build:
snapcraft
```

## Android Build

### Requirements
- Android Studio or Android SDK
- Node.js 20+
- Capacitor CLI: `npm install -g @capacitor/cli`

### Build Steps

1. **Build web assets**:
```bash
npm run react:build
```

2. **Sync to Android**:
```bash
npx cap sync android
```

3. **Build APK**:
```bash
# Debug APK
npm run build:android

# Release APK
npm run build:android:release
```

4. **Output file**:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Distribution

1. **Direct APK**:
   - Users download `.apk` file
   - Install via file manager or `adb install`

2. **Google Play Store**:
   - Create developer account ($25 one-time fee)
   - Build signed release APK
   - Submit through Play Console

### Signing Release APK

```bash
# Generate keystore
keytool -genkey -v -keystore my-release-key.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias

# Sign APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
  -keystore my-release-key.keystore \
  android/app/build/outputs/apk/release/app-release.apk my-key-alias

# Verify
jarsigner -verify -verbose -certs android/app/build/outputs/apk/release/app-release.apk
```

## iOS Build

### Requirements
- macOS 11+ (iOS builds only on macOS)
- Xcode 13+
- iOS deployment target 12+
- Apple Developer Account

### Build Steps

1. **Build web assets**:
```bash
npm run react:build
```

2. **Add iOS platform**:
```bash
npx cap add ios
```

3. **Sync to iOS**:
```bash
npx cap sync ios
```

4. **Open in Xcode**:
```bash
npx cap open ios
```

5. **Build in Xcode**:
   - Select target device or simulator
   - Product → Build: `Cmd + B`
   - Product → Run: `Cmd + R`

### Distribution

1. **Test Flight** (beta testing):
   - Build with debug provisioning profile
   - Upload to TestFlight via App Store Connect

2. **App Store**:
   - Build release variant
   - Submit through App Store Connect

## Web Deployment

### Backend Server

1. **Prepare server**:
```bash
npm run server:build
```

2. **Install on server**:
```bash
# Copy files to server
scp -r . user@server:/path/to/app

# Install on server
npm install --production
```

3. **Environment setup**:
```bash
# Create .env file on server
DATABASE_URL=postgres://...
OLLAMA_BASE_URL=...
NODE_ENV=production
```

4. **Run with process manager**:
```bash
# Using PM2
npm install -g pm2
pm2 start server/server.js --name "language-learning"
pm2 save
pm2 startup
```

### Frontend Hosting

1. **Build static files**:
```bash
npm run react:build
```

2. **Upload to CDN/Hosting**:
   - GitHub Pages
   - Netlify
   - Vercel
   - AWS S3 + CloudFront
   - Your own web server

3. **Configure API endpoint**:
```javascript
// src/services/api.js
const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run react:build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "server:start"]
```

Build and run:
```bash
docker build -t language-learning .
docker run -p 3000:3000 --env-file .env language-learning
```

## Database Deployment

### PostgreSQL Hosting Options

1. **Self-hosted**:
   - AWS EC2
   - DigitalOcean Droplet
   - Linode
   - Your own server

2. **Managed Services**:
   - AWS RDS
   - Google Cloud SQL
   - Azure Database
   - Heroku Postgres
   - DigitalOcean Managed Database

### Setup pgvector Extension

```sql
-- On managed service
CREATE EXTENSION IF NOT EXISTS vector;

-- Create initial tables
CREATE TABLE words (
  id SERIAL PRIMARY KEY,
  word VARCHAR(255) NOT NULL,
  language VARCHAR(10),
  definition TEXT,
  examples TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE word_embeddings (
  word_id INTEGER REFERENCES words(id),
  embedding vector(1536)
);

CREATE INDEX ON word_embeddings USING ivfflat (embedding vector_cosine_ops);
```

## Ollama Deployment

### Local Machine
- Ollama must run on same machine or be network accessible
- Default: `http://localhost:11434`

### Remote Server
```bash
# Start Ollama on server
ollama serve --host 0.0.0.0:11434

# Configure client to connect
OLLAMA_BASE_URL=http://server-ip:11434
```

### Docker Deployment
```bash
docker run -d -p 11434:11434 ollama/ollama
```

## Performance Optimization

### Frontend Optimization
```bash
# Minify and optimize
npm run react:build

# Analyze bundle size
npm install -g webpack-bundle-analyzer
```

### Backend Optimization
```bash
# Use production database indexes
psql $DATABASE_URL -c "CREATE INDEX idx_word_embedding ON word_embeddings USING ivfflat (embedding vector_cosine_ops);"
```

### Caching Strategy
- Cache frequently accessed words
- Use Redis for session caching
- CDN for frontend assets

## Monitoring and Logging

### Production Logging

```javascript
// server/middleware/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Error Tracking

```javascript
// Sentry integration
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

### Health Checks

```bash
# API health check endpoint
curl http://localhost:3000/api/health

# Database health
psql $DATABASE_URL -c "SELECT 1;"

# Ollama health
curl http://localhost:11434/api/tags
```

## Security Checklist

- [ ] Environment variables configured securely
- [ ] Database credentials not in version control
- [ ] HTTPS/TLS enabled for production
- [ ] API rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Authentication tokens stored securely
- [ ] CORS properly configured
- [ ] Database backups automated
- [ ] Logs monitored and retained
- [ ] Dependencies kept up-to-date

## Backup Strategy

### Database Backups

```bash
# Daily backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Automated with cron
0 2 * * * pg_dump $DATABASE_URL > /backups/backup-$(date +\%Y\%m\%d).sql
```

### Application Files

```bash
# Backup important files
tar -czf app-backup-$(date +%Y%m%d).tar.gz \
  server/migrations/ \
  json/ \
  package.json
```

## Rollback Procedure

```bash
# Stop current version
pm2 stop language-learning

# Restore from backup
git revert <commit-hash>
npm install
npm run server:build

# Restore database
psql $DATABASE_URL < backup-YYYYMMDD.sql

# Restart
pm2 start language-learning
```

## Related Documentation

- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions
- [Development Guide](DEVELOPMENT.md) - Development setup and workflow
- [Architecture Guide](ARCHITECTURE.md) - System design and structure

## Support Resources

- [Electron Builder Documentation](https://www.electron.build)
- [Capacitor Documentation](https://capacitorjs.com)
- [Express.js Deployment](https://expressjs.com/en/advanced/best-practice-performance.html)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
