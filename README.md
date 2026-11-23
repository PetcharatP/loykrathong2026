# ลอยกระทงพิกเซล 🪷

เว็บลอยกระทงออนไลน์สไตล์พิกเซล — ใส่ชื่อ + ข้อความ แล้วทุกคนเห็นกระทงของกันและกัน

## โครงสร้าง

```
public/index.html     หน้าเว็บ (Canvas พิกเซล + ฟอร์ม)
api/krathongs.js      GET = ดึงกระทงล่าสุด 80 ใบ / POST = ลอยกระทงใหม่
package.json          dependency: @neondatabase/serverless
```

## ดีพลอยบน Vercel

1. push โฟลเดอร์นี้ขึ้น GitHub แล้ว Import เข้า Vercel (Framework Preset: **Other**)
2. ในโปรเจกต์ไปที่ **Storage** → เลือก **Neon (Postgres)** จาก Marketplace → Create แล้ว **Connect to Project**
   (ระบบจะเพิ่ม env `DATABASE_URL` ให้อัตโนมัติ)
3. กด **Redeploy** หนึ่งครั้ง — ตารางจะถูกสร้างเองตอนมีคนเรียก API ครั้งแรก

## รันในเครื่อง

```bash
npm i -g vercel
npm install
vercel link
vercel env pull .env.local
vercel dev
```

## ปรับแต่ง

- จำนวนกระทงที่แสดง: `LIMIT 80` ใน `api/krathongs.js`
- จำกัดการสแปม: 3 ใบ/นาที/IP (แก้ที่เลข `3` ใน `api/krathongs.js`)
- สีกระทง: `PALETTES` ใน `public/index.html`
