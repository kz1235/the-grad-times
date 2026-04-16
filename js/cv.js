// ── CV: UPLOAD & EXTRACT ───────────────
async function extractPDF(file){
  const arrayBuffer=await file.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:arrayBuffer}).promise;
  let text='';
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const content=await page.getTextContent();
    // Smart join: avoid inserting spaces between CJK characters
    const items=content.items;
    let line='';
    for(let k=0;k<items.length;k++){
      const str=items[k].str;
      if(!str)continue;
      if(line&&str){
        const lastChar=line[line.length-1];
        const firstChar=str[0];
        const isCJK=c=>c&&c.charCodeAt(0)>0x2E80;
        if(isCJK(lastChar)&&isCJK(firstChar)){
          line+=str;
        }else{
          line+=' '+str;
        }
      }else{
        line+=str;
      }
    }
    text+=line+'\n';
  }
  return text.trim();
}

async function extractDOCX(file){
  const arrayBuffer=await file.arrayBuffer();
  const result=await mammoth.extractRawText({arrayBuffer});
  return result.value.trim();
}

async function handleCVUpload(event){
  const file=event.target.files[0];
  if(!file)return;
  const ext=file.name.split('.').pop().toLowerCase();
  const dropZone=document.getElementById('cv-drop');
  dropZone.textContent='Consulting the Archives...';
  dropZone.style.pointerEvents='none';
  try{
    let text='';
    if(ext==='pdf'){text=await extractPDF(file);}
    else if(ext==='docx'){text=await extractDOCX(file);}
    else if(ext==='txt'){text=await file.text();}
    else{throw new Error('Unsupported format');}
    if(!text.trim())throw new Error('No text could be extracted');
    cvData={filename:file.name,text:text.trim(),editedText:text.trim()};
    saveCV();
    renderCVUI();
    toast('Document on Record');
  }catch(e){
    toast('Extraction failed: '+e.message);
    renderCVUI();
  }
  event.target.value='';
}

function renderCVUI(){
  const container=document.getElementById('cv-ui');
  if(cvData.text){
    container.innerHTML=`
      <div class="cv-loaded-info">
        <span class="cv-filename">\u2713 ${esc(cvData.filename)}</span>
        <button class="cv-action-btn" onclick="openCVEditor()">Amend Record</button>
        <button class="cv-action-btn" onclick="removeCV()">Withdraw Document</button>
      </div>`;
    renderSearchButtons(true);
  }else{
    container.innerHTML=`
      <div class="cv-upload-zone" id="cv-drop" onclick="document.getElementById('cv-file').click()">
        Present Your Document
        <br><span style="font-size:9px;letter-spacing:1px;color:var(--dim)">.pdf \u00b7 .docx \u00b7 .txt</span>
      </div>
      <input type="file" id="cv-file" accept=".pdf,.docx,.txt" style="display:none" onchange="handleCVUpload(event)">`;
    renderSearchButtons(false);
  }
}

function renderSearchButtons(hasCv){
  const container=document.getElementById('search-buttons');
  if(hasCv){
    container.innerHTML=`
      <button class="cv-go-btn" id="cv-go-btn" onclick="doCVSearch()">Discover Positions by Record \u2192</button>
      <div class="cv-search-divider">\u2014 or search manually \u2014</div>
      <button class="go-btn secondary" id="go-btn" onclick="doSearch()">Despatch Inquiry \u2192</button>`;
  }else{
    container.innerHTML=`
      <button class="go-btn" id="go-btn" onclick="doSearch()">Despatch Inquiry \u2192</button>`;
  }
}

// ── CV: EDITOR ─────────────────────────
function openCVEditor(){
  document.getElementById('cve-text').value=cvData.editedText;
  document.getElementById('cve-instr').value='';
  document.getElementById('cve-result').classList.remove('show');
  document.getElementById('cve-result').textContent='';
  document.getElementById('cve-apply-wrap').style.display='none';
  improvedCVText='';
  document.getElementById('cv-editor').classList.add('open');
}

function closeCVEditor(){
  document.getElementById('cv-editor').classList.remove('open');
}

function saveCVEdits(){
  cvData.editedText=document.getElementById('cve-text').value.trim();
  saveCV();
  closeCVEditor();
  toast('Record amended & preserved');
}

function discardCVEdits(){
  closeCVEditor();
  toast('Revisions abandoned');
}

// ── CV: IMPROVE (AI) ───────────────────
async function improveCVSection(){
  const instruction=document.getElementById('cve-instr').value.trim();
  const cvText=document.getElementById('cve-text').value.trim();
  if(!instruction){document.getElementById('cve-instr').focus();toast('Kindly provide an instruction');return;}
  if(!cvText){toast('No CV text to refine');return;}
  const btn=document.getElementById('cve-improve-btn');
  btn.disabled=true;btn.textContent='Refining\u2026';
  const resultEl=document.getElementById('cve-result');
  resultEl.textContent='Consulting the archives\u2026';
  resultEl.classList.add('show');
  document.getElementById('cve-apply-wrap').style.display='none';
  try{
    const improved=await callClaude([{role:'user',content:`Here is the candidate's CV:\n\n${cvText}\n\nInstruction: ${instruction}`}],SYS_CV_IMPROVE,false,4000);
    improvedCVText=improved;
    resultEl.textContent=improved;
    document.getElementById('cve-apply-wrap').style.display='block';
  }catch(e){
    resultEl.textContent=e.message;
    document.getElementById('cve-apply-wrap').style.display='none';
  }
  btn.disabled=false;btn.textContent='Refine This Passage';
}

function applyCVImprovement(){
  if(!improvedCVText)return;
  document.getElementById('cve-text').value=improvedCVText;
  document.getElementById('cve-result').classList.remove('show');
  document.getElementById('cve-apply-wrap').style.display='none';
  improvedCVText='';
  toast('Amendments applied to record');
}
