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

# Install dependencies (production only)
npm ci --omit=dev

# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env
```

Edit file `.env` dengan konfigurasi berikut:

```env
# Database
DATABASE_URL="postgresql://cr_user:your_secure_password@localhost:5432/cr_system?schema=public"

# JWT (WAJIB GANTI dengan random string minimal 32 karakter)
JWT_SECRET="generate-random-secret-min-32-chars-here"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV=production

# Upload
MAX_FILE_SIZE=10485760
MAX_FILES=5
UPLOAD_PATH="./uploads"
```

> 💡 **Tips:** Generate random JWT secret dengan command:
> ```bash
> openssl rand -base64 32
> ```

---

## 4️⃣ Setup Database Schema

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (buat tabel di database)
npx prisma migrate deploy

# Seed data (optional - untuk test users)
npm run seed
```

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

## 9️⃣ Create Uploads Directory

```bash
# Pastikan folder uploads ada dan writable
mkdir -p uploads
chmod 755 uploads
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

### Permission denied on uploads

```bash
# Fix permissions
sudo chown -R $USER:$USER uploads/
chmod 755 uploads/
```

---

## 📞 Support

Jika ada pertanyaan atau masalah, silakan hubungi tim development.
