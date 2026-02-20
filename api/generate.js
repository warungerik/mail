import * as cheerio from 'cheerio';

const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

async function _f(u, o, r = 5) {
  for (let i = 0, e; i < r; i++) {
    try {
      const res = await fetch(u, o);
      return o._t ? await res.text() : await res.json();
    } catch (err) { e = err.message; if (i === r - 1) throw new Error(e); }
  }
}

async function _v(u, d) {
  try {
    return await _f('https://generator.email/check_adres_validation3.php', {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ usr: u, dmn: d })
    });
  } catch (e) { return { err: e.message }; }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const html = await _f('https://generator.email/', { headers: H, cache: 'no-store', _t: 1 });
    const $ = cheerio.load(html);
    const em = $('#email_ch_text').text().trim();

    if (!em) return res.json({ success: false, result: 'Gagal generate email' });

    const [u, d] = em.split('@');
    const v = await _v(u, d);

    return res.json({
      success: true,
      result: {
        email: em,
        emailStatus: v.status || null,
        uptime: v.uptime || null,
        ...(v.err && { error: v.err })
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, result: e.message });
  }
}
