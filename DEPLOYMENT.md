# 🚀 Deployment Guide - Ubuntu 24 LTS Server

Panduan lengkap untuk deploy CR System API di Ubuntu 24 LTS Server.

---

## 📋 Prerequisites

- Ubuntu 24 LTS Server
- Akses root atau sudo
- Domain (optional, untuk SSL)

---

## 1️⃣ Update System & Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS (recommended for Prisma 7)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v  # Should be v20.x
npm -v
```

---

## 2️⃣ Setup PostgreSQL

> **Skip langkah ini jika sudah ada external database PostgreSQL**

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start & enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database & user
sudo -u postgres psql
```

Jalankan perintah SQL berikut di dalam psql:

```sql
CREATE DATABASE cr_system;
CREATE USER cr_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE cr_system TO cr_user;
\c cr_system
GRANT ALL ON SCHEMA public TO cr_user;
\q
```

---

## 3️⃣ Setup Application

```bash
# Masuk ke folder aplikasi
cd /path/to/server

# Install dependencies (termasuk tsx untuk Prisma 7 config)
npm ci

# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env
```

Edit file `.env` dengan konfigurasi berikut:

```env
# Database (Local PostgreSQL)
DATABASE_URL="postgresql://cr_user:your_secure_password@localhost:5432/cr_system?schema=public"

# Database (Azure PostgreSQL - requires SSL)
# DATABASE_URL="postgresql://username:password@your-server.postgres.database.azure.com:5432/cr_system?schema=public&sslmode=require"
# Note: Special characters in password must be URL-encoded (e.g., # = %23, * = %2A)

# JWT (WAJIB GANTI dengan random string minimal 32 karakter)
JWT_SECRET="generate-random-secret-min-32-chars-here"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV=production

# Azure Communication Services (Email) - Optional
# Get from Azure Portal > Communication Services > Keys
AZURE_COMMUNICATION_CONNECTION_STRING="endpoint=https://your-resource.communication.azure.com/;accesskey=your-access-key"
AZURE_EMAIL_SENDER_ADDRESS="DoNotReply@your-domain.azurecomm.net"

# Azure Blob Storage (for document/PDF storage)
# Container must be set to Private access level (SAS tokens used for secure downloads)
AZURE_BLOB_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=your-storage;AccountKey=your-key;EndpointSuffix=core.windows.net"
AZURE_BLOB_CONTAINER_NAME="compro-container"

# Upload (max file size in bytes)
MAX_FILE_SIZE=10485760
MAX_FILES=5
```

> 💡 **Tips:** Generate random JWT secret dengan command:
> ```bash
> openssl rand -base64 32
> ```

> 📧 **Email Notifications:** Jika tidak menggunakan Azure Communication Services, kosongkan atau hapus `AZURE_COMMUNICATION_CONNECTION_STRING`. Aplikasi akan tetap berjalan dengan notifikasi Socket.IO saja.

---

## 4️⃣ Setup Database Schema

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations (buat tabel di database)
npm run prisma:migrate:deploy

# Seed data (optional - untuk test users)
npm run seed
```

> **Note Prisma 7:** Pastikan `tsx` terinstall (sudah termasuk di dependencies) karena Prisma 7 menggunakan TypeScript config file.

---

## 4️⃣.5 Setup Azure Communication Services (Optional)

Untuk mengaktifkan email notifications, setup Azure Communication Services:

### Langkah 1: Buat Resource di Azure Portal

1. Login ke [Azure Portal](https://portal.azure.com)
2. Buat **Communication Services** resource
3. Buat **Email Communication Services** resource
4. Connect Email service ke Communication Services

### Langkah 2: Setup Domain

1. Di Email Communication Services, tambahkan domain:
   - **Azure subdomain** (gratis, format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.azurecomm.net`)
   - Atau **Custom domain** (verifikasi DNS diperlukan)
2. Catat sender address, contoh: `DoNotReply@your-domain.azurecomm.net`

### Langkah 3: Dapatkan Connection String

1. Buka Communication Services resource
2. Pergi ke **Keys** di sidebar
3. Copy **Connection string** (Primary atau Secondary)

### Langkah 4: Update Environment

```bash
nano .env
```

Tambahkan:
```env
AZURE_COMMUNICATION_CONNECTION_STRING="endpoint=https://your-resource.communication.azure.com/;accesskey=your-access-key"
AZURE_EMAIL_SENDER_ADDRESS="DoNotReply@your-domain.azurecomm.net"
```

> 💡 **Note:** Jika tidak ingin menggunakan email notifications, skip langkah ini. Aplikasi akan tetap berjalan dengan Socket.IO notifications saja.

---

## 4️⃣.6 Setup Azure Blob Storage

Untuk menyimpan dokumen dan PDF di Azure Blob Storage:

### Langkah 1: Buat Storage Account di Azure Portal

1. Login ke [Azure Portal](https://portal.azure.com)
2. Buat **Storage Account** baru
3. Pilih region yang dekat dengan server Anda
4. Performance: Standard, Redundancy: LRS (atau sesuai kebutuhan)

### Langkah 2: Buat Container

1. Buka Storage Account yang baru dibuat
2. Pergi ke **Containers** di sidebar
3. Buat container baru dengan nama `compro-container`
4. **PENTING:** Set access level ke **Private** (no anonymous access)

### Langkah 3: Dapatkan Connection String

1. Di Storage Account, pergi ke **Access keys**
2. Copy **Connection string** (key1 atau key2)

### Langkah 4: Update Environment

```bash
nano .env
```

Tambahkan:
```env
AZURE_BLOB_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=your-storage;AccountKey=your-key;EndpointSuffix=core.windows.net"
AZURE_BLOB_CONTAINER_NAME="compro-container"
```

### Struktur Folder di Blob Storage

Dokumen akan disimpan dengan struktur:
```
{container}/
└── {division}/
    └── {userId}/
        └── {crId}/
            ├── attachments/    # Dokumen upload user
            └── pdf/            # PDF generated (approval & form)
```

### Security Notes

- Container harus **Private** (tidak ada anonymous access)
- Download menggunakan **SAS Token** (Shared Access Signature)
- SAS Token berlaku **2 menit** untuk keamanan
- AccountKey harus dijaga kerahasiaannya

> 💡 **Note:** Container akan dibuat otomatis jika belum ada saat aplikasi pertama kali upload file.

---

## 5️⃣ Setup PM2 (Process Manager)

PM2 adalah process manager untuk menjaga aplikasi Node.js tetap berjalan.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application dengan PM2
pm2 start src/app.js --name "cr-system-api"

# Save PM2 process list
pm2 save

# Setup PM2 startup script (auto-start saat reboot)
pm2 startup
# Jalankan command yang diberikan oleh pm2 startup (copy-paste)
```

---

## 6️⃣ Setup Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/cr-system
```

Isi dengan konfigurasi berikut:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Ganti dengan domain atau IP server

    # Upload size limit (sesuaikan dengan MAX_FILE_SIZE)
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support untuk Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/cr-system /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 7️⃣ Setup Firewall

```bash
# Allow required ports
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## 8️⃣ Setup SSL dengan Let's Encrypt (Recommended)

> **Memerlukan domain yang sudah pointing ke IP server**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Generate SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

---

## 🔟 Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check if API is responding
curl http://localhost:3000/api/health

# Check Nginx status
sudo systemctl status nginx
```

Akses melalui browser:
- **API Health Check:** `http://your-domain.com/api/health`
- **API Documentation:** `http://your-domain.com/api-docs`

---

## 📊 Monitoring & Logs

### PM2 Commands

```bash
# View real-time logs
pm2 logs cr-system-api

# Monitor resources
pm2 monit

# View status
pm2 status

# Restart application
pm2 restart cr-system-api

# Stop application
pm2 stop cr-system-api

# Delete from PM2
pm2 delete cr-system-api
```

### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### PostgreSQL Logs

```bash
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

---

## 📋 Quick Reference Commands

| Task | Command |
|------|---------|
| Start app | `pm2 start cr-system-api` |
| Stop app | `pm2 stop cr-system-api` |
| Restart app | `pm2 restart cr-system-api` |
| View logs | `pm2 logs cr-system-api` |
| Monitor | `pm2 monit` |
| Run migration | `npx prisma migrate deploy` |
| Open Prisma Studio | `npx prisma studio` |
| Restart Nginx | `sudo systemctl restart nginx` |
| Check Nginx config | `sudo nginx -t` |

---

## 🔄 Update Application

Ketika ada update code:

```bash
# Masuk ke folder aplikasi
cd /path/to/server

# Pull latest code (jika menggunakan git)
git pull origin main

# Install dependencies
npm ci --omit=dev

# Generate Prisma Client
npx prisma generate

# Run new migrations (jika ada)
npx prisma migrate deploy

# Restart application
pm2 restart cr-system-api
```

---

## ⚠️ Security Checklist

- [ ] Ganti `JWT_SECRET` dengan random string yang kuat (min 32 karakter)
- [ ] Gunakan password database yang kuat
- [ ] Setup SSL/HTTPS dengan Let's Encrypt
- [ ] Konfigurasi firewall (UFW)
- [ ] Jangan expose port 5432 (PostgreSQL) ke public
- [ ] Simpan Azure Communication Services connection string dengan aman
- [ ] Simpan Azure Blob Storage connection string dengan aman
- [ ] Set Azure Blob container access level ke **Private**
- [ ] Set `NODE_ENV=production`
- [ ] Backup database secara berkala
- [ ] Update sistem secara berkala (`sudo apt update && sudo apt upgrade`)

---

## 🐛 Troubleshooting

### Application tidak bisa start

```bash
# Check logs
pm2 logs cr-system-api --lines 50

# Check if port is in use
sudo lsof -i :3000
```

### Database connection error

```bash
# Test database connection
psql -h localhost -U cr_user -d cr_system

# Check PostgreSQL status
sudo systemctl status postgresql
```

### Nginx error

```bash
# Check config syntax
sudo nginx -t

# Check error log
sudo tail -f /var/log/nginx/error.log
```

### Azure Blob Storage error

```bash
# Check PM2 logs for blob service errors
pm2 logs cr-system-api --lines 50 | grep -i blob

# Verify connection string format
# Should start with: DefaultEndpointsProtocol=https;AccountName=...

# Verify container exists and is set to Private access in Azure Portal
```

---

## 📞 Support

Jika ada pertanyaan atau masalah, silakan hubungi tim development.
