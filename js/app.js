// ── INIT ───────────────────────────────
(function(){
  // Load API key
  const k=localStorage.getItem('gr_key');
  if(k){API_KEY=k;document.getElementById('setup').style.display='none';}
  // Load persisted data
  loadCV();
  loadSavedJobs();
  loadSearchHistory();
  // Render UI
  renderCVUI();
  renderSearchHistory();
  renderSavedCount();
  // Dynamic date
  const dateEl=document.getElementById('mast-date');
  if(dateEl)dateEl.textContent=formatVictorianDate();
})();

// ── EVENT LISTENERS ───────────────────
document.getElementById('q').addEventListener('keydown',e=>{if(e.key==='Enter')doSearch();});
document.getElementById('loc').addEventListener('keydown',e=>{if(e.key==='Enter')doSearch();});
