# 🎉 Whyroon - Party Game

เว็บรวมปาร์ตี้เกม Real-time สำหรับเล่นกับเพื่อนบนมือถือ (เข้าห้องแบบ Kahoot)
**Doraemon · ใบ้คำแข่งเวลา · Werewolf**

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Motion (Framer Motion) · Supabase (Anonymous Auth + Realtime)

## ติดตั้ง

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com)
2. **Authentication → Sign In / Providers → เปิด "Allow anonymous sign-ins"**
3. **SQL Editor** → วางไฟล์ `supabase/schema.sql` ทั้งไฟล์ → Run
4. คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่าจาก **Project Settings → API**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon / publishable key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role / secret key — ใช้เฉพาะฝั่งเซิร์ฟเวอร์)
5. `npm install && npm run dev` แล้วเปิด http://localhost:3000
   (ทดสอบหลายเครื่องในวง LAN: `npm run dev -- -H 0.0.0.0` แล้วเปิดด้วย IP เครื่อง)

> Deploy บน Vercel: ใส่ env 3 ตัวเดียวกันใน Project Settings → Environment Variables

## สถาปัตยกรรม

```
มือถือ ──POST /api/action──▶ Next.js Route Handler (ตรวจ JWT + กติกาเกม)
   ▲                              │ commit_room() — atomic + optimistic lock (version)
   │                              ▼
   │◀── Broadcast "sync" ──── Supabase Postgres (rooms / players / game_states / secrets)
   │◀── postgres_changes ────────┘
   └── rpc get_snapshot() (อ่านผ่าน RLS เฉพาะห้องที่ตัวเองอยู่)
       Presence: ใครออนไลน์/หลุด
```

- **Server-authoritative:** client เขียนฐานข้อมูลตรงไม่ได้ ทุกการกระทำผ่าน `/api/action` ซึ่งรันกติกาเกม (`lib/engine/*`) แล้ว commit แบบ atomic — กดพร้อมกันหลายเครื่องก็ไม่พัง (retry อัตโนมัติ)
- **ความลับไม่รั่ว:** บทบาท Werewolf และคำศัพท์ของคนใบ้อยู่ใน `player_secrets` (RLS: อ่านได้เฉพาะของตัวเอง) ส่วนสำรับไพ่/คะแนนโหวตอยู่ใน `game_secrets` (ไม่มีใครอ่านได้นอกจากเซิร์ฟเวอร์)
- **นาฬิกาซิงค์:** deadline ทุกอย่างเป็นเวลาฝั่งเซิร์ฟเวอร์ client ชดเชย offset เอง ทุกเครื่องนับถอยหลังตรงกัน
- **กันหลุด:** broadcast + postgres_changes + polling ทุก 12 วิ + refetch เมื่อกลับมาเปิดแอป / รีเฟรชแล้วกลับเข้าห้องเดิมอัตโนมัติ

## โครงสร้างโฟลเดอร์

```
supabase/schema.sql           ตาราง + RLS + ฟังก์ชัน get_snapshot / commit_room
app/
  layout.tsx, page.tsx        ฟอนต์ Kanit, หน้าเดียวแบบ SPA (?room=XXXX)
  api/action/route.ts         API เดียวสำหรับทุกการกระทำ
lib/
  types.ts, constants.ts      ชนิดข้อมูล, อิโมจิ, กติกาไพ่, บทบาท
  words-data.ts               คลังคำศัพท์ 6 หมวด หมวดละ 50 คำ
  engine/                     กติกาเกม (pure functions) — index (ล็อบบี้/ตั้งค่า), ohana, words, werewolf
  supabase/                   client (anonymous session) / server (service role + broadcast)
  client/                     api + นาฬิกาซิงค์, room-store (realtime), setup draft, toast
components/
  PartyApp.tsx                เราเตอร์หลัก: หน้าแรก → โปรไฟล์ → ห้อง
  home/                       หน้าแรก, เลือกอิโมจิ + ชื่อเล่น
  room/                       ล็อบบี้, QR, จัดการผู้เล่น, หน้าตั้งค่าเกม
  setup/                      ตั้งค่าแต่ละเกม + ตัวจัดคิวลากวาง
  games/ohana|words|werewolf  หน้าจอระหว่างเล่น
  ui/                         ปุ่ม 3D, Modal, Avatar, Countdown
```

## บำรุงรักษา

ห้องที่ไม่มีความเคลื่อนไหวเกิน 2 วันลบได้ด้วย `select public.cleanup_old_rooms();`
(ตั้งเป็น cron ได้ผ่าน Supabase → Integrations → Cron)
