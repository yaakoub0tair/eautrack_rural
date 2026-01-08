/* EauTrack Rural — Native CSS, Dark UI, Offline-first SPA */

const STORAGE_KEYS = { profile:"eautrack_profile", entries:"eautrack_entries", ui:"eautrack_ui" };

const HOUSING_FACTORS = { dorm:0.9, apartment:1.0, house:1.2, house_garden:1.5 };

const DEFAULT_ACTIVITIES = [
  { key:"shower", label:"Shower", color:"#38bdf8" },
  { key:"kitchen", label:"Kitchen", color:"#2dd4bf" },
  { key:"dishes", label:"Dishes", color:"#60a5fa" },
  { key:"garden", label:"Garden", color:"#34d399" }
];

let chartBreakdown = null;
let chartLastDays = null;

let currentView = "#/";
let dashboardMounted = false;
let dashboardRefs = null;

const $ = (sel) => document.querySelector(sel);

/* ---------- Helpers ---------- */
function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }
function safeParse(j,f){ try{return JSON.parse(j);}catch{return f;} }
function lireLocal(k,f){ const r=localStorage.getItem(k); return r?safeParse(r,f):f; }
function ecrireLocal(k,v){ localStorage.setItem(k, JSON.stringify(v)); }

function todayISO(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function nowHHmm(){ const d=new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }

function shiftDateISO(iso, deltaDays){
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0,10);
}
function formatShortDay(iso){
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday:"short", day:"2-digit" });
}

/* ---------- Inline SVG icons ---------- */
function iconDroplet(colorVar="--sky"){
  return `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(${colorVar})" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 2.5s6 6.6 6 11.1a6 6 0 1 1-12 0C6 9.1 12 2.5 12 2.5z"/>
  </svg>`;
}
function iconChart(colorVar="--teal"){
  return `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(${colorVar})" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M4 19V5" />
    <path d="M4 19h16" />
    <path d="M8 16v-6" />
    <path d="M12 16V8" />
    <path d="M16 16v-3" />
  </svg>`;
}
function iconClock(colorVar="--muted"){
  return `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(${colorVar})" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10z"/>
    <path d="M12 6v6l4 2"/>
  </svg>`;
}
function iconTrash(colorVar="--rose"){
  return `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(${colorVar})" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M4 7h16" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M6 7l1-3h10l1 3" />
    <path d="M7 7l1 14h8l1-14" />
  </svg>`;
}

/* ---------- Toast / Modal ---------- */
function showToast({type="info",title="Info",message=""}){
  const toast=$("#toast"), dot=$("#toastDot"), tTitle=$("#toastTitle"), tMsg=$("#toastMsg"), box=$("#toastBox");
  toast.classList.remove("toast--hidden");
  tTitle.textContent=title;
  tMsg.textContent=message;

  dot.style.background = type==="danger" ? "var(--rose)" : type==="warn" ? "var(--amber)" : "var(--sky)";
  box.style.borderColor = type==="danger" ? "rgba(251,113,133,.22)" : type==="warn" ? "rgba(251,191,36,.22)" : "var(--stroke)";

  clearTimeout(showToast._t);
  showToast._t=setTimeout(()=>toast.classList.add("toast--hidden"),3200);
}

function showModal({type="warn",title="Alert",message=""}){
  const modal=$("#modal"), icon=$("#modalIcon"), mTitle=$("#modalTitle"), mMsg=$("#modalMsg");
  modal.classList.remove("modal--hidden");
  mTitle.textContent=title;
  mMsg.textContent=message;

  if(type==="danger"){
    icon.style.background="rgba(251,113,133,.14)";
    icon.style.borderColor="rgba(251,113,133,.22)";
    icon.style.color="var(--rose)";
    icon.textContent="!";
  }else{
    icon.style.background="rgba(251,191,36,.14)";
    icon.style.borderColor="rgba(251,191,36,.22)";
    icon.style.color="var(--amber)";
    icon.textContent="!";
  }
}
function hideModal(){ $("#modal").classList.add("modal--hidden"); }

/* ---------- Storage ---------- */
function getProfile(){ return lireLocal(STORAGE_KEYS.profile, null); }
function saveProfile(p){ ecrireLocal(STORAGE_KEYS.profile, p); }
function getEntries(){ return lireLocal(STORAGE_KEYS.entries, []); }
function setEntries(a){ ecrireLocal(STORAGE_KEYS.entries, a); }

/* ---------- Logic ---------- */
function calcQuota(nb, type){
  const factor = HOUSING_FACTORS[type] ?? 1.0;
  return Math.round(150 * Number(nb||1) * factor);
}

function totalForDay(dateISO){
  return getEntries().filter(e=>e.date===dateISO).reduce((s,e)=>s+Number(e.liters||0),0);
}

function breakdownForDay(dateISO){
  const entries=getEntries().filter(e=>e.date===dateISO);
  const map={}; for(const a of DEFAULT_ACTIVITIES) map[a.key]=0;
  for(const e of entries) map[e.activity]=(map[e.activity]||0)+Number(e.liters||0);
  return map;
}

function lastNDaysTotals(n=5){
  const today=todayISO();
  const dates=[];
  for(let i=n-1;i>=0;i--) dates.push(shiftDateISO(today,-i));
  const totals=dates.map(d=>totalForDay(d));
  return {dates,totals};
}

function pctUsed(total, quota){ if(!quota||quota<=0) return 0; return Math.round((total/quota)*100); }

function getProgressVariant(pct){
  if(pct<80) return "ok";
  if(pct<=100) return "warn";
  return "bad";
}

function badgeFor(total, quota){
  if(!quota) return {label:"—", ok:true};
  const ok = total < quota;
  return {label: ok ? "Eco Hero" : "Quota Breaker", ok};
}

function computeStreak(){
  const quota=getProfile()?.quota_l_day||0;
  if(!quota) return 0;

  const entries=getEntries();
  const totalsByDate={};
  for(const e of entries) totalsByDate[e.date]=(totalsByDate[e.date]||0)+Number(e.liters||0);

  let streak=0;
  let d=new Date();
  for(let i=0;i<30;i++){
    const iso=d.toISOString().slice(0,10);
    if(!totalsByDate[iso]) break;
    if(totalsByDate[iso]<quota) streak++;
    else break;
    d.setDate(d.getDate()-1);
  }
  return streak;
}

function savingsEstimateDH(profile, pct){
  const bill=Number(profile?.bill_avg_dh||0);
  if(!bill) return 0;
  const ratio=Math.max(0,(100-Math.min(pct,100))/100);
  return Math.round(bill*0.25*ratio);
}

function checkAlerts(total, quota){
  const pct=pctUsed(total,quota);
  const ui=lireLocal(STORAGE_KEYS.ui,{});
  const key=`alert_${todayISO()}`;
  const last=ui[key]||0;

  if(pct>=100 && last<100){
    ui[key]=100; ecrireLocal(STORAGE_KEYS.ui,ui);
    showModal({
      type:"danger",
      title:"Quota exceeded",
      message:"Tips: Shorter showers, close tap while soaping, fix leaks, group dishes."
    });
    return;
  }
  if(pct>=80 && last<80){
    ui[key]=80; ecrireLocal(STORAGE_KEYS.ui,ui);
    showToast({type:"warn", title:"Warning", message:"80% of your daily quota reached."});
  }
}

/* ---------- Demo seed (only if empty) ---------- */
function seedIfEmpty(){
  const profile=getProfile();
  if(!profile){
    const demo={
      full_name:"Residence",
      nb_personnes:4,
      type_habitation:"apartment",
      bill_avg_dh:220,
      billing_frequency:"monthly",
      last_payment_dh:210,
      wasted_last_month_l:1800,
      time_factor_min_day:12,
      region:"urban",
      created_at:new Date().toISOString()
    };
    demo.quota_l_day=calcQuota(demo.nb_personnes,demo.type_habitation);
    saveProfile(demo);
  }

  const entries=getEntries();
  if(entries && entries.length) return;

  const today=todayISO();
  const seeded=[];
  const samples=[
    {day:-4,a:"shower",l:28,t:"07:30"},
    {day:-3,a:"kitchen",l:16,t:"09:10"},
    {day:-2,a:"dishes",l:22,t:"13:20"},
    {day:-1,a:"shower",l:40,t:"18:15"},
    {day: 0,a:"shower",l:35,t:"07:40"},
    {day: 0,a:"kitchen",l:12,t:"09:10"},
    {day: 0,a:"dishes",l:18,t:"13:25"}
  ];
  for(const s of samples){
    seeded.push({ id: crypto.randomUUID(), date: shiftDateISO(today, s.day), time: s.t, activity: s.a, liters: s.l, synced:false });
  }
  setEntries(seeded);
}

/* ---------- Routing ---------- */
const routes = {
  "#/": renderLanding,
  "#/onboarding/1": renderOnboarding1,
  "#/onboarding/2": renderOnboarding2,
  "#/onboarding/3": renderOnboarding3,
  "#/onboarding/4": renderOnboarding4,
  "#/dashboard": renderDashboard,
  "#/settings": renderSettings,
  "#/logout": doLogout
};

function navigate(hash){ window.location.hash = hash; }
function route(){ return window.location.hash || "#/"; }

function requireProfile(){
  const p=getProfile();
  const r=route();
  if(!p && (r==="#/dashboard" || r==="#/settings")) navigate("#/onboarding/1");
}

function setBottomNav(){
  const p=!!getProfile();
  const r=route();
  const show = p && (r==="#/dashboard" || r==="#/settings");
  $("#bottomNav").classList.toggle("bottomnav--hidden", !show);
}

function cleanupIfLeavingDashboard(nextRoute){
  if(nextRoute !== "#/dashboard"){
    dashboardMounted=false;
    dashboardRefs=null;
    if(chartBreakdown){ chartBreakdown.destroy(); chartBreakdown=null; }
    if(chartLastDays){ chartLastDays.destroy(); chartLastDays=null; }
  }
}

function router(){
  requireProfile();
  const r=route();
  currentView=r;
  setBottomNav();
  cleanupIfLeavingDashboard(r);

  (routes[r] || renderNotFound)();
}

/* ---------- Views ---------- */
function renderLanding(){
  $("#app").innerHTML = `
    <div class="grid grid--main">
      <div class="stack">
        <div class="card card--soft card__pad-lg">
          <div class="row row--start">
            <div>
              <h1 class="h1">EauTrack Rural</h1>
              <div class="muted" style="margin-top:8px;">Track water usage offline with clean charts.</div>
            </div>
            <div class="pillTag">
              ${iconDroplet("--sky")}
            </div>
          </div>

          <div style="margin-top:16px; display:grid; gap:12px;">
            <div class="card card__pad">
              <div class="row">
                <div class="row__left">
                  ${iconChart("--teal")}
                  <div style="font-weight:700;">Last 5 days diagram</div>
                </div>
                <div class="small muted">Trend view</div>
              </div>
            </div>

            <div class="card card__pad">
              <div class="row">
                <div class="row__left">
                  ${iconDroplet("--sky")}
                  <div style="font-weight:700;">Quota alerts</div>
                </div>
                <div class="small muted">80% / 100%</div>
              </div>
            </div>
          </div>

          <div style="margin-top:16px; display:grid; gap:10px;">
            <button class="btn btn--primary" data-action="start">Start</button>
            <button class="btn btn--ghost" data-action="demo">Load demo data</button>
          </div>
        </div>
      </div>

      <div class="stack">
        <div class="card card__pad-lg">
          <div class="h2">Baseline quota</div>
          <div class="muted" style="margin-top:8px;">150 L / person / day (then adjusted by housing).</div>
        </div>
      </div>
    </div>
  `;
}

function wizardShell({step,title,subtitle,nextLabel="Next",contentHTML}){
  const pct = Math.round((step/4)*100);

  $("#app").innerHTML = `
    <div class="grid grid--main">
      <div class="stack">
        <div class="card card--soft card__pad-lg">
          <div class="row row--start">
            <div>
              <div class="small muted">Onboarding • Step ${step}/4</div>
              <div class="h2" style="margin-top:8px;">${title}</div>
              <div class="muted" style="margin-top:6px;">${subtitle || ""}</div>
            </div>
            <div class="pillTag">${iconDroplet("--sky")}</div>
          </div>

          <div class="progress" style="margin-top:14px;">
            <div class="progress__bar progress__bar--ok" style="width:${pct}%;"></div>
          </div>

          <div style="margin-top:14px; display:grid; gap:12px;">
            ${contentHTML}
          </div>

          <div style="margin-top:16px;">
            <button class="btn btn--primary" data-action="wizard-next">${nextLabel}</button>
          </div>
        </div>
      </div>

      <div class="stack">
        <div class="card card__pad-lg">
          <div class="h2">Offline-first</div>
          <div class="muted" style="margin-top:8px;">No internet required. Data stays on this device.</div>
        </div>
      </div>
    </div>
  `;
}

function renderOnboarding1(){
  const p=getProfile()||{};
  wizardShell({
    step:1,
    title:"Personal information",
    subtitle:"Who will be tracked?",
    contentHTML: `
      <div class="card card__pad">
        <div class="field">
          <label class="label">Household / name</label>
          <input id="full_name" class="input" placeholder="Name" value="${p.full_name||""}">
        </div>
      </div>

      <div class="card card__pad">
        <div class="field">
          <label class="label">Number of persons (1–6)</label>
          <select id="nb_personnes" class="select">
            ${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${String(p.nb_personnes||"")==String(n)?"selected":""}>${n}</option>`).join("")}
          </select>
        </div>
      </div>
    `
  });
}

function renderOnboarding2(){
  const p=getProfile()||{};
  wizardShell({
    step:2,
    title:"Monthly usage",
    subtitle:"Quick estimates.",
    contentHTML: `
      <div class="card card__pad">
        <div class="field">
          <label class="label">Average bill (DH)</label>
          <input id="bill_avg_dh" type="number" class="input" min="0" value="${p.bill_avg_dh||""}" placeholder="220">
        </div>
      </div>

      <div class="card card__pad">
        <div class="field">
          <label class="label">Last payment (DH)</label>
          <input id="last_payment_dh" type="number" class="input" min="0" value="${p.last_payment_dh||""}" placeholder="210">
        </div>
      </div>

      <div class="card card__pad">
        <div class="field">
          <label class="label">Wasted last month (L)</label>
          <input id="wasted_last_month_l" type="number" class="input" min="0" value="${p.wasted_last_month_l||""}" placeholder="1800">
        </div>
      </div>
    `
  });
}

function renderOnboarding3(){
  const p=getProfile()||{};
  const ui=lireLocal(STORAGE_KEYS.ui,{});
  const chosen=ui.selectedHousing || p.type_habitation || "apartment";

  const tile=(key,label)=>{
    const active = chosen===key;
    return `
      <button class="btn ${active ? "btn--primary" : "btn--ghost"}" data-action="pick-housing" data-value="${key}" type="button">
        ${label} <span class="small" style="opacity:.85;">(x${HOUSING_FACTORS[key]})</span>
      </button>
    `;
  };

  wizardShell({
    step:3,
    title:"Housing",
    subtitle:"Affects daily quota.",
    contentHTML: `
      <div class="card card__pad" style="display:grid; gap:10px;">
        ${tile("dorm","Dorm")}
        ${tile("apartment","Apartment")}
        ${tile("house","House")}
        ${tile("house_garden","House + garden")}
      </div>

      <div class="card card__pad">
        <div class="small muted">Preview quota</div>
        <div style="margin-top:6px; font-weight:800; font-size:22px;">
          ${calcQuota(p.nb_personnes||1, chosen)} L/day
        </div>
      </div>
    `
  });
}

function renderOnboarding4(){
  const p=getProfile()||{};
  const ui=lireLocal(STORAGE_KEYS.ui,{});
  const chosen=ui.selectedRegion || p.region || "urban";

  const tile=(key,label)=>{
    const active = chosen===key;
    return `
      <button class="btn ${active ? "btn--primary" : "btn--ghost"}" data-action="pick-region" data-value="${key}" type="button">
        ${label}
      </button>
    `;
  };

  wizardShell({
    step:4,
    title:"Region",
    subtitle:"Used for tips messaging.",
    nextLabel:"Finish",
    contentHTML: `
      <div class="card card__pad" style="display:grid; gap:10px;">
        ${tile("rural","Rural")}
        ${tile("urban","Urban")}
      </div>
    `
  });
}

function renderDashboard(){
  const p=getProfile();
  if(!p){ navigate("#/onboarding/1"); return; }
  if(!p.quota_l_day){
    p.quota_l_day = calcQuota(p.nb_personnes, p.type_habitation||"apartment");
    saveProfile(p);
  }

  const quota = p.quota_l_day;
  const d = todayISO();

  $("#app").innerHTML = `
    <div class="grid grid--main">
      <div class="stack">
        <div class="card card--soft card__pad-lg">
          <div class="row row--start">
            <div>
              <div class="small muted">Today</div>
              <div class="h2" style="margin-top:6px;">${p.full_name}</div>
              <div class="muted" style="margin-top:6px;">Quota: <span style="color:var(--sky); font-weight:800;">${quota} L/day</span></div>
            </div>
            <div id="badgePill" class="pillTag pillTag--ok">
              <div class="small muted">Badge</div>
              <div id="badgeLabel" style="font-weight:800;">Eco Hero</div>
            </div>
          </div>

          <div class="card card__pad" style="margin-top:14px;">
            <div class="row row--start">
              <div>
                <div class="small muted">Consumption</div>
                <div class="kpiRow">
                  <div id="kpiTotal" class="kpi">0</div>
                  <div style="font-weight:800; color:var(--muted);">L</div>
                </div>
              </div>
              <div style="text-align:right;">
                <div class="small muted">Progress</div>
                <div id="kpiPctText" style="font-weight:800;">0% used</div>
              </div>
            </div>

            <div class="progress" style="margin-top:12px;">
              <div id="progressBar" class="progress__bar"></div>
            </div>

            <div id="kpiTip" class="small muted" style="margin-top:10px;"></div>
          </div>

          <div style="margin-top:12px; display:grid; gap:12px; grid-template-columns: 1fr 1fr;">
            <div class="card card__pad">
              <div class="small muted">Savings est.</div>
              <div id="kpiSavings" style="margin-top:6px; font-weight:900; color:var(--sky); font-size:20px;">0 DH/month</div>
            </div>
            <div class="card card__pad">
              <div class="small muted">Streak</div>
              <div id="kpiStreak" style="margin-top:6px; font-weight:900; font-size:20px;">0 days</div>
            </div>
          </div>
        </div>

        <div class="card card__pad">
          <div class="row">
            <div class="row__left">
              ${iconChart("--teal")}
              <div class="h2">Last 5 days usage</div>
            </div>
            <div class="small muted">Liters/day</div>
          </div>
          <div class="chartBox" style="margin-top:12px;">
            <canvas id="lastDaysChart"></canvas>
          </div>
        </div>

        <div class="card card__pad">
          <div class="row">
            <div class="row__left">
              ${iconDroplet("--sky")}
              <div class="h2">Today breakdown</div>
            </div>
            <div class="small muted">${d}</div>
          </div>
          <div class="chartBox" style="margin-top:12px;">
            <canvas id="donutChart"></canvas>
          </div>
        </div>
      </div>

      <div class="stack">
        <div class="card card__pad">
          <div class="row">
            <div class="h2">Add consumption</div>
            <div class="row__left small muted">
              ${iconClock("--muted")}
              <span>${d}</span>
            </div>
          </div>

          <form id="entryForm" style="margin-top:12px; display:grid; gap:12px;">
            <div class="field">
              <label class="label">Activity</label>
              <select id="activity" class="select">
                ${DEFAULT_ACTIVITIES.map(a=>`<option value="${a.key}">${a.label}</option>`).join("")}
              </select>
            </div>

            <div style="display:grid; gap:12px; grid-template-columns: 1fr 1fr;">
              <div class="field">
                <label class="label">Liters</label>
                <input id="liters" class="input" type="number" min="1" max="500" placeholder="15" required>
              </div>
              <div class="field">
                <label class="label">Time</label>
                <input id="time" class="input" type="time" value="${nowHHmm()}" required>
              </div>
            </div>

            <button class="btn btn--primary" data-action="add-entry" type="submit">Add entry</button>
          </form>
        </div>

        <div class="card card__pad">
          <div class="row">
            <div class="h2">Recent entries</div>
            <button class="btn btn--ghost" type="button" data-action="clear-today">
              <span style="display:inline-flex; align-items:center; gap:8px;">
                ${iconTrash("--rose")}
                <span>Clear today</span>
              </span>
            </button>
          </div>

          <div id="entriesList" style="margin-top:12px; display:grid; gap:10px;"></div>
        </div>
      </div>
    </div>
  `;

  dashboardRefs = {
    kpiTotal: $("#kpiTotal"),
    kpiPctText: $("#kpiPctText"),
    progressBar: $("#progressBar"),
    badgePill: $("#badgePill"),
    badgeLabel: $("#badgeLabel"),
    kpiSavings: $("#kpiSavings"),
    kpiStreak: $("#kpiStreak"),
    kpiTip: $("#kpiTip"),
    entriesList: $("#entriesList")
  };
  dashboardMounted = true;

  initCharts();
  updateDashboardUI();
  renderEntries();
}

function renderSettings(){
  const p=getProfile();
  if(!p){ navigate("#/onboarding/1"); return; }

  $("#app").innerHTML = `
    <div class="grid grid--main">
      <div class="stack">
        <div class="card card--soft card__pad-lg">
          <div class="h2">Settings</div>
          <div class="muted" style="margin-top:6px;">Edit your offline profile.</div>

          <form id="settingsForm" style="margin-top:14px; display:grid; gap:12px;">
            <div class="card card__pad">
              <div class="field">
                <label class="label">Full name</label>
                <input id="s_full_name" class="input" value="${p.full_name||""}">
              </div>
            </div>

            <div class="card card__pad">
              <div class="field">
                <label class="label">Persons</label>
                <select id="s_nb_personnes" class="select">
                  ${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${String(p.nb_personnes)==String(n)?"selected":""}>${n}</option>`).join("")}
                </select>
              </div>
            </div>

            <div class="card card__pad">
              <div class="field">
                <label class="label">Housing</label>
                <select id="s_type_habitation" class="select">
                  ${Object.keys(HOUSING_FACTORS).map(k=>`<option value="${k}" ${p.type_habitation===k?"selected":""}>${k}</option>`).join("")}
                </select>
              </div>
            </div>

            <div class="card card__pad">
              <div class="field">
                <label class="label">Region</label>
                <select id="s_region" class="select">
                  <option value="rural" ${p.region==="rural"?"selected":""}>rural</option>
                  <option value="urban" ${p.region==="urban"?"selected":""}>urban</option>
                </select>
              </div>
            </div>

            <div class="card card__pad">
              <div class="field">
                <label class="label">Average bill (DH)</label>
                <input id="s_bill_avg_dh" class="input" type="number" min="0" value="${p.bill_avg_dh||0}">
              </div>
            </div>

            <button class="btn btn--primary" data-action="save-settings" type="submit">Save</button>
          </form>
        </div>
      </div>

      <div class="stack">
        <div class="card card__pad-lg">
          <div class="h2">Quota preview</div>
          <div class="muted" style="margin-top:6px;">Quota recalculates when saved.</div>
        </div>
      </div>
    </div>
  `;
}

function renderNotFound(){
  $("#app").innerHTML = `
    <div class="card card--soft card__pad-lg">
      <div class="h2">404</div>
      <div class="muted" style="margin-top:6px;">Route not found.</div>
      <div style="margin-top:12px;">
        <a class="btn btn--primary" href="#/">Go home</a>
      </div>
    </div>
  `;
}

/* ---------- Dashboard updates ---------- */
function updateDashboardUI(){
  if(!dashboardMounted || !dashboardRefs) return;

  const p=getProfile();
  const quota=p.quota_l_day||0;
  const total=totalForDay(todayISO());
  const pct=pctUsed(total,quota);

  // progress style
  const variant=getProgressVariant(pct);
  dashboardRefs.progressBar.className = "progress__bar";
  dashboardRefs.progressBar.classList.add(
    variant==="ok" ? "progress__bar--ok" : variant==="warn" ? "progress__bar--warn" : "progress__bar--bad"
  );
  if(pct>=80) dashboardRefs.progressBar.classList.add("stripes");
  dashboardRefs.progressBar.style.width = `${Math.min(pct,120)}%`;

  const badge=badgeFor(total,quota);
  dashboardRefs.badgeLabel.textContent = badge.label;
  dashboardRefs.badgePill.className = "pillTag " + (badge.ok ? "pillTag--ok" : "pillTag--bad");

  dashboardRefs.kpiTotal.textContent = total;
  dashboardRefs.kpiPctText.textContent = `${pct}% used`;
  dashboardRefs.kpiSavings.textContent = `${savingsEstimateDH(p,pct)} DH/month`;
  dashboardRefs.kpiStreak.textContent = `${computeStreak()} days`;
  dashboardRefs.kpiTip.textContent = (p.region==="rural")
    ? "Tip: Fix leaks early and reuse rinse water for cleaning."
    : "Tip: Group dishes, and keep showers short.";

  checkAlerts(total, quota);
}

/* ---------- Charts ---------- */
function initCharts(){
  if(chartBreakdown){ chartBreakdown.destroy(); chartBreakdown=null; }
  if(chartLastDays){ chartLastDays.destroy(); chartLastDays=null; }

  const donut = $("#donutChart");
  const initial = breakdownForDay(todayISO());

  chartBreakdown = new Chart(donut, {
    type: "doughnut",
    data: {
      labels: DEFAULT_ACTIVITIES.map(a=>a.label),
      datasets: [{
        data: DEFAULT_ACTIVITIES.map(a=>initial[a.key]||0),
        backgroundColor: DEFAULT_ACTIVITIES.map(a=>a.color),
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      animation: { duration: 650 },
      plugins: {
        legend: { position: "bottom", labels: { color: "#94a3b8", usePointStyle: true, pointStyle:"circle" } }
      }
    }
  });

  const last = $("#lastDaysChart");
  const { dates, totals } = lastNDaysTotals(5);

  chartLastDays = new Chart(last, {
    type: "line",
    data: {
      labels: dates.map(formatShortDay),
      datasets: [{
        data: totals,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56,189,248,0.18)",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#38bdf8"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700 },
      scales: {
        y: { beginAtZero: true, grid: { color: "rgba(148,163,184,0.12)" }, ticks: { color: "#94a3b8" } },
        x: { grid: { display: false }, ticks: { color: "#94a3b8" } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function updateCharts(){
  if(chartBreakdown){
    const map = breakdownForDay(todayISO());
    chartBreakdown.data.datasets[0].data = DEFAULT_ACTIVITIES.map(a => map[a.key] || 0);
    chartBreakdown.update();
  }
  if(chartLastDays){
    const { dates, totals } = lastNDaysTotals(5);
    chartLastDays.data.labels = dates.map(formatShortDay);
    chartLastDays.data.datasets[0].data = totals;
    chartLastDays.update();
  }
}

/* ---------- Entries ---------- */
function renderEntries(){
  const list = dashboardRefs?.entriesList;
  if(!list) return;

  const d=todayISO();
  const entries=getEntries()
    .filter(e=>e.date===d)
    .sort((a,b)=>(a.time>b.time?-1:1))
    .slice(0,12);

  if(!entries.length){
    list.innerHTML = `<div class="muted">No entries yet.</div>`;
    return;
  }

  list.innerHTML = entries.map(e=>{
    const label = DEFAULT_ACTIVITIES.find(a=>a.key===e.activity)?.label || e.activity;
    return `
      <div class="item">
        <div class="item__left">
          <div class="item__icon">${iconDroplet("--sky")}</div>
          <div>
            <div class="item__title">${label}</div>
            <div class="item__sub">${e.date} • ${e.time}</div>
          </div>
        </div>
        <div class="item__right">
          <div style="font-weight:900;">${e.liters} L</div>
          <button class="item__btn" type="button" data-action="delete-entry" data-id="${e.id}">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

function addEntryFromForm(){
  const activity = $("#activity")?.value;
  const liters = Number($("#liters")?.value);
  const time = $("#time")?.value || nowHHmm();
  const date = todayISO();

  if(!activity){ showToast({type:"warn", title:"Missing", message:"Choose an activity."}); return; }
  if(!liters || liters<=0){ showToast({type:"warn", title:"Invalid", message:"Enter liters > 0."}); return; }

  const entry = { id: crypto.randomUUID(), activity, liters: Math.round(liters), date, time, synced:false };
  const arr = getEntries();
  arr.push(entry);
  setEntries(arr);

  $("#liters").value="";
  $("#time").value=nowHHmm();

  showToast({type:"info", title:"Saved", message:"Entry added (offline)."});
  renderEntries();
  updateCharts();
  updateDashboardUI();
}

function deleteEntry(id){
  setEntries(getEntries().filter(e=>e.id!==id));
  showToast({type:"info", title:"Deleted", message:"Entry removed."});
  renderEntries();
  updateCharts();
  updateDashboardUI();
}

function clearToday(){
  setEntries(getEntries().filter(e=>e.date!==todayISO()));
  showToast({type:"info", title:"Cleared", message:"Today entries removed."});
  renderEntries();
  updateCharts();
  updateDashboardUI();
}

/* ---------- Onboarding save ---------- */
function wizardNext(){
  const p=getProfile()||{};

  if(currentView==="#/onboarding/1"){
    const full_name = $("#full_name")?.value.trim();
    const nb_personnes = Number($("#nb_personnes")?.value);
    if(!full_name){ showToast({type:"warn", title:"Missing", message:"Enter a name."}); return; }
    saveProfile({ ...p, full_name, nb_personnes });
    navigate("#/onboarding/2");
    return;
  }

  if(currentView==="#/onboarding/2"){
    const bill_avg_dh = Number($("#bill_avg_dh")?.value || 0);
    if(!bill_avg_dh){ showToast({type:"warn", title:"Missing", message:"Enter average bill."}); return; }

    saveProfile({
      ...p,
      bill_avg_dh,
      last_payment_dh: Number($("#last_payment_dh")?.value || 0),
      wasted_last_month_l: Number($("#wasted_last_month_l")?.value || 0)
    });
    navigate("#/onboarding/3");
    return;
  }

  if(currentView==="#/onboarding/3"){
    const ui=lireLocal(STORAGE_KEYS.ui,{});
    const type_habitation = ui.selectedHousing || p.type_habitation || "apartment";
    const updated = { ...p, type_habitation };
    updated.quota_l_day = calcQuota(updated.nb_personnes||1, updated.type_habitation);
    saveProfile(updated);
    navigate("#/onboarding/4");
    return;
  }

  if(currentView==="#/onboarding/4"){
    const ui=lireLocal(STORAGE_KEYS.ui,{});
    const region = ui.selectedRegion || p.region || "urban";
    const updated = { ...p, region };
    updated.quota_l_day = calcQuota(updated.nb_personnes||1, updated.type_habitation || "apartment");
    saveProfile(updated);
    showToast({type:"info", title:"Saved", message:"Profile created."});
    navigate("#/dashboard");
    return;
  }
}

/* ---------- Settings save ---------- */
function saveSettingsFromForm(){
  const p=getProfile();
  if(!p){ navigate("#/onboarding/1"); return; }

  const updated = {
    ...p,
    full_name: $("#s_full_name")?.value.trim() || p.full_name,
    nb_personnes: Number($("#s_nb_personnes")?.value || p.nb_personnes),
    type_habitation: $("#s_type_habitation")?.value || p.type_habitation,
    region: $("#s_region")?.value || p.region,
    bill_avg_dh: Number($("#s_bill_avg_dh")?.value || p.bill_avg_dh || 0)
  };
  updated.quota_l_day = calcQuota(updated.nb_personnes, updated.type_habitation || "apartment");
  saveProfile(updated);

  showToast({type:"info", title:"Saved", message:"Profile updated."});
  navigate("#/dashboard");
}

/* ---------- Logout ---------- */
function doLogout(){
  localStorage.removeItem(STORAGE_KEYS.profile);
  localStorage.removeItem(STORAGE_KEYS.entries);
  localStorage.removeItem(STORAGE_KEYS.ui);
  if(chartBreakdown){ chartBreakdown.destroy(); chartBreakdown=null; }
  if(chartLastDays){ chartLastDays.destroy(); chartLastDays=null; }
  showToast({type:"info", title:"Logged out", message:"Local data cleared."});
  navigate("#/");
}

/* ---------- Event delegation (stable clicks) ---------- */
/* Using event delegation prevents “lost listeners” after innerHTML rerenders. [web:89][web:92] */
document.addEventListener("click", (e) => {
  const actionEl = e.target.closest("[data-action]");
  if(actionEl){
    const action = actionEl.getAttribute("data-action");
    const value = actionEl.getAttribute("data-value");
    const id = actionEl.getAttribute("data-id");

    switch(action){
      case "start": navigate("#/onboarding/1"); break;
      case "demo": seedIfEmpty(); navigate("#/dashboard"); break;

      case "wizard-next": wizardNext(); break;
      case "pick-housing": {
        const ui=lireLocal(STORAGE_KEYS.ui,{});
        ui.selectedHousing=value;
        ecrireLocal(STORAGE_KEYS.ui,ui);
        renderOnboarding3();
        break;
      }
      case "pick-region": {
        const ui=lireLocal(STORAGE_KEYS.ui,{});
        ui.selectedRegion=value;
        ecrireLocal(STORAGE_KEYS.ui,ui);
        renderOnboarding4();
        break;
      }

      case "add-entry":
        e.preventDefault();
        addEntryFromForm();
        break;

      case "delete-entry":
        deleteEntry(id);
        break;

      case "clear-today":
        clearToday();
        break;

      case "save-settings":
        e.preventDefault();
        saveSettingsFromForm();
        break;

      case "modal-close":
        hideModal();
        break;
      case "modal-ok":
        hideModal();
        break;
    }
  }

  if(e.target?.id==="toastClose") $("#toast").classList.add("toast--hidden");
});

document.addEventListener("submit", (e) => {
  if(e.target?.id === "entryForm"){
    e.preventDefault();
    addEntryFromForm();
  }
  if(e.target?.id === "settingsForm"){
    e.preventDefault();
    saveSettingsFromForm();
  }
});

window.addEventListener("hashchange", router);

(function init(){
  // Keep demo only when empty; remove this call if you don't want auto demo.
  seedIfEmpty();

  if(!window.location.hash) window.location.hash="#/";
  router();
})();
