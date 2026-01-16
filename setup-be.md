# SETUP BACKEND (DEV / PROD) – PROSIMEX

Tài liệu này hướng dẫn **từ A → Z** cách setup Backend cho dự án **Prosimex** gồm:

* Backend NodeJS (Docker)
* PostgreSQL
* Nginx reverse proxy
* HTTPS (Certbot)
* Tách domain **DEV / PROD**
* CI/CD (GitHub Actions)

---

## 1. Kiến trúc tổng thể

```
Internet
  │
  ├── https://api-prosimex.pitundev.io.vn        (PROD)
  ├── https://dev.api-prosimex.pitundev.io.vn    (DEV)
  │
Nginx (Host)
  │
  ├── proxy → backend_prod:3000 (Docker)
  └── proxy → backend_dev:3000  (Docker)
```

---

## 2. Cấu trúc thư mục backend

```
backend/
├── Dockerfile.dev
├── Dockerfile.prod
├── package.json
├── src/
└── ...
```

---

## 3. Dockerfile Backend

### 3.1 Dockerfile.dev

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
```

---

### 3.2 Dockerfile.prod

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000
CMD ["npm", "run", "start"]
```

---

## 4. docker-compose

### 4.1 docker-compose.dev.yml (Backend part)

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile.dev
  container_name: backend_dev
  env_file: .env.dev
  ports:
    - "3002:3000"
  depends_on:
    - db
```

➡️ Backend DEV chạy tại:

```
http://127.0.0.1:3002
```

---

### 4.2 docker-compose.prod.yml (Backend part)

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile.prod
  container_name: backend_prod
  env_file: .env.prod
  expose:
    - "3000"
  depends_on:
    - db
```

➡️ Backend PROD **KHÔNG expose public**, chỉ dùng qua nginx

---

## 5. Environment Variables

### 5.1 .env.dev

cd /var/www/prosimex-dev
nano .env.dev


```env
NODE_ENV=development
DB_HOST=db
DB_PORT=5432
DB_NAME=dev_db
DB_USER=appuser
DB_PASSWORD=********
```

### 5.2 .env.prod
cd /var/www/prosimex-prod
nano .env.prod

```env
NODE_ENV=production
DB_HOST=db
DB_PORT=5432
DB_NAME=prod_db
DB_USER=appuser
DB_PASSWORD=********
```



Sau khi sửa .env Backend → BẮT BUỘC restart: 
docker compose -f docker-compose.dev.yml restart backend
docker compose -f docker-compose.prod.yml restart backend
Nếu đổi PORT / DB / biến quan trọng → nên rebuild:
docker compose -f docker-compose.prod.yml up -d --build backend


---

## 6. Nginx Backend Config

### 6.1 API PROD

`/etc/nginx/sites-available/api-prosimex`

```nginx
server {
  listen 80;
  server_name api-prosimex.pitundev.io.vn;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

---

### 6.2 API DEV

`/etc/nginx/sites-available/dev.api-prosimex`

```nginx
server {
  listen 80;
  server_name dev.api-prosimex.pitundev.io.vn;

  location / {
    proxy_pass http://127.0.0.1:3002;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

---

## 7. Enable Nginx site

```bash
sudo ln -s /etc/nginx/sites-available/api-prosimex /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/dev.api-prosimex /etc/nginx/sites-enabled/

sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. HTTPS với Certbot

```bash
sudo certbot --nginx \
  -d api-prosimex.pitundev.io.vn \
  -d dev.api-prosimex.pitundev.io.vn
```

Kiểm tra:

```bash
sudo certbot certificates
```

---

## 9. CI/CD (GitHub Actions – Backend)

### Deploy PROD backend

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 10. Kiểm tra backend

```bash
# container
docker ps | grep backend

# local test
curl http://127.0.0.1:3000

# public test
curl https://api-prosimex.pitundev.io.vn
```

---

## 11. Troubleshooting

### Backend chạy nhưng curl localhost không được

✔ Kiểm tra port mapping

```bash
docker ps
```

---

### 502 Bad Gateway

✔ Backend chưa start
✔ Sai port proxy_pass

---

## 12. Best Practices

* DEV luôn dùng `npm run dev`
* PROD chỉ dùng `npm run start`
* Không expose port backend prod ra ngoài
* API đi qua nginx

---

## 13. Thay đổi domain (Khi cần đổi sau này)

Phần này dùng khi **đổi domain / thêm domain mới** cho Backend (DEV hoặc PROD).

---

### 13.1 Checklist nhanh khi đổi domain

Khi đổi domain, **luôn kiểm tra đủ 5 chỗ sau**:

1. DNS (A record)
2. Nginx `server_name`
3. Certbot (SSL)
4. FE env gọi API
5. Restart service

---

### 13.2 Bước 1 – Cập nhật DNS

Vào DNS provider (Cloudflare / hosting):

| Type | Name                    | Value  |
| ---- | ----------------------- | ------ |
| A    | api-new.example.com     | VPS_IP |
| A    | dev.api-new.example.com | VPS_IP |

⏳ Chờ 1–2 phút rồi test:

```bash
ping api-new.example.com
```

---

### 13.3 Bước 2 – Sửa Nginx backend

Ví dụ đổi sang domain mới:

```
api-new.example.com
dev.api-new.example.com
```

#### PROD

```bash
sudo nano /etc/nginx/sites-available/api-prosimex
```

```nginx
server_name api-new.example.com;
```

#### DEV

```bash
sudo nano /etc/nginx/sites-available/dev.api-prosimex
```

```nginx
server_name dev.api-new.example.com;
```

Kiểm tra & reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### 13.4 Bước 3 – Cấp lại SSL (BẮT BUỘC)

```bash
sudo certbot --nginx \
  -d api-new.example.com \
  -d dev.api-new.example.com
```

Kiểm tra cert:

```bash
sudo certbot certificates
```

---

### 13.5 Bước 4 – Sửa FE gọi API

#### DEV (Vite)

`.env.development`

```env
VITE_API_BASE_URL=https://dev.api-new.example.com
```

#### PROD

`.env.production`

```env
VITE_API_BASE_URL=https://api-new.example.com
```

Sau đó **build lại FE**:

```bash
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d
```

---

### 13.6 Bước 5 – Verify end-to-end

```bash
curl https://api-new.example.com
curl https://dev.api-new.example.com
```

Mở browser:

* [https://api-new.example.com](https://api-new.example.com)
* [https://dev.api-new.example.com](https://dev.api-new.example.com)

---

### 13.7 Lỗi thường gặp khi đổi domain

❌ **ERR_CONNECTION_TIMED_OUT**

* DNS chưa trỏ đúng
* Firewall chặn 80/443

❌ **NET::ERR_CERT_COMMON_NAME_INVALID**

* Chưa cấp lại cert

❌ **502 Bad Gateway**

* Backend chưa chạy
* Sai port proxy_pass

---

### 13.8 Best practice khi đổi domain

* Không sửa domain trực tiếp trong code
* Luôn dùng env (`VITE_API_BASE_URL`)
* Đổi domain → đổi SSL ngay
* DEV & PROD tách cert

---

## 14. Checklist hoàn thành

* [x] Backend dev chạy
* [x] Backend prod chạy
* [x] DB tách dev/prod
* [x] Domain dev/prod
* [x] HTTPS
* [x] CI/CD

---

✅ **Backend setup hoàn chỉnh – Production Ready**
