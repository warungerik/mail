import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';

const app = express();
app.use(cors());
app.use(express.json());

const scraper = {
    base: 'https://generator.email/',
    validate_path: 'check_adres_validation3.php',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    async _fetch(url, options) {
        const res = await fetch(url, options);
        return options._text ? await res.text() : await res.json();
    },
    async _validate(usr, dmn) {
        return await this._fetch(this.base + this.validate_path, {
            method: 'POST',
            headers: { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ usr, dmn }),
        });
    },
    async generate() {
        const html = await this._fetch(this.base, { headers: this.headers, _text: true });
        const $ = cheerio.load(html);
        const em = $('#email_ch_text').text().trim();
        const [usr, dmn] = em.split('@');
        const v = await this._validate(usr, dmn);
        return { success: true, result: { email: em, emailStatus: v.status, uptime: v.uptime } };
    },
    async inbox(email) {
        const [usr, dmn] = email.split('@');
        const v = await this._validate(usr, dmn);
        const html = await this._fetch(this.base, {
            headers: { ...this.headers, Cookie: `surl=${dmn}/${usr}` },
            _text: true
        });
        const $ = cheerio.load(html);
        const inbox = [];
        $('#email-table .e7m.row').each((_, el) => {
            const row = $(el);
            inbox.push({
                from: row.find('.e7m.col-md-9 span').eq(3).text().trim(),
                subject: row.find('h1').text().trim(),
                message: row.find('.e7m.mess_bodiyy').text().trim(),
                created: row.find('.e7m.tooltip').text().replace('Created: ', '').trim()
            });
        });
        return { success: true, result: { email, emailStatus: v.status, uptime: v.uptime, inbox } };
    }
};

app.get('/generate', async (req, res) => res.json(await scraper.generate()));
app.get('/inbox', async (req, res) => res.json(await scraper.inbox(req.query.email)));

export default app;