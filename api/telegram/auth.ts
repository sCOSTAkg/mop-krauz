import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || '';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || '';

function validateInitData(initData: string): { valid: boolean; user?: any } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { valid: false };

    params.delete('hash');
    const entries = Array.from(params.entries());
    entries.sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== hash) return { valid: false };

    // Check freshness (24 hours)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    if (Date.now() / 1000 - authDate > 86400) return { valid: false };

    const userStr = params.get('user');
    const user = userStr ? JSON.parse(userStr) : null;

    return { valid: true, user };
  } catch {
    return { valid: false };
  }
}

function generateToken(user: any): string {
  const payload = JSON.stringify({
    id: user.id,
    ts: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  const sig = crypto.createHmac('sha256', BOT_TOKEN).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64url') + '.' + sig;
}

async function upsertAirtable(user: any) {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) return;

  const now = new Date().toISOString();
  const fields: Record<string, any> = {
    TelegramID: String(user.id),
    FirstName: user.first_name || '',
    LastName: user.last_name || '',
    Username: user.username || '',
    Language: user.language_code || 'ru',
    IsPremium: !!user.is_premium,
    LastLogin: now,
  };

  try {
    // Check if user exists
    const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={TelegramID}="${user.id}"&maxRecords=1`;
    const existing = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    }).then(r => r.json());

    if (existing.records?.length > 0) {
      // Update
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users/${existing.records[0].id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      });
    } else {
      // Create
      fields.JoinedAt = now;
      fields.Status = 'active';
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      });
    }
  } catch (e) {
    console.error('Airtable upsert failed:', e);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — restrict to known origin
  const allowedOrigin = process.env.WEBAPP_URL || 'https://mopkrauz.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData } = req.body || {};
  if (!initData) return res.status(400).json({ error: 'initData required' });

  const { valid, user } = validateInitData(initData);
  if (!valid || !user) return res.status(401).json({ error: 'Invalid initData' });

  // Background Airtable sync
  upsertAirtable(user).catch(console.error);

  const token = generateToken(user);

  return res.status(200).json({
    ok: true,
    token,
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      photoUrl: user.photo_url,
      languageCode: user.language_code,
      isPremium: user.is_premium,
    },
  });
}
