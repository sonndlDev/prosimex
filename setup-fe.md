# SETUP FRONTEND (DEV / PROD) – PROSIMEX

Tài liệu này hướng dẫn **từ A → Z** cách setup Frontend (React + Vite) cho dự án **Prosimex**, bao gồm:

* Frontend DEV / PROD tách biệt
* Docker hoá
* Vite dev server (DEV)
* Build + Nginx serve static (PROD)
* Nginx reverse proxy + HTTPS
* Đổi domain sau này không bị lỗi

---

## 1. Kiến trúc tổng thể

```
Browser
  │
  ├── https://prosimex.pitundev.io.vn        (PROD)
  ├── https://dev.prosimex.pitundev.io.vn    (DEV)
  │
Nginx (Host)
  │
  ├── proxy → frontend_prod (nginx container :3001)
  └── proxy → frontend_dev  (vite dev server :3003)
```

---

## 2. Cấu trúc thư mục frontend

```
frontend/
├── Dockerfile.dev
├── Dockerfile.prod
├── nginx.conf
├── package.json
├── vite.config.js
├── .env.development
├── .env.production
├── src/
└── dist/                # sinh ra khi build
```

---

## 3. package.json (chuẩn)

```json
{
  "name": "prosimex-frontend",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

---

## 4. Vite config (BẮT BUỘC)

`vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: 'all'
  }
})
```

---

## 5. Environment variables

### 5.1 DEV

`.env.development`
cd /var/www/prosimex-dev/frontend
nano .env.development

```env
VITE_API_BASE_URL=https://dev.api-prosimex.pitundev.io.vn
```

---

### 5.2 PROD

`.env.production`
cd /var/www/prosimex-prod/frontend
nano .env.production

```env
VITE_API_BASE_URL=https://api-prosimex.pitundev.io.vn
```



Sau khi sửa .env Frontend → PHẢI rebuild
  + DEV:
    cd /var/www/prosimex-dev
    docker compose -f docker-compose.dev.yml restart frontend
  + PROD:
    cd /var/www/prosimex-prod
    docker compose -f docker-compose.prod.yml build frontend
    docker compose -f docker-compose.prod.yml up -d frontend


---

## 6. Dockerfile Frontend

### 6.1 Dockerfile.dev (Vite dev server)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
```

---

### 6.2 Dockerfile.prod (Build + Nginx – CHUẨN PROD)

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Runtime stage
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 7. nginx.conf (frontend PROD container)

`frontend/nginx.conf`

```nginx
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

---

## 8. docker-compose

### 8.1 DEV (frontend)

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile.dev
  container_name: frontend_dev
  ports:
    - "3003:5173"
  volumes:
    - ./frontend:/app
    - /app/node_modules
```

Truy cập DEV:

* [http://IP:3003](http://IP:3003)
* [https://dev.prosimex.pitundev.io.vn](https://dev.prosimex.pitundev.io.vn)

---

### 8.2 PROD (frontend)

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile.prod
  container_name: frontend_prod
  ports:
    - "3001:80"
```

PROD đi qua nginx host.

---

## 9. Nginx host config

### 9.1 PROD

`/etc/nginx/sites-available/prosimex`

```nginx
server {
  listen 80;
  server_name prosimex.pitundev.io.vn;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

---

### 9.2 DEV

`/etc/nginx/sites-available/dev.prosimex`

```nginx
server {
  listen 80;
  server_name dev.prosimex.pitundev.io.vn;

  location / {
    proxy_pass http://127.0.0.1:3003;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

---

## 10. HTTPS

```bash
sudo certbot --nginx \
  -d prosimex.pitundev.io.vn \
  -d dev.prosimex.pitundev.io.vn
```

---

## 11. CI/CD (Frontend)

```bash
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d
```

---

## 12. Debug nhanh

### Không vào được domain

* DNS chưa trỏ
* Nginx chưa reload
* SSL chưa cấp

### Blank page / trắng màn hình

* Sai `try_files`
* FE chưa build lại

### API không gọi được

* Sai `VITE_API_BASE_URL`

---

## 13. Thay đổi domain Frontend (Sau này)

### 13.1 Checklist nhanh

1. Cập nhật DNS
2. Sửa nginx `server_name`
3. Cấp lại SSL
4. Sửa `.env.*`
5. Build & restart FE

---

### 13.2 Ví dụ đổi domain

Domain mới:

```
prosimex-new.example.com
dev.prosimex-new.example.com
```

DNS:

* A prosimex-new.example.com → VPS_IP
* A dev.prosimex-new.example.com → VPS_IP

---

### 13.3 Sửa nginx

```nginx
server_name prosimex-new.example.com;
```

```nginx
server_name dev.prosimex-new.example.com;
```

Reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### 13.4 Cấp lại SSL

```bash
sudo certbot --nginx \
  -d prosimex-new.example.com \
  -d dev.prosimex-new.example.com
```

---

### 13.5 Sửa env FE

```env
VITE_API_BASE_URL=https://api-prosimex-new.example.com
```

Build lại:

```bash
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d
```

---

## 14. Checklist hoàn thành

* [x] FE dev chạy
* [x] FE prod build
* [x] Domain dev/prod
* [x] HTTPS
* [x] API connect OK

---

✅ **Frontend setup hoàn chỉnh – Production Ready**
