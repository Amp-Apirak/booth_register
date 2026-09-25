# Deploy ขึ้น Production

ระบบเปิดทุกอย่างผ่าน **โดเมนเดียว** (`https://<DOMAIN>`)

```
https://<DOMAIN>
   ├─ /api/*, /socket.io/*  →  server (Express + Socket.io :3005)  →  PostgreSQL 15
   └─ /* อื่นๆ               →  client (Next.js :3000)
```

ดังนั้น `NEXT_PUBLIC_API_URL=https://<DOMAIN>` และ `CORS_ORIGIN=https://<DOMAIN>` ไม่ต้องมีซับโดเมน `api.` แยก

ก่อนเริ่ม: ตั้ง DNS **A record** ของ `<DOMAIN>` และ `www.<DOMAIN>` ให้ชี้ไป IP ของเครื่อง server

## ทางเลือก 1 — เครื่องธรรมดา มี Docker (ง่ายสุด)

ใช้ได้เมื่อพอร์ต 80/443 ของเครื่องว่าง (Caddy ขอ HTTPS ให้เอง)

```bash
git clone -b Dev https://github.com/Amp-Apirak/booth_register.git
cd booth_register/deploy/docker
cp .env.example .env          # แก้ DOMAIN, DB_PASSWORD (openssl rand -hex 24), JWT_SECRET (openssl rand -hex 32)
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec server node scripts/create-admin.js admin '<รหัสผ่าน>' Admin "System Admin"
```

อัปเดตโค้ด: `git pull && docker compose -f docker-compose.prod.yml up -d --build`
สำรองข้อมูล: `docker compose -f docker-compose.prod.yml exec database pg_dump -U event_admin booth_register_db | gzip > backup_$(date +%F).sql.gz`

## ทางเลือก 2 — k3s + Istio Gateway (เครื่อง srv1530414)

พอร์ต 80/443 ถูก Istio ใช้อยู่ จึง**ห้ามลง Nginx/Caddy เพิ่ม** ใช้สคริปต์นี้แทน:

```bash
cd /usr/app/booth_register && git pull
DOMAIN=event-bbk.com ./deploy/k8s/deploy.sh
kubectl -n booth exec -it deploy/booth-server -- node scripts/create-admin.js admin '<รหัสผ่าน>' Admin "System Admin"   # ครั้งแรกครั้งเดียว
```

สคริปต์ทำ: build image ด้วย podman → import เข้า k3s (ไม่ใช้ registry) → สร้าง namespace `booth`, secret (สุ่มรหัสให้ครั้งแรกครั้งเดียว), เพิ่ม listener `event-bbk.com` ใน Gateway `ingressgateway` → ออก SSL (Let's Encrypt) → deploy → รอจนพร้อม · รันซ้ำเพื่ออัปเดตได้ ข้อมูลไม่หาย

| ไฟล์ใน `deploy/k8s/` | คืออะไร |
|---|---|
| `postgres.yaml` | PostgreSQL 15 + PVC 5Gi (schema/seed รันครั้งแรกเท่านั้น) |
| `server.yaml` / `client.yaml` | API และเว็บ (replicas 1 — Socket.io เก็บ state ใน memory) |
| `route.yaml` | แยก path → server/client, http→https, www→โดเมนหลัก |
| `tls.yaml` | Issuer + Certificate ของโดเมนนี้ |
| `backup.yaml` | `pg_dump` ทุกวัน 02:00 เก็บ 14 วัน ใน PVC `booth-backups` |

คำสั่งที่ใช้บ่อย:
```bash
kubectl -n booth get pods                                   # สถานะ
kubectl -n booth logs deploy/booth-server -f                # log API
kubectl -n istio-system get certificate booth-tls           # SSL พร้อมหรือยัง (READY=True)
kubectl -n booth edit secret booth-server-env               # เพิ่ม SMTP_* แล้ว…
kubectl -n booth rollout restart deploy/booth-server        # …restart
kubectl -n booth create job --from=cronjob/booth-db-backup backup-now   # สำรองทันที
```

## อัปเดตเวอร์ชันและการเปลี่ยนแปลงฐานข้อมูล

- `database/schema.sql` + `seed.sql` รัน **ครั้งแรกที่สร้าง volume เท่านั้น** · ตาราง/คอลัมน์ที่เพิ่มภายหลังถูกสร้างโดย server ตอนเปิด (`initTable()` ในแต่ละ repository) จึง **ไม่ต้องรัน SQL เอง**
- ทั้ง 2 ทางเลือก restart server ให้เองเมื่ออัปเดต (ทางเลือก 1 `up -d --build` สร้าง container ใหม่ · ทางเลือก 2 image tag = git commit จึง rollout ใหม่ทุกครั้ง)
- ตรวจหลังอัปเดต: `kubectl -n booth logs deploy/booth-server | head -40` (หรือ `docker compose … logs server`) ต้องไม่มี error ตอน init
- ลืมรหัสผ่านเจ้าหน้าที่: รันคำสั่ง `create-admin.js` ด้านบนด้วย username เดิม = ตั้งรหัสใหม่ (บัญชีเดิม, ข้อมูลไม่หาย)

| รอบ | สิ่งที่ server เพิ่มให้เอง | หลังอัปเดตให้ทำ |
|---|---|---|
| 2026-09-25 | ตาราง `organization_types` (+ 6 ประเภทเริ่มต้น), คอลัมน์ `organization_type_id`, `organization_type_other` ใน `participants` | เปิด `/settings?tab=organizations` ตรวจรายการประเภทองค์กร · ผู้ลงทะเบียนเดิมเป็น "ไม่ระบุ" (เลือกแทนได้ในแดชบอร์ด) · ช่องประเภทองค์กรในหน้าลงทะเบียนกลายเป็นช่องบังคับ |

หมายเหตุ: ค่า CPU request ตั้งไว้ต่ำ (10m) เพราะเครื่องนี้ยอดจอง CPU รวมเกือบเต็ม · ถ้าในอนาคตมีการรัน Ansible role `infra/mesh` ที่สร้าง Gateway ใหม่ทับ ให้รัน `deploy.sh` ซ้ำเพื่อเติม listener กลับ
