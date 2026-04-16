// ── SEARCH: MANUAL ─────────────────────
async function doSearch(){
  const q=document.getElementById('q').value.trim();
  const loc=document.getElementById('loc').value.trim()||'United Kingdom';
  const ind=document.getElementById('industry').value;
  if(!q){document.getElementById('q').focus();return;}
  const btn=document.getElementById('go-btn');
  btn.disabled=true;btn.textContent='Searching Archives\u2026';
  document.getElementById('detail-area').classList.remove('open');
  cvSearchMode=false;
  const handle=startProgress('manual');
  const vp=visaMode==='graduate'?'Prioritise positions open to Graduate Route visa holders.':visaMode==='skilled'?'Only include positions that explicitly offer Skilled Worker visa sponsorship.':'Include all positions.';
  try{
    const txt=await callClaude([{role:'user',content:`Locate ${q} positions in ${loc}${ind?' within the '+ind+' trade':''}.
${vp}
Search Indeed UK, Reed.co.uk, LinkedIn UK, Totaljobs. Return 7-10 real current listings as JSON array.`}],SYS_S,true);
    stopProgress(handle);
    jobs=(parseJ(txt)||[]).map((j,i)=>({...j,id:j.id||String(i+1)}));
    if(!jobs.length)throw new Error('No notices found');
    const vl=visaMode==='graduate'?' \u2014 Graduate Route Eligible':visaMode==='skilled'?' \u2014 Sponsorship Available':'';
    const ra=document.getElementById('results-area');
    ra.innerHTML=`<div class="rh"><div class="rh-eyebrow">Positions Vacant</div><div class="rh-count">${jobs.length} Notices for ${esc(q)} \u00b7 ${esc(loc)}${vl}</div></div><div class="jobs">${jobs.map((j,i)=>renderCard(j,i+1,false)).join('')}</div>`;
    addSearchHistory({query:q,location:loc,industry:ind,visaMode:visaMode,timestamp:Date.now(),type:'manual'});
    renderSearchHistory();
  }catch(e){
    stopProgress(handle);
    document.getElementById('results-area').innerHTML=`<div style="padding:40px 0;font-family:'Playfair Display',serif;font-style:italic;color:var(--dim)">${esc(e.message)}</div>`;
  }
  btn.disabled=false;btn.textContent='Despatch Inquiry \u2192';
}

// ── SEARCH: CV-BASED ───────────────────
async function doCVSearch(){
  if(!cvData.editedText){toast('No CV on record');return;}
  const btn=document.getElementById('cv-go-btn');
  btn.disabled=true;btn.textContent='Analysing Your Record\u2026';
  document.getElementById('detail-area').classList.remove('open');
  cvSearchMode=true;
  const handle=startProgress('cv');
  const vp=visaMode==='graduate'?'Prioritise positions open to Graduate Route visa holders.':visaMode==='skilled'?'Only include positions that explicitly offer Skilled Worker visa sponsorship.':'Include all positions.';
  const loc=document.getElementById('loc').value.trim();
  const locNote=loc?`\nPreferred location: ${loc}`:'';
  try{
    const txt=await callClaude([{role:'user',content:`Here is the candidate's CV:\n\n${cvData.editedText}\n${locNote}\n${vp}\n\nFind 7-10 matching UK jobs.`}],SYS_CV_SEARCH,true);
    stopProgress(handle);
    jobs=(parseJ(txt)||[]).map((j,i)=>({...j,id:j.id||String(i+1)}));
    if(!jobs.length)throw new Error('No suitable notices found');
    if(jobs[0]&&jobs[0].title){
      const qInput=document.getElementById('q');
      if(!qInput.value.trim())qInput.value=jobs[0].title;
    }
    const ra=document.getElementById('results-area');
    ra.innerHTML=`<div class="rh"><div class="rh-eyebrow">Positions Matched to Your Record</div><div class="rh-count">${jobs.length} Notices Suited to Your Background</div></div><div class="jobs">${jobs.map((j,i)=>renderCard(j,i+1,true)).join('')}</div>`;
    addSearchHistory({query:'[CV-Based Search]',location:loc||'United Kingdom',industry:'',visaMode:visaMode,timestamp:Date.now(),type:'cv'});
    renderSearchHistory();
  }catch(e){
    stopProgress(handle);
    document.getElementById('results-area').innerHTML=`<div style="padding:40px 0;font-family:'Playfair Display',serif;font-style:italic;color:var(--dim)">${esc(e.message)}</div>`;
  }
  btn.disabled=false;btn.textContent='Discover Positions by Record \u2192';
}

// ── RENDER ─────────────────────────────
function renderCard(j,n,showMatchReason){
  let matchHtml='';
  if(showMatchReason&&j.cv_match_reason){
    matchHtml=`<div class="j-match-reason">${esc(j.cv_match_reason)}</div>`;
  }
  const saved=isJobSaved(j.id);
  const star=`<span class="j-star" id="star-${j.id}" onclick="toggleBookmark('${j.id}',event)" title="${saved?'Remove from saved':'Save notice'}">${saved?'\u2605':'\u2606'}</span>`;
  return`<div class="jcard${j.id===selectedId?' sel':''}" id="card-${j.id}" onclick="selectJob('${j.id}')"><div class="j-num">${n}</div><div class="j-body"><div class="j-top"><div class="j-title">${esc(j.title)}</div>${star}${vbadge(j.visa_sponsorship)}</div><div class="j-byline">${esc(j.company)} \u2014 ${esc(j.location)}</div><div class="j-meta"><span>${j.salary?esc(j.salary):''}</span>${j.type?`<span class="bullet">\u00b7</span><span>${esc(j.type)}</span>`:''}${j.posted?`<span class="bullet">\u00b7</span><span>${esc(j.posted)}</span>`:''}</div>${matchHtml}</div></div>`;
}

function vbadge(v){if(v==='yes')return'<span class="vbadge vby">Sponsors</span>';if(v==='no')return'<span class="vbadge vbn">Right to Work</span>';return'<span class="vbadge vbu">Grad Route</span>';}
