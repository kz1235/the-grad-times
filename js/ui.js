// ── UI UTILITIES ──────────────────────
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.style.display='block';clearTimeout(el._t);el._t=setTimeout(()=>el.style.display='none',2800);}
function esc(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── SETUP & AUTH ──────────────────────
async function saveKey(){
  const v=document.getElementById('api-key').value.trim();
  if(!v.startsWith('sk-')){toast('Invalid credentials');return;}
  const btn=document.querySelector('.sbtn');
  btn.disabled=true;btn.textContent='VERIFYING\u2026';
  const valid=await validateApiKey(v);
  if(!valid){
    toast('Invalid credentials \u2014 please verify your API key');
    btn.disabled=false;btn.textContent='SUBMIT CREDENTIALS';
    return;
  }
  API_KEY=v;localStorage.setItem('gr_key',v);
  document.getElementById('setup').style.display='none';
  btn.disabled=false;btn.textContent='SUBMIT CREDENTIALS';
}
function clearKey(){localStorage.removeItem('gr_key');API_KEY='';document.getElementById('setup').style.display='flex';}
function setVisa(m,btn){visaMode=m;document.querySelectorAll('.v-btn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');}
function resetApp(){
  document.getElementById('results-area').innerHTML='<div class="init"><div class="init-rule"></div><div class="init-title">Awaiting Your Inquiry</div><div class="init-rule"></div><div class="init-sub">Submit a position to view notices</div></div>';
  document.getElementById('detail-area').classList.remove('open');
  jobs=[];selectedId=null;cvSearchMode=false;
}

// ── DYNAMIC DATE ──────────────────────
function formatVictorianDate(){
  const d=new Date();
  const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const day=d.getDate();
  const suffix=(day===1||day===21||day===31)?'st':(day===2||day===22)?'nd':(day===3||day===23)?'rd':'th';
  return`${days[d.getDay()]}, ${day}${suffix} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ── MODALS ─────────────────────────────
function closeModal(){document.getElementById('cl-modal').classList.remove('open');}
function handleModalBg(e){if(e.target===document.getElementById('cl-modal'))closeModal();}
function copyLetter(){navigator.clipboard.writeText(currentLetter).then(()=>toast('Letter copied to clipboard'));}

function printLetter(){
  const w=window.open('','_blank','width=700,height=900');
  w.document.write(`<!DOCTYPE html><html><head><title>Letter of Application</title>
<link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Playfair+Display:wght@400;700&family=Noto+Serif+SC:wght@400&display=swap" rel="stylesheet">
<style>body{font-family:'IM Fell English','Noto Serif SC',serif;font-size:14px;line-height:1.9;color:#1a1208;padding:40px 60px;max-width:700px;margin:0 auto}
h1{font-family:'Playfair Display',serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#6b5a3e;border-bottom:2px solid #1a1208;padding-bottom:8px;margin-bottom:24px}
.letter{white-space:pre-wrap}
@media print{body{padding:20px}}</style></head>
<body><h1>Letter of Application</h1><div class="letter">${esc(currentLetter)}</div></body></html>`);
  w.document.close();
  setTimeout(()=>{w.print();},500);
}

function downloadLetterDoc(){
  const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Letter of Application</title>
<style>body{font-family:Georgia,serif;font-size:12pt;line-height:1.8;color:#1a1208;padding:40px}
h1{font-size:10pt;letter-spacing:2px;text-transform:uppercase;color:#6b5a3e;border-bottom:1px solid #1a1208;padding-bottom:6px;margin-bottom:20px}</style></head>
<body><h1>Letter of Application</h1><pre style="font-family:Georgia,serif;white-space:pre-wrap">${esc(currentLetter)}</pre></body></html>`;
  const blob=new Blob(['\ufeff'+html],{type:'application/msword'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='cover_letter.doc';
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Letter downloaded as .doc');
}

// ── SEARCH PROGRESS ───────────────────
const PROGRESS_MANUAL=[
  'Consulting the archives\u2026',
  'Searching Indeed UK notices\u2026',
  'Examining Reed.co.uk dispatches\u2026',
  'Reviewing LinkedIn correspondences\u2026',
  'Inspecting Totaljobs announcements\u2026',
  'Compiling the gazette\u2026',
  'Arranging notices by merit\u2026',
  'Preparing the final edition\u2026'
];
const PROGRESS_CV=[
  'Reading your CV\u2026',
  'Identifying principal qualifications\u2026',
  'Searching for matching positions\u2026',
  'Consulting employment registries\u2026',
  'Cross-referencing visa requirements\u2026',
  'Preparing tailored recommendations\u2026'
];

function startProgress(type){
  const msgs=type==='cv'?PROGRESS_CV:PROGRESS_MANUAL;
  let idx=0;
  const ra=document.getElementById('results-area');
  function render(){
    ra.innerHTML=`<div class="progress-area">
      <div class="progress-ornament">\u2767</div>
      <div class="progress-msg" style="animation:fdup 0.3s ease">${msgs[idx]}</div>
      <div class="progress-bar"><div class="progress-bar-inner"></div></div>
    </div>`;
  }
  render();
  const handle=setInterval(()=>{
    idx++;
    if(idx>=msgs.length)idx=msgs.length-1;
    render();
  },3000);
  return handle;
}
function stopProgress(handle){if(handle)clearInterval(handle);}

// ── SEARCH HISTORY UI ─────────────────
function renderSearchHistory(){
  const container=document.getElementById('search-history');
  if(!container)return;
  if(!searchHistory.length){container.innerHTML='';return;}
  const items=searchHistory.slice(0,5).map(h=>{
    const ago=timeAgo(h.timestamp);
    const label=esc(h.query)+(h.location&&h.location!=='United Kingdom'?' \u00b7 '+esc(h.location):'');
    return`<button class="hist-item" onclick="rerunSearch(${searchHistory.indexOf(h)})" title="${esc(h.query)} in ${esc(h.location)}">${label}<span class="hist-ago">${ago}</span></button>`;
  }).join('');
  container.innerHTML=`<div class="col-head" style="margin-top:18px">Previous Inquiries</div>${items}<button class="lf-link" onclick="clearSearchHistory()" style="margin-top:4px">Clear Record</button>`;
}

function rerunSearch(idx){
  const h=searchHistory[idx];if(!h)return;
  document.getElementById('q').value=h.query||'';
  document.getElementById('loc').value=h.location||'';
  document.getElementById('industry').value=h.industry||'';
  if(h.type==='cv'&&cvData.editedText){doCVSearch();}
  else{doSearch();}
}

function timeAgo(ts){
  const diff=Date.now()-ts;
  const mins=Math.floor(diff/60000);
  if(mins<1)return'just now';
  if(mins<60)return mins+'m ago';
  const hrs=Math.floor(mins/60);
  if(hrs<24)return hrs+'h ago';
  const days=Math.floor(hrs/24);
  if(days===1)return'Yesterday';
  return days+'d ago';
}

// ── SAVED JOBS UI ─────────────────────
function renderSavedCount(){
  const btn=document.getElementById('saved-btn');
  if(!btn)return;
  const n=savedJobs.length;
  btn.textContent=n?`Saved Notices (${n})`:'Saved Notices';
  btn.style.display=n?'block':'block';
}

function showSavedJobs(){
  const saved=getSavedJobs();
  const ra=document.getElementById('results-area');
  document.getElementById('detail-area').classList.remove('open');
  if(!saved.length){
    ra.innerHTML='<div class="init"><div class="init-rule"></div><div class="init-title">No Notices Preserved</div><div class="init-rule"></div><div class="init-sub">Bookmark positions to review later</div></div>';
    return;
  }
  // Temporarily set jobs to saved for detail panel to work
  jobs=saved;cvSearchMode=false;selectedId=null;
  ra.innerHTML=`<div class="rh"><div class="rh-eyebrow">Notices Preserved for Later Reference</div><div class="rh-count">${saved.length} Saved Position${saved.length>1?'s':''}</div></div><div class="jobs">${saved.map((j,i)=>renderCard(j,i+1,false)).join('')}</div>`;
}

function toggleBookmark(jobId,evt){
  if(evt)evt.stopPropagation();
  // Find the job in current jobs or savedJobs
  const job=jobs.find(j=>j.id===jobId)||savedJobs.find(j=>j.id===jobId);
  if(!job)return;
  if(isJobSaved(jobId)){unsaveJob(jobId);toast('Notice removed from saved');}
  else{saveJob(job);toast('Notice saved');}
  // Update the star icon
  const star=document.getElementById('star-'+jobId);
  if(star)star.textContent=isJobSaved(jobId)?'\u2605':'\u2606';
  // Update detail panel bookmark button if open
  const dpStar=document.getElementById('dp-bookmark');
  if(dpStar&&selectedId===jobId){
    dpStar.textContent=isJobSaved(jobId)?'\u2605 Notice Saved':'\u2606 Save Notice';
  }
  renderSavedCount();
}
