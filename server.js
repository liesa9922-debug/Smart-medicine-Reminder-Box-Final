const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'changeme';
const TW_SID = process.env.TWILIO_ACCOUNT_SID;
const TW_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TW_FROM = process.env.TWILIO_FROM_NUMBER;

let twilioClient = null;
if (TW_SID && TW_TOKEN) {
  try { twilioClient = require('twilio')(TW_SID, TW_TOKEN); } catch (e) { console.warn('Twilio client unavailable'); }
}

// No Firebase in this server version; Twilio-only path

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/api/notify', async (req, res) => {
  const key = req.header('X-API-KEY');
  if (!key || key !== API_KEY) return res.status(401).json({ error: 'Unauthorized: invalid API key' });

  const { phone, email, status, time } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Missing phone number' });

  const when = time ? new Date(time).toLocaleString() : new Date().toLocaleString();
  const message = `Patient has ${status} medication on ${when}.`;

  if (TW_SID && TW_TOKEN && TW_FROM && twilioClient) {
    try {
      const msg = await twilioClient.messages.create({ body: message, from: TW_FROM, to: phone });
      return res.json({ success: true, method: 'sms', sid: msg.sid });
    } catch (err) {
      console.error('Twilio error', err && err.message ? err.message : err);
      return res.status(500).json({ error: 'Failed to send SMS', details: err && err.message ? err.message : String(err) });
    }
  }

  return res.status(500).json({ error: 'Twilio not configured on server. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER.' });
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Smart MedBox notify server listening on http://localhost:${PORT}`));
