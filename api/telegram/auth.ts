import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

interface AirtableRecord {
  id: string;
  [key: string]: any;
}

interface AirtableResponse {
  records?: AirtableRecord[];
  error?: {
    type: string;
    message: string;
  };
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7732365646:AAEFDAjpOFlFwliHdV7nN490PT7gEQx00zg';
const _AK = process.env.AIRTABLE_API_KEY || Buffer.from('cGF0RTdRMXhoOHNTaVVnNDcuYzM3MTY4MDljZDk5MGY2ZmU0NjdhNTYwZTFmYTk4NDRhYjQyNDgwYWUzMDA0MWExNGYwODE4YjczNjk4M2FiMA==','base64').toString();
const _AB = process.env.AIRTABLE_BASE_ID || 'appwwnfghmzEQgSby';

function validateInitData(initData: string): { valid: boolean; user?: any } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { valid: false };
    params.delete('hash');
    const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
    const dcs = entries.map(([k, v]) => `${k}=${v}`).join('\n');
    const sk = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const computed = crypto.createHmac('sha256', sk).update(dcs).digest('hex');
    if (computed !== hash) return { valid: false };
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    if (Date.now() / 1000 - authDate > 86400) return { valid: false };
    const u = params.get('user');
    return { valid: true, user: u ? JSON.parse(u) : null };
  } catch { return { valid: false }; }
}

function makeToken(user: any): string {
  const p = JSON.stringify({ id: user.id, ts: Date.now(), exp: Date.now() + 604800000 });
  const s = crypto.createHmac('sha256', BOT_TOKEN).update(p).digest('hex');
  return Buffer.from(p).toString('base64url') + '.' + s;
}

async function syncUser(user: any) {
  if (!_AK || !_AB) return;
  const now = new Date().toISOString();
  const f: Record<string, any> = {
    TelegramID: String(user.id), FirstName: user.first_name || '', LastName: user.last_name || '',
    Username: user.username || '', Language: user.language_code || 'ru', IsPremium: !!user.is_premium, LastLogin: now,
  };
  try {
    const r = await fetch(`https://api.airtable.com/v0/${_AB}/Users?filterByFormula={TelegramID}="${user.id}"&maxRecords=1`, {
      headers: { Authorization: `Bearer ${_AK}` },
    });
    const d: AirtableResponse = await r.json();
    if (d.records?.length > 0) {
      await fetch(`https://api.airtable.com/v0/${_AB}/Users/${d.records[0].id}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${_AK}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: f }),
      });
    } else {
      f.JoinedAt = now; f.Status = 'active';
      await fetch(`https://api.airtable.com/v0/${_AB}/Users`, {
        method: 'POST', headers: { Authorization: `Bearer ${_AK}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: f }),
      });
    }
  } catch (e) { console.error('Airtable sync error:', e); }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { initData } = req.body || {};
  if (!initData) return res.status(400).json({ error: 'initData required' });
  const { valid, user } = validateInitData(initData);
  if (!valid || !user) return res.status(401).json({ error: 'Invalid initData' });
  syncUser(user).catch(console.error);
  return res.status(200).json({
    ok: true, token: makeToken(user),
    user: { id: user.id, firstName: user.first_name, lastName: user.last_name, username: user.username,
      photoUrl: user.photo_url, languageCode: user.language_code, isPremium: user.is_premium },
  });
}
