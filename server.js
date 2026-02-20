/*
  server.js — Tempbox Backend
  Jalankan: node server.js
  Requires: npm install express cheerio cors
*/

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

// Sajikan file HTML statis dari folder yang sama
app.use(express.static(__dirname));

/* ─────────────────────────────────────────────
   SCRAPER (dari generatorEmail)
───────────────────────────────────────────── */
const scraper = {
    base: 'https://generator.email/',
    validate_path: 'check_adres_validation3.php',

    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    },

    async _fetch(url, options, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(url, options);
                if (options._text) return await res.text();
                return await res.json();
            } catch (err) {
                if (i === retries - 1) throw err;
                await new Promise(r => setTimeout(r, 800 * (i + 1)));
            }
        }
    },

    async _validate(usr, dmn) {
        try {
            return await this._fetch(this.base + this.validate_path, {
                method: 'POST',
                headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ usr, dmn }),
            });
        } catch (e) {
            return { err: e.message };
        }
    },

    _split(email) {
        return email?.includes('@') ? email.split('@') : null;
    },

    async generate() {
        try {
            const html = await this._fetch(this.base, {
                headers: this.headers, cache: 'no-store', _text: true
            });
            const $ = cheerio.load(html);
            const em = $('#email_ch_text').text().trim();

            if (!em) return { success: false, result: 'Gagal mengambil email dari generator.email' };

            const [usr, dmn] = this._split(em);
            const v = await this._validate(usr, dmn);

            return {
                success: true,
                result: {
                    email: em,
                    emailStatus: v.status || null,
                    uptime: v.uptime || null,
                    ...(v.err && { error: v.err }),
                }
            };
        } catch (e) {
            return { success: false, result: e.message };
        }
    },

    async validate(email) {
        const p = this._split(email);
        if (!p) return { success: false, result: 'Email tidak valid' };

        const [usr, dmn] = p;
        const v = await this._validate(usr, dmn);

        return {
            success: true,
            result: {
                email,
                emailStatus: v.status || null,
                uptime: v.uptime || null,
                ...(v.err && { error: v.err }),
            }
        };
    },

    async inbox(email) {
        const p = this._split(email);
        if (!p) return { success: false, result: 'Email tidak valid' };

        const [usr, dmn] = p;
        const v = await this._validate(usr, dmn);
        const ck = `surl=${dmn}/${usr}`;

        let html;
        try {
            html = await this._fetch(this.base, {
                headers: { ...this.headers, Cookie: ck },
                cache: 'no-store',
                _text: true,
            });
        } catch (e) {
            return {
                success: true,
                result: { email, emailStatus: v.status, uptime: v.uptime, inbox: [], error: e.message }
            };
        }

        if (html.includes('Email generator is ready')) {
            return {
                success: true,
                result: { email, emailStatus: v.status, uptime: v.uptime, inbox: [] }
            };
        }

        const $ = cheerio.load(html);
        const count = parseInt($('#mess_number').text()) || 0;
        const inbox = [];

        if (count === 1) {
            const el = $('#email-table .e7m.row');
            const sp = el.find('.e7m.col-md-9 span');
            inbox.push({
                from: sp.eq(3).text().replace(/\(.*?\)/, '').trim(),
                to: sp.eq(1).text(),
                created: el.find('.e7m.tooltip').text().replace('Created: ', '').trim(),
                subject: el.find('h1').text().trim(),
                message: el.find('.e7m.mess_bodiyy').text().trim(),
            });
        } else if (count > 1) {
            const links = $('#email-table a').map((_, a) => $(a).attr('href')).get();
            for (const link of links) {
                try {
                    const mhtml = await this._fetch(this.base, {
                        headers: { ...this.headers, Cookie: `surl=${link.replace(/^\//, '')}` },
                        cache: 'no-store',
                        _text: true,
                    });
                    const m = cheerio.load(mhtml);
                    const sp = m('.e7m.col-md-9 span');
                    inbox.push({
                        from: sp.eq(3).text().replace(/\(.*?\)/, '').trim(),
                        to: sp.eq(1).text(),
                        created: m('.e7m.tooltip').text().replace('Created: ', '').trim(),
                        subject: m('h1').text().trim(),
                        message: m('.e7m.mess_bodiyy').text().trim(),
                    });
                } catch (_) { }
            }
        }

        return {
            success: true,
            result: { email, emailStatus: v.status, uptime: v.uptime, inbox }
        };
    }
};

/* ─────────────────────────────────────────────
   ROUTES
───────────────────────────────────────────── */

// GET /generate
app.get('/generate', async (req, res) => {
    console.log('[GET] /generate');
    const result = await scraper.generate();
    res.json(result);
});

// GET /inbox?email=...
app.get('/inbox', async (req, res) => {
    const email = req.query.email;
    console.log(`[GET] /inbox?email=${email}`);
    if (!email) return res.json({ success: false, result: 'Parameter email diperlukan' });
    const result = await scraper.inbox(email);
    res.json(result);
});

// GET /validate?email=...
app.get('/validate', async (req, res) => {
    const email = req.query.email;
    console.log(`[GET] /validate?email=${email}`);
    if (!email) return res.json({ success: false, result: 'Parameter email diperlukan' });
    const result = await scraper.validate(email);
    res.json(result);
});

// Health check
app.get('/health', (_, res) => res.json({ ok: true, time: new Date().toISOString() }));

/* ─────────────────────────────────────────────
   START
───────────────────────────────────────────── */
app.listen(PORT, () => {
    console.log(`\n🚀 Tempbox server berjalan di http://localhost:${PORT}`);
    console.log(`   Buka browser ke http://localhost:${PORT}/tempbox.html\n`);
});