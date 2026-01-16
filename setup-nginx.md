# SETUP NGINX (FE + BE + SSL) – PROSIMEX

Tài liệu này gom **toàn bộ cấu hình Nginx** cho hệ thống Prosimex:

* Frontend DEV / PROD
* Backend DEV / PROD
* Reverse proxy
* HTTPS (Certbot)
* Đổi domain sau này

---

## 1. Kiến trúc tổng thể

```
Internet
  │
  ├── prosimex.pitundev.io.vn        → FE PROD
  ├── dev.prosimex.pitundev.io.vn    → FE DEV
  ├── api-prosimex.pitundev.io.vn    → BE PROD
  ├── dev.api-prosimex.pitundev.io.vn→ BE DEV
  │
Nginx (Host)
  │
  ├── 127.0.0.1:3001 → frontend_prod (nginx container)
  ├── 127.0.0.1:3003 → frontend_dev (vite)
  ├── 127.0.0.1:3000 → backend_prod
  └── 127.0.0.1:3002 → backend_dev
```

---

## 2. Cấu trúc file Nginx

```
/etc/nginx/
├── sites-available/
│   ├── prosimex
│   ├── dev.prosimex
│   ├── api-prosimex
│   └── dev.api-prosimex
├── sites-enabled/
└── nginx.conf
```

---

## 3. Frontend PROD

`/etc/nginx/sites-available/prosimex`

FRONTEND – PROD
sudo nano /etc/nginx/sites-available/prosimex

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

## 4. Frontend DEV

`/etc/nginx/sites-available/dev.prosimex`

FRONTEND – DEV
sudo nano /etc/nginx/sites-available/dev.prosimex

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

## 5. Backend PROD

`/etc/nginx/sites-available/api-prosimex`

BACKEND – PROD (API)
sudo nano /etc/nginx/sites-available/api-prosimex

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

## 6. Backend DEV

`/etc/nginx/sites-available/dev.api-prosimex`

BACKEND – DEV (API)
sudo nano /etc/nginx/sites-available/dev.api-prosimex

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

## 7. Enable site
KIỂM TRA FILE ĐANG ĐƯỢC DÙNG:
ls -l /etc/nginx/sites-enabled/

```bash
sudo ln -s /etc/nginx/sites-available/prosimex /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/dev.prosimex /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api-prosimex /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/dev.api-prosimex /etc/nginx/sites-enabled/

```
SAU KHI SỬA FILE – BẮT BUỘC
    - Test config: sudo nginx -t
    - Reload nginx: sudo systemctl reload nginx

---

## 8. HTTPS (Certbot)

```bash
sudo certbot --nginx \
  -d prosimex.pitundev.io.vn \
  -d dev.prosimex.pitundev.io.vn \
  -d api-prosimex.pitundev.io.vn \
  -d dev.api-prosimex.pitundev.io.vn
```

---

## 9. Đổi domain sau này

* Sửa DNS
* Sửa `server_name`
* Reload nginx
* Cấp lại SSL

---

✅ **Nginx setup hoàn chỉnh – FE + BE + SSL**

