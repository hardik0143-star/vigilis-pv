export const maxDuration = 60;
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({error:'AI service is not configured. Add ANTHROPIC_API_KEY in Vercel Environment Variables.'});
  try {
    const body = req.body || {};
    const payload = {
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: body.max_tokens || 1600,
      system: body.system || 'You are Vigilis AI, an enterprise pharmacovigilance assistant. Human reviewers remain accountable for safety and regulatory decisions. Do not invent facts, citations, regulatory requirements, or patient data.',
      messages: body.messages || [{role:'user', content:String(body.prompt || '')}],
    };
    if (body.useWebSearch) payload.tools = [{type:'web_search_20250305', name:'web_search'}];
    const r = await fetch('https://api.anthropic.com/v1/messages', {method:'POST', headers:{'content-type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'}, body:JSON.stringify(payload)});
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({error:data?.error?.message || 'Anthropic request failed'});
    const text = (data.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n').trim();
    return res.status(200).json({text});
  } catch(e){ return res.status(500).json({error:e.message || 'AI request failed'}); }
}
