import { Router } from 'express';
import supabase from '../db.js';

const router = Router();

// ─── CHANNEL ACCOUNTS CRUD ────────────────────

// GET /api/channels/accounts — List all connected channel accounts
router.get('/accounts', async (req, res) => {
  try {
    const { channel } = req.query;
    let query = supabase
      .from('channel_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (channel) query = query.eq('channel', channel);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ accounts: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channels/accounts — Connect a new channel account
router.post('/accounts', async (req, res) => {
  try {
    const { channel, account_name, config } = req.body;
    if (!channel || !account_name) {
      return res.status(400).json({ error: 'channel and account_name are required' });
    }

    const validChannels = ['whatsapp', 'telegram', 'discord', 'slack'];
    if (!validChannels.includes(channel)) {
      return res.status(400).json({ error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('channel_accounts')
      .insert({
        channel,
        account_name: account_name.trim(),
        config: config || {},
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/channels/accounts/:id — Update a channel account
router.put('/accounts/:id', async (req, res) => {
  try {
    const { account_name, config, is_active } = req.body;
    const id = Number(req.params.id);

    const updates = { updated_at: new Date().toISOString() };
    if (account_name !== undefined) updates.account_name = account_name.trim();
    if (config !== undefined) updates.config = config;
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    const { data, error } = await supabase
      .from('channel_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/channels/accounts/:id — Disconnect a channel account
router.delete('/accounts/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { error } = await supabase
      .from('channel_accounts')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ deleted: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── INBOUND MESSAGES ──────────────────────────

// GET /api/channels/inbox — List inbound messages
router.get('/inbox', async (req, res) => {
  try {
    const { channel, limit = 50, page = 1 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('inbound_messages')
      .select('*, channel_accounts(account_name, channel), leads(name, email)', { count: 'exact' });

    if (channel) query = query.eq('channel', channel);

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    const { data, count, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    res.json({
      messages: data || [],
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WEBHOOK ENDPOINTS (for receiving channel messages) ─────

// POST /api/channels/webhook/whatsapp — WhatsApp webhook
router.post('/webhook/whatsapp', async (req, res) => {
  try {
    const payload = req.body;

    // WhatsApp Cloud API sends verification challenge
    if (req.query['hub.mode'] === 'subscribe') {
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'flowreach-verify';
      if (req.query['hub.verify_token'] === verifyToken) {
        return res.status(200).send(req.query['hub.challenge']);
      }
      return res.sendStatus(403);
    }

    // Process incoming message
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (message) {
      const senderId = message.from || 'unknown';
      const senderName = change?.value?.contacts?.[0]?.profile?.name || senderId;
      const body = message.text?.body || message.caption || '';

      // Find account
      const { data: account } = await supabase
        .from('channel_accounts')
        .select('id')
        .eq('channel', 'whatsapp')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      // Try to match lead by phone-like fields in custom_fields
      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .or(`email.ilike.%${senderId}%`)
        .limit(1)
        .maybeSingle();

      await supabase.from('inbound_messages').insert({
        channel: 'whatsapp',
        channel_account_id: account?.id || null,
        sender_id: senderId,
        sender_name: senderName,
        body,
        raw_payload: payload,
        lead_id: lead?.id || null,
      });

      const io = req.app.get('io');
      if (io) io.emit('channel:inbound', { channel: 'whatsapp', sender: senderName, body });
    }

    res.sendStatus(200);
  } catch {
    res.sendStatus(200); // Always respond 200 to avoid retries
  }
});

// GET /api/channels/webhook/whatsapp — WhatsApp verification
router.get('/webhook/whatsapp', (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'flowreach-verify';
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === verifyToken) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});

// POST /api/channels/webhook/telegram — Telegram webhook
router.post('/webhook/telegram', async (req, res) => {
  try {
    const update = req.body;
    const message = update?.message;

    if (message) {
      const senderId = String(message.from?.id || 'unknown');
      const senderName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ') || senderId;
      const body = message.text || message.caption || '';

      const { data: account } = await supabase
        .from('channel_accounts')
        .select('id')
        .eq('channel', 'telegram')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      await supabase.from('inbound_messages').insert({
        channel: 'telegram',
        channel_account_id: account?.id || null,
        sender_id: senderId,
        sender_name: senderName,
        body,
        raw_payload: update,
        lead_id: null,
      });

      const io = req.app.get('io');
      if (io) io.emit('channel:inbound', { channel: 'telegram', sender: senderName, body });
    }

    res.sendStatus(200);
  } catch {
    res.sendStatus(200);
  }
});

// POST /api/channels/webhook/discord — Discord webhook
router.post('/webhook/discord', async (req, res) => {
  try {
    const payload = req.body;

    // Discord verification (PING)
    if (payload.type === 1) {
      return res.json({ type: 1 });
    }

    // MESSAGE_CREATE
    if (payload.type === 0 || payload.t === 'MESSAGE_CREATE') {
      const data = payload.d || payload;
      const senderId = data.author?.id || 'unknown';
      const senderName = data.author?.username || senderId;
      const body = data.content || '';

      const { data: account } = await supabase
        .from('channel_accounts')
        .select('id')
        .eq('channel', 'discord')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      await supabase.from('inbound_messages').insert({
        channel: 'discord',
        channel_account_id: account?.id || null,
        sender_id: senderId,
        sender_name: senderName,
        body,
        raw_payload: payload,
        lead_id: null,
      });

      const io = req.app.get('io');
      if (io) io.emit('channel:inbound', { channel: 'discord', sender: senderName, body });
    }

    res.sendStatus(200);
  } catch {
    res.sendStatus(200);
  }
});

// POST /api/channels/webhook/slack — Slack Events API
router.post('/webhook/slack', async (req, res) => {
  try {
    const payload = req.body;

    // Slack URL verification challenge
    if (payload.type === 'url_verification') {
      return res.json({ challenge: payload.challenge });
    }

    // Event callback
    if (payload.type === 'event_callback') {
      const event = payload.event;
      if (event?.type === 'message' && !event.bot_id) {
        const senderId = event.user || 'unknown';
        const body = event.text || '';

        const { data: account } = await supabase
          .from('channel_accounts')
          .select('id')
          .eq('channel', 'slack')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        await supabase.from('inbound_messages').insert({
          channel: 'slack',
          channel_account_id: account?.id || null,
          sender_id: senderId,
          sender_name: senderId,
          body,
          raw_payload: payload,
          lead_id: null,
        });

        const io = req.app.get('io');
        if (io) io.emit('channel:inbound', { channel: 'slack', sender: senderId, body });
      }
    }

    res.sendStatus(200);
  } catch {
    res.sendStatus(200);
  }
});

export default router;
