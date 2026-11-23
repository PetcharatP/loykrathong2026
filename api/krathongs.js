const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = url ? neon(url) : null;

let ready = null;
function ensureTable() {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS krathongs (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        message TEXT NOT NULL,
        style SMALLINT NOT NULL DEFAULT 0,
        ip_hash TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

const clean = (s, max) =>
  String(s ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const toItem = (r) => ({
  id: Number(r.id),
  name: r.name,
  message: r.message,
  style: Number(r.style),
  created: Number(r.created),
});

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (!sql) {
    return res.status(500).json({ error: 'ยังไม่ได้เชื่อมต่อ database (ไม่พบ DATABASE_URL)' });
  }

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, name, message, style,
               (EXTRACT(EPOCH FROM created_at) * 1000)::bigint AS created
        FROM krathongs
        ORDER BY id DESC
        LIMIT 80
      `;
      return res.status(200).json({ now: Date.now(), items: rows.map(toItem) });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      body = body || {};

      const name = clean(body.name, 24);
      const message = clean(body.message, 120);
      const style = Math.max(0, Math.min(4, parseInt(body.style, 10) || 0));

      if (!name || !message) {
        return res.status(400).json({ error: 'กรุณากรอกชื่อและข้อความ' });
      }

      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
        .split(',')[0]
        .trim();
      const ipHash = crypto.createHash('sha256').update(ip + '|loy-krathong').digest('hex').slice(0, 24);

      // กันสแปมแบบง่ายๆ: ไม่เกิน 3 ใบ / นาที / IP
      const recent = await sql`
        SELECT count(*)::int AS c FROM krathongs
        WHERE ip_hash = ${ipHash} AND created_at > now() - interval '1 minute'
      `;
      if (recent[0].c >= 3) {
        return res.status(429).json({ error: 'ลอยเร็วไปหน่อย รอสักครู่แล้วลองใหม่นะ' });
      }

      const rows = await sql`
        INSERT INTO krathongs (name, message, style, ip_hash)
        VALUES (${name}, ${message}, ${style}, ${ipHash})
        RETURNING id, name, message, style,
                  (EXTRACT(EPOCH FROM created_at) * 1000)::bigint AS created
      `;
      return res.status(201).json({ now: Date.now(), item: toItem(rows[0]) });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
  }
};
