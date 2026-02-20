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
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const email = req.query.email;
  if (!email || !email.includes('@')) {
    return res.json({ success: false, result: 'Parameter email tidak valid' });
  }

  const [u, d] = email.split('@');
  const v  = await _v(u, d);
  const ck = `surl=${d}/${u}`;

  let html;
  try {
    html = await _f('https://generator.email/', {
      headers: { ...H, Cookie: ck },
      cache: 'no-store',
      _t: 1
    });
  } catch (e) {
    return res.json({
      success: true,
      result: { email, emailStatus: v.status, uptime: v.uptime, inbox: [], error: e.message }
    });
  }

  if (html.includes('Email generator is ready')) {
    return res.json({
      success: true,
      result: { email, emailStatus: v.status, uptime: v.uptime, inbox: [] }
    });
  }

  const $ = cheerio.load(html);
  const c  = parseInt($('#mess_number').text()) || 0;
  const ib = [];

  if (c === 1) {
    const el = $('#email-table .e7m.row');
    const sp = el.find('.e7m.col-md-9 span');
    ib.push({
      from:    sp.eq(3).text().replace(/\(.*?\)/, '').trim(),
      to:      sp.eq(1).text(),
      created: el.find('.e7m.tooltip').text().replace('Created: ', '').trim(),
      subject: el.find('h1').text().trim(),
      message: el.find('.e7m.mess_bodiyy').text().trim()
    });
  } else if (c > 1) {
    const links = $('#email-table a').map((_, a) => $(a).attr('href')).get();
    for (const l of links) {
      try {
        const mhtml = await _f('https://generator.email/', {
          headers: { ...H, Cookie: `surl=${l.replace(/^\//, '')}` },
          cache: 'no-store',
          _t: 1
        });
        const m  = cheerio.load(mhtml);
        const sp = m('.e7m.col-md-9 span');
        ib.push({
          from:    sp.eq(3).text().replace(/\(.*?\)/, '').trim(),
          to:      sp.eq(1).text(),
          created: m('.e7m.tooltip').text().replace('Created: ', '').trim(),
          subject: m('h1').text().trim(),
          message: m('.e7m.mess_bodiyy').text().trim()
        });
      } catch (_) {}
    }
  }

  return res.json({
    success: true,
    result: { email, emailStatus: v.status, uptime: v.uptime, inbox: ib }
  });
}
