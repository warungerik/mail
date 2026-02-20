const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

async function _f(u, o, r = 3) {
  for (let i = 0, e; i < r; i++) {
    try {
      const res = await fetch(u, o);
      return o._t ? await res.text() : await res.json();
    } catch (err) { e = err.message; if (i === r - 1) throw new Error(e); }
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const email = req.query.email;
  if (!email || !email.includes('@')) {
    return res.json({ success: false, result: 'Parameter email tidak valid' });
  }

  const [u, d] = email.split('@');

  try {
    const v = await _f('https://generator.email/check_adres_validation3.php', {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ usr: u, dmn: d })
    });

    return res.json({
      success: true,
      result: {
        email,
        emailStatus: v.status || null,
        uptime: v.uptime || null,
        ...(v.err && { error: v.err })
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, result: e.message });
  }
}
