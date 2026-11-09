(()=>{'use strict';
const base=document.body.dataset.root||'./',host=document.getElementById('app'),params=new URLSearchParams(location.search);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const previewFragment=new URLSearchParams(location.hash.slice(1)).get('preview');
if(previewFragment){try{sessionStorage.setItem('hongyun-preview',previewFragment)}catch(e){}params.set('preview','1');history.replaceState(null,'',location.pathname+'?'+params);}
const preview=params.get('preview')==='1';
const storage={get(k){try{return sessionStorage.getItem(k)||''}catch(e){return ''}},set(k,v){try{sessionStorage.setItem(k,v)}catch(e){}}};
const tokenKey=preview?'hongyun-preview':'hongyun-access';
const link=(route,id)=>base+route+(id?'?id='+encodeURIComponent(id):'')+(preview?(id?'&':'?')+'preview=1':'');
async function api(action,payload={}){const r=await fetch(window.HONGYUN_CONFIG.endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...payload})});const j=await r.json();if(!j.ok)throw Error(j.error||'Please try again.');return j;}
function shell(title,content,back=''){
host.innerHTML=(back?'<p class="zp-back"><a href="'+back+'">← Home</a></p>':'')+'<p class="zp-kicker">IG English</p><h1>'+esc(title)+'</h1>'+content;
document.getElementById('home-link').href=link('');document.getElementById('brand-link').href=link('');folds();}
function folds(){const key='hongyun-portal-folds:'+location.pathname+(params.get('id')||'')+(preview?':preview':':student');let state={};try{state=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}document.querySelectorAll('details[data-fold]').forEach(d=>{if(typeof state[d.dataset.fold]==='boolean')d.open=state[d.dataset.fold];d.addEventListener('toggle',()=>{if(document.documentElement.dataset.printing)return;state[d.dataset.fold]=d.open;try{localStorage.setItem(key,JSON.stringify(state))}catch(e){}})});}
function materialRows(items){return '<div class="zp-cards">'+items.map(m=>'<a class="zp-card zp-card-link '+(!m.released&&!preview?'is-locked':'')+'" href="'+link('material/',m.id)+'"><span class="zp-card-kind">Reading</span><h3>'+esc(m.title)+'</h3><span class="zp-go">'+(m.released||preview?'Open →':'Locked')+'</span></a>').join('')+'</div>';}
function signIn(title){shell(title,'<form id="sign-in" class="hy-access"><label for="access-code">Access code</label><input id="access-code" name="code" type="password" autocomplete="current-password" required><button class="zp-btn" type="submit">Open</button><p class="zp-msg" role="status"></p></form>',link(''));document.getElementById('sign-in').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button'),msg=form.querySelector('[role=status]');button.disabled=true;msg.textContent='Opening…';try{const j=await api('signIn',{code:form.code.value});storage.set('hongyun-access',j.token);await loadMaterial()}catch(error){msg.textContent=error.message;button.disabled=false;}};}
async function loadMaterial(){const id=params.get('id');if(!id){shell('Page not found','<p>Please open a page from Class 00.</p>',link(''));return;}
const home=await api('getHome'),material=home.classes.flatMap(c=>c.materials).find(m=>m.id===id);if(!material){shell('Page not found','',link(''));return;}
if(!material.released&&!preview){shell(material.title,'<p class="zp-empty">This page is locked.</p>',link('class/','c00'));return;}
const token=storage.get(tokenKey);if(!token){signIn(material.title);return;}
let result;try{result=await api('getMaterial',{id,token})}catch(e){storage.set(tokenKey,'');if(preview)throw e;signIn(material.title);return;}
if(result.locked){shell(material.title,'<p class="zp-empty">This page is locked.</p>',link('class/','c00'));return;}
if(preview)result.html=result.html.replace(/href="https:\/\/dangolu-github.github.io\/hongyun-ig-learning\/class\/\?id=c00"/,'href="https://dangolu-github.github.io/hongyun-ig-learning/class/?id=c00&preview=1"');
document.open();document.write(result.html);document.close();}
async function load(){if(document.body.dataset.page==='material'){await loadMaterial();return;}const data=await api('getHome');if(document.body.dataset.page==='class'){
const c=data.classes.find(c=>c.id===params.get('id'));if(!c){shell('Page not found','',link(''));return;}
shell('Class '+c.number+' · '+c.title,'<p class="zp-lead">'+(c.date?esc(c.date):'Date to be confirmed')+'</p><details class="zp-fold hy-section" data-fold="handout"><summary>Class Handout</summary><div class="zp-fold-body">'+materialRows(c.materials)+'</div></details>',link(''));
}else{shell('Hongyun’s Study Portal','<details class="zp-fold hy-section" data-fold="classes"><summary>Classes</summary><div class="zp-fold-body"><ol class="zp-log">'+data.classes.map(c=>'<li><a href="'+link('class/',c.id)+'"><span class="num">'+esc(c.number)+'</span><span><strong>'+esc(c.title)+'</strong><span class="date">'+(c.date?esc(c.date):'Date to be confirmed')+'</span></span><span class="go">Open →</span></a></li>').join('')+'</ol></div></details>');}}
document.getElementById('print-page').onclick=()=>window.print();let states=[];addEventListener('beforeprint',()=>{document.documentElement.dataset.printing='1';states=[...document.querySelectorAll('details')].map(d=>[d,d.open]);states.forEach(([d])=>d.open=true)});addEventListener('afterprint',()=>{states.forEach(([d,o])=>d.open=o);setTimeout(()=>delete document.documentElement.dataset.printing,50)});
load().catch(()=>shell('Hongyun’s Study Portal','<p class="zp-empty">This page could not open. Please try again.</p><button class="zp-btn retry" type="button">Try again</button>'));document.addEventListener('click',e=>{if(e.target.closest('.retry'))location.reload()});
})();
