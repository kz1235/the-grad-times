// ── JOB DETAIL ─────────────────────────
function selectJob(id){
  selectedId=id;
  // Search in both jobs and savedJobs
  const j=jobs.find(x=>x.id===id)||savedJobs.find(x=>x.id===id);
  if(!j)return;
  document.querySelectorAll('.jcard').forEach(c=>c.classList.remove('sel'));
  const card=document.getElementById('card-'+id);if(card){card.classList.add('sel');card.scrollIntoView({behavior:'smooth',block:'nearest'});}
  const vm=j.visa_sponsorship==='yes'?'This establishment confirms Skilled Worker visa sponsorship. Candidates of any immigration status are encouraged to apply.':j.visa_sponsorship==='no'?'This position requires prior right to work in the United Kingdom. Graduate Route holders may be eligible depending upon their circumstances.':'Visa sponsorship is not specified in the notice. Graduate Route holders may generally apply freely \u2014 correspondence with the employer is advised regarding Skilled Worker sponsorship.';
  const saved=isJobSaved(id);
  document.getElementById('detail-content').innerHTML=`<div>
    <div class="dp-kicker">${esc(j.type||'Position Vacant')}</div>
    <div class="dp-headline">${esc(j.title)}</div>
    <div class="dp-deck">${esc(j.company)}</div>
    <div class="dp-byline">Correspondent: ${esc(j.location)}${j.posted?' \u00b7 Received: '+esc(j.posted):''}</div>
    <div class="dp-actions">
      ${j.url?`<a href="${esc(j.url)}" target="_blank" rel="noopener" class="apply-link">Submit Application \u2197</a>`:''}
      <button class="btn-ghost dp-bookmark-btn" id="dp-bookmark" onclick="toggleBookmark('${esc(j.id)}')">${saved?'\u2605 Notice Saved':'\u2606 Save Notice'}</button>
    </div>
    <div class="dp-thick"></div><div style="height:1px;background:var(--border);margin-bottom:14px"></div>
    <div class="dp-sec-head">Notice</div>
    <p class="dp-body" style="margin-bottom:14px">${esc(j.summary)}</p>
    ${j.salary?`<p class="dp-body" style="margin-bottom:14px"><strong>Remuneration:</strong> ${esc(j.salary)}</p>`:''}
    <div class="dp-rule"></div>
    <div class="dp-sec-head">Visa Intelligence</div>
    <div class="visa-notice">${vm}</div>
    <div class="dp-rule"></div>
    <div class="dp-sec-head">Candidate Assessment</div>
    <label class="cv-label">Present your CV</label>
    <textarea class="cv-ta" id="cv-txt" placeholder="Paste your CV or principal qualifications herein\u2026"></textarea>
    <div class="act-row">
      <button class="btn-ink" id="ab" onclick="analyzeMatch('${esc(j.id)}')">Assess Suitability</button>
      <button class="btn-ghost" id="cb" onclick="generateCL('${esc(j.id)}')">Compose Letter</button>
    </div>
    <div id="match-out"></div>
  </div>`;
  const cvTextarea=document.getElementById('cv-txt');
  if(cvTextarea&&cvData.editedText){cvTextarea.value=cvData.editedText;}
  document.getElementById('detail-area').classList.add('open');
}

function closeDetail(){document.getElementById('detail-area').classList.remove('open');selectedId=null;document.querySelectorAll('.jcard').forEach(c=>c.classList.remove('sel'));}

// ── MATCH ANALYSIS ─────────────────────
async function analyzeMatch(id){
  const j=jobs.find(x=>x.id===id)||savedJobs.find(x=>x.id===id);
  const cv=document.getElementById('cv-txt').value.trim();
  if(!cv){document.getElementById('cv-txt').focus();toast('Please present your CV');return;}
  const btn=document.getElementById('ab');btn.disabled=true;btn.textContent='Assessing\u2026';
  try{
    const txt=await callClaude([{role:'user',content:`Position: ${j.title} at ${j.company}\nDescription: ${j.summary}\nVisa: ${j.visa_sponsorship}\n\nCurriculum Vitae:\n${cv}\n\nReturn assessment JSON only.`}],SYS_M);
    const a=parseJ(txt);if(!a)throw new Error('Assessment failed');
    document.getElementById('match-out').innerHTML=`<div class="match-box"><div class="m-score">${a.score}%</div><div class="m-level">${esc(a.level||'Assessment')}</div><div class="m-bar-bg"><div class="m-bar" style="width:${a.score}%"></div></div>${a.matching_skills?.length?`<div class="tag-row">${a.matching_skills.map(s=>`<span class="tg tg-y">${esc(s)}</span>`).join('')}</div>`:''}${a.gaps?.length?`<div class="tag-row">${a.gaps.map(g=>`<span class="tg tg-n">${esc(g)}</span>`).join('')}</div>`:''}${a.recommendation?`<div class="m-note">${esc(a.recommendation)}</div>`:''}</div>`;
  }catch(e){document.getElementById('match-out').innerHTML=`<p style="color:var(--dim);font-size:11px;font-style:italic;margin-top:10px">${esc(e.message)}</p>`;}
  btn.disabled=false;btn.textContent='Assess Suitability';
}

// ── COVER LETTER ───────────────────────
async function generateCL(id){
  const j=jobs.find(x=>x.id===id)||savedJobs.find(x=>x.id===id);
  const cv=document.getElementById('cv-txt')?.value?.trim()||'';
  const btn=document.getElementById('cb');btn.disabled=true;btn.textContent='Composing\u2026';
  try{
    const letter=await callClaude([{role:'user',content:`Position: ${j.title} at ${j.company}, ${j.location}\n${cv?'\nApplicant Background:\n'+cv:''}\n${j.visa_sponsorship==='yes'?'\nNote: applicant requires Skilled Worker visa sponsorship.':''}\nCompose a formal British cover letter.`}],SYS_CL);
    currentLetter=letter;document.getElementById('cl-body').textContent=letter;document.getElementById('cl-modal').classList.add('open');
  }catch(e){toast(e.message);}
  btn.disabled=false;btn.textContent='Compose Letter';
}
