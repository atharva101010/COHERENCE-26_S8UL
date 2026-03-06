import Groq from 'groq-sdk';
import supabase from './db.js';

// ──────────────────────────────────────────────
// Groq client (lazy-initialized with credential)
// ──────────────────────────────────────────────

async function getGroqClient(credentialId) {
  let apiKey = process.env.GROQ_API_KEY || null;

  if (credentialId) {
    const { data: cred, error } = await supabase
      .from('credentials')
      .select('*')
      .eq('id', Number(credentialId))
      .single();

    if (!error && cred) {
      const config = typeof cred.config === 'string' ? JSON.parse(cred.config) : (cred.config || {});
      apiKey = config.apiKey || config.api_key || apiKey;
    }
  }

  if (!apiKey) return null;
  return new Groq({ apiKey });
}

// ──────────────────────────────────────────────
// Template variable replacement
// ──────────────────────────────────────────────

function replaceVariables(template, lead) {
  if (!template) return '';
  return template
    .replace(/\{\{name\}\}/gi, lead.name || 'there')
    .replace(/\{\{email\}\}/gi, lead.email || '')
    .replace(/\{\{company\}\}/gi, lead.company || 'your company')
    .replace(/\{\{title\}\}/gi, lead.title || 'professional');
}

// ──────────────────────────────────────────────
// Mock data for when no API key is available
// ──────────────────────────────────────────────

function generateMockEmail(lead, prompt, tone) {
  const toneMap = {
    professional: 'Professional',
    friendly: 'Friendly',
    casual: 'Casual',
    formal: 'Formal',
    persuasive: 'Persuasive',
  };
  const toneLabel = toneMap[tone] || 'Professional';
  const name = lead.name || 'there';
  const company = lead.company || 'your company';

  const templates = [
    {
      subject: `Quick question about ${company}`,
      body: `Hi ${name},\n\nI came across ${company} and was impressed by the work your team is doing. I'd love to connect and share how FlowReach AI could help streamline your outreach.\n\nWould you have 15 minutes this week for a quick chat?\n\nBest regards,\nFlowReach AI Team`,
    },
    {
      subject: `Idea for ${company}'s growth`,
      body: `Hello ${name},\n\nI noticed ${company} has been expanding rapidly — congratulations! We've helped similar teams automate their lead outreach and increase conversion rates by 40%.\n\nI'd love to show you a quick demo. Are you free for a brief call?\n\nCheers,\nFlowReach AI Team`,
    },
    {
      subject: `${name}, let's connect`,
      body: `Hey ${name},\n\nI've been following ${company}'s journey and think there's a great fit between what you're building and our AI-powered outreach platform.\n\nNo pressure — just thought it might be worth a conversation. Let me know if you're interested!\n\nWarm regards,\nFlowReach AI Team`,
    },
  ];

  return templates.map((t, idx) => ({
    id: idx + 1,
    lead: { name: lead.name, email: lead.email, company: lead.company },
    subject: t.subject,
    body: t.body,
    tone: toneLabel,
    source: 'mock',
  }));
}

// ──────────────────────────────────────────────
// Generate a single AI message for a lead
// ──────────────────────────────────────────────

async function generateMessage({ lead, prompt, tone, maxLength, credentialId, model, companyName, senderName, industry, painPoints, callToAction, signature, language, messageType }) {
  const filledPrompt = replaceVariables(prompt, lead);

  const groq = await getGroqClient(credentialId);
  if (!groq) {
    const mockResults = generateMockEmail(lead, prompt, tone);
    return mockResults[0];
  }

  const personalizationContext = [
    companyName ? `Sender's company: ${companyName}` : '',
    senderName ? `Sender's name: ${senderName}` : '',
    industry ? `Target industry: ${industry}` : '',
    painPoints ? `Key pain points to address: ${painPoints}` : '',
    callToAction ? `Call to action: ${callToAction}` : '',
    signature ? `Email signature: ${signature}` : '',
    language ? `Language: ${language}` : 'Language: English',
    messageType ? `Message type: ${messageType}` : 'Message type: outreach email',
  ].filter(Boolean).join('\n');

  const systemPrompt = `You are an expert email copywriter specializing in personalized outreach. Write a highly personalized ${messageType || 'outreach email'}.

Personalization Context:
${personalizationContext}

Tone: ${tone || 'professional'}.
Maximum length: ${maxLength || 200} words.

Rules:
- Use the recipient's name naturally in the greeting
- Reference their company and role specifically
- Address their pain points if provided
- Include a clear call-to-action
- Sign off with the sender's name/signature if provided
- Make it feel genuinely personal, not templated
- Match the specified tone precisely

Return ONLY a JSON object with "subject" and "body" fields — no markdown, no code fences, no extra text.`;

  const completion = await groq.chat.completions.create({
    model: model || 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: filledPrompt },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  });

  const raw = completion.choices[0]?.message?.content || '';
  let parsed;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { subject: 'Follow up', body: raw };
  } catch {
    parsed = { subject: 'Follow up', body: raw };
  }

  return {
    id: 1,
    lead: { name: lead.name, email: lead.email, company: lead.company },
    subject: parsed.subject,
    body: parsed.body,
    tone: tone || 'professional',
    source: 'groq',
    model: model || 'llama-3.3-70b-versatile',
  };
}

// ──────────────────────────────────────────────
// Preview: generate messages for multiple leads
// ──────────────────────────────────────────────

async function previewMessages({ leads, prompt, tone, maxLength, credentialId, model, companyName, senderName, industry, painPoints, callToAction, signature, language, messageType }) {
  const groq = await getGroqClient(credentialId);

  if (!groq) {
    return leads.flatMap((lead) => generateMockEmail(lead, prompt, tone).slice(0, 1));
  }

  const results = [];
  for (const lead of leads.slice(0, 5)) {
    const result = await generateMessage({ lead, prompt, tone, maxLength, credentialId, model, companyName, senderName, industry, painPoints, callToAction, signature, language, messageType });
    results.push({ ...result, id: results.length + 1 });
  }
  return results;
}

export { generateMessage, previewMessages, replaceVariables, generateMockEmail };
