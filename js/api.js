// ── API ────────────────────────────────
async function callClaude(msgs,sys,ws=false,maxTokens=16000){
  const body={model:'claude-sonnet-4-20250514',max_tokens:maxTokens,system:sys,messages:msgs};
  if(ws)body.tools=[{type:'web_search_20250305',name:'web_search'}];
  const r=await fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify(body)});
  const d=await r.json();
  if(d.error)throw new Error(d.error.message);
  return d.content.filter(b=>b.type==='text').map(b=>b.text).join('\n');
}

function parseJ(txt){try{return JSON.parse(txt.trim())}catch{}const a=txt.match(/\[[\s\S]*\]/);if(a){try{return JSON.parse(a[0])}catch{}}const o=txt.match(/\{[\s\S]*\}/);if(o){try{return JSON.parse(o[0])}catch{}}return null;}

async function validateApiKey(key){
  try{
    const r=await fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1,messages:[{role:'user',content:'Hi'}]})});
    const d=await r.json();
    if(d.error&&d.error.type==='authentication_error')return false;
    return true;
  }catch(e){return true;} // fail open on network error
}

// ── SYSTEM PROMPTS ─────────────────────
const BILINGUAL_NOTE='\nThe candidate may have a bilingual CV (e.g., Chinese and English). Analyse ALL content regardless of language. Skills, qualifications, and experience listed in any language are equally valid.';

const SYS_S=`You are The Grad Times Employment Gazette, a UK job search service for international students. Search for real current UK job listings on Indeed UK, Reed.co.uk, LinkedIn, and Totaljobs.
Return ONLY a valid JSON array — no markdown, no explanation.
Each object: {"id":"1","title":"...","company":"...","location":"...","salary":"...","summary":"2-3 sentences.","url":"https://...","visa_sponsorship":"yes|no|unknown","posted":"...","type":"..."}
Return 7-10 jobs.`;

const SYS_CV_SEARCH=`You are The Grad Times, a UK employment specialist. A candidate has provided their CV.${BILINGUAL_NOTE}

First, silently analyse the CV to identify:
- Primary skills and technologies
- Years of experience level
- Most suitable job titles
- Preferred industries based on background

Then search for 7-10 real, current UK job listings that best match this candidate.
Search Indeed UK, Reed.co.uk, LinkedIn UK, Totaljobs.

Return ONLY a valid JSON array. Each object:
{"id":"1","title":"...","company":"...","location":"...","salary":"...","summary":"2-3 sentences.","url":"https://...","visa_sponsorship":"yes|no|unknown","posted":"...","type":"...","cv_match_reason":"One sentence: why this matches the candidate's background."}

The cv_match_reason field is required — always include it.`;

const SYS_M=`Analyze CV-job fit for an international graduate in the UK.${BILINGUAL_NOTE} Return ONLY JSON:
{"score":78,"level":"Commendable","matching_skills":["Python"],"gaps":["SQL"],"visa_note":"...","recommendation":"..."}`;

const SYS_CL=`Write a formal, professional UK cover letter in a slightly elevated register — as one might write in a quality British newspaper era. 3-4 paragraphs. Just the letter text.${BILINGUAL_NOTE} If the CV contains non-English text, the cover letter should still be written in English unless the user specifies otherwise.`;

const SYS_CV_IMPROVE=`You are a professional UK CV editor specialising in international graduates.${BILINGUAL_NOTE}
When given a CV and an instruction, return ONLY the improved CV text.
Preserve all factual information. Do not invent experience or qualifications.
Preserve bilingual content. Do not translate sections unless specifically instructed.
Keep formatting clean (no markdown symbols). Return plain text only.`;
