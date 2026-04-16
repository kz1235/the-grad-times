// ── CHAT ASSISTANT ─────────────────────
let chatHistory=[];
let chatOpen=false;

const SYS_CHAT=`You are the Grad Times President — the personal career advisor behind The Grad Times, a UK job search site for international graduates.

You have full awareness of everything happening in the app:
- The user's CV (if uploaded)
- Current search results (job listings)
- The user's search filters (position, location, industry, visa preference)
- Match analysis results and cover letters generated

Your role goes far beyond just suggesting searches. You are a full career companion:
1. Help users figure out what to search for — ask about skills, experience, preferences
2. After search results come in, review them and give advice on which roles are the best fit and why
3. Compare different positions based on the user's background
4. Suggest follow-up searches to explore related opportunities
5. Help users decide which jobs to apply to
6. Give tips on how to strengthen their application for specific roles
7. Answer questions about UK visa sponsorship, Graduate Route, job market trends

CRITICAL LANGUAGE RULE: Always reply in the SAME LANGUAGE the user is writing in. If the user writes in Chinese, reply in Chinese. If in English, reply in English. Match their language exactly. However, the search query/location/industry fields must ALWAYS be in English regardless of conversation language.

IMPORTANT: Always respond with valid JSON in this exact format:
{"reply":"Your conversational message to the user (in the user's language)","search":null}

When you want to suggest a search, use:
{"reply":"Your message explaining the suggestion (in the user's language)","search":{"query":"English job title keywords","location":"English city or region","industry":"industry category or empty string"}}

Industry must be one of: Technology, Finance & Banking, Consulting, Healthcare, Engineering, Marketing & PR, Education, Legal, Retail & FMCG, Media & Creative, or empty string for all.

Keep replies concise, warm and professional. You are knowledgeable about the UK graduate job market.`;

function getAppContext(){
  let ctx='';
  // CV info
  if(cvData.editedText){
    ctx+=`\n\n[USER'S CV on file: "${cvData.filename}"]\n${cvData.editedText.substring(0,1500)}`;
    if(cvData.editedText.length>1500)ctx+='...(truncated)';
  }
  // Current search results
  if(jobs.length){
    ctx+=`\n\n[CURRENT SEARCH RESULTS: ${jobs.length} jobs found]`;
    jobs.forEach((j,i)=>{
      ctx+=`\n${i+1}. ${j.title} at ${j.company} — ${j.location}${j.salary?' — '+j.salary:''}${j.visa_sponsorship==='yes'?' [Sponsors visa]':''}`;
      if(j.cv_match_reason)ctx+=` | Match: ${j.cv_match_reason}`;
    });
  }
  // Search filters
  const q=document.getElementById('q')?.value;
  const loc=document.getElementById('loc')?.value;
  const ind=document.getElementById('industry')?.value;
  if(q||loc||ind){
    ctx+=`\n\n[CURRENT SEARCH FILTERS: position="${q||''}", location="${loc||''}", industry="${ind||''}", visa="${visaMode}"]`;
  }
  // Saved jobs
  if(savedJobs.length){
    ctx+=`\n\n[SAVED JOBS: ${savedJobs.length}]`;
    savedJobs.forEach((j,i)=>{ctx+=`\n- ${j.title} at ${j.company}`;});
  }
  return ctx;
}

function toggleChat(){
  chatOpen=!chatOpen;
  const panel=document.getElementById('chat-panel');
  const bubble=document.getElementById('chat-bubble');
  const icon=document.getElementById('chat-bubble-icon');
  if(chatOpen){
    panel.classList.add('open');
    bubble.classList.add('active');
    icon.src='/img/chat-icon.png';
    if(!chatHistory.length){
      chatHistory.push({role:'assistant',content:JSON.stringify({reply:"Hello! I'm the Grad Times President \u2014 your personal career advisor. I can see everything in the app: your CV, search results, saved jobs. Tell me what you're looking for, or ask me about any of the positions you've found!",search:null})});
      renderChatMessages();
    }
    setTimeout(()=>document.getElementById('chat-input').focus(),100);
  }else{
    panel.classList.remove('open');
    bubble.classList.remove('active');
    icon.src='/img/chat-bubble.svg';
  }
}

function renderChatMessages(){
  const container=document.getElementById('chat-messages');
  container.innerHTML=chatHistory.map(m=>{
    if(m.role==='user'){
      return`<div class="chat-msg chat-user"><div class="chat-bubble-msg">${esc(m.content)}</div></div>`;
    }else{
      let parsed;
      try{parsed=JSON.parse(m.content);}catch{parsed={reply:m.content,search:null};}
      let html=`<div class="chat-msg chat-ai"><img src="/img/chat-icon.png" class="chat-msg-avatar"><div class="chat-bubble-msg">${esc(parsed.reply)}`;
      if(parsed.search){
        const s=parsed.search;
        html+=`<button class="chat-search-btn" onclick="applyChatSearch('${esc(s.query)}','${esc(s.location||'')}','${esc(s.industry||'')}')">Search: ${esc(s.query)}${s.location?' in '+esc(s.location):''} \u2192</button>`;
      }
      html+=`</div></div>`;
      return html;
    }
  }).join('');
  container.scrollTop=container.scrollHeight;
}

async function sendChatMessage(){
  const input=document.getElementById('chat-input');
  const text=input.value.trim();
  if(!text)return;
  input.value='';
  chatHistory.push({role:'user',content:text});
  renderChatMessages();
  const container=document.getElementById('chat-messages');
  container.innerHTML+=`<div class="chat-msg chat-ai" id="chat-typing"><img src="/img/chat-icon.png" class="chat-msg-avatar"><div class="chat-bubble-msg chat-typing-dots">\u2026</div></div>`;
  container.scrollTop=container.scrollHeight;
  try{
    // Build messages with app context injected into the latest user message
    const appCtx=getAppContext();
    const msgs=chatHistory.map((m,i)=>{
      if(m.role==='user'){
        let content=m.content;
        // Inject context into the latest user message
        if(i===chatHistory.length-1&&appCtx){
          content+=`\n\n---\n[APP CONTEXT — this is automatically injected, not typed by the user]${appCtx}`;
        }
        return{role:'user',content:content};
      }
      let parsed;
      try{parsed=JSON.parse(m.content);}catch{parsed={reply:m.content};}
      return{role:'assistant',content:parsed.reply||m.content};
    });
    const raw=await callClaude(msgs,SYS_CHAT,false,2000);
    const typing=document.getElementById('chat-typing');
    if(typing)typing.remove();
    chatHistory.push({role:'assistant',content:raw});
    renderChatMessages();
  }catch(e){
    const typing=document.getElementById('chat-typing');
    if(typing)typing.remove();
    chatHistory.push({role:'assistant',content:JSON.stringify({reply:'Sorry, something went wrong: '+e.message,search:null})});
    renderChatMessages();
  }
}

function applyChatSearch(query,location,industry){
  document.getElementById('q').value=query;
  if(location)document.getElementById('loc').value=location;
  if(industry)document.getElementById('industry').value=industry;
  toggleChat();
  doSearch();
}

document.addEventListener('keydown',function(e){
  if(e.key==='Enter'&&document.activeElement===document.getElementById('chat-input')){
    sendChatMessage();
  }
});
