
// ═══════════════════════════════════
// STATE
// ═══════════════════════════════════
let appState = 'L0'; // L0 | L1 | L2 | CONFIRMED
let selectedVehicle = null;
let selectedCOA = null;
let activeCOAPreview = null; // 'a' | 'b' | 'c' — drives globe COA trajectory overlay
let anomalyActive = true;
let coaLocked = false;
let toastTimer = null;

// ═══════════════════════════════════
// CLOCK
// ═══════════════════════════════════
function tick(){
  const n=new Date();
  document.getElementById('nav-clock').textContent=
    String(n.getUTCHours()).padStart(2,'0')+':'+
    String(n.getUTCMinutes()).padStart(2,'0')+':'+
    String(n.getUTCSeconds()).padStart(2,'0')+'Z';
}
setInterval(tick,1000); tick();

// ═══════════════════════════════════
// L0 → L1: Show toast after 3 seconds
// ═══════════════════════════════════
setTimeout(()=>{
  document.getElementById('toast').classList.add('vis');
  appState = 'L1';
}, 3000);

// ═══════════════════════════════════
// TOAST CLICK → activate anomaly workflow
// ═══════════════════════════════════
function clickToast(){
  document.getElementById('toast').classList.remove('vis');
  activateAnomaly();
}

// Alert pill click
function clickAlert(){
  if(appState === 'L0') return;
  activateAnomaly();
}

// Show monitor pill immediately — Equinox-3 is already being monitored
(function initPills(){
  const mp = document.getElementById('mon-pill');
  mp.style.display = 'flex';
  document.getElementById('mon-text').textContent = '1 MONITORED';
})();

function activateAnomaly(){
  appState = 'L2';

  // Force both sidebars open
  if(!leftOpen){
    leftOpen = true;
    document.querySelector('.sidebar.left').classList.remove('collapsed');
    document.getElementById('col-left').classList.add('open');
  }
  if(!rightOpen){
    rightOpen = true;
    document.querySelector('.sidebar.right').classList.remove('collapsed');
    document.getElementById('col-right').classList.add('open');
  }
  const layout = document.querySelector('.app-layout');
  layout.classList.remove('left-collapsed','right-collapsed','both-collapsed');
  // Trigger globe resize after sidebar opens
  setTimeout(()=>{ /* earth renderer handles resize */ }, 260);

  // Left panel title stays vehicle-driven — just update badge and sub
  document.getElementById('left-sub').textContent = '2026-03-19 · 03:41:22Z · Anomaly Active';
  document.getElementById('left-badge').textContent = 'L2 — ANOMALY CONFIRMED';
  document.getElementById('left-badge').className = 'state-badge';

  // Update right panel header
  document.getElementById('right-title').textContent = 'ANOMALY RESPONSE';
  document.getElementById('right-sub').textContent = '2026-03-19 · 03:41:22Z · Solstice-9 → OPS-7';
  document.getElementById('right-badge').textContent = 'L2 — ANOMALY CONFIRMED';
  document.getElementById('right-badge').className = 'state-badge';

  // Enable deviation tab
  const tabDev = document.getElementById('tab-dev');
  tabDev.classList.remove('disabled');

  // Update vehicle tags to show anomaly
  // Update MIL-STD symbol stroke colors to orange at L2
  document.querySelectorAll('#vdot-ops7 svg circle, #vdot-ops7 svg line').forEach(el=>el.setAttribute('stroke','#E04444'));
  document.querySelectorAll('#vdot-ops7 svg circle').forEach(el=>el.setAttribute('fill','rgba(204,51,51,0.08)'));
  document.getElementById('vname-ops7').style.color = '#E04444';
  document.getElementById('vtag-ops7').innerHTML = '<span class="tag tag-risk">VEHICLE AT RISK</span>';
  document.querySelectorAll('#vdot-48821 svg polygon, #vdot-48821 svg line').forEach(el=>el.setAttribute('stroke','#E04444'));
  document.getElementById('vname-solstice9').style.color = '#E04444';
  document.getElementById('vtag-48821').innerHTML = '<span class="tag tag-thr">ANOMALY</span>';
  document.getElementById('solstice9-id').className = 'fv thr';
  document.getElementById('solstice9-dev').textContent = '9 / 10';
  document.getElementById('solstice9-dev').className = 'fv thr';
  // Reveal bidirectional cross-links
  document.getElementById('link-ops7-anomaly').style.display = 'block';
  document.getElementById('link-solstice9-vehicle').style.display  = 'block';

  // Auto-switch to deviation tab
  const tabEl = document.getElementById('tab-dev');
  leftTab(tabEl, 'anomaly-intel');

  // Show dev content
  document.getElementById('dev-empty').style.display = 'none';
  document.getElementById('dev-content').style.display = 'block';

  // Show COA content
  document.getElementById('coa-empty').style.display = 'none';
  document.getElementById('coa-content').style.display = 'block';

  // Switch right panel to COA tab explicitly
  const tabCoa = document.getElementById('tab-coa');
  if(tabCoa) rightTab(tabCoa, 'coa');

  // Select OPS-7 as the asset we're protecting — highlight it
  selectedVehicle = 'ops7';
  selectVehicle('ops7');

  // Enable globe trajectory filter
  document.getElementById('f-traj').checked = true;
  selectedGlobeVehicle = 'ops7';

  startTimers();
}

// ═══════════════════════════════════
// LEFT TABS
// ═══════════════════════════════════
function leftTab(btn, id){
  if(btn.classList.contains('disabled')) return;
  ['vehicles','soh','timeline','contacts','anomaly-intel'].forEach(t=>{
    const el=document.getElementById('lt-'+t);
    if(el) el.style.display='none';
  });
  document.querySelectorAll('.sidebar.left .tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('lt-'+id).style.display='block';
  btn.classList.add('active');
}

// ═══════════════════════════════════
// SIDEBAR COLLAPSE
// ═══════════════════════════════════
let leftOpen=true, rightOpen=true;
function toggleSidebar(side){
  const layout = document.querySelector('.app-layout');
  const btn = document.getElementById('col-'+side);
  if(side==='left'){
    leftOpen = !leftOpen;
    document.querySelector('.sidebar.left').classList.toggle('collapsed', !leftOpen);
    btn.classList.toggle('open', leftOpen);
  } else {
    rightOpen = !rightOpen;
    document.querySelector('.sidebar.right').classList.toggle('collapsed', !rightOpen);
    btn.classList.toggle('open', rightOpen);
  }
  // Set correct grid class
  layout.classList.remove('left-collapsed','right-collapsed','both-collapsed');
  if(!leftOpen && !rightOpen) layout.classList.add('both-collapsed');
  else if(!leftOpen)          layout.classList.add('left-collapsed');
  else if(!rightOpen)         layout.classList.add('right-collapsed');
  // Globe resize after sidebar transition
  setTimeout(()=>{
    if(typeof resizeCloseUp === 'function') resizeCloseUp();
  }, 260);
}

// ═══════════════════════════════════
// RIGHT PANEL TABS
// ═══════════════════════════════════
function rightTab(btn, id){
  document.querySelectorAll('.sidebar.right .tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('rt-queue').style.display = id==='queue' ? 'flex' : 'none';
  document.getElementById('rt-coa').style.display   = id==='coa'   ? 'flex' : 'none';
}

// ═══════════════════════════════════
// QUEUE DATA + RENDER
// ═══════════════════════════════════
const VEH_QUEUE = {
  'ops7': [
    { offsetSec:1118,  type:'contact',  typeColor:'#7A8A9A', label:'Ground Contact · Site 1',  detail:'Ka-Band · Est. duration 9m · Nominal pass',          tab:'contacts', accordionId:'gs-site1' },
    { offsetSec:3310,  type:'maneuver', typeColor:'#4A8FD4', label:'Stationkeeping Burn',              detail:'Δv +0.4 m/s · Scheduled drag makeup',                tab:null },
    { offsetSec:5580,  type:'contact',  typeColor:'#7A8A9A', label:'Ground Contact · Site 5',   detail:'Ka-Band · Est. duration 6m',                         tab:'contacts', accordionId:'gs-svalbard' },
    { offsetSec:8820,  type:'sensor',   typeColor:'#5A9A6A', label:'SAR Collection Window',            detail:'Maritime zone · Priority HIGH · 14m window',         tab:null },
  ],
  'ops4': [
    { offsetSec:2590,  type:'contact',  typeColor:'#7A8A9A', label:'Ground Contact · Site 2 SFB',  detail:'S-Band · Est. duration 8m',                          tab:'contacts', accordionId:'gs-vandenberg' },
    { offsetSec:5100,  type:'sensor',   typeColor:'#5A9A6A', label:'Collection Window',         detail:'Priority Zone Alpha · 22m window',                tab:null },
    { offsetSec:7440,  type:'contact',  typeColor:'#7A8A9A', label:'Ground Contact · Site 8',     detail:'X-Band · Est. duration 7m',                          tab:'contacts', accordionId:'gs-hawaii' },
  ],
  'ops9': [
    { offsetSec:1980,  type:'sensor',   typeColor:'#5A9A6A', label:'Collection Window',          detail:'Priority Zone Bravo · Priority MED',              tab:null },
    { offsetSec:3750,  type:'contact',  typeColor:'#7A8A9A', label:'Ground Contact · Site 1',   detail:'Ka-Band · Est. duration 9m',                         tab:'contacts', accordionId:'gs-site1' },
    { offsetSec:6300,  type:'maneuver', typeColor:'#4A8FD4', label:'Stationkeeping Burn',              detail:'Δv +0.5 m/s · Routine',                              tab:null },
  ],
  'solstice9': [
    { offsetSec:720,   type:'anomaly',  typeColor:'#E04444', label:'Projected CPA',                    detail:'Closest Point of Approach with OPS-7 · Pc 0.013',  tab:null },
    { offsetSec:4500,  type:'maneuver', typeColor:'#4A8FD4', label:'Predicted Burn Window',            detail:'Based on current trajectory — estimate only',         tab:null },
  ],
  'equinox3': [
    { offsetSec:2880,  type:'sensor',   typeColor:'#5A9A6A', label:'Observation Pass',                 detail:'WARDEN photometric coverage',              tab:null },
    { offsetSec:6120,  type:'maneuver', typeColor:'#4A8FD4', label:'Predicted Burn Window',            detail:'DEV 5 — possible stationkeeping event',               tab:null },
  ],
};

let queueTick = 0;

function fmtCountdown(sec){
  const abs = Math.abs(Math.round(sec));
  const h = Math.floor(abs/3600), m = Math.floor((abs%3600)/60), s = abs%60;
  return (h>0?String(h).padStart(2,'0')+':':'') + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

function renderQueue(id){
  const empty  = document.getElementById('q-empty');
  const items  = document.getElementById('q-items');
  const nEmpty = document.getElementById('q-next-empty');
  const nCont  = document.getElementById('q-next-content');
  if(!id || !VEH_QUEUE[id]){ empty.style.display='block'; items.style.display='none'; nEmpty.style.display='block'; nCont.style.display='none'; return; }
  empty.style.display='none'; items.style.display='block'; nEmpty.style.display='none'; nCont.style.display='block';
  const evts = VEH_QUEUE[id].slice().sort((a,b)=>a.offsetSec-b.offsetSec);
  const next = evts.find(e=>(e.offsetSec - queueTick) > -600) || evts[0];
  if(next){
    document.getElementById('q-next-label').textContent  = next.label;
    document.getElementById('q-next-detail').textContent = next.detail;
    const rem = next.offsetSec - queueTick;
    const isActive = rem <= 0 && rem > -600;
    const timer = document.getElementById('q-next-timer');
    const actBar = document.getElementById('q-next-active-bar');
    if(isActive){
      timer.style.color = '#2ECC71'; timer.textContent = 'T+' + fmtCountdown(-rem);
      actBar.style.display='block'; document.getElementById('q-next-active-detail').textContent = next.detail;
    } else {
      timer.style.color = '#DDEEFF'; timer.textContent = 'T-' + fmtCountdown(rem);
      actBar.style.display='none';
    }
  }
  const upcoming = evts.filter(e => (e.offsetSec - queueTick) > -600);
  items.innerHTML = upcoming.map(e => {
    const rem = e.offsetSec - queueTick;
    const isActive = rem <= 0 && rem > -600;
    const timerStr = isActive
      ? `<span style="color:#2ECC71">T+${fmtCountdown(-rem)}</span>`
      : `T-${fmtCountdown(rem)}`;
    const viewBtn = e.tab ? `<button class="q-view-btn" onclick="queueView('${e.tab}','${e.accordionId||''}')">View →</button>` : '';
    return `<div class="q-item">
      <div class="q-item-left">
        <div class="q-item-type" style="color:${e.typeColor}">${e.type.toUpperCase()}</div>
        <div class="q-item-label">${e.label}</div>
        <div class="q-item-detail">${e.detail}</div>
        ${viewBtn}
      </div>
      <div class="q-item-timer">${timerStr}</div>
    </div>`;
  }).join('');
}

function queueView(tabName, accordionId){
  if(tabName === 'contacts'){
    const btn = document.getElementById('tab-con');
    if(btn) leftTab(btn, 'contacts');
    if(accordionId){
      setTimeout(()=>{
        const row = document.getElementById(accordionId);
        if(row){
          if(!row.classList.contains('open')){ row.classList.add('open'); const b=row.nextElementSibling; if(b) b.classList.add('open'); }
          row.scrollIntoView({behavior:'smooth', block:'center'});
        }
      }, 80);
    }
  }
}

setInterval(()=>{ queueTick+=1; if(selectedVehicle) renderQueue(selectedVehicle); }, 1000);


function toggleAcc(row){
  // row may be passed directly or we find it from a child
  const body = row.nextElementSibling;
  const isOpen = row.classList.toggle('open');
  if(body) body.classList.toggle('open', isOpen);
}

function jumpToVehicle(rowId, bodyId){
  const row=document.getElementById(rowId);
  const body=document.getElementById(bodyId);
  if(!row||!body) return;
  // Expand if not already open
  if(!row.classList.contains('open')){ row.classList.add('open'); body.classList.add('open'); }
  // Scroll into view
  row.scrollIntoView({behavior:'smooth', block:'center'});
}

// ═══════════════════════════════════
// SIGMA
// ═══════════════════════════════════
function toggleMath(id){
  const mb=document.getElementById('mb-'+id);
  const sb=document.getElementById('sb-'+id);
  if(!mb||!sb) return;
  const o=mb.classList.toggle('open');
  sb.classList.toggle('open',o);
}

// ═══════════════════════════════════
// VEHICLE SELECTION
// ═══════════════════════════════════
const VEH_META = {
  'ops7':    { title:'OPS-7',        sub:'LEO 518km · OPR' },
  'ops4':    { title:'OPS-4',        sub:'LEO 503km · OPR' },
  'ops9':    { title:'OPS-9',        sub:'LEO 534km · OPR' },
  'solstice9':    { title:'Solstice-9',    sub:'LEO 520km · Inspector · STATE-A' },
  'equinox3':{ title:'Equinox-3',    sub:'LEO 541km · Inspector · STATE-B' },
};

// Per-vehicle stat bar data
const VEH_STATS = {
  'ops7':    { range:'47.0 km', closing:'+0.34 km/s', pc:'0.013',  dev:'9',  alerts:'1', rangeAlert:true, closingAlert:true, pcAlert:true, devAlert:true },
  'ops4':    { range:'—',       closing:'—',           pc:'—',      dev:'2',  alerts:'0', rangeAlert:false,closingAlert:false,pcAlert:false,devAlert:false },
  'ops9':    { range:'—',       closing:'—',           pc:'—',      dev:'1',  alerts:'0', rangeAlert:false,closingAlert:false,pcAlert:false,devAlert:false },
  'solstice9':    { range:'47.0 km', closing:'+0.34 km/s',  pc:'0.013',  dev:'9',  alerts:'1', rangeAlert:true, closingAlert:true, pcAlert:true, devAlert:true  },
  'equinox3':{ range:'812 km',  closing:'+0.02 km/s',  pc:'0.0008', dev:'5',  alerts:'0', rangeAlert:false,closingAlert:false,pcAlert:false,devAlert:false },
};

function updateStatBar(id){
  const s = id ? VEH_STATS[id] : null;
  const set = (elId, val, alert) => {
    const el = document.getElementById(elId);
    if(!el) return;
    el.textContent = val || '—';
    el.style.color = alert ? '#E04444' : '#DDEEFF';
  };
  if(!s){
    ['s-range','s-closing','s-pc','s-dev','s-alerts'].forEach(id=>{ const e=document.getElementById(id); if(e){e.textContent='—';e.style.color='#8A9AAA';} });
  } else {
    set('s-range',   s.range,   s.rangeAlert);
    set('s-closing', s.closing, s.closingAlert);
    set('s-pc',      s.pc,      s.pcAlert);
    set('s-dev',     s.dev,     s.devAlert);
    set('s-alerts',  s.alerts,  s.alerts !== '0');
  }
  // Monitored is always global
  const tracked = document.getElementById('s-monitored2');
  if(tracked) tracked.textContent = Object.keys(VEH_DATA).length;
  if(tracked) tracked.style.color = '#DDEEFF';
}

// pip color per event type
const TL_COLOR = { maneuver:'#4A8FD4', contact:'#7A8A9A', sensor:'#5A9A6A', anomaly:'#E04444', coa:'#2ECC71' };

const VEH_TIMELINE = {
  'ops7': [
    { ts:'2026-03-19 · 03:47:33Z', type:'anomaly',  label:'L2 Escalation',         tx:'OPERATOR 1 escalated Solstice-9 anomaly to L2', detail:'DEV 9 · Pc 0.013 · OPS-7 designated Vehicle at Risk' },
    { ts:'2026-03-19 · 03:44:01Z', type:'anomaly',  label:'L1 Alert Fired',         tx:'Automated L1 alert triggered on Solstice-9', detail:'Unexpected burn sequence detected · WARDEN retasked' },
    { ts:'2026-03-19 · 03:18:44Z', type:'contact',  label:'Uplink · Site 1',     tx:'Telemetry downlink and command uplink completed', detail:'Duration 8m 42s · Ka-Band · 2.4 Gbps · All subsystems nominal' },
    { ts:'2026-03-19 · 01:44:10Z', type:'sensor',   label:'Sensor Retask',          tx:'Sensor tasked to cover new collection priority', detail:'Collection window 14m · Zone: Alpha · Priority: HIGH' },
    { ts:'2026-03-18 · 22:31:55Z', type:'contact',  label:'Uplink · Site 5', tx:'Routine contact and ephemeris upload', detail:'Duration 6m 18s · Ka-Band · NAV update applied' },
    { ts:'2026-03-18 · 19:08:30Z', type:'maneuver', label:'Stationkeeping Burn',    tx:'Scheduled drag makeup maneuver executed', detail:'Δv +0.4 m/s · Fuel used: 0.3% · Post-burn orbit nominal' },
    { ts:'2026-03-18 · 14:52:14Z', type:'sensor',   label:'Sensor Retask',          tx:'SAR tasked to cover maritime collection zone', detail:'Collection window 9m · 2 of 8 array elements offline — partial coverage' },
    { ts:'2026-03-18 · 11:20:00Z', type:'contact',  label:'Uplink · Site 1',     tx:'Scheduled contact · ephemeris + crypto uplink', detail:'Duration 9m 04s · crypto key refresh applied' },
    { ts:'2026-03-17 · 23:44:38Z', type:'maneuver', label:'Collision Avoidance',    tx:'Minor avoidance maneuver — debris conjunction', detail:'Δv +1.2 m/s · Pc pre-maneuver: 1/4,200 · Post: nominal' },
    { ts:'2026-03-17 · 08:15:00Z', type:'contact',  label:'Uplink · Site 2',    tx:'Routine telemetry pass', detail:'Duration 7m 30s · S-Band' },
  ],
  'ops4': [
    { ts:'2026-03-19 · 03:41:02Z', type:'contact',  label:'Uplink · Site 2',    tx:'Telemetry pass completed', detail:'Duration 7m 55s · S-Band · Narrowband dropout noted · 3 events / 6hr' },
    { ts:'2026-03-19 · 02:14:20Z', type:'sensor',   label:'Sensor Retask',          tx:'Collection shifted to new priority region', detail:'Zone: Alpha · Window: 22m · Collection nominal' },
    { ts:'2026-03-19 · 00:55:10Z', type:'anomaly',  label:'Receiver Anomaly',       tx:'Narrowband receiver intermittent dropout detected', detail:'3 dropout events in 6hr window · Under monitoring · No action taken' },
    { ts:'2026-03-18 · 21:30:44Z', type:'contact',  label:'Uplink · Site 6',    tx:'Contact and NAV update', detail:'Duration 5m 12s · X-Band · Fuel reserve noted at 61% — below threshold' },
    { ts:'2026-03-18 · 18:08:00Z', type:'maneuver', label:'Stationkeeping Burn',    tx:'Scheduled orbit maintenance burn', detail:'Δv +0.3 m/s · Fuel used: 0.4% · Fuel reserve now 61%' },
    { ts:'2026-03-18 · 15:44:55Z', type:'sensor',   label:'Sensor Retask',          tx:'Collection priority update — new tasking order received', detail:'Sensor repositioned · Window 18m' },
    { ts:'2026-03-18 · 12:00:30Z', type:'contact',  label:'Uplink · Site 2',    tx:'Scheduled pass · crypto expiry warning logged', detail:'Crypto/crypto key expires in 3 days · Action required' },
    { ts:'2026-03-17 · 20:33:15Z', type:'anomaly',  label:'Crypto Warning',         tx:'crypto key key expiry flagged by ground system', detail:'Expiry: 2026-03-22 · Renewal pending scheduling' },
    { ts:'2026-03-17 · 14:10:00Z', type:'contact',  label:'Uplink · Site 8',   tx:'Contact and telemetry download', detail:'Duration 6m 40s · X-Band · All subsystems nominal' },
  ],
  'ops9': [
    { ts:'2026-03-19 · 03:07:18Z', type:'contact',  label:'Uplink · Site 1',     tx:'Routine telemetry and command pass', detail:'Duration 9m 22s · Ka-Band · All subsystems nominal' },
    { ts:'2026-03-19 · 01:15:44Z', type:'sensor',   label:'Sensor Retask',           tx:'Collection window opened over priority zone', detail:'Zone: Bravo · Window: 17m · Collection complete' },
    { ts:'2026-03-18 · 22:48:00Z', type:'contact',  label:'Uplink · Site 5', tx:'NAV ephemeris upload and downlink', detail:'Duration 7m 10s · Ka-Band · Nominal' },
    { ts:'2026-03-18 · 20:30:00Z', type:'sensor',   label:'Imaging Retask',            tx:'Imaging tasked for thermal imaging pass', detail:'Region: North Africa · Window: 11m · Nominal' },
    { ts:'2026-03-18 · 17:02:33Z', type:'maneuver', label:'Stationkeeping Burn',    tx:'Scheduled drag makeup burn executed', detail:'Δv +0.5 m/s · Fuel used: 0.2% · Fuel reserve 88%' },
    { ts:'2026-03-18 · 13:55:00Z', type:'contact',  label:'Uplink · Site 2',    tx:'Scheduled pass', detail:'Duration 8m 04s · S-Band · All nominal' },
    { ts:'2026-03-18 · 10:20:15Z', type:'sensor',   label:'EO Retask',              tx:'High-resolution EO collection over priority target', detail:'Window: 8m · Nominal · Data recorded 28% capacity' },
    { ts:'2026-03-17 · 23:10:00Z', type:'contact',  label:'Uplink · Site 7', tx:'Routine contact', detail:'Duration 5m 50s · Ka-Band · Nominal' },
    { ts:'2026-03-17 · 16:44:00Z', type:'maneuver', label:'Orbit Adjust',           tx:'Minor inclination correction burn', detail:'Δv +0.8 m/s · Ground commanded · Post-burn orbit nominal' },
  ],
  'solstice9': [
    { ts:'2026-03-19 · 03:41:22Z', type:'anomaly',  label:'Deviation Detected',     tx:'Baseline deviation confirmed — burn sequence initiated', detail:'DEV 9 · Pc 0.013 · Closing on OPS-7 at +0.34 km/s' },
    { ts:'2026-03-19 · 03:41:45Z', type:'sensor',   label:'Sensor Retask',          tx:'WARDEN retasked 3 sensors to track object', detail:'Coverage increased to continuous · All sensors nominal' },
    { ts:'2026-03-19 · 03:44:01Z', type:'anomaly',  label:'L1 Alert',               tx:'L1 anomaly alert auto-generated', detail:'Velocity delta confirmed · Approach trajectory toward OPS-7' },
    { ts:'2026-03-18 · 18:30:00Z', type:'maneuver', label:'Maneuver Detected',      tx:'Minor Δv event observed — assessed as stationkeeping', detail:'Δv ~0.06 m/s · Baseline activity index unchanged at 0.12' },
    { ts:'2026-03-18 · 09:14:22Z', type:'sensor',   label:'Sensor Observation',     tx:'Scheduled photometric observation pass', detail:'Object class confirmed: Inspector · 92-day baseline established' },
    { ts:'2026-03-17 · 22:00:00Z', type:'sensor',   label:'Initial Track',          tx:'Object added to WARDEN monitoring queue', detail:'Object ID 48821 · Origin: STATE-A · Inspector class · DEV 2' },
  ],
  'equinox3': [
    { ts:'2026-03-19 · 02:44:10Z', type:'anomaly',  label:'DEV Elevated',           tx:'Deviation score elevated to 5 — increased monitoring', detail:'DEV 5 · Pc 0.0008 · Closing velocity nominal · No action taken' },
    { ts:'2026-03-19 · 00:10:55Z', type:'sensor',   label:'Sensor Retask',          tx:'Additional sensor coverage allocated by WARDEN', detail:'Coverage interval reduced to 20min · Baseline confirmed' },
    { ts:'2026-03-18 · 20:30:00Z', type:'maneuver', label:'Maneuver Detected',      tx:'Δv event detected — possible inspection approach', detail:'Δv ~0.14 m/s · DEV score updated 3 → 5 · Monitoring elevated' },
    { ts:'2026-03-18 · 14:05:00Z', type:'sensor',   label:'Sensor Observation',     tx:'Photometric pass · object confirmed active', detail:'Attitude control nominal · No payload emissions detected' },
    { ts:'2026-03-18 · 08:00:00Z', type:'sensor',   label:'Initial Track Update',   tx:'Routine observation — no activity', detail:'DEV 3 · Baseline: 0.09 · Stationkeeping only' },
    { ts:'2026-03-17 · 16:22:00Z', type:'sensor',   label:'Initial Track',          tx:'Equinox-3 added to monitoring queue', detail:'STATE-B Inspector class · LEO 541km · DEV 3 at intake' },
  ],
};

let tlFilter = 'all';

function setTLFilter(btn, type){
  tlFilter = type;
  document.querySelectorAll('.tl-ft').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderTimeline(selectedVehicle);
}

function renderTimeline(id){
  const empty = document.getElementById('tl-empty');
  const content = document.getElementById('tl-content');
  const log = document.getElementById('tl-log');
  if(!id || !VEH_TIMELINE[id]){
    empty.style.display='block'; content.style.display='none'; return;
  }
  empty.style.display='none'; content.style.display='block';
  const meta = VEH_META[id];
  document.getElementById('tl-veh-name').textContent = meta ? meta.title : id;
  document.getElementById('tl-veh-sub').textContent  = meta ? meta.sub   : '';
  const events = VEH_TIMELINE[id].filter(e=> tlFilter==='all' || e.type===tlFilter);
  if(!events.length){
    log.innerHTML='<div style="font-size:11px;color:#2A3545;padding:20px 0;text-align:center">No events match this filter</div>';
    return;
  }
  log.innerHTML = events.map((e,i)=>`
    <div class="tl-i">
      <div class="tl-line"></div>
      <div class="tl-pip" style="background:${TL_COLOR[e.type]||'#7A8A9A'}"></div>
      <div class="tl-tag ${e.type}">${e.label}</div>
      <div class="tl-t">${e.ts}</div>
      <div class="tl-tx">${e.tx}</div>
      <div class="tl-detail">${e.detail}</div>
    </div>
  `).join('');
}

function selectVehicle(id){
  selectedVehicle = id;
  selectedGlobeVehicle = id;

  // Highlight selected row — clear all first, then mark active
  document.querySelectorAll('.sidebar.left .acc-row').forEach(r=>r.classList.remove('selected'));
  const vehRows = { 'ops7':'vrow-ops7-header', 'solstice9':'vrow-solstice9-header' };
  // For rows with explicit ids use them; others find by onclick attribute
  document.querySelectorAll('.sidebar.left .acc-row').forEach(r=>{
    const oc = r.getAttribute('onclick')||'';
    if(oc.includes(`'${id}'`)) r.classList.add('selected');
  });

  const meta = VEH_META[id];
  if(meta){
    document.getElementById('left-title').textContent = meta.title;
    document.getElementById('left-sub').textContent   = meta.sub;
  }

  // Always refresh timeline and queue for the newly selected vehicle
  renderTimeline(id);
  renderQueue(id);
  updateStatBar(id);

  // Show deviation content if relevant vehicle selected and anomaly is active
  if(appState !== 'L0' && (id === 'ops7' || id === 'solstice9')){
    document.getElementById('dev-empty').style.display='none';
    document.getElementById('dev-content').style.display='block';
  } else if(id !== 'ops7' && id !== 'solstice9'){
    const de = document.getElementById('dev-empty');
    const dc = document.getElementById('dev-content');
    if(de) de.style.display='block';
    if(dc) dc.style.display='none';
  }
}

// ═══════════════════════════════════
// COA VIEW TOGGLE
// ═══════════════════════════════════
function setView(m){
  document.body.className = m==='d' ? 'vd' : '';
  document.getElementById('vb-s').classList.toggle('active', m==='s');
  document.getElementById('vb-d').classList.toggle('active', m==='d');
}

// ═══════════════════════════════════
// COA TIMERS
// ═══════════════════════════════════
const TI={
  a:{el:null,card:null,s:750, base:'#DDEEFF'},
  b:{el:null,card:null,s:1860,base:'#DDEEFF'},
  c:{el:null,card:null,s:2460,base:'#E04444'},
};
let timerStarted=false;
function fmtT(s){const m=Math.floor(s/60),sec=s%60;return'T-'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}
let expCnt=0;

function startTimers(){
  if(timerStarted) return; timerStarted=true;
  TI.a.el=document.getElementById('ti-a'); TI.a.card=document.getElementById('ca-a');
  TI.b.el=document.getElementById('ti-b'); TI.b.card=document.getElementById('ca-b');
  TI.c.el=document.getElementById('ti-c'); TI.c.card=document.getElementById('ca-c');
  setInterval(()=>{
    if(coaLocked) return;
    for(const[id,t]of Object.entries(TI)){
      if(t.s<=0||!t.el)continue; t.s--;
      if(t.s<=0){
        t.el.textContent=''; t.card.classList.add('expired');
        if(selectedCOA===id){selectedCOA=null;t.card.classList.remove('sel-a','sel-b','sel-c');document.getElementById('confirm-btn').disabled=true;document.getElementById('confirm-btn').classList.remove('rdy');document.getElementById('sel-sum').classList.remove('vis');}
        expCnt++;
        if(expCnt>=3){document.getElementById('exp-banner').classList.add('vis');document.getElementById('confirm-btn').disabled=true;}
      }else{
        t.el.style.color=t.s<120?'#E04444':t.base;
        t.el.textContent=fmtT(t.s);
      }
    }
  },1000);
}

function selectCOA(id){
  if(coaLocked) return;
  if(document.getElementById('ca-'+id).classList.contains('expired')) return;
  ['a','b','c'].forEach(c=>{document.getElementById('ca-'+c).classList.remove('sel-a','sel-b','sel-c');});
  document.getElementById('ca-'+id).classList.add('sel-'+id);
  selectedCOA=id;
  const n={a:'COA-A · Orbital Adjustment',b:'COA-B · Hold Position',c:'COA-C · Emergency Burn'};
  document.getElementById('sel-text').textContent=n[id];
  document.getElementById('sel-sum').classList.add('vis');
  const btn=document.getElementById('confirm-btn'); btn.disabled=false; btn.classList.add('rdy');
  // Dialog — orange accent only for HIGH RISK (COA-C)
  const isHigh = (id === 'c');
  const accentColor = isHigh ? '#E04444' : '#DDEEFF';
  const dtop  = document.getElementById('dialog-topbar');
  const dtitle= document.getElementById('dialog-coa-title');
  const dcard = document.getElementById('dialog-card');
  if(dtop)   dtop.style.background   = accentColor;
  if(dtitle) dtitle.style.color       = accentColor;
  if(dcard)  dcard.style.borderLeft   = `3px solid ${accentColor}`;
  if(dtitle) dtitle.textContent        = n[id];
  // Trigger COA globe trajectory overlay + close-up preview on OPS-7
  activeCOAPreview = id;
  if(window.updateGlobeLayers) window.updateGlobeLayers();
  if(!zoomTarget) { if(window.zoomToVehicle) window.zoomToVehicle('ops7'); }
  else { selectedGlobeVehicle = 'ops7'; zoomTarget = 'ops7'; }
}

// ═══════════════════════════════════
// CONFIRM FLOW
// ═══════════════════════════════════
document.getElementById('confirm-btn')?.addEventListener('click',()=>{
  if(!selectedCOA||coaLocked) return;
  document.getElementById('dialog-overlay').classList.add('vis');
});

function closeDialog(){
  document.getElementById('dialog-overlay').classList.remove('vis');
}

function executeConfirm(){
  closeDialog();
  coaLocked=true;
  const now=new Date();
  const ts=String(now.getUTCHours()).padStart(2,'0')+':'+String(now.getUTCMinutes()).padStart(2,'0')+':'+String(now.getUTCSeconds()).padStart(2,'0')+'Z';
  const n={a:'COA-A · Orbital Adjustment',b:'COA-B · Hold Position',c:'COA-C · Emergency Burn'};

  // Show confirmed badge
  document.getElementById('confirmed-text').textContent = `${n[selectedCOA]} · ${ts} · OPERATOR 1`;
  document.getElementById('confirmed-badge').classList.add('vis');

  // Lock all cards
  ['a','b','c'].forEach(c=>{
    const card=document.getElementById('ca-'+c);
    card.classList.add('readonly');
    if(c!==selectedCOA) card.style.opacity='0.2';
  });

  // Lock footer
  document.getElementById('note-field').disabled=true;
  document.getElementById('confirm-btn').disabled=true;
  document.getElementById('confirm-btn').classList.remove('rdy');

  // Update badges
  document.getElementById('left-badge').textContent='COA TRANSMITTED';
  document.getElementById('left-badge').style.background='rgba(30,110,60,.15)';
  document.getElementById('left-badge').style.borderColor='rgba(30,110,60,.4)';
  document.getElementById('left-badge').style.color='#2ECC71';
  document.getElementById('right-badge').textContent='COA TRANSMITTED';
  document.getElementById('right-badge').style.background='rgba(30,110,60,.15)';
  document.getElementById('right-badge').style.borderColor='rgba(30,110,60,.4)';
  document.getElementById('right-badge').style.color='#2ECC71';

  // Anomaly pill → quiet; monitor pill → 3 MONITORED
  const ap = document.getElementById('alert-pill');
  ap.classList.add('none');
  document.getElementById('alert-text').textContent = '0 ACTIVE ANOMALYS';
  document.getElementById('mon-text').textContent = '3 MONITORED';
  document.getElementById('vtag-ops7').innerHTML =
    '<span class="tag tag-mon">MONITOR</span><span class="tag tag-done" style="margin-left:4px">COA TRANSMITTED</span>';
  document.getElementById('vtag-48821').innerHTML =
    '<span class="tag tag-mon">MONITOR</span><span class="tag tag-done" style="margin-left:4px">COA TRANSMITTED</span>';

  // Reset symbol stroke colors back to blue
  document.querySelectorAll('#vdot-ops7 svg circle, #vdot-ops7 svg line').forEach(el=>el.setAttribute('stroke','#00CCCC'));
  document.querySelectorAll('#vdot-ops7 svg circle').forEach(el=>el.setAttribute('fill','rgba(0,204,204,0.08)'));
  document.getElementById('vname-ops7').style.color      = '#DDEEFF';
  document.querySelectorAll('#vdot-48821 svg polygon, #vdot-48821 svg line').forEach(el=>el.setAttribute('stroke','#E04444'));
  document.getElementById('vname-solstice9').style.color       = '#DDEEFF';
}

function escalateChain(){
  const b=document.querySelector('.eb-btn'); b.textContent='Escalating… logged at '+new Date().toISOString().slice(11,19)+'Z'; b.disabled=true;
}

// ═══════════════════════════════════
// CONTACT COUNTDOWNS
// ═══════════════════════════════════
const cts={'ct-ops7':{s:18*60+22},'ct-ops4':{s:43*60+10},'ct-ops9':{s:64*60+45}};
function fmtC(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return'T-'+(h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}
setInterval(()=>{for(const[id,c]of Object.entries(cts)){if(c.s>0){c.s--;const el=document.getElementById(id);if(el)el.textContent=fmtC(c.s);}}},1000);


// ── CANVAS / CLOSE-UP ──


// 2D canvas — used only for close-up / COA trajectory overlay
const canvas = document.getElementById('globe');
const ctx    = canvas.getContext('2d');
let selectedGlobeVehicle = null;
let animFrame            = 0;

// ── MOUNT + SIZE HELPERS ──
const mount = document.getElementById('globe-mount');
const W3 = () => mount.clientWidth;
const H3 = () => mount.clientHeight;

// ── VEHICLE DEFINITIONS ──
const VEH_DATA = {
  'ops7': { label:'OPS-7',      type:'a',       lat:31.6, lng:-61.2 },
  'ops4': { label:'OPS-4',      type:'ours',    lat:50,   lng:-30   },
  'ops9': { label:'OPS-9',      type:'ours',    lat:-15,  lng:75    },
  'solstice9': { label:'Solstice-9',  type:'t',       lat:32,   lng:-62   },
  'cosmos': { label:'Equinox-3',  type:'suspect', lat:38,   lng:120   },
};

function typeColor(t){
  return { a:'#00CCCC', ours:'#00CCCC', t:'#CC3333', suspect:'#DDEEFF',
           gs:'rgba(0,204,204,0.45)', m:'#4A8FD4', n:'#2A3A4A' }[t] || '#4A5A6A';
}

// ── MIL-STD HTML MARKERS ──
function makeMilSymHTML(type, label){
  const col = typeColor(type);
  let svg = '';
  if(type==='a'||type==='ours'){
    svg = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="9" stroke="${col}" stroke-width="1.8" fill="${col}22"/>
      <line x1="11" y1="3" x2="11" y2="19" stroke="${col}" stroke-width="1.4"/>
      <line x1="3"  y1="11" x2="19" y2="11" stroke="${col}" stroke-width="1.4"/>
    </svg>`;
  } else if(type==='t'){
    svg = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="11,1 21,11 11,21 1,11" stroke="${col}" stroke-width="1.8" fill="${col}22"/>
      <line x1="11" y1="4" x2="11" y2="18" stroke="${col}" stroke-width="1.4"/>
      <line x1="4"  y1="11" x2="18" y2="11" stroke="${col}" stroke-width="1.4"/>
    </svg>`;
  } else if(type==='suspect'){
    svg = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="11,1 21,11 11,21 1,11" stroke="${col}" stroke-width="1.5" stroke-dasharray="3 2" fill="${col}11"/>
      <text x="11" y="15" text-anchor="middle" font-size="10" font-weight="700" font-family="Inter,sans-serif" fill="${col}">?</text>
    </svg>`;
  }
  const labelHtml = label
    ? `<div style="font:600 8px/1.2 Inter,sans-serif;color:${col};white-space:nowrap;margin-top:2px;text-shadow:0 0 6px #000,0 1px 3px #000;">${label}</div>`
    : '';
  return `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;user-select:none;">${svg}${labelHtml}</div>`;
}

// Named vehicle markers
const VEH_MARKERS = Object.entries(VEH_DATA).map(([id, v]) => ({
  id, lat: v.lat, lng: v.lng, type: v.type, label: v.label
}));

// Nominal background dots (pure data — no labels)
const NOM_DOTS = [
  [28,-80],[52,10],[35,140],[-20,60],[60,-100],[10,20],[45,80],
  [-35,-70],[70,30],[20,-40],[-10,110],[55,-150],[0,170],[-50,20],
  [30,50],[15,-120],[65,60],[-40,130],[40,-20],[5,90],[-25,-10],
].map(([lat,lng]) => ({ lat, lng, color:'rgba(30,50,70,0.55)', radius:0.12 }));

// Ground stations as points
const GS_POINTS = [
  { lat:38.8, lng:-104.5, label:'Site 1',     id:'sch', gs:true },
  { lat:34.7, lng:-120.5, label:'Site 2',    id:'van', gs:true },
  { lat:76.5, lng:-68.7,  label:'Site 3',         id:'thu', gs:true },
  { lat:7.3,  lng:-72.4,  label:'Site 4',  id:'dgo', gs:true },
  { lat:78.2, lng:15.6,   label:'Site 5', id:'ksvl',gs:true },
  { lat:-72.0,lng:2.5,    label:'Site 6',    id:'ktrl',gs:true },
  { lat:58.3, lng:8.6,    label:'Site 7', id:'kgri',gs:true },
  { lat:22.1, lng:-159.4, label:'Site 8',   id:'khaw',gs:true },
  { lat:1.3,  lng:103.8,  label:'Site 9',id:'ksin',gs:true },
].map(d => ({ ...d, color:'rgba(0,204,204,0.4)', radius:0.22 }));

// ── TRAJECTORY PATHS ──
function lerpPts(sLat,sLng,eLat,eLng,steps,dLat=0,dLng=0,alt=0.12){
  const pts = [];
  for(let i=0;i<=steps;i++){
    const t=i/steps;
    const drift = Math.sin(Math.PI*t)*t;
    pts.push([sLat+(eLat-sLat)*t+dLat*drift, sLng+(eLng-sLng)*t+dLng*drift, alt]);
  }
  return pts;
}

function buildPaths(){
  return [
    // OPS-7 planned (dashed cyan)
    { id:'p342plan', pnts: lerpPts(28,-70,35,-52,60),
      color:'rgba(0,204,204,0.7)', dashLen:0.5, dashGap:0.5 },
    // Solstice-9 actual trajectory (solid red)
    { id:'pn48act',  pnts: lerpPts(29,-68,33,-55,60,-2.2,1.8),
      color:'rgba(204,51,51,0.8)',  dashLen:1,   dashGap:0   },
    // OPS-7 deviation (solid red, dimmer)
    { id:'p342dev',  pnts: lerpPts(28,-70,33,-56,60,-2.8,1.6),
      color:'rgba(204,51,51,0.55)', dashLen:1,   dashGap:0   },
  ];
}

// Closing vector (NORAD → OPS-7)
const CLOSING_ARCS = [{
  startLat:32, startLng:-62, endLat:31.6, endLng:-61.2,
  color:'rgba(204,51,51,0.75)'
}];

// ── ZOOM / CLOSE-UP STATE ──
let zoomTarget = null;

function zoomToVehicle(id){
  const vd = VEH_DATA[id]; if(!vd) return;
  zoomTarget = id; selectedGlobeVehicle = id;
  // Only show 2D canvas close-up when NOT in COA preview mode
  // COA mode uses the globe directly for trajectory overlay
  if(!activeCOAPreview) {
    canvas.width  = W3(); canvas.height = H3();
    canvas.style.display = 'block';
  }
  if(window.getEarth && window.getEarth()) window.getEarth().pointOfView({ lat:vd.lat, lng:vd.lng, altitude:0.6 }, 900);
}
function exitCloseUp(){
  zoomTarget = null; activeCOAPreview = null;
  canvas.style.display = 'none';
  if(window.updateGlobeLayers) window.updateGlobeLayers();
  if(window.getEarth && window.getEarth()) window.getEarth().pointOfView({ lat:20, lng:-30, altitude:2.5 }, 900);
}
function resetZoom(){ exitCloseUp(); }
function resizeCloseUp(){
  if(zoomTarget){ canvas.width = W3(); canvas.height = H3(); }
}

// ── RESIZE ──
window.addEventListener('resize', () => { if(window.resizeCloseUp) window.resizeCloseUp(); });

// ── CLOSE-UP ANIMATION LOOP ──
(function closeUpLoop(){
  animFrame++;
  if(zoomTarget && !activeCOAPreview && canvas.style.display !== 'none'){
    const cW = canvas.width, cH = canvas.height;
    if(cW > 10 && cH > 10) drawCloseUp(zoomTarget, cW, cH);
  }
  requestAnimationFrame(closeUpLoop);
})();




// ── CLOSE-UP VIEW ──
function drawCloseUp(id, W, H){
  const vd = VEH_DATA[id];
  if(!vd) return;
  ctx.clearRect(0,0,W,H);

  // Background
  ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);

  // Grid lines for close-up space context
  ctx.strokeStyle='rgba(30,50,80,0.3)'; ctx.lineWidth=0.5;
  const spacing=40;
  for(let x=0;x<W;x+=spacing){ ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke(); }
  for(let y=0;y<H;y+=spacing){ ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke(); }

  const cx=W/2, cy=H/2;

  // Back button hint
  ctx.fillStyle='#7A8A9A'; ctx.font='14px Inter,sans-serif';
  ctx.fillText('← Click to return to globe view', 12, 20);

  // Vehicle label header
  ctx.fillStyle='#DDEEFF'; ctx.font='bold 18px Inter,sans-serif';
  ctx.fillText(vd.label, cx, 40);
  ctx.textAlign='center';
  ctx.fillStyle='#7A8A9A'; ctx.font='14px Inter,sans-serif';

  const typeLabel = {a:'VEHICLE AT RISK',ours:'OPERATOR',t:'ANOMALY',m:'MONITORED'}[vd.type]||'MONITORED';
  const typeCol   = typeColor(vd.type);
  ctx.fillStyle=typeCol;
  ctx.fillText(typeLabel, cx, 56);
  ctx.textAlign='left';

  // Central vehicle dot with glow
  const glowColors = { t:['rgba(204,51,51,0.45)','rgba(204,51,51,0)'], a:['rgba(221,238,255,0.35)','rgba(221,238,255,0)'], ours:['rgba(0,204,204,0.35)','rgba(0,204,204,0)'], m:['rgba(74,143,212,0.3)','rgba(74,143,212,0)'], n:['rgba(58,74,90,0.3)','rgba(58,74,90,0)'] };
  const gc = glowColors[vd.type] || glowColors.n;
  const glowGrad=ctx.createRadialGradient(cx,cy,0,cx,cy,50);
  glowGrad.addColorStop(0, gc[0]);
  glowGrad.addColorStop(1, gc[1]);
  ctx.beginPath();ctx.arc(cx,cy,50,0,Math.PI*2);ctx.fillStyle=glowGrad;ctx.fill();
  ctx.beginPath();ctx.arc(cx,cy,5,0,Math.PI*2);ctx.fillStyle=typeCol;ctx.fill();
  // orbit ring
  ctx.beginPath();ctx.arc(cx,cy,18,0,Math.PI*2);ctx.strokeStyle=typeCol+'55';ctx.lineWidth=1;ctx.setLineDash([2,4]);ctx.stroke();ctx.setLineDash([]);

  // ── COA TRAJECTORY PREVIEW ── orbital-arc style matching drawCloseUp aesthetic
  if(activeCOAPreview && id === 'ops7'){

    // Shared arc geometry — same formula as the planned/deviation paths
    // Orbital arc: sweeps left→right across canvas, sinusoidal height = LEO curvature feel
    const arcW = W * 0.74;   // total sweep width
    const arcH = H * 0.30;   // arc height (how much it bows)
    const steps = 60;

    // OPS-7 sits at its "current" position — ~38% along a nominal arc
    // We'll anchor at a consistent canvas point and project arcs forward from there
    const nowT   = 0.38;  // "now" is 38% along the full planned arc
    const nowX   = (W - arcW) / 2 + arcW * nowT;
    const nowY   = cy + arcH * Math.sin(Math.PI * nowT) * 0.5;

    // COA definitions — each COA is a *continuation* from nowT to 1.0
    // using a different arc profile. We parameterise as:
    //   arcWMult  — how wide the forward arc is relative to arcW
    //   arcHMult  — how much extra lift/sink (positive = up = away from anomaly)
    //   col       — path color (all OPS-7 = friendly cyan, NORAD paths = hostile red)
    const USA_COL = '#00CCCC'; // friendly MIL-STD cyan — tied to vehicle, not COA
    const coaDefs = {
      a: { col:USA_COL, label:'COA-A · Orbital Adjustment',      risk:'LOW',  arcWMult:0.72, arcHMult: 1.55, noradMiss: true,  missBy:'~18 km' },
      b: { col:USA_COL, label:'COA-B · Hold Position',         risk:'MED',  arcWMult:0.68, arcHMult: 0.45, noradMiss: false, missBy:'~2.1 km' },
      c: { col:USA_COL, label:'COA-C · Emergency Burn',     risk:'HIGH', arcWMult:0.78, arcHMult:-1.20, noradMiss: true,  missBy:'~31 km' },
    };

    // ── Solstice-9 current approach arc (always) ──
    // NORAD comes in from upper-right on a converging arc
    const nArcW   = W * 0.52;
    const nStartX = W - (W - arcW)/2 + nArcW * 0.12;
    const nStartY = cy - H * 0.28;
    const nEndX   = nowX + W * 0.06;
    const nEndY   = nowY + H * 0.04;
    const nCpX    = (nStartX + nEndX)/2 - W*0.06;
    const nCpY    = (nStartY + nEndY)/2 + H*0.10;

    // Draw NORAD approach
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const bx=(1-t)*(1-t)*nStartX+2*(1-t)*t*nCpX+t*t*nEndX;
      const by=(1-t)*(1-t)*nStartY+2*(1-t)*t*nCpY+t*t*nEndY;
      i===0?ctx.moveTo(bx,by):ctx.lineTo(bx,by);
    }
    ctx.strokeStyle='#E04444'; ctx.lineWidth=1.2; ctx.setLineDash([3,5]); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha=1;

    // NORAD current position marker at arc start
    const nPulse = 0.5+0.5*Math.sin(animFrame*0.09+1.2);
    const nGlow = ctx.createRadialGradient(nStartX,nStartY,0,nStartX,nStartY,16+nPulse*5);
    nGlow.addColorStop(0,'rgba(204,51,51,0.4)'); nGlow.addColorStop(1,'rgba(204,51,51,0)');
    ctx.beginPath(); ctx.arc(nStartX,nStartY,16+nPulse*5,0,Math.PI*2); ctx.fillStyle=nGlow; ctx.fill();
    // NORAD hostile diamond
    ctx.save(); ctx.translate(nStartX,nStartY); ctx.rotate(Math.PI/4);
    ctx.strokeStyle='#E04444'; ctx.lineWidth=1.5; ctx.fillStyle='rgba(204,51,51,0.12)';
    ctx.beginPath(); ctx.rect(-6,-6,12,12); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle='#E04444'; ctx.font='bold 12px Inter,sans-serif';
    ctx.fillText('Solstice-9', nStartX - 38, nStartY - 12);
    ctx.fillStyle='rgba(204,51,51,0.6)'; ctx.font='12px Inter,sans-serif';
    ctx.fillText('+0.34 km/s closing', nStartX - 44, nStartY - 3);

    // ── OPS-7 planned baseline arc (always, dim) ──
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    for(let i=0;i<=steps;i++){
      const t = i/steps;
      const px = (W-arcW)/2 + arcW*t;
      const py = cy + arcH*Math.sin(Math.PI*t)*0.5 - 8;
      i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
    }
    ctx.strokeStyle='rgba(160,180,200,0.5)'; ctx.lineWidth=1.2; ctx.setLineDash([5,5]); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha=1;
    ctx.fillStyle='rgba(120,140,160,0.4)'; ctx.font='12px Inter,sans-serif';
    ctx.fillText('Baseline planned', (W-arcW)/2, cy + arcH*0.22 - 16);

    // ── Draw each COA forward arc from NOW position ──
    ['c','b','a'].forEach(cid => {  // draw back-to-front so selected is on top
      const d = coaDefs[cid];
      const isSel = cid === activeCOAPreview;
      ctx.globalAlpha = isSel ? 1.0 : 0.18;

      // Forward arc from NOW: parameterised t goes 0 → 1 representing nowT → end
      const fwdW = arcW * d.arcWMult;
      const fwdH = arcH * d.arcHMult;
      const pts = [];
      for(let i=0;i<=steps;i++){
        const t = i/steps;
        // Start from nowX,nowY and sweep forward
        const px = nowX + fwdW * t;
        const py = nowY - fwdH * Math.sin(Math.PI * t * 0.85) * t;
        pts.push({x:px,y:py});
      }

      ctx.beginPath();
      pts.forEach((p,i) => i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
      ctx.strokeStyle = d.col;
      ctx.lineWidth   = isSel ? 2.2 : 0.9;
      ctx.setLineDash(isSel ? [] : [4,5]);
      ctx.stroke(); ctx.setLineDash([]);

      // Arrowhead
      const last=pts[pts.length-1], prev=pts[pts.length-6];
      const ang=Math.atan2(last.y-prev.y,last.x-prev.x);
      ctx.save(); ctx.translate(last.x,last.y); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-9,-4); ctx.lineTo(-9,4); ctx.closePath();
      ctx.fillStyle=d.col; ctx.fill(); ctx.restore();

      if(isSel){
        // Label + risk
        ctx.fillStyle=d.col; ctx.font='bold 13px Inter,sans-serif';
        const lblX = last.x > W*0.7 ? last.x - 110 : last.x + 10;
        ctx.fillText(d.label, lblX, last.y - 4);
        ctx.font='12px Inter,sans-serif'; ctx.fillStyle=d.col+'AA';
        ctx.fillText(d.risk+' RISK', lblX, last.y + 8);
        // Pulsing destination dot
        const pulse=0.5+0.5*Math.sin(animFrame*0.1);
        const dg=ctx.createRadialGradient(last.x,last.y,0,last.x,last.y,12+pulse*5);
        dg.addColorStop(0,d.col+'55'); dg.addColorStop(1,d.col+'00');
        ctx.beginPath(); ctx.arc(last.x,last.y,12+pulse*5,0,Math.PI*2); ctx.fillStyle=dg; ctx.fill();
        ctx.beginPath(); ctx.arc(last.x,last.y,4,0,Math.PI*2); ctx.fillStyle=d.col; ctx.fill();

        // NORAD predicted outcome for selected COA
        // Project NORAD along its approach vector to where it ends up
        const noradPredT = 0.88;
        const noradPredX = (1-noradPredT)*(1-noradPredT)*nStartX+2*(1-noradPredT)*noradPredT*nCpX+noradPredT*noradPredT*nEndX + (d.noradMiss ? W*0.08 : W*0.01);
        const noradPredY = (1-noradPredT)*(1-noradPredT)*nStartY+2*(1-noradPredT)*noradPredT*nCpY+noradPredT*noradPredT*nEndY + (d.noradMiss ? H*0.06 : 0);
        const nPredPulse = 0.5+0.5*Math.sin(animFrame*0.11);
        const nPredGlow  = ctx.createRadialGradient(noradPredX,noradPredY,0,noradPredX,noradPredY,18+nPredPulse*6);
        const nAlpha = d.noradMiss ? 0.2 : 0.5;
        nPredGlow.addColorStop(0,'rgba(204,51,51,'+nAlpha+')'); nPredGlow.addColorStop(1,'rgba(204,51,51,0)');
        ctx.beginPath(); ctx.arc(noradPredX,noradPredY,18+nPredPulse*6,0,Math.PI*2); ctx.fillStyle=nPredGlow; ctx.fill();
        ctx.save(); ctx.translate(noradPredX,noradPredY); ctx.rotate(Math.PI/4);
        ctx.strokeStyle=d.noradMiss?'rgba(204,51,51,0.35)':'#E04444'; ctx.lineWidth=1.5;
        ctx.fillStyle=d.noradMiss?'rgba(204,51,51,0.05)':'rgba(204,51,51,0.18)';
        ctx.beginPath(); ctx.rect(-5,-5,10,10); ctx.fill(); ctx.stroke(); ctx.restore();
        ctx.fillStyle=d.noradMiss?'rgba(204,51,51,0.6)':'#E04444'; ctx.font='12px Inter,sans-serif';
        ctx.fillText('Solstice-9 (predicted)', noradPredX+10, noradPredY-2);
        if(d.noradMiss){
          ctx.fillStyle='#2ECC71'; ctx.font='bold 12px Inter,sans-serif';
          ctx.fillText('✓ MISS · '+d.missBy, noradPredX+10, noradPredY+10);
        } else {
          ctx.fillStyle='#E04444'; ctx.font='bold 12px Inter,sans-serif';
          ctx.fillText('⚠ CLOSE PASS · '+d.missBy, noradPredX+10, noradPredY+10);
        }
      } else {
        ctx.beginPath(); ctx.arc(last.x,last.y,2.5,0,Math.PI*2); ctx.fillStyle=d.col; ctx.fill();
      }
      ctx.globalAlpha=1;
    });

    // ── OPS-7 NOW marker ──
    const nowPulse=0.5+0.5*Math.sin(animFrame*0.07);
    const ng=ctx.createRadialGradient(nowX,nowY,0,nowX,nowY,18+nowPulse*6);
    ng.addColorStop(0,'rgba(0,204,204,0.35)'); ng.addColorStop(1,'rgba(0,204,204,0)');
    ctx.beginPath(); ctx.arc(nowX,nowY,18+nowPulse*6,0,Math.PI*2); ctx.fillStyle=ng; ctx.fill();
    // Friendly circle symbol
    ctx.beginPath(); ctx.arc(nowX,nowY,7,0,Math.PI*2); ctx.strokeStyle='#00CCCC'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(nowX,nowY-7); ctx.lineTo(nowX,nowY+7); ctx.moveTo(nowX-7,nowY); ctx.lineTo(nowX+7,nowY);
    ctx.strokeStyle='#00CCCC'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle='rgba(180,220,220,0.85)'; ctx.font='bold 13px Inter,sans-serif';
    ctx.fillText('OPS-7 · NOW', nowX + 12, nowY - 6);
    ctx.fillStyle='rgba(0,204,204,0.5)'; ctx.font='12px Inter,sans-serif';
    ctx.fillText('LEO 518km', nowX + 12, nowY + 5);

    // ── COA legend ──
    const legY=H-52;
    ctx.fillStyle='#3A4A5A'; ctx.font='12px Inter,sans-serif'; ctx.letterSpacing='0.8px';
    ctx.fillText('COURSE OF ACTION', 14, legY);
    ['a','b','c'].forEach((cid,i)=>{
      const d=coaDefs[cid]; const isSel=cid===activeCOAPreview;
      ctx.globalAlpha=isSel?1:0.3;
      ctx.strokeStyle=d.col; ctx.lineWidth=isSel?2:1;
      ctx.setLineDash(isSel?[]:[3,4]);
      ctx.beginPath(); ctx.moveTo(14,legY+11+i*13); ctx.lineTo(30,legY+11+i*13); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle=d.col; ctx.font=isSel?'bold 8px Inter,sans-serif':'8px Inter,sans-serif';
      ctx.fillText(d.label+(isSel?' ← selected':''), 34, legY+14+i*13);
      ctx.globalAlpha=1;
    });

    return;
  }

  // Planned route
  if(vd.planned){
    const totalArcW = W*0.72;
    const arcH = H*0.32;
    const pts=[];
    const steps=vd.planned.steps;
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const px=cx - totalArcW/2 + totalArcW*t;
      const py=cy + arcH*Math.sin(Math.PI*t)*0.5 - 8; // slight orbital curve
      pts.push({x:px,y:py});
    }
    ctx.beginPath();
    pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
    ctx.strokeStyle='rgba(160,180,200,0.55)'; ctx.lineWidth=1.5; ctx.setLineDash([6,5]); ctx.stroke(); ctx.setLineDash([]);
    // direction arrow
    const last=pts[pts.length-1], prev=pts[pts.length-4];
    const ang=Math.atan2(last.y-prev.y,last.x-prev.x);
    ctx.save();ctx.translate(last.x,last.y);ctx.rotate(ang);
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-8,-4);ctx.lineTo(-8,4);ctx.closePath();
    ctx.fillStyle='rgba(160,180,200,0.55)';ctx.fill();ctx.restore();
    // Current position on planned path (~42% along)
    const planPosIdx = Math.floor(pts.length * 0.42);
    const planPos = pts[planPosIdx];
    const planPulse = 0.5 + 0.5 * Math.sin(animFrame * 0.08);
    const planGlow = ctx.createRadialGradient(planPos.x, planPos.y, 0, planPos.x, planPos.y, 10 + planPulse*4);
    planGlow.addColorStop(0,'rgba(160,180,200,0.3)'); planGlow.addColorStop(1,'rgba(160,180,200,0)');
    ctx.beginPath(); ctx.arc(planPos.x, planPos.y, 10+planPulse*4, 0, Math.PI*2); ctx.fillStyle=planGlow; ctx.fill();
    ctx.beginPath(); ctx.arc(planPos.x, planPos.y, 3, 0, Math.PI*2); ctx.fillStyle='rgba(180,200,220,0.9)'; ctx.fill();
    ctx.fillStyle='rgba(140,160,180,0.6)'; ctx.font='12px Inter,sans-serif'; ctx.fillText('NOW',planPos.x+6, planPos.y-5);
    // label
    ctx.fillStyle='rgba(140,160,180,0.7)';ctx.font='13px Inter,sans-serif';
    ctx.fillText('Planned Trajectory',cx-totalArcW/2,cy+arcH*0.25-16);
  }

  // Deviation path
  if(vd.deviation){
    const dev=vd.deviation.dev;
    const conf=vd.deviation.conf;
    const devColor = dev>=7 ? '#E04444' : '#DDEEFF';
    const totalArcW=W*0.65;
    const arcH=H*0.3;
    const dpts=[];
    const steps=vd.deviation.steps;
    const driftScale=dev>=7?1.0:0.5;
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const drift=vd.deviation.driftLat*driftScale*Math.sin(Math.PI*t)*t;
      const driftL=vd.deviation.driftLng*driftScale*Math.sin(Math.PI*t)*t;
      const px=cx - totalArcW/2 + totalArcW*(t+(driftL*0.04));
      const py=cy + arcH*Math.sin(Math.PI*t)*0.5 + drift*8;
      dpts.push({x:px,y:py});
    }
    // deviation band between planned and actual (if both exist)
    if(vd.planned){
      const ppts=[];
      const steps2=vd.planned.steps;
      const totalArcW2=W*0.72;
      const arcH2=H*0.32;
      for(let i=0;i<=steps2;i++){const t=i/steps2;ppts.push({x:cx-totalArcW2/2+totalArcW2*t,y:cy+arcH2*Math.sin(Math.PI*t)*0.5-8});}
      ctx.beginPath();
      ppts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
      [...dpts].reverse().forEach(p=>ctx.lineTo(p.x,p.y));
      ctx.closePath();
      ctx.fillStyle=dev>=7?'rgba(204,51,51,0.07)':'rgba(221,238,255,0.05)';ctx.fill();
    }
    // deviation line
    ctx.beginPath();
    dpts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
    ctx.strokeStyle=devColor; ctx.lineWidth=1.8; ctx.stroke();
    // arrow
    const last=dpts[dpts.length-1], prev=dpts[dpts.length-4];
    const ang=Math.atan2(last.y-prev.y,last.x-prev.x);
    ctx.save();ctx.translate(last.x,last.y);ctx.rotate(ang);
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-8,-4);ctx.lineTo(-8,4);ctx.closePath();
    ctx.fillStyle=devColor;ctx.fill();ctx.restore();
    // Current position on deviation path (~60% along for active anomaly)
    const devProgress = vd.type==='t' ? 0.60 : 0.42;
    const devPosIdx = Math.floor(dpts.length * devProgress);
    const devPos = dpts[devPosIdx];
    const devPulse = 0.5 + 0.5 * Math.sin(animFrame * 0.08 + 1.2);
    const devGlowR = 10 + devPulse*5;
    const devGlowC = ctx.createRadialGradient(devPos.x, devPos.y, 0, devPos.x, devPos.y, devGlowR);
    devGlowC.addColorStop(0, devColor.replace('#','rgba(').replace(/^rgba\(([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, (_,r,g,b)=>`rgba(${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)}`)+'0.45)');
    const devGlowSolid = vd.deviation.dev>=7 ? 'rgba(204,51,51,0.45)' : 'rgba(221,238,255,0.35)';
    const devGlowFade  = vd.deviation.dev>=7 ? 'rgba(204,51,51,0)'    : 'rgba(221,238,255,0)';
    const devGlow2 = ctx.createRadialGradient(devPos.x, devPos.y, 0, devPos.x, devPos.y, devGlowR);
    devGlow2.addColorStop(0, devGlowSolid); devGlow2.addColorStop(1, devGlowFade);
    ctx.beginPath(); ctx.arc(devPos.x, devPos.y, devGlowR, 0, Math.PI*2); ctx.fillStyle=devGlow2; ctx.fill();
    ctx.beginPath(); ctx.arc(devPos.x, devPos.y, 3.5, 0, Math.PI*2); ctx.fillStyle=devColor; ctx.fill();
    ctx.fillStyle=devColor; ctx.font='bold 12px Inter,sans-serif'; ctx.fillText('NOW', devPos.x+6, devPos.y-5);
    // confidence badge
    const midPt=dpts[Math.floor(dpts.length*0.58)];
    ctx.fillStyle='rgba(4,8,14,0.88)';
    ctx.fillRect(midPt.x+6,midPt.y-22,80,16);
    ctx.strokeStyle=devColor+'66';ctx.lineWidth=0.5;ctx.strokeRect(midPt.x+6,midPt.y-22,80,16);
    ctx.fillStyle=devColor;ctx.font='bold 13px Inter,sans-serif';
    ctx.fillText(`DEV ${dev}  CONF ${conf}%`,midPt.x+10,midPt.y-10);
    // label
    ctx.fillStyle=devColor+'BB';ctx.font='13px Inter,sans-serif';
    const lbx=dpts[4].x, lby=dpts[4].y+14;
    ctx.fillText('Actual / Deviation Path',lbx,lby);
  }

  // Legend bottom
  const legY=H-48;
  ctx.fillStyle='#7A8A9A';ctx.font='12px Inter,sans-serif';
  if(vd.planned){ ctx.strokeStyle='rgba(160,180,200,0.55)';ctx.setLineDash([4,3]);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(16,legY);ctx.lineTo(32,legY);ctx.stroke();ctx.setLineDash([]);ctx.fillText('Planned',36,legY+3); }
  if(vd.deviation){
    const dc=vd.deviation.dev>=7?'#E04444':'#DDEEFF';
    ctx.strokeStyle=dc;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(16,legY+14);ctx.lineTo(32,legY+14);ctx.stroke();
    ctx.fillStyle=dc;ctx.fillText('Actual / Deviation',36,legY+17);
  }

  // No data state
  if(!vd.planned && !vd.deviation){
    ctx.fillStyle='#2A3545';ctx.font='15px Inter,sans-serif';ctx.textAlign='center';
    ctx.fillText('No trajectory data available',cx,cy+80);ctx.textAlign='left';
  }
}


// ── SEARCH ──
const SEARCHABLE = Object.entries(VEH_DATA).map(([id,d])=>({id,label:d.label,type:d.type}));
function onSatSearch(val){
  const q=val.trim().toLowerCase();
  const box=document.getElementById('sat-suggestions');
  if(!q){box.style.display='none';return;}
  const hits=SEARCHABLE.filter(s=>s.label.toLowerCase().includes(q));
  if(!hits.length){box.style.display='none';return;}
  box.innerHTML=hits.map(s=>`
    <div onmousedown="selectSatResult('${s.id}')"
      style="padding:6px 10px;font-size:10px;font-weight:600;color:#DDEEFF;cursor:pointer;border-bottom:1px solid #1A2230;display:flex;align-items:center;gap:8px;"
      onmouseover="this.style.background='rgba(221,238,255,0.05)'" onmouseout="this.style.background=''"
    ><span style="width:6px;height:6px;border-radius:50%;background:${typeColor(s.type)};flex-shrink:0;display:inline-block"></span>${s.label}</div>
  `).join('');
  box.style.display='block';
}
function showSuggestions(){ if(document.getElementById('sat-search').value.trim()) document.getElementById('sat-suggestions').style.display='block'; }
function hideSuggestions(){ setTimeout(()=>document.getElementById('sat-suggestions').style.display='none',160); }
function selectSatResult(id){
  document.getElementById('sat-search').value=VEH_DATA[id]?.label||id;
  document.getElementById('sat-suggestions').style.display='none';
  zoomToVehicle(id);
  selectedGlobeVehicle=id;
}

// ── FILTER STATE ──
function getFilters(){
  return {
    showOurs:    document.getElementById('f-ours')?.checked,
    showGs:      document.getElementById('f-gs')?.checked,
    showAnom:  document.getElementById('f-anomaly')?.checked,
    showMon:     document.getElementById('f-monitor')?.checked,
    showNom:     document.getElementById('f-nom')?.checked,
    showRisk:    document.getElementById('f-atrisk')?.checked,
    showTraj:    document.getElementById('f-traj')?.checked,
  };
}

