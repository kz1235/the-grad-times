// ── STATE ──────────────────────────────
let API_KEY='',visaMode='all',jobs=[],selectedId=null,currentLetter='';
let cvData={filename:'',text:'',editedText:''};
let cvSearchMode=false;
let improvedCVText='';
let savedJobs=[];
let searchHistory=[];
let progressHandle=null;

// ── LOCALSTORAGE HELPERS ──────────────
function saveCV(){localStorage.setItem('gr_cv',JSON.stringify(cvData));}
function loadCV(){const saved=localStorage.getItem('gr_cv');if(saved){try{cvData=JSON.parse(saved);}catch{}}}
function removeCV(){cvData={filename:'',text:'',editedText:''};localStorage.removeItem('gr_cv');renderCVUI();toast('Document withdrawn');}

function loadSavedJobs(){const s=localStorage.getItem('gr_saved');if(s){try{savedJobs=JSON.parse(s);}catch{}}}
function persistSavedJobs(){localStorage.setItem('gr_saved',JSON.stringify(savedJobs));}
function saveJob(job){if(!isJobSaved(job.id)){savedJobs.push(job);persistSavedJobs();}}
function unsaveJob(jobId){savedJobs=savedJobs.filter(j=>j.id!==jobId);persistSavedJobs();}
function isJobSaved(jobId){return savedJobs.some(j=>j.id===jobId);}
function getSavedJobs(){return savedJobs;}

function loadSearchHistory(){const s=localStorage.getItem('gr_history');if(s){try{searchHistory=JSON.parse(s);}catch{}}}
function persistSearchHistory(){localStorage.setItem('gr_history',JSON.stringify(searchHistory));}
function addSearchHistory(entry){
  // Deduplicate by query+location+industry
  searchHistory=searchHistory.filter(h=>!(h.query===entry.query&&h.location===entry.location&&h.industry===entry.industry));
  searchHistory.unshift(entry);
  if(searchHistory.length>10)searchHistory=searchHistory.slice(0,10);
  persistSearchHistory();
}
function clearSearchHistory(){searchHistory=[];localStorage.removeItem('gr_history');renderSearchHistory();}
