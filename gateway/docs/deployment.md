# Deployment

This guide covers setting up G-Watch for production use.

---

## Prerequisites

- Node.js 20 or later
- PostgreSQL 14 or later
- npm or yarn

---

## 1. Clone and Install

```bash
git clone <repo-url> && cd gateway

# Install backend dependencies
cd backend-server
npm install

# Install frontend dependencies
cd ../frontend-dashboard
npm install
```

---

## 2. Set Up PostgreSQL

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE gwatch_security;"
```

---

## 3. Configure Environment

```bash
cd backend-server
cp .env.example .env
```

Edit `.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:your-password@localhost:5432/gwatch_security

# Security (REQUIRED — server won't start without this)
JWT_SECRET=your-random-secret-key-here

# Server
PORT=3000
NODE_ENV=development

# CORS (frontend URL)
CORS_ORIGIN=http://localhost:5173
```

**Important:** `JWT_SECRET` is required. Generate a strong random string:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Create Database Tables

```bash
cd backend-server
npx drizzle-kit push
```

This creates all the tables in your database.

---

## 5. Seed Demo Data (Optional)

```bash
npm run seed
```

This creates:
- 1 admin user
- 5 integrations with different risk levels
- API keys for each integration
- Demo events, alerts, and audit logs

---

## 6. Start the Application

```bash
# Backend (Terminal 1)
cd backend-server
npm run dev

# Frontend (Terminal 2)
cd frontend-dashboard
npm run dev
```

Backend: http://localhost:3000
Frontend: http://localhost:5173

---

## 7. Production Build

### Frontend

```bash
cd frontend-dashboard
npm run build
```

This creates a `dist/` folder with optimized static files.

### Serve with nginx

```nginx
server {
    listen 80;
    server_name dashboard.yourdomain.com;

    location / {
        root /path/to/gateway/frontend-dashboard/dist;
        try_files $uri /index.html;
    }

    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Backend

```bash
cd backend-server
npm start
```

Or use pm2 for process management:

```bash
pm2 start src/server.js --name gwatch-api
```

---

## 8. Nginx Reverse Proxy (Optional)

If you want everything behind one domain:

```nginx
# Frontend
server {
    listen 443 ssl;
    server_name dashboard.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/dashboard.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.yourdomain.com/privkey.pem;

    location / {
        root /path/to/gateway/frontend-dashboard/dist;
        try_files $uri /index.html;
    }

    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

# API + Gateway
server {
    listen 443 ssl;
    server_name gateway.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/gateway.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gateway.yourdomain.com/privkey.pem;

    # API endpoints
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Explicit gateway
    location /gateway {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Transparent proxy (catch-all)
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Secret for JWT signing. Server won't start without it. |
| `PORT` | No | `3000` | Backend port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Frontend URL for CORS |

---

## Clearing the Database

To start fresh:

```bash
cd backend-server
npm run clear
```

This deletes all data from all tables.

---

## Troubleshooting

### "JWT_SECRET is not set"
Add `JWT_SECRET=your-secret` to your `.env` file.

### "Cannot find module"
Run `npm install` in the backend-server directory.

### "relation does not exist"
Run `npx drizzle-kit push` to create the tables.

### Frontend can't connect to backend
- Check `CORS_ORIGIN` matches the frontend URL
- Check the backend is running on port 3000
- Check the API base URL in `frontend-dashboard/src/api.js`

### Socket.IO connection fails
- Check `CORS_ORIGIN` in the backend
- Check nginx is forwarding `/socket.io` correctly
- Check the frontend is sending the auth token

### "EADDRINUSE"
Port 3000 is already in use. Change `PORT` in `.env` or stop the other process.

---

## Security Checklist

Before going to production:

- [ ] Set a strong `JWT_SECRET` (not the default)
- [ ] Use HTTPS (not HTTP)
- [ ] Set `NODE_ENV=production`
- [ ] Restrict `CORS_ORIGIN` to your frontend domain
- [ ] Use a non-default database password
- [ ] Run the app as a non-root user
- [ ] Enable PostgreSQL authentication (not trust)
- [ ] Set up regular database backups
