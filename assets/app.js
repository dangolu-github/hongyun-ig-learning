(()=>{'use strict';
const base=document.body.dataset.root||'./',host=document.getElementById('app'),params=new URLSearchParams(location.search);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* Signed in once per browser: the token stays in localStorage until the service answers that it is unknown or revoked
   (Teacher → Sign out all devices). A network failure keeps it and offers Try again. The teacher preview is kept the same
   way under its own key, so it also opens in new tabs. Storage can be unavailable (private mode): every access is guarded. */
const kept=k=>{try{return localStorage.getItem(k)||sessionStorage.getItem(k)||''}catch(e){try{return sessionStorage.getItem(k)||''}catch(e2){return ''}}};
const keep=(k,v)=>{try{if(v)localStorage.setItem(k,v);else localStorage.removeItem(k);sessionStorage.removeItem(k)}catch(e){try{if(v)sessionStorage.setItem(k,v);else sessionStorage.removeItem(k)}catch(e2){}}};
const previewFragment=new URLSearchParams(location.hash.slice(1)).get('preview');
if(previewFragment){keep('hongyun-preview',previewFragment);params.set('preview','1');history.replaceState(null,'',location.pathname+'?'+params);}
const preview=params.get('preview')==='1';
const KEY=preview?'hongyun-preview':'hongyun-access',store={get:()=>kept(KEY),set:v=>keep(KEY,v)};
const refused=e=>!!e&&(e.reason==='unknown'||e.reason==='revoked');/* the only answers that forget the stored token */
const link=(route,id)=>base+route+(id?'?id='+encodeURIComponent(id):'')+(preview?(id?'&':'?')+'preview=1':'');
async function api(action,payload={}){const r=await fetch(window.HONGYUN_CONFIG.endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...payload})});const j=await r.json();if(!j.ok){const e=Error(j.error||'Please try again.');e.answered=true;e.reason=j.reason||'';throw e;}return j;}
const getHome=async()=>{const home=await api('getHome',{token:store.get()});if(refused({reason:home.access}))store.set('');return home;};
function shell(title,content,back='',backLabel='Home'){
host.innerHTML=(preview?'<p class="zp-preview">Teacher preview</p>':'')+(back?'<p class="zp-back"><a href="'+back+'">← '+esc(backLabel)+'</a></p>':'')+'<p class="zp-kicker">IG English</p><h1>'+esc(title)+'</h1>'+content;
document.getElementById('home-link').href=link('');document.getElementById('brand-link').href=link('');folds();}
function folds(){const key='hongyun-portal-folds:'+location.pathname+(params.get('id')||'')+(preview?':preview':':student');let state={};try{state=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}document.querySelectorAll('details[data-fold]').forEach(d=>{if(typeof state[d.dataset.fold]==='boolean')d.open=state[d.dataset.fold];d.addEventListener('toggle',()=>{if(document.documentElement.dataset.printing)return;state[d.dataset.fold]=d.open;try{localStorage.setItem(key,JSON.stringify(state))}catch(e){}})});}
function statusPill(m){if(m.section!=='homework')return '';const s=m.status;if(s&&s.checked)return '<span class="zp-pill good">Checked · '+esc(s.checked.total)+'/'+esc(s.checked.max)+'</span>';if(s&&s.handedIn)return '<span class="zp-pill">Handed in</span>';return m.released?'<span class="zp-pill warn">To do</span>':'';}
function materialRows(items,withClass){return '<div class="zp-cards">'+items.map(m=>{const pill=statusPill(m);return '<a class="zp-card zp-card-link '+(!m.released&&!preview?'is-locked':'')+'" href="'+link('material/',m.id)+'"><span class="zp-card-kind">'+esc((withClass?'Class '+withClass[m.class]+' · ':'')+(m.kind||'Reading'))+'</span><h3>'+esc(m.title)+'</h3>'+(pill?'<p class="zp-meta">'+pill+'</p>':'')+'<span class="zp-go">'+(m.released||preview?'Open →':'Locked')+'</span></a>'}).join('')+'</div>';}
const SECTIONS=[['summary','Class Summary'],['handout','Class Handout'],['homework','Homework']];
function classSections(c){const current=c.materials.filter(m=>!m.archived),archived=c.materials.filter(m=>m.archived);
 return SECTIONS.map(([key,label])=>{const items=current.filter(m=>(m.section||'handout')===key);return items.length?'<details class="zp-fold hy-section" data-fold="'+key+'" open><summary>'+label+'</summary><div class="zp-fold-body">'+materialRows(items)+'</div></details>':''}).join('')
 +(archived.length?'<details class="zp-fold hy-section" data-fold="archived"><summary>Archived homework</summary><div class="zp-fold-body">'+materialRows(archived)+'</div></details>':'');}
function signIn(title,back,label,note){shell(title,(note?'<p class="zp-note">'+esc(note)+'</p>':'')+'<form id="sign-in" class="hy-access"><label for="access-code">Access code</label><input id="access-code" name="code" type="password" autocomplete="current-password" required><button class="zp-btn" type="submit">Open</button><p class="zp-msg" role="status"></p></form>',back,label);document.getElementById('sign-in').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button'),msg=form.querySelector('[role=status]');button.disabled=true;msg.textContent='Opening…';try{const j=await api('signIn',{code:form.code.value});store.set(j.token);await loadMaterial()}catch(error){msg.textContent=error.message;button.disabled=false;}};}
async function loadMaterial(){const id=params.get('id');if(!id){shell('Page not found','<p>Please open a page from your class page.</p>',link(''));return;}
const home=await getHome(),material=home.classes.flatMap(c=>c.materials).find(m=>m.id===id);if(!material){shell('Page not found','',link(''));return;}
const back=link('class/',material.class),cls=home.classes.find(c=>c.id===material.class),label='Class '+(cls?cls.number:'');
if(!material.released&&!preview){shell(material.title,'<p class="zp-empty">This page is locked.</p>',back,label);return;}
const ended=()=>preview?shell(material.title,'<p class="zp-empty">This preview has ended. Open a new learner preview from the Teacher page.</p>',back,label):signIn(material.title,back,label,'Please enter the access code again.');
const token=store.get();if(!token){if(refused({reason:home.access}))ended();else if(preview)shell(material.title,'<p class="zp-empty">Open the learner preview from the Teacher page.</p>',back,label);else signIn(material.title,back,label);return;}
let result;try{result=await api('getMaterial',{id,token})}catch(e){if(refused(e)){store.set('');ended();return;}throw e;}/* anything else (network, busy service) keeps the token: load() shows Try again */
if(result.locked){shell(material.title,'<p class="zp-empty">This page is locked.</p>',back,label);return;}
let html=result.html;
if(preview)html=html.replace(/href="(https:\/\/dangolu-github\.github\.io\/hongyun-ig-learning\/(?:class|material)\/\?id=[a-z0-9-]+)"/g,'href="$1&preview=1"');
const ctx={endpoint:window.HONGYUN_CONFIG.endpoint,token,store:KEY,id,preview,work:result.work||null,review:result.review||null};
html=html.replace('</head>',()=>'<script>window.HY_CTX='+JSON.stringify(ctx).replace(/</g,'\\u003c')+';</script></head>');
document.open();document.write(html);document.close();}
function classLog(classes){return '<ol class="zp-log">'+classes.map(c=>'<li><a href="'+link('class/',c.id)+'"><span class="num">'+esc(c.number)+'</span><span><strong>'+esc(c.title)+'</strong><span class="date">'+(c.date?esc(c.date):'Date to be confirmed')+'</span></span><span class="go">Open →</span></a></li>').join('')+'</ol>';}
async function load(){if(document.body.dataset.page==='material'){await loadMaterial();return;}const data=await getHome();
if(document.body.dataset.page==='class'){const c=data.classes.find(c=>c.id===params.get('id'));if(!c){shell('Page not found','',link(''));return;}
 shell('Class '+c.number+' · '+c.title,'<p class="zp-lead">'+(c.date?esc(c.date):'Date to be confirmed')+'</p>'+classSections(c),link(''));return;}
const numbers=Object.fromEntries(data.classes.map(c=>[c.id,c.number]));
const todo=data.classes.flatMap(c=>c.materials).filter(m=>m.section==='homework'&&m.released&&!m.archived&&!(m.status&&m.status.handedIn));
shell('Hongyun’s Study Portal','<details class="zp-fold hy-section" data-fold="todo" open><summary>To do</summary><div class="zp-fold-body">'+(todo.length?materialRows(todo,numbers):'<p class="zp-note">Nothing to do right now.</p>')+'</div></details>'
 +'<details class="zp-fold hy-section" data-fold="classes" open><summary>Classes</summary><div class="zp-fold-body">'+classLog(data.classes)+'</div></details>');}
document.getElementById('print-page').onclick=()=>window.print();let states=[];addEventListener('beforeprint',()=>{document.documentElement.dataset.printing='1';states=[...document.querySelectorAll('details')].map(d=>[d,d.open]);states.forEach(([d])=>d.open=true)});addEventListener('afterprint',()=>{states.forEach(([d,o])=>d.open=o);setTimeout(()=>delete document.documentElement.dataset.printing,50)});
load().catch(()=>shell('Hongyun’s Study Portal','<p class="zp-empty">This page could not open. Please try again.</p><button class="zp-btn retry" type="button">Try again</button>'));document.addEventListener('click',e=>{if(e.target.closest('.retry'))location.reload()});
})();
