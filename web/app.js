const $=i=>document.getElementById(i);let V=null,pending=null;
/* Matrix rain */
const cv=$('m'),cx=cv.getContext('2d'),fs=16,ch="ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789ABCDEF";let dr=[],rainCol='#00ff66';
function rs(){cv.width=innerWidth;cv.height=innerHeight;dr=Array.from({length:Math.ceil(cv.width/fs)},()=>Math.random()*-40)}
function draw(){cx.fillStyle='rgba(0,0,0,.08)';cx.fillRect(0,0,cv.width,cv.height);cx.fillStyle=rainCol;cx.font=fs+'px monospace';
dr.forEach((y,i)=>{cx.fillText(ch[Math.random()*ch.length|0],i*fs,y*fs);dr[i]=y*fs>cv.height&&Math.random()>.975?0:y+1})}
addEventListener('resize',rs);rs();
let rain=null;const rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
function setAnim(on){clearInterval(rain);rain=null;if(on)rain=setInterval(draw,50);else for(let k=0;k<60;k++)draw();$('anim').textContent='Animation: '+(on?'on':'off');$('anim').setAttribute('aria-pressed',String(on));try{localStorage.setItem('anim-mpv',on?'1':'0')}catch(e){}}
$('anim').onclick=()=>setAnim(!rain);
let ap=null;try{ap=localStorage.getItem('anim-mpv')}catch(e){}setAnim(ap===null?!rm:ap==='1');
/* Navigation */
function go(v){['check','gen','vault','audit','ph','learn','act','priv','center','set'].forEach(n=>{$('v-'+n).classList.toggle('hide',n!==v);const bt=document.querySelector('[data-v='+n+']');bt.classList.toggle('on',n===v);bt.setAttribute('aria-current',n===v?'page':'false')});drawer(false);hook(v)}
document.querySelectorAll('#drawer [data-v]').forEach(b=>b.onclick=()=>go(b.dataset.v));go('check');
document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(e=>e.setAttribute('aria-label',e.placeholder));
$('cat').setAttribute('aria-label','Category');$('len').setAttribute('aria-label','Password length');$('wc').setAttribute('aria-label','Number of words');
function msg(t,e){const m=$('msg');m.textContent=t;m.className=e?'err':''}
function status(){$('who').textContent=V?'Unlocked profile: '+V.label:S?'Locked profile: '+S.label:'No profile selected'}
/* Checker */
const RULES={"common_passwords":["000000","111111","123456","12345678","123456789","1q2w3e4r","abc123","admin","baseball","batman","dragon","football","hello123","iloveyou","letmein","login","master","monkey","p@ssw0rd","p@ssword","passw0rd","password","password1","princess","qwerty","qwerty123","shadow","sunshine","superman","trustno1","welcome","zaq12wsx"],"common_words":["access","admin","angel","autumn","banana","baseball","batman","buster","computer","cookie","cricket","delhi","dragon","family","flower","football","freedom","friend","google","guest","hello","hockey","iloveyou","india","internet","killer","letmein","lion","login","love","master","money","monkey","mumbai","ninja","orange","pass","password","pepper","princess","qwerty","root","samsung","secret","shadow","soccer","spring","star","summer","sunshine","superman","test","tiger","user","welcome","whatever","winter"],"leet":{"@":"a","4":"a","3":"e","1":"i","!":"i","0":"o","$":"s","5":"s","7":"t","+":"t"},"sequences":["abcdefghijklmnopqrstuvwxyz","0123456789","qwertyuiop","asdfghjkl","zxcvbnm","1234567890"],"costs":{"dictionary":14.0,"sequence":8.0,"repeat":6.0,"year":7.0},"min_word":4};
const CM=new Set(RULES.common_passwords),W=new Set([...RULES.common_words,...RULES.common_passwords]),LT=RULES.leet,COST=RULES.costs;
const SQ=[...RULES.sequences,...RULES.sequences.map(s=>[...s].reverse().join(''))];
function analyze(pw){const n=pw.length;if(!n)return null;
let pool=(/[a-z]/.test(pw)?26:0)+(/[A-Z]/.test(pw)?26:0)+(/\d/.test(pw)?10:0)+(/[^A-Za-z0-9]/.test(pw)?33:0),per=Math.log2(pool);
const low=pw.toLowerCase(),norm=[...low].map(c=>LT[c]||c).join(''),f=[];
for(let i=0;i<n;i++)for(let j=n;j>=i+4;j--){const s=norm.slice(i,j);if(W.has(s)||CM.has(s)){f.push({k:'dictionary',a:i,b:j,leet:low.slice(i,j)!==s});break}}
for(let i=0;i<n-2;i++){let best=0;for(const s of SQ){const k=s.indexOf(low.substr(i,3));if(k<0)continue;let j=i+3;while(j<n&&k+j-i<s.length&&s[k+j-i]===low[j])j++;best=Math.max(best,j-i)}if(best>=3){f.push({k:'sequence',a:i,b:i+best});i+=best-1}}
for(const m of pw.matchAll(/(.)\1{2,}/g))f.push({k:'repeat',a:m.index,b:m.index+m[0].length});for(const m of pw.matchAll(/(.{2,4}?)\1+/g))f.push({k:'repeat',a:m.index,b:m.index+m[0].length});
for(const m of pw.matchAll(/(?<!\d)(19|20)\d{2}(?!\d)/g))f.push({k:'year',a:m.index,b:m.index+4});
f.sort((x,y)=>(y.b-y.a)-(x.b-x.a));const cov=Array(n).fill(0),ch=[];
for(const x of f)if(!cov.slice(x.a,x.b).some(Boolean)){ch.push(x);for(let k=x.a;k<x.b;k++)cov[k]=1}
let bits=ch.reduce((s,x)=>s+COST[x.k],0)+cov.filter(v=>!v).length*per;
if(CM.has(low)||CM.has(norm)){bits=Math.min(bits,10);ch.unshift({k:'common'})}
const cnt={};for(const c of pw)cnt[c]=(cnt[c]||0)+1;const sh=-Object.values(cnt).reduce((s,v)=>s+v/n*Math.log2(v/n),0);
let r=bits<28?'Very Weak':bits<36?'Weak':bits<60?'Moderate':bits<80?'Strong':'Very Strong';if(n<8&&!/Weak/.test(r))r='Weak';
const t=[],kd=new Set(ch.map(x=>x.k));
if(n<12)t.push('Use at least 12 characters.');
[['lowercase',/[a-z]/],['uppercase',/[A-Z]/],['numbers',/\d/],['special characters',/[^A-Za-z0-9]/]].forEach(([l,re])=>{if(!re.test(pw))t.push('Add '+l+'.')});
if(kd.has('common')||kd.has('dictionary'))t.push('Avoid dictionary words and common passwords.');
if(ch.some(x=>x.leet))t.push("Swaps like '@' for 'a' are well known to attackers.");
if(kd.has('sequence'))t.push("Avoid sequences like 123456, abcd, qwerty.");
if(kd.has('repeat'))t.push('Avoid repeated characters or blocks.');
if(kd.has('year'))t.push('Avoid years and dates.');
if(!t.length)t.push('Looks good. Never reuse it.');
return{bits,r,sh:sh*n,score:Math.min(100,Math.round(bits)),kinds:[...kd],t,seg:ch}}
const RC={'Very Weak':'#ff4d4d',Weak:'#ff9f3b',Moderate:'#ffd23b',Strong:'#9be15d','Very Strong':'#00ff66'};
$('chk').oninput=e=>{const a=analyze(e.target.value),b=$('bar'),rep=$('rep');rep.textContent='';
if(!a){b.style.width=0;rep.textContent='Waiting for input...';$('sug').classList.add('hide');return}
b.style.width=a.score+'%';b.style.background=RC[a.r];
const h=document.createElement('div');h.textContent=`${a.r} | score ${a.score}/100 | effective ${a.bits.toFixed(1)} bits | Shannon ${a.sh.toFixed(1)} bits`;rep.append(h);
if(a.kinds.length){const w=document.createElement('div');w.textContent='Found: '+a.kinds.join(', ');rep.append(w)}
const u=document.createElement('ul');a.t.forEach(x=>{const l=document.createElement('li');l.textContent=x;u.append(l)});rep.append(u);
$('sug').classList.toggle('hide',['Strong','Very Strong'].includes(a.r))};
/* Advanced analysis: guessing-time estimates + highlighted weak segments */
const KC={dictionary:'#ff6b6b',common:'#ff6b6b',sequence:'#ff9f3b',repeat:'#ffd23b',year:'#7cc4ff'};
const KE={dictionary:'common word or password',common:'one of the most common passwords',sequence:'keyboard, alphabet or number sequence',repeat:'repeated characters or pattern',year:'looks like a year'};
function fmt(sec){if(sec<1)return'less than a second';if(sec>=3.2e16)return'over a billion years';
const u=[['second',1],['minute',60],['hour',3600],['day',86400],['year',31557600],['century',3155760000]];let k=0;while(k<5&&sec>=u[k+1][1])k++;
const v=Math.floor(sec/u[k][1]);return v.toLocaleString()+' '+u[k][0]+(v===1?'':'s')}
function paint(){const v=$('chk').value,a=analyze(v),c=$('crack'),h=$('hlv');c.textContent='';h.classList.add('hide');if(!a)return;
[['Online attack (100 guesses/hour)',100/3600],['Offline, slow hash (10,000/s)',1e4],['Offline, fast hash (10 billion/s)',1e10]].forEach(([l,r])=>{const d=document.createElement('div');d.textContent=l+': '+fmt(Math.pow(2,a.bits-1)/r);c.append(d)});
const n=document.createElement('small');n.textContent='Average time to guess, estimated from effective entropy. Real attackers vary.';c.append(n);
if(!$('hl').checked)return;h.classList.remove('hide');const t=$('hlt'),e=$('hle');t.textContent='';e.textContent='';
const seg=a.seg.filter(x=>x.a!==undefined);let i=0;
while(i<v.length){const s=seg.find(x=>x.a===i),j=s?s.b:i+1,sp=document.createElement('span');sp.textContent=v.slice(i,j);if(s){sp.style.color=KC[s.k];sp.style.textDecoration='underline'}t.append(sp);i=j}
if(!a.seg.length)e.textContent='No predictable patterns found.';
a.seg.forEach(s=>{const d=document.createElement('div');d.style.color=KC[s.k];
d.textContent=(s.a!==undefined?'"'+v.slice(s.a,s.b)+'"':'Whole password')+': '+KE[s.k]+(s.leet?' (predictable swaps like @ for a)':'')+(COST[s.k]?'. Attackers need only about '+COST[s.k]+' bits to guess this part.':'. Its strength is capped at about 10 bits.');e.append(d)})}
$('chk').addEventListener('input',paint);$('hl').onchange=paint;
$('sugb').onclick=()=>{$('chk').value='';$('bar').style.width=0;$('rep').textContent='Waiting for input...';$('sug').classList.add('hide');paint();go('gen');gen()};
/* Generator + save prompt */
const SET={up:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',lo:'abcdefghijklmnopqrstuvwxyz',di:'0123456789',sy:'!@#$%^&*()-_=+[]{};:,.?'};
function rnd(n){const m=Math.floor(2**32/n)*n,a=new Uint32Array(1);do crypto.getRandomValues(a);while(a[0]>=m);return a[0]%n}
function make(){const L=+$('len').value,am=$('am').checked,sets=Object.keys(SET).filter(k=>$(k).checked).map(k=>am?[...SET[k]].filter(c=>!'Il1O0o'.includes(c)).join(''):SET[k]);
if(!sets.length)return null;const all=sets.join('');let best=null;
for(let t=0;t<25;t++){const p=sets.map(s=>s[rnd(s.length)]);while(p.length<L)p.push(all[rnd(all.length)]);
for(let i=p.length-1;i>0;i--){const j=rnd(i+1);[p[i],p[j]]=[p[j],p[i]]}const s=p.slice(0,L).join(''),a=analyze(s);
if(!best||a.bits>best.a.bits)best={s,a};if(a.r==='Very Strong'||(a.r==='Strong'&&L<14))break}return best}
/* Passphrase mode: words picked with crypto randomness; entropy = words * log2(list size) + extras */
let ppMode=false;
const WORDS=[...new Set("acorn amber anchor anvil apple april arch arrow attic autumn bacon badge badger baker bamboo banjo barrel basil basket beach beacon beetle bell berry bicycle birch biscuit bishop blade blanket blossom boat bobcat bolt bone bonnet book boot bottle bowl branch brave breeze brick bridge bright bronze brush bucket buffalo butter button cabbage cabin cable cactus cake calm camel candle canyon card carpet carrot cashew castle cedar chair chalk cheese cherry chess chimney cinnamon circle citrus clever cliff cloak clock cloud clover cobweb cocoa coffee coin comb comet compass cookie copper coral cork cosmic cotton cousin cranberry crane crayon cricket crisp crown crystal cucumber curtain dagger daisy dancer dawn desert diamond dingo dinner dolphin donkey dragon drawer dream drizzle drum dune dust dusty eager eagle earth elbow elm ember engine fable fabric falcon fancy feather fern ferry fiddle finger firefly fish fjord flag flame flannel flower flute forest fossil fountain frog fudge gadget garden garlic gate gazelle gentle ginger glacier glove goat goblet gold golden gopher granite grape gravel grove guitar gull hammer hammock happy harbor harp harvest hawk hazel hedge helmet heron hill hive honey hook horizon horn hornet humble iguana island ivory jacket jelly jigsaw jolly jungle juniper kayak kettle kind kite kitten knot koala ladder lagoon lamp lantern leaf lemon letter library lilac lime lively lizard llama lobster lock locket lucky lunch magnet mallet mango maple marble marsh mask meadow mellow melon mighty mirror mitten monkey moon moose mosaic moth mountain muffin napkin needle nest nickel noble noodle note nutmeg oak oasis ocean olive onion orange orbit orchid otter oyster paddle paint palace pancake panda paprika parrot peach pear pebble pepper piano pickle pigeon pillow pine pirate pistachio planet plank plaza plum pocket polite pollen pond pony pretzel proud pumpkin puzzle quail quartz quick quiet quilt rabbit raccoon radish rain rainbow ranch rapid raven reed ribbon ring ripple river road rock rocket rope rose rustic saddle saffron sail salmon salt sand sandal sapphire scarf school seal seed shadow shell shiny shoe shovel shrimp signal silent silver simple sketch skillet sleepy smooth snow snowy soap sock solid sparrow spider spoon spruce squirrel stable star statue stone straw sugar sundae sunny sunset swallow swan sweet table tangerine temple tender tent thimble thistle thunder ticket tide timber tiny toast tomato tool tower tractor train tree trout trumpet tulip tunnel turnip turtle umbrella valley vanilla vase velvet violin vivid wagon walnut walrus warm wave whale wheat wild willow wind window winter witty wizard wolf wombat wool yarn yogurt young zebra zephyr".split(' '))];
const rate=b=>b<28?'Very Weak':b<36?'Weak':b<60?'Moderate':b<80?'Strong':'Very Strong';
function makePP(){const n=+$('wc').value,sep=$('sep').value,w=[];
for(let i=0;i<n;i++){let x=WORDS[rnd(WORDS.length)];if($('cap').checked)x=x[0].toUpperCase()+x.slice(1);w.push(x)}
let bits=n*Math.log2(WORDS.length),t=w.join(sep);
if($('num').checked){t+=sep+rnd(10);bits+=Math.log2(10)}
if($('psy').checked){const y='!@#$%&*?';t+=y[rnd(y.length)];bits+=Math.log2(y.length)}
return{s:t,a:{bits,r:rate(bits)}}}
function setMode(pp){ppMode=pp;$('mPw').classList.toggle('on',!pp);$('mPp').classList.toggle('on',pp);$('pwopts').classList.toggle('hide',pp);$('ppopts').classList.toggle('hide',!pp);gen()}
$('mPw').onclick=()=>setMode(false);$('mPp').onclick=()=>setMode(true);
$('wc').oninput=e=>{$('wv').textContent=e.target.value;if(pwShown())gen()};
['sep','cap','num','psy'].forEach(i=>$(i).onchange=()=>{if(pwShown())gen()});
function gen(){$('sf').classList.add('hide');const b=ppMode?makePP():make();
if(!b){$('out').textContent='';$('gr').textContent='Select at least one character type.';$('ask').classList.add('hide');return}
$('out').textContent=b.s;$('gr').textContent=`${b.a.r} | ${b.a.bits.toFixed(0)} bits`+(ppMode?' | random words from a '+WORDS.length+'-word list':'');$('ask').classList.remove('hide')}
$('len').oninput=e=>{$('lv').textContent=e.target.value;if(pwShown())gen()};
['up','lo','di','sy','am'].forEach(i=>$(i).onchange=()=>{if(pwShown())gen()});
const pwShown=()=>$('out').textContent&&!$('out').querySelector('.mut');
$('gen').onclick=gen;
$('cp').onclick=()=>{const t=$('out').textContent;if(pwShown())navigator.clipboard?.writeText(t).then(()=>msg('Copied'),()=>msg('Copy blocked by browser',1))};
$('no').onclick=()=>{$('ask').classList.add('hide');msg('OK, not saved.')};
$('yes').onclick=()=>{pending=$('out').textContent;
if(V)openSave();else{msg('Choose a local profile and unlock the vault to save.',1);$('note').classList.remove('hide');go('vault')}};
function openSave(){go('gen');$('out').textContent=pending;$('ask').classList.add('hide');$('spw').value=pending;$('sf').classList.remove('hide');msg('Add details, then save.')}
$('cx').onclick=()=>{pending=null;$('sf').classList.add('hide');msg('Cancelled.')};
/* Local profile + master-password vault; no third-party identity provider. */
const enc=new TextEncoder(),dec=new TextDecoder();
const b64=u=>btoa(String.fromCharCode(...u)),ub=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('mpv',1);r.onupgradeneeded=()=>r.result.createObjectStore('keys');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function idbGet(k){const d=await idb();return new Promise((res,rej)=>{const q=d.transaction('keys').objectStore('keys').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function idbSet(k,v){const d=await idb();return new Promise((res,rej)=>{const t=d.transaction('keys','readwrite');t.objectStore('keys').put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
/* createUserKey: makes (once per signed-in user) a random, non-extractable AES-256 key kept in this browser */
async function createUserKey(uid){let k=await idbGet(uid);if(!k){k=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);await idbSet(uid,k)}return k}
/* Master password: key = PBKDF2-SHA256(master password, random salt, 600k iterations); data = AES-256-GCM */
let S=null,fails=0,until=0,failN=0;const ITER=600000;
async function mkKey(pw,salt,it){const k=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:it,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
/* Key derivation: Argon2id via the bundled libsodium (vendor/sodium.js) when it loaded, else PBKDF2 */
const SODP=(async()=>{try{if(window.sodium){await window.sodium.ready;return window.sodium}}catch(e){}return null})();
const argT=m=>m<=19456?2:3;
async function kdfNew(){return (await SODP)?{k:'argon2id',m:ST.mem,t:argT(ST.mem),p:1}:{k:'pbkdf2',it:ITER}}
const prOf=o=>o.kdf==='argon2id'?{k:'argon2id',m:o.m,t:o.t,p:o.p}:{k:'pbkdf2',it:o.it};
const kdfOk=P=>P.k==='argon2id'?(P.m>=8192&&P.m<=262144&&P.t>=1&&P.t<=10&&P.p===1):(P.it>=100000&&P.it<=5000000);
async function deriveKey(pw,salt,P){if(P.k==='argon2id'){const sd=await SODP;if(!sd)throw new Error('argon2');const raw=sd.crypto_pwhash(32,pw,salt,P.t,P.m*1024,sd.crypto_pwhash_ALG_ARGON2ID13);try{return await crypto.subtle.importKey('raw',raw,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}finally{raw.fill(0)}}return mkKey(pw,salt,P.it)}
const rd=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
async function dcrypt(key,o,id){const p={name:'AES-GCM',iv:ub(o.i)};if(o.v>=4&&id)p.additionalData=enc.encode('mpv|'+o.v+'|'+id);return JSON.parse(dec.decode(await crypto.subtle.decrypt(p,key,ub(o.d))))}
async function persist(){const rec=V.kp.k==='argon2id'?{v:5,kdf:'argon2id',m:V.kp.m,t:V.kp.t,p:V.kp.p}:{v:4,it:V.kp.it},iv=crypto.getRandomValues(new Uint8Array(12)),ct=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode('mpv|'+rec.v+'|'+V.id)},V.key,enc.encode(JSON.stringify({items:V.items,log:V.log||[],sc:V.sc||[]})));
try{localStorage.setItem('mpv3:'+V.id,JSON.stringify({...rec,s:b64(V.salt),i:b64(iv),d:b64(new Uint8Array(ct))}));return true}catch(e){msg('Browser storage is unavailable; nothing was saved',1);return false}}
async function startSession(id,label,name){S={id,label,name};try{localStorage.setItem('last-mpv',JSON.stringify({id,label,name}))}catch(e){}showMk();status()}
function showMk(){const make=!rd('mpv3:'+S.id),leg=rd('mpv2:'+S.id);
$('signin').classList.add('hide');$('note').classList.add('hide');$('mk').classList.remove('hide');$('lock').classList.remove('hide');$('open').classList.add('hide');
$('mpw2').classList.toggle('hide',!make);$('mbarw').classList.toggle('hide',!make);$('mhint').textContent='';$('mbar').style.width=0;
$('mkt').textContent=make?'Create your master password':'Unlock your vault';
$('mkp').textContent=make?(leg?'Upgrade: your saved passwords will now be protected by a master password you choose. If you forget it they cannot be recovered.':'This password encrypts everything you save. Use 12+ characters. If you forget it, your saved passwords cannot be recovered.'):'Local profile: '+S.name+' ('+S.label+')';
$('mgo').textContent=make?'Create master password':'Unlock';$('mpw').value=$('mpw2').value='';$('mpw').focus()}
$('mpw').oninput=()=>{if(!$('mpw2').classList.contains('hide')){const a=analyze($('mpw').value);$('mbar').style.width=a?a.score+'%':0;if(a){$('mbar').style.background=RC[a.r];$('mhint').textContent=a.r+(a.t[0]&&!/Looks good/.test(a.t[0])?': '+a.t[0]:'')}}};
function enter(){$('mpw').value=$('mpw2').value='';$('mk').classList.add('hide');$('lock').classList.add('hide');$('open').classList.remove('hide');
$('hello').textContent='Local profile: '+V.name+' ('+V.label+')';bump();status();render();if(pending)openSave();else msg('Welcome'+(V.items.length?' back':'')+', '+V.name+'!')}
$('mgo').onclick=async()=>{if(!S)return;const pw=$('mpw').value,has=rd('mpv3:'+S.id);
if(Date.now()<until)return msg('Too many attempts. Wait '+Math.ceil((until-Date.now())/1000)+'s.',1);
msg('Working...');
if(has){let o,salt;try{o=JSON.parse(has);salt=ub(o.s)}catch(e){return msg('This vault record looks damaged.',1)}const P=prOf(o);if(!kdfOk(P))return msg('This vault record looks damaged.',1);if(P.k==='argon2id'&&!(await SODP))return msg('This vault uses Argon2id but the Argon2 library did not load. Make sure vendor/sodium.js is served.',1);let key,items,lg,sc0;
try{key=await deriveKey(pw,salt,P);const dd=await dcrypt(key,o,S.id);items=Array.isArray(dd)?dd:dd.items;lg=Array.isArray(dd)?[]:(dd.log||[]);sc0=Array.isArray(dd)?[]:(dd.sc||[])}catch(e){failN++;if(++fails>=5){fails=0;until=Date.now()+30000;return msg('Too many wrong attempts. Try again in 30 seconds.',1)}return msg('Wrong master password',1)}
fails=0;V={id:S.id,label:S.label,name:S.name,key,salt,kp:P,items,log:lg,sc:sc0,ok:Date.now()};logEv('Unlocked'+(failN?' after '+failN+' failed attempt'+(failN>1?'s':''):''));failN=0;if(P.k==='pbkdf2'&&await SODP){try{const s2=crypto.getRandomValues(new Uint8Array(16)),kp=await kdfNew();V.key=await deriveKey(pw,s2,kp);V.salt=s2;V.kp=kp;logEv('Key derivation upgraded to Argon2id')}catch(e){}}await persist();enter()}
else{const a=analyze(pw);if(pw.length<12||!a||['Very Weak','Weak'].includes(a.r))return msg('Master password must be 12+ characters and at least Moderate strength',1);
if(pw!==$('mpw2').value)return msg('The two passwords do not match',1);
let items=[];const leg=rd('mpv2:'+S.id);
if(leg){try{items=await dcrypt(await createUserKey(S.id),JSON.parse(leg))}catch(e){return msg('Could not read your existing vault in this browser.',1)}}
const salt=crypto.getRandomValues(new Uint8Array(16)),kp=await kdfNew(),key=await deriveKey(pw,salt,kp);
V={id:S.id,label:S.label,name:S.name,key,salt,kp,items,log:[],sc:[],ok:Date.now()};logEv('Vault created'+(leg?' (upgraded from an older format)':''));if(!await persist()){V=null;return}
try{if(leg)localStorage.removeItem('mpv2:'+S.id)}catch(e){}enter()}};
/* Ask for the master password again before revealing or copying a saved password (valid for 60 s) */
async function reauth(){if(Date.now()-V.ok<60000)return true;const pw=prompt('Enter your master password to continue');if(!pw)return false;
try{const o=JSON.parse(rd('mpv3:'+V.id));await dcrypt(await deriveKey(pw,ub(o.s),prOf(o)),o,V.id);V.ok=Date.now();return true}catch(e){msg('Wrong master password',1);return false}}
/* Breach check via Pwned Passwords range API (k-anonymity): only the first 5 hex chars of SHA-1 are sent */
function breachCount(text,sfx){for(const l of text.split('\n')){const[a,n]=l.trim().split(':');if(a&&a.toUpperCase()===sfx)return +n||0}return 0}
async function pwned(pw){const h=await crypto.subtle.digest('SHA-1',enc.encode(pw)),hex=[...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
const r=await fetch('https://api.pwnedpasswords.com/range/'+hex.slice(0,5),{headers:{'Add-Padding':'true'}});if(!r.ok)throw new Error('http');return breachCount(await r.text(),hex.slice(5))}
$('chk').addEventListener('input',()=>{$('brr').textContent='';$('brk').classList.toggle('hide',!$('chk').value)});
$('brk').onclick=async()=>{const v=$('chk').value,o=$('brr');if(!v)return;o.textContent='Checking...';
try{const n=await pwned(v);if(n>0){o.textContent='Found in known data breaches ('+n.toLocaleString()+' times). Never use it. Change it everywhere you used it and turn on two-factor login.';o.className='err';$('sug').classList.remove('hide')}
else{o.textContent='Not found in known breaches. That does not prove it is safe, so rely on the strength score too.';o.className='mut'}}
catch(e){o.className='err';o.textContent='Could not reach the breach service. Check your connection.'}};
$('brall').onclick=async()=>{if(!V)return;const u=[...new Set(V.items.map(x=>x.pw))];if(!u.length)return msg('Nothing to check yet.');
msg('Checking '+u.length+' password(s)... only partial hashes are sent.');const m=new Map();
try{for(const p of u)m.set(p,await pwned(p))}catch(e){return msg('Could not reach the breach service. Check your connection.',1)}
V.pwn=m;render();const n=V.items.filter(x=>m.get(x.pw)>0).length;logEv('Breach check: '+n+' of '+V.items.length+' saved passwords exposed');await persist();msg(n?n+' saved password(s) appear in known breaches. Change them now.':'None of your saved passwords were found in known breaches.',!!n)};
/* Local-first release: no client-side OAuth token is treated as identity.
   A future multi-user edition must add a backend that verifies provider tokens. */
let idle=null;let IDLE=5*60*1000;
function lockVault(m,full){clearTimeout(idle);V=null;pending=null;['list','dash','rptx','au-cards','au-score','au-list','au-charts','flt'].forEach(i=>$(i).textContent='');FILT=null;AU=null;$('rpt').classList.add('hide');$('q').value='';$('open').classList.add('hide');$('sf').classList.add('hide');
if(full||!S){S=null;$('mk').classList.add('hide');$('signin').classList.remove('hide');$('lock').classList.remove('hide');try{localStorage.removeItem('last-mpv')}catch(e){}}else showMk();
status();net();msg(m)}
function bump(){if(!V)return;clearTimeout(idle);idle=setTimeout(async()=>{if(V){logEv('Auto-locked after inactivity');try{await persist()}catch(e){}}lockVault('Locked after '+ST.idle+' minute'+(ST.idle>1?'s':'')+' of inactivity. Enter your master password to unlock.')},IDLE)}
['click','keydown','touchstart','mousemove'].forEach(e=>addEventListener(e,bump,{passive:true}));
$('out2').onclick=()=>lockVault('Profile closed.',true);$('mout').onclick=()=>lockVault('Profile closed.',true);
/* Encrypted backup / restore: password-derived key (PBKDF2), versioned JSON file, never plaintext */
async function bk(pw,salt,it){const k=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:it,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
$('exp').onclick=async()=>{if(!V)return;const pw=prompt('Choose a backup password (12+ characters). You will need it to restore.');if(!pw)return;if(pw.length<12)return msg('Backup password needs 12+ characters',1);
const kp=await kdfNew(),bv=kp.k==='argon2id'?4:3,salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),ct=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode('mpv-backup|'+bv)},await deriveKey(pw,salt,kp),enc.encode(JSON.stringify(V.items)));
const blob=new Blob([JSON.stringify({...(kp.k==='argon2id'?{v:4,kdf:'argon2id',m:kp.m,t:kp.t,p:kp.p}:{v:3,it:ITER,kdf:'PBKDF2-SHA256'}),s:b64(salt),i:b64(iv),d:b64(new Uint8Array(ct))})],{type:'application/json'});
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='password-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);try{localStorage.setItem('last-backup-mpv',new Date().toISOString().slice(0,10))}catch(e){}logEv('Encrypted backup exported');await persist();msg('Encrypted backup downloaded.')};
$('imp').onclick=()=>V&&$('fi').click();
$('fi').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f||!V)return;await handleBackup(f,false)};
$('vf').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;await handleBackup(f,true)};
const SZ=(v,n)=>typeof v==='string'&&v.length<=n;
function validBackupFile(o){return !!o&&[1,2,3,4].includes(o.v)&&SZ(o.s,64)&&SZ(o.i,64)&&typeof o.d==='string'&&o.d.length<=8e6&&(o.v===1||(o.v<=3?(o.it>=100000&&o.it<=5000000):(o.kdf==='argon2id'&&kdfOk(prOf(o)))))}
async function openBackup(o,pw){const p={name:'AES-GCM',iv:ub(o.i)};if(o.v>=3)p.additionalData=enc.encode('mpv-backup|'+o.v);const P=o.v>=4?prOf(o):{k:'pbkdf2',it:o.v>=2?o.it:250000};
return JSON.parse(dec.decode(await crypto.subtle.decrypt(p,await deriveKey(pw,ub(o.s),P),ub(o.d))))}
function cleanItems(items){if(!Array.isArray(items)||items.length>5000)return null;const out=[];
for(const x of items){if(!x||!SZ(x.site,200)||!SZ(x.pw,1000)||(x.usr!==undefined&&!SZ(x.usr,200))||(x.nt!==undefined&&!SZ(x.nt,2000)))return null;
out.push({site:x.site,usr:x.usr||'',pw:x.pw,nt:x.nt||'',cat:CATS.includes(x.cat)?x.cat:'General',t:/^\d{4}-\d{2}-\d{2}$/.test(x.t||'')?x.t:'',
rev:Array.isArray(x.rev)?x.rev.filter(r=>r&&SZ(r.t,10)&&SZ(r.a,40)).slice(-20).map(r=>({t:r.t,a:r.a})):[],ck:x.ck&&typeof x.ck==='object'?{mfa:!!x.ck.mfa,rec:!!x.ck.rec,codes:!!x.ck.codes}:{}})}return out}
async function handleBackup(f,verifyOnly){if(f.size>5*1024*1024)return msg('Backup file is too large (limit 5 MB).',1);
let o;try{o=JSON.parse(await f.text());if(!validBackupFile(o))throw 0}catch(x){return msg('Not a valid backup file',1)}
if(o.v>=4&&!(await SODP))return msg('This backup needs the Argon2 library, which did not load.',1);const pw=prompt('Backup password');if(!pw)return;let items;
try{items=cleanItems(await openBackup(o,pw));if(!items)throw 0}catch(x){return msg('Wrong backup password or damaged file',1)}
if(verifyOnly){try{localStorage.setItem('last-verify-mpv',new Date().toISOString().slice(0,10))}catch(e){}const n=new Set(items.map(x=>x.site)).size;logEv('Backup verified: '+items.length+' entries');if(V)await persist();return msg('Backup is valid: '+items.length+' entries across '+n+' sites, format v'+o.v+'. Your vault was not changed.')}
const have=new Set(V.items.map(x=>x.site+'|'+x.usr+'|'+x.pw));let add=0;
items.forEach(x=>{const k=x.site+'|'+x.usr+'|'+x.pw;if(!have.has(k)){have.add(k);V.items.push(x);add++}});FILT=null;
logEv('Backup restored: '+add+' new entries');if(await persist()){render();msg('Restored '+add+' new entr'+(add===1?'y':'ies')+' ('+(items.length-add)+' duplicates skipped).')}}
$('save').onclick=async()=>{if(!V||!pending)return;const site=$('site').value.trim(),usr=$('usr').value.trim();
if(!site)return msg('Site / app name is required',1);
V.items.push({site,usr,pw:pending,nt:$('nt').value.trim(),cat:$('cat').value,t:new Date().toISOString().slice(0,10)});logEv('Saved '+site);
if(await persist()){['site','usr','nt'].forEach(i=>$(i).value='');pending=null;$('sf').classList.add('hide');render();msg('Saved to your vault (encrypted).')}else V.items.pop()};
const CATS=['General','Social','Banking','Work','Shopping'];
function render(){const L=$('list'),D=$('dash');L.textContent='';D.textContent='';
const FL=$('flt');FL.textContent='';FL.classList.toggle('hide',!FILT);if(FILT){FL.append('Showing '+FILT.size+' entries from the audit. ');const fb=document.createElement('button');fb.textContent='Show all';fb.onclick=()=>{FILT=null;render()};FL.append(fb)}
const cnt={};V.items.forEach(x=>cnt[x.pw]=(cnt[x.pw]||0)+1);
const weak=V.items.filter(x=>['Very Weak','Weak'].includes(analyze(x.pw).r)).length,dup=V.items.filter(x=>cnt[x.pw]>1).length;
[['Saved',V.items.length],['Weak',weak],['Reused',dup],...(V.pwn?[['Exposed',V.items.filter(x=>V.pwn.get(x.pw)>0).length]]:[]),['Review due',V.items.filter(due).length],['No MFA recorded',V.items.filter(x=>!(x.ck&&x.ck.mfa)).length]].forEach(([l,n])=>{const c=document.createElement('span');c.className='chip'+(l!=='Saved'&&n?' bad':'');c.textContent=l+': '+n;D.append(c)});
const q=$('q').value.trim().toLowerCase(),list=V.items.map((x,i)=>[x,i]).filter(([x,i])=>(!FILT||FILT.has(i))&&(!q||(x.site+' '+x.usr+' '+(x.cat||'')).toLowerCase().includes(q)));
if(!list.length){L.textContent=V.items.length?'No matches.':'No saved passwords yet.';return}
list.forEach(([x,i])=>{const d=document.createElement('div');d.className='e';
const t=document.createElement('div'),b=document.createElement('b');b.textContent=x.site;t.append(b,' '+(x.usr?'| '+x.usr+' ':'')+'| '+(x.cat||'General')+' | '+x.t);d.append(t);
const p=document.createElement('div');p.textContent='••••••••';d.append(p);
const w=[];if(['Very Weak','Weak'].includes(analyze(x.pw).r))w.push('weak');if(cnt[x.pw]>1)w.push('reused');if(V.pwn&&V.pwn.get(x.pw)>0)w.push('exposed in a breach');if(due(x))w.push('review due');if(/\./.test(x.site)&&!/\s/.test(x.site)){const ph=phish(x.site);if(ph&&ph.level==='high')w.push('suspicious site address')}
if(w.length){const f=document.createElement('div');f.className='chip bad';f.textContent='Warning: '+w.join(', ');d.append(f)}
if(x.nt){const n=document.createElement('small');n.textContent=x.nt;d.append(n)}
if(x.rev&&x.rev.length){const hs=document.createElement('small');hs.style.display='block';hs.textContent='History: '+x.rev.slice(-3).reverse().map(r=>r.t+' '+r.a).join(' | ');d.append(hs)}
{const ck=x.ck||{},cl=document.createElement('details'),sm=document.createElement('summary'),strong=['Strong','Very Strong'].includes(analyze(x.pw).r),uniq=cnt[x.pw]===1,fresh=!due(x);
const MK=[['mfa','Multi-factor login is on'],['rec','Recovery email or phone is verified'],['codes','Recovery codes are stored offline (never save them here)']];
const score=()=>MK.filter(([k])=>(x.ck||{})[k]).length+[strong,uniq,fresh].filter(Boolean).length;sm.textContent='Checklist '+score()+'/6';cl.append(sm);
MK.forEach(([k,tx])=>{const lb=document.createElement('label'),cb=document.createElement('input');cb.type='checkbox';cb.checked=!!ck[k];lb.style.display='block';
cb.onchange=async()=>{x.ck={...(x.ck||{}),[k]:cb.checked};logEv('Checklist updated: '+x.site);if(await persist())sm.textContent='Checklist '+score()+'/6'};lb.append(cb,' '+tx);cl.append(lb)});
[['Password is strong',strong],['Password is not reused',uniq],['Review is up to date',fresh]].forEach(([tx,ok])=>{const r=document.createElement('div');r.className='mut';r.textContent=(ok?'Pass: ':'To do: ')+tx;cl.append(r)});
if(V.pwn&&V.pwn.get(x.pw)>0){const r=document.createElement('div');r.className='err';r.textContent='To do: change this password, it appears in a known breach';cl.append(r)}
d.append(cl)}
const mk=(l,f)=>{const q=document.createElement('button');q.textContent=l;q.onclick=f;return q};let sh=false;
d.append(mk('Show',async e=>{if(!sh&&!await reauth())return;sh=!sh;p.textContent=sh?x.pw:'••••••••';e.target.textContent=sh?'Hide':'Show'}),
mk('Copy',async()=>{if(!await reauth())return;navigator.clipboard?.writeText(x.pw).then(()=>{msg(ST.clip?'Copied. Clipboard clears in '+ST.clip+' s.':'Copied.');if(ST.clip)setTimeout(()=>navigator.clipboard?.writeText('').catch(()=>{}),ST.clip*1000)},()=>msg('Copy blocked',1))}),
mk('Log',async()=>{const c=prompt('Log an action for '+x.site+': 1 = Reviewed, 2 = Password changed, 3 = Issue resolved'),A={1:'Reviewed',2:'Password changed',3:'Issue resolved'};if(!A[c])return;
if(c==='2'){const np=prompt('Enter the new password to store (leave empty to only log the change)');if(np)x.pw=np}
x.rev=[...(x.rev||[]),{t:new Date().toISOString().slice(0,10),a:A[c]}].slice(-20);logEv(A[c]+': '+x.site);if(await persist()){render();msg('Logged: '+A[c])}}),
mk('Edit',async()=>{const s1=prompt('Site / app',x.site);if(s1===null)return;const u=prompt('Username or email',x.usr||'');if(u===null)return;const c=prompt('Category ('+CATS.join(', ')+')',x.cat||'General');if(c===null)return;
x.site=s1.trim()||x.site;x.usr=u.trim();x.cat=CATS.find(k=>k.toLowerCase()===c.trim().toLowerCase())||'General';logEv('Edited '+x.site);if(await persist()){render();msg('Updated.')}}),
mk('Delete',async()=>{if(confirm('Delete '+x.site+'?')){V.items.splice(i,1);FILT=null;logEv('Deleted '+x.site);await persist();render()}}));L.append(d)})}
$('q').oninput=()=>V&&render();
/* Security report: summary + site names only, never passwords or usernames */
function reportText(){const it=V.items,cnt={};it.forEach(x=>cnt[x.pw]=(cnt[x.pw]||0)+1);
const rows=it.map(x=>{const a=analyze(x.pw),is=[];if(['Very Weak','Weak'].includes(a.r))is.push('weak ('+a.r+')');else if(a.r==='Moderate')is.push('moderate strength');
if(cnt[x.pw]>1)is.push('reused');if(V.pwn&&V.pwn.get(x.pw)>0)is.push('exposed in a known breach');if(x.pw.length<12)is.push('short (under 12 characters)');if(due(x))is.push('review overdue');return{site:x.site,cat:x.cat||'General',t:x.t,is}});
const bad=rows.filter(r=>r.is.length),w=rows.filter(r=>r.is.some(i=>i.startsWith('weak'))).length,d=it.filter(x=>cnt[x.pw]>1).length,ex=V.pwn?it.filter(x=>V.pwn.get(x.pw)>0).length:null;
const L=['# Password Security Report','Generated: '+new Date().toISOString().slice(0,10),'','Only site names and categories are listed. No passwords or usernames are included.','',
'## Summary','- Saved accounts: '+it.length,'- Weak: '+w,'- Reused: '+d,'- Exposed in breaches: '+(ex===null?'not checked (use "Check for breaches")':ex),'- Review due: '+it.filter(due).length,'- Without multi-factor recorded: '+it.filter(x=>!(x.ck&&x.ck.mfa)).length,'- Accounts needing action: '+bad.length,'','## Accounts needing action'];
if(!bad.length)L.push('None.');bad.forEach(r=>L.push('- '+r.site+' ['+r.cat+', saved '+r.t+']: '+r.is.join(', ')));
const hist=it.flatMap(x=>(x.rev||[]).map(r=>({s:x.site,t:r.t,a:r.a}))).sort((p,q)=>q.t.localeCompare(p.t)).slice(0,10);L.push('','## Recent security actions');if(!hist.length)L.push('None logged yet.');hist.forEach(g=>L.push('- '+g.t+': '+g.a+' ('+g.s+')'));L.push('','## Recommended actions','1. Change exposed and weak passwords first, starting with email and banking accounts.','2. Give every account its own password (use the generator).','3. Turn on two-factor login wherever it is offered.','4. Keep an encrypted backup (Export backup) away from this device.','5. Run this report again after making changes.');return L.join('\n')}
$('rptb').onclick=()=>{if(!V)return;$('rptx').textContent=reportText();$('rpt').classList.remove('hide');$('rptc').focus()};
$('rptc').onclick=()=>$('rpt').classList.add('hide');
$('rptd').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([$('rptx').textContent],{type:'text/markdown'}));a.download='security-report.md';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
/* Keyboard + offline support */
['mpw','mpw2'].forEach(i=>$(i).addEventListener('keydown',e=>{if(e.key==='Enter')$('mgo').click()}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('rpt').classList.add('hide');drawer(false)}});
function net(){const off=!navigator.onLine;$('net').textContent=off?'Offline: the checker, generator and local vault work. Breach checks need internet.':'';
let l=null;try{l=JSON.parse(localStorage.getItem('last-mpv'))}catch(e){}$('offb').classList.toggle('hide',!(off&&l&&!S&&!V&&rd('mpv3:'+l.id)))}
addEventListener('online',net);addEventListener('offline',net);net();
$('offb').onclick=()=>{try{const l=JSON.parse(localStorage.getItem('last-mpv'));startSession(l.id,l.label,l.name)}catch(e){}};
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
/* Side menu, three-dot menu and settings */
function drawer(o){$('drawer').classList.toggle('open',o);$('scrim').classList.toggle('hide',!o);$('mb').setAttribute('aria-expanded',String(o));$('mb').setAttribute('aria-label',o?'Close menu':'Open menu');if(o)document.querySelector('#drawer [data-v]').focus()}
$('mb').onclick=()=>drawer(!$('drawer').classList.contains('open'));$('scrim').onclick=()=>drawer(false);
const SD={theme:'blue',rain:'green',op:50,bl:18,fs:15,idle:5,clip:30,len:16,rev:90,mem:65536};
const TH={blue:['#8fd0ff','143,208,255'],purple:['#c3a6ff','195,166,255'],green:['#7dffb2','125,255,178'],orange:['#ffb870','255,184,112'],pink:['#ff9ccf','255,156,207']};
const RCOL={green:'#00ff66',blue:'#4da3ff',white:'#e8f3ff'};
let ST={...SD};try{ST={...SD,...JSON.parse(localStorage.getItem('settings-mpv')||'{}')}}catch(e){}
function saveST(){try{localStorage.setItem('settings-mpv',JSON.stringify(ST))}catch(e){}}
function applyST(){const r=document.documentElement.style,t=TH[ST.theme]||TH.blue;
r.setProperty('--g',t[0]);r.setProperty('--a',t[1]);r.setProperty('--bl',ST.bl+'px');r.setProperty('--fs',ST.fs+'px');
rainCol=ST.rain==='theme'?t[0]:(RCOL[ST.rain]||RCOL.green);cv.style.opacity=ST.op/100;IDLE=ST.idle*60000;bump();if(!rain)for(let k=0;k<60;k++)draw();
$('s-theme').value=ST.theme;$('s-rain').value=ST.rain;$('s-op').value=ST.op;$('s-bl').value=ST.bl;$('s-fs').value=ST.fs;$('s-idle').value=ST.idle;$('s-clip').value=ST.clip;$('s-rev').value=ST.rev;$('s-mem').value=ST.mem;$('s-len').value=ST.len;$('s-lv').textContent=ST.len;if(V)render()}
[['s-theme','theme',0],['s-rain','rain',0],['s-op','op',1],['s-bl','bl',1],['s-fs','fs',1],['s-idle','idle',1],['s-clip','clip',1],['s-len','len',1],['s-rev','rev',1],['s-mem','mem',1]].forEach(([id,k,n])=>$(id).addEventListener('input',e=>{ST[k]=n?+e.target.value:e.target.value;saveST();applyST();if(k==='len'){$('len').value=ST.len;$('lv').textContent=ST.len}}));
$('s-reset').onclick=()=>{ST={...SD};saveST();applyST();$('len').value=ST.len;$('lv').textContent=ST.len;msg('Settings reset to defaults.')};
applyST();$('len').value=ST.len;$('lv').textContent=ST.len;

/* Review reminders: an account is due when its last logged review (or save date) is older than ST.rev days */
function due(x){if(!ST.rev)return false;const l=x.rev&&x.rev.length?x.rev[x.rev.length-1].t:x.t,d=Date.parse(l);return !!d&&(Date.now()-d)/864e5>ST.rev}
/* Security self-check: automatic checks run now; manual checks are ticked by the user */
const MAN=[['browsers','Tested the app in Chrome and Firefox'],['restore','Restored an encrypted backup successfully'],['phone','Tried it on a phone-size screen'],['keys','Used it with the keyboard only'],['2fa','Turned on two-factor login for my email account'],['hosted','Checked security headers on my hosted site (curl -I)']];
let MC={};try{MC=JSON.parse(localStorage.getItem('selfcheck-mpv')||'{}')}catch(e){}
function sumSC(){$('sc-sum').textContent='Manual: '+MAN.filter(([k])=>MC[k]).length+' of '+MAN.length+' confirmed.'}
function drawMan(){const u=$('sc-man');u.textContent='';MAN.forEach(([k,t])=>{const li=document.createElement('li'),l=document.createElement('label'),c=document.createElement('input');c.type='checkbox';c.checked=!!MC[k];
c.onchange=()=>{MC[k]=c.checked;try{localStorage.setItem('selfcheck-mpv',JSON.stringify(MC))}catch(e){}sumSC()};l.append(c,' '+t);li.append(l);u.append(li)})}
drawMan();sumSC();
/* Learning mode (fictional examples only) */
const SAMPLES=[{pw:'Summer2024!'},{pw:'P@ssw0rd!'},{pw:'qwerty123'},{pw:'aaaaaaaa'},{pw:'Zq8$mT4!vL2#'},{pw:'Maple-Rocket-velvet-tunnel-pebble-orange-anchor',pp:7}];
const QZ=[{a:{pw:'Summer2024!'},b:{pw:'k9#Vr2$Lq8!z'},why:'Words, a year and a symbol on the end are what attackers try first. Twelve random characters have no pattern to exploit.'},
{a:{pw:'Xk9$mP2!'},b:{pw:'Maple-Rocket-velvet-tunnel-pebble-orange-anchor',pp:7},why:'Seven random words beat eight random characters and are much easier to remember. Length wins when the choice is truly random.'},
{a:{pw:'aaaaaaaaaaaaaaaaaaaa'},b:{pw:'Tq7!mZ4p'},why:'Twenty characters sound strong, but a repeated pattern is one guess. Randomness matters more than length alone.'},
{a:{pw:'P@ssw0rd!'},b:{pw:'Ew3^nR7@xQp'},why:'Swapping letters for symbols is predictable and this one is among the most common passwords. Eleven random characters have nothing predictable.'}];
const bitsOf=s=>s.pp?s.pp*Math.log2(WORDS.length):analyze(s.pw).bits;
function lnShow(s){const o=$('ln-out');o.textContent='';const a=s.pp?{bits:bitsOf(s),seg:[]}:analyze(s.pw),r=s.pp?rate(a.bits):a.r;
const hd=document.createElement('div');hd.textContent=r+' | about '+a.bits.toFixed(0)+' bits | offline guess time about '+fmt(Math.pow(2,a.bits-1)/1e10);o.append(hd);
const t=document.createElement('div');t.className='gen';const seg=a.seg.filter(x=>x.a!==undefined);let i=0;
while(i<s.pw.length){const g=seg.find(x=>x.a===i),e=g?g.b:i+1,sp=document.createElement('span');sp.textContent=s.pw.slice(i,e);if(g){sp.style.color=KC[g.k];sp.style.textDecoration='underline'}t.append(sp);i=e}o.append(t);
if(s.pp){const n=document.createElement('div');n.textContent='Random words: each word from a '+WORDS.length+'-word list adds about '+Math.log2(WORDS.length).toFixed(1)+' bits, so '+s.pp+' words give about '+a.bits.toFixed(0)+' bits.';o.append(n)}
else if(!a.seg.length){const n=document.createElement('div');n.textContent='No predictable patterns found. Strength here comes from length and randomness.';o.append(n)}
a.seg.forEach(g=>{const d=document.createElement('div');d.style.color=KC[g.k];d.textContent=(g.a!==undefined?'"'+s.pw.slice(g.a,g.b)+'"':'Whole password')+': '+KE[g.k]+(g.leet?' (predictable swaps like @ for a)':'');o.append(d)})}
let qi=0;
function showQ(){const q=QZ[qi%QZ.length],sw=Math.random()<.5,[x,y]=sw?[q.b,q.a]:[q.a,q.b],z=$('qz');z.textContent='';
const p=document.createElement('div');p.textContent='Which password is harder to guess?';z.append(p);
const res=document.createElement('div');res.setAttribute('role','status');res.className='mut';const nx=document.createElement('button');nx.textContent='Next question';nx.className='hide';nx.onclick=()=>{qi++;showQ()};
[x,y].forEach((s,i)=>{const b=document.createElement('button');b.textContent=s.pw;b.onclick=()=>{const bx=bitsOf(x),by=bitsOf(y),win=bx>=by?0:1;res.textContent=(i===win?'Correct. ':'Not quite. ')+'First: about '+bx.toFixed(0)+' bits, second: about '+by.toFixed(0)+' bits. '+q.why;nx.classList.remove('hide')};z.append(b)});
z.append(res,nx)}
function calc(){const c=+$('lc').value,w=+$('lw').value,cb=c*Math.log2(94),wb=w*Math.log2(WORDS.length);$('lcv').textContent=c;$('lwv').textContent=w;
$('calc').textContent=c+' random characters: about '+cb.toFixed(0)+' bits, '+fmt(Math.pow(2,cb-1)/1e10)+' to guess offline. '+w+' random words: about '+wb.toFixed(0)+' bits, '+fmt(Math.pow(2,wb-1)/1e10)+' offline. Words are easier to remember, so you can afford more of them.'}
SAMPLES.forEach(s=>{const b=document.createElement('button');b.textContent=s.pw.length>24?s.pw.slice(0,22)+'...':s.pw;b.onclick=()=>lnShow(s);$('ln-samples').append(b)});
['lc','lw'].forEach(i=>$(i).addEventListener('input',calc));$('lc').setAttribute('aria-label','Random characters');$('lw').setAttribute('aria-label','Random words');
['Dictionary attack: tries real words and known leaked passwords first.','Substitution tricks: @ for a or 0 for o are built into attack tools.','Sequences and keyboard walks: 123456, qwerty and abcd come early.','Repeats and dates: aaaa, abab and years like 1998 are cheap guesses.','Credential stuffing: a leaked password is tried on your other accounts, so never reuse one.','Brute force: tries everything, so every extra random character or word multiplies the work.'].forEach(t=>{const li=document.createElement('li');li.textContent=t;$('atk').append(li)});
showQ();calc();

/* Event timeline (stored inside the encrypted vault; never contains passwords) */
function logEv(d){if(!V)return;V.log=V.log||[];V.log.push({t:new Date().toISOString().slice(0,16).replace('T',' '),d});if(V.log.length>300)V.log=V.log.slice(-300)}
function hook(v){if(v==='center')renderCenter();if(v==='act')drawAct();if(v==='priv')drawPriv();if(v==='audit'){renderAudit();if(V&&!AU)runAudit()}}
function drawAct(){const l=$('act-list');l.textContent='';$('act-dl').disabled=$('act-clr').disabled=!V;
if(!V){l.textContent='Unlock your vault on the Passwords screen to see your timeline.';return}
const ev=[...(V.log||[])].reverse();if(!ev.length){l.textContent='No events recorded yet.';return}
const u=document.createElement('ul');u.className='plain';ev.slice(0,200).forEach(e=>{const li=document.createElement('li');li.textContent=e.t+'  '+e.d;u.append(li)});l.append(u)}
$('act-dl').onclick=()=>{if(!V)return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([[...(V.log||[])].reverse().map(e=>e.t+'  '+e.d).join('\n')],{type:'text/plain'}));a.download='security-activity.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('act-clr').onclick=async()=>{if(!V||!confirm('Clear the whole timeline? This cannot be undone.'))return;V.log=[];logEv('Timeline cleared');await persist();drawAct()};
/* Privacy and data center */
function descKey(k){if(k.startsWith('mpv3:'))return['Encrypted vault for '+k.slice(5),'passwords, notes, history and timeline, all encrypted'];if(k.startsWith('mpv2:'))return['Old-format encrypted vault','from an earlier version, encrypted'];
const M={'settings-mpv':['Settings','look and behavior choices, no secrets'],'anim-mpv':['Animation choice','no secrets'],'selfcheck-mpv':['Self-check ticks','no secrets'],'last-mpv':['Last signed-in account','name and email, used for offline unlock'],'last-backup-mpv':['Last backup date','no secrets'],'last-verify-mpv':['Last backup verification date','no secrets']};return M[k]||['Other data from this app','unknown']}
const mine=k=>k.startsWith('mpv')||k.endsWith('-mpv');
function drawPriv(){const u=$('pv-list');u.textContent='';let any=false;
try{const ks=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(mine(k))ks.push(k)}
ks.sort().forEach(k=>{any=true;const[t,d]=descKey(k),li=document.createElement('li');li.textContent=t+': '+d+' ('+(k.length+(localStorage.getItem(k)||'').length)+' bytes)';u.append(li)})}catch(e){}
if(!any){const li=document.createElement('li');li.textContent='Nothing stored yet.';u.append(li)}
const li=document.createElement('li');li.textContent='Browser database "mpv": may hold an old device key from versions before master passwords.';u.append(li)}
async function idbDel(k){try{const d=await idb();await new Promise(r=>{const t=d.transaction('keys','readwrite');t.objectStore('keys').delete(k);t.oncomplete=r;t.onerror=r})}catch(e){}}
$('pv-exp').onclick=()=>{if(!V)return msg('Unlock your vault first (Passwords screen).',1);$('exp').click()};
$('pv-prefs').onclick=()=>{if(!confirm('Clear your settings, animation choice, self-check ticks and the offline local-profile shortcut? Your vault is not touched.'))return;
['settings-mpv','anim-mpv','selfcheck-mpv','last-mpv'].forEach(k=>{try{localStorage.removeItem(k)}catch(e){}});ST={...SD};applyST();MC={};drawMan();sumSC();drawPriv();msg('App preferences cleared. Your vault was not changed.')};
$('pv-del').onclick=async()=>{if(!V)return msg('Choose a local profile and unlock your vault first.',1);if(!await reauth())return;const id=V.id,lb=V.label;
const c=prompt('This permanently deletes the vault for '+lb+' from this device. Export a backup first if you might need it. Type DELETE to confirm.');if(c!=='DELETE')return msg('Deletion cancelled. Nothing was removed.');
['mpv3:'+id,'mpv2:'+id,'last-mpv'].forEach(k=>{try{localStorage.removeItem(k)}catch(e){}});await idbDel(id);lockVault('Your vault was deleted from this device.',true);drawPriv()};
$('pv-all').onclick=async()=>{const c=prompt('This erases EVERYTHING this app stored in this browser: all vaults, settings and keys. Type DELETE EVERYTHING to confirm.');if(c!=='DELETE EVERYTHING')return msg('Cancelled. Nothing was removed.');
try{const ks=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(mine(k))ks.push(k)}ks.forEach(k=>localStorage.removeItem(k))}catch(e){}
try{indexedDB.deleteDatabase('mpv')}catch(e){}lockVault('All app data was erased from this device.',true);ST={...SD};applyST();MC={};drawMan();sumSC();drawPriv()};
/*PH-START*/
const BR=[['paypal',['paypal.com']],['google',['google.com','google.co.in','gstatic.com','googleapis.com','googleusercontent.com']],['gmail',['gmail.com']],['facebook',['facebook.com','fb.com']],['instagram',['instagram.com']],['amazon',['amazon.com','amazon.in','amazon.co.uk','amazonaws.com']],['apple',['apple.com','icloud.com']],['microsoft',['microsoft.com','live.com','office.com','outlook.com','microsoftonline.com']],['netflix',['netflix.com']],['github',['github.com','github.io','githubusercontent.com']],['linkedin',['linkedin.com']],['whatsapp',['whatsapp.com','whatsapp.net']],['dropbox',['dropbox.com']],['adobe',['adobe.com']],['ebay',['ebay.com']],['walmart',['walmart.com']],['chase',['chase.com']],['wellsfargo',['wellsfargo.com']],['bankofamerica',['bankofamerica.com']],['hdfcbank',['hdfcbank.com']],['icicibank',['icicibank.com']],['onlinesbi',['onlinesbi.sbi','sbi.co.in']],['paytm',['paytm.com']],['flipkart',['flipkart.com']],['irctc',['irctc.co.in']],['phonepe',['phonepe.com']],['youtube',['youtube.com','youtu.be']],['twitter',['twitter.com','x.com']],['telegram',['telegram.org','t.me']],['coinbase',['coinbase.com']],['binance',['binance.com']]];
const TWO=['co.in','co.uk','com.au','gov.in','ac.in','org.in','net.in','nic.in','com.br','co.jp','co.nz','com.sg','co.za','org.uk','gov.uk','ac.uk'];
const SHORT=['bit.ly','tinyurl.com','t.co','goo.gl','is.gd','ow.ly','buff.ly','rb.gy','cutt.ly'];
const RISKY=['zip','mov','xyz','top','tk','click','support','loan','work','gq','ml','cf','ga','country','kim','review','science','download'];
const KW=['login','signin','verify','secure','account','update','wallet','password','confirm','billing','recover','suspend','unlock','otp'];
const HG={'0':'o','1':'l','3':'e','5':'s','$':'s','@':'a'};
function lev(a,b){const m=[...Array(a.length+1)].map((_,i)=>[i]);for(let j=1;j<=b.length;j++)m[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return m[a.length][b.length]}
function regDomain(h){const p=h.split('.');if(p.length<=2)return h;const l2=p.slice(-2).join('.');return TWO.includes(l2)?p.slice(-3).join('.'):l2}
function phish(input){const raw=String(input||'').trim();if(!raw)return null;let u;
try{u=new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)?raw:'https://'+raw)}catch(e){return{level:'high',host:'',reg:'',legit:false,finds:[{sev:'high',t:'This is not a valid web address.'}]}}
const h=u.hostname.toLowerCase().replace(/\.$/,''),F=[],add=(sev,t)=>F.push({sev,t}),reg=regDomain(h),label=reg.split('.')[0],full=(u.pathname+u.search).toLowerCase(),legit=BR.find(b=>b[1].includes(reg));
if(u.username||u.password)add('high','The address has a username or password before the real host, a trick used to hide where it goes.');
if(/^\d{1,3}(\.\d{1,3}){3}$/.test(h)||h.includes(':'))add('high','The address is a raw IP number, not a website name.');
if(h.split('.').some(x=>x.startsWith('xn--')))add('high','Contains punycode (xn--), which can hide look-alike letters from other alphabets.');
else if(/[^\x00-\x7f]/.test(raw))add('high','Contains non-English letters that can imitate English ones.');
if(u.protocol==='http:')add('medium','Not encrypted (http, not https).');
if(SHORT.includes(reg))add('medium','Link shortener: the real destination is hidden until you open it.');
const tld=h.split('.').pop();if(RISKY.includes(tld))add('medium','Unusual ending (.'+tld+') often used for throwaway sites.');
if(h.split('-').length>3)add('medium','Many hyphens in the name, typical of made-up look-alike sites.');
if(h.length>40)add('medium','Very long website name.');
if(h.split('.').length>4)add('medium','Many nested subdomains can push the real name out of view.');
if(!legit){const toks=h.split(/[.\-_]/);let hit=false;
for(const[k,doms]of BR){if(toks.includes(k)||(k.length>=6&&(label.startsWith(k)||label.endsWith(k)))){add('high','Contains "'+k+'" but belongs to '+reg+', not the real '+doms[0]+'.');hit=true;break}
const n=label.replace(/[0-9$@]/g,c=>HG[c]).replace(/rn/g,'m').replace(/vv/g,'w').replace(/-/g,'');if(n===k&&label!==k){add('high','"'+label+'" imitates "'+k+'" using look-alike characters.');hit=true;break}}
if(!hit)for(const[k]of BR){if(k.length>=5&&label[0]===k[0]&&label!==k&&lev(label,k)<=1){add('medium','"'+label+'" is one character away from "'+k+'".');break}}
if(KW.some(k=>h.includes(k)||full.includes(k)))add('low','Contains words like "login" or "verify" that scam pages use to create urgency.')}
else add('info','Matches the official domain of '+legit[1][0]+'. This does not prove the page itself is safe.');
const has=s=>F.some(f=>f.sev===s);return{level:has('high')?'high':has('medium')?'medium':has('low')?'low':'none',host:h,reg,legit:!!legit,finds:F}}
/*PH-END*/
const PL={high:'High risk. Do not enter your password.',medium:'Suspicious. Check the address carefully.',low:'Minor warnings.',none:'No red flags found. This does not mean the site is safe.'};
$('ph-in').addEventListener('input',()=>{const o=$('ph-out'),r=phish($('ph-in').value);o.textContent='';if(!r)return;
const hd=document.createElement('div');hd.setAttribute('role','status');hd.style.fontWeight='700';hd.style.color=r.level==='high'?'#ff9f9f':r.level==='none'?'#9be15d':'#ffd23b';hd.textContent=PL[r.level];o.append(hd);
if(r.host){const w=document.createElement('div');w.className='gen';const k=r.host.length-r.reg.length,a=document.createElement('span'),b=document.createElement('b');a.textContent=r.host.slice(0,k);b.textContent=r.reg;b.style.textDecoration='underline';w.append(a,b);o.append(w);
const n=document.createElement('div');n.className='mut';n.textContent='The underlined part is who really owns this address. Everything before it can be chosen by anyone.';o.append(n)}
r.finds.forEach(f=>{const d=document.createElement('div');d.textContent={high:'High: ',medium:'Medium: ',low:'Low: ',info:'Note: '}[f.sev]+f.t;d.style.color=f.sev==='high'?'#ff9f9f':f.sev==='info'?'#9be15d':'#ffd23b';o.append(d)})});

/* Local vault profile: no third-party identity at all */
$('lp-go').onclick=()=>{const n=$('lp-name').value.trim().replace(/[^\w .-]/g,'').slice(0,40);if(!n)return msg('Enter a profile name.',1);startSession('local:'+n.toLowerCase(),n,n)};
/* Security audit: verifiable checks, severity, evidence, remediation */
let FILT=null,AU=null;
const ei=fn=>V.items.map((x,i)=>fn(x)?i:-1).filter(i=>i>=0);
const grade=s=>s>=90?'A':s>=80?'B':s>=70?'C':s>=60?'D':'F';
async function computeAudit(){const F=[],P=[],add=(sev,cat,title,desc,fix,act,ids,ev)=>F.push({sev,cat,title,desc,fix,act,ids,ev}),pass=(cat,title)=>P.push({cat,title});let strong=0;
if(V){const n=V.items.length,cnt={};V.items.forEach(x=>cnt[x.pw]=(cnt[x.pw]||0)+1);const R=x=>analyze(x.pw).r,of=k=>k+' of '+n+' saved accounts';
strong=V.items.filter(x=>['Strong','Very Strong'].includes(R(x))&&cnt[x.pw]===1).length;
const reused=ei(x=>cnt[x.pw]>1),weak=ei(x=>['Very Weak','Weak'].includes(R(x))),mod=ei(x=>R(x)==='Moderate'),short=ei(x=>x.pw.length>0&&x.pw.length<12),empty=ei(x=>!x.pw),
sus=ei(x=>/\./.test(x.site)&&!/\s/.test(x.site)&&(phish(x.site)||{}).level==='high'),dueI=ei(due),nomfa=ei(x=>!(x.ck&&x.ck.mfa));
reused.length?add('critical','Passwords',reused.length+' accounts share passwords','One breach can unlock several sites. Every login should have its own password.','Generate a unique password for each account and change the shared ones.','entries',reused,of(reused.length)):pass('Passwords','No reused passwords');
weak.length?add('critical','Passwords',weak.length+' weak passwords detected','Short, common or low-entropy passwords are vulnerable to guessing and breach lists.','Replace them with generated passwords or passphrases.','entries',weak,of(weak.length)):pass('Passwords','No weak passwords');
if(mod.length)add('warning','Passwords',mod.length+' passwords are only moderate','They resist casual guessing but not a determined offline attack.','Use 12+ random characters or a 7-word passphrase.','entries',mod,of(mod.length));
if(short.length)add('warning','Passwords',short.length+' passwords are under 12 characters','Length is the cheapest protection against guessing.','Use at least 12 characters.','entries',short,of(short.length));
if(empty.length)add('warning','Passwords',empty.length+' entries have no password','Incomplete entries cannot be evaluated.','Edit or delete them.','entries',empty,of(empty.length));
if(sus.length)add('warning','Passwords',sus.length+' saved site addresses look suspicious','The link check flagged high-risk patterns in the site name.','Check the address with Link check and re-enter the real site.','entries',sus,of(sus.length));
if(V.pwn){const ex=ei(x=>V.pwn.get(x.pw)>0);ex.length?add('critical','Passwords',ex.length+' passwords appear in known breaches','Attackers already have these passwords.','Change them now and enable multi-factor login.','entries',ex,of(ex.length)):pass('Passwords','No saved password found in known breaches')}
else if(n)add('warning','Vault hygiene','Breach check has not been run this session','Exposed passwords stay unnoticed until you check.','Run "Check for breaches" on the Passwords screen (needs internet).','vault',null,'No result available');
dueI.length?add('warning','Vault hygiene',dueI.length+' accounts are due for review','No logged review within '+(ST.rev||0)+' days.','Review them and log the action on each entry.','entries',dueI,of(dueI.length)):pass('Vault hygiene','No reviews overdue');
nomfa.length?add('warning','Vault hygiene',nomfa.length+' accounts have no multi-factor recorded','A password alone is the only barrier on these accounts.','Turn on multi-factor login and tick it in each checklist.','entries',nomfa,of(nomfa.length)):pass('Vault hygiene','Multi-factor recorded on every account');
let lb=null;try{lb=localStorage.getItem('last-backup-mpv')}catch(e){}const age=lb?(Date.now()-Date.parse(lb))/864e5:null;
age===null?add('warning','Vault hygiene','No encrypted backup recorded','Without a backup a lost master password or cleared browser data loses everything.','Export a backup and verify it in Privacy.','backup',null,'No backup date on this device'):age>30?add('warning','Vault hygiene','Last backup is '+Math.floor(age)+' days old','Recent changes are not protected.','Export a fresh backup.','backup',null,'Last backup '+lb):pass('Vault hygiene','Backup made in the last 30 days');
let lvv=null;try{lvv=localStorage.getItem('last-verify-mpv')}catch(e){}if(lb&&(!lvv||lvv<lb))add('warning','Vault hygiene','Latest backup has not been verified','An unverified backup may not restore.','Use "Verify a backup file" on the Privacy page.','backup',null,lvv?'Verified '+lvv+', backup '+lb:'Never verified');
let rec=null;try{rec=JSON.parse(rd('mpv3:'+V.id))}catch(e){}
if(rec){(rec.v>=4)?pass('Vault hygiene','Vault record is bound to your account (AES-GCM AAD)'):add('warning','Vault hygiene','Vault uses an older record format','It is not bound to your account.','Unlock again to upgrade it automatically.',null,null,'Format v'+rec.v);
const KP=prOf(rec),kg=KP.k==='argon2id'?(KP.m>=19456&&KP.t>=2):(KP.it>=600000);
kg?pass('Settings','Key derivation is strong ('+(KP.k==='argon2id'?'Argon2id, '+Math.round(KP.m/1024)+' MiB':'PBKDF2, '+KP.it.toLocaleString()+' rounds')+')'):add('warning','Settings','Weak key-derivation setting','The vault key is derived with weak parameters.','Export a backup, delete the vault and recreate it.',null,null,KP.k==='argon2id'?KP.m+' KiB, '+KP.t+' passes':(KP.it||'?')+' rounds');
if(KP.k==='pbkdf2'&&await SODP)add('info','Settings','Vault still uses PBKDF2','Argon2id is available and will be applied the next time you unlock.','Lock and unlock once.',null,null,'PBKDF2')}
pass('Deployment','Local profile only; no third-party identity provider')}
else add('info','Vault hygiene','Vault checks skipped','Password and hygiene checks need the vault unlocked.','Unlock on the Passwords screen, then run the audit again.','vault',null,'Vault is locked');
ST.idle>10?add('warning','Settings','Auto-lock is set above 10 minutes','The vault stays unlocked for '+ST.idle+' minutes of inactivity. Shorter timeouts reduce exposure if you step away.','Choose 10 minutes or less.','settings',null,ST.idle+' minutes'):pass('Settings','Auto-lock is 10 minutes or less');
ST.clip===0?add('warning','Settings','Copied passwords are never cleared','They stay on the clipboard until something replaces them.','Choose a clear time in Settings.','settings',null,'Clipboard clearing is off'):pass('Settings','Clipboard clears automatically');
if(!ST.rev)add('info','Settings','Review reminders are off','Old passwords will not be flagged.','Pick a reminder period.','settings',null,'Never');
window.isSecureContext?pass('Deployment','Secure context (HTTPS or localhost)'):add('critical','Deployment','Not a secure context','Encryption features need HTTPS or localhost.','Serve over HTTPS.',null,null,'isSecureContext is false');
(crypto&&crypto.subtle)?pass('Deployment','WebCrypto available'):add('critical','Deployment','WebCrypto is unavailable','The vault cannot encrypt.','Use a current browser over HTTPS.',null,null,'crypto.subtle missing');
try{const r=await fetch(location.href,{method:'HEAD',cache:'no-store'}),g=n=>r.headers.get(n),miss=[];if(!g('content-security-policy'))miss.push('Content-Security-Policy');if(!g('referrer-policy'))miss.push('Referrer-Policy');if(!/nosniff/i.test(g('x-content-type-options')||''))miss.push('X-Content-Type-Options');
miss.length?add('warning','Deployment','Security headers are missing','The server did not send: '+miss.join(', ')+'.','Serve with serve.py, web/_headers or hosting/nginx.conf.',null,null,'Missing: '+miss.join(', ')):pass('Deployment','Security headers present')}
catch(e){add('info','Deployment','Security headers could not be checked','The browser could not read response headers here.','Check your hosted site with curl -I.',null,null,'No evidence available')}
pass('Deployment','No third-party sign-in scripts are loaded');
let sw=null;try{sw=!!(await navigator.serviceWorker.getRegistration())}catch(e){}
sw===false?add('info','Deployment','Offline support is not installed','The app works only while online.','Open via http://localhost or HTTPS and reload.',null,null,'No service worker'):sw?pass('Deployment','Offline support installed'):0;
const crit=F.filter(f=>f.sev==='critical').length,warn=F.filter(f=>f.sev==='warning').length,score=Math.max(0,100-crit*15-warn*5);
return{F,P,crit,warn,score,grade:grade(score),strong,locked:!V}}
const SEVC={critical:'#ff6b6b',warning:'#ffb84d',info:'#8fd0ff'};
function renderAudit(){const A=AU,cs=$('au-cards'),sc=$('au-score'),ls=$('au-list'),ch=$('au-charts');[cs,sc,ls,ch].forEach(e=>e.textContent='');
$('au-last').textContent=V&&V.sc&&V.sc.length?V.sc[V.sc.length-1].t:'never';
if(!A){ls.textContent=V?'Press "Run full audit".':'Unlock your vault on the Passwords screen, then run the audit.';return}
['Passwords','Settings','Vault hygiene','Deployment'].forEach(c=>{const n=A.F.filter(f=>f.cat===c&&f.sev!=='info').length,d=document.createElement('div');d.className='card';const b=document.createElement('b');b.textContent=n;const l=document.createElement('div');l.className='mut';l.textContent=c==='Passwords'?'Password issues':c;d.append(b,l);cs.append(d)});
const col=A.score>=80?'#5ee08a':A.score>=60?'#ffb84d':'#ff6b6b',R=52,C=2*Math.PI*R,s=sv('svg',{viewBox:'0 0 120 120',width:130,height:130,role:'img','aria-label':'Score '+A.score+' out of 100, grade '+A.grade});
sv('circle',{cx:60,cy:60,r:R,fill:'none',stroke:'rgba(255,255,255,.15)','stroke-width':9},s);sv('circle',{cx:60,cy:60,r:R,fill:'none',stroke:col,'stroke-width':9,'stroke-linecap':'round','stroke-dasharray':(C*A.score/100)+' '+C,transform:'rotate(-90 60 60)'},s);
const t1=sv('text',{x:60,y:62,'text-anchor':'middle',fill:'#fff','font-size':32,'font-weight':700},s);t1.textContent=A.score;const t2=sv('text',{x:60,y:80,'text-anchor':'middle',fill:'#a9c8ec','font-size':11},s);t2.textContent='/ 100  '+A.grade;sc.append(s);
const tx=document.createElement('div');const hd=document.createElement('div');hd.style.cssText='font-size:18px;font-weight:700;color:'+col;hd.textContent=A.crit?'Critical - immediate action required':A.warn?'Needs attention':'Looking good';
const sub=document.createElement('div');sub.className='mut';sub.textContent=A.locked?'Only technical checks ran because the vault is locked.':A.crit?'This audit found serious issues across passwords and/or settings.':A.warn?'No critical issues, but several things can be improved.':'No issues found by the automated checks. That is not proof of security.';tx.append(hd,sub);
const st=document.createElement('div');st.className='grid';[['Passed checks',A.P.length],['Warnings',A.warn],['Critical',A.crit],['Strong logins',A.strong]].forEach(([l,n])=>{const d=document.createElement('div');d.className='card';const b=document.createElement('b');b.textContent=n;const e=document.createElement('div');e.className='mut';e.textContent=l;d.append(b,e);st.append(d)});tx.append(st);sc.append(tx);
const ord={critical:0,warning:1,info:2};[...A.F].sort((a,b)=>ord[a.sev]-ord[b.sev]).forEach(f=>{const d=document.createElement('div');d.className='finding f-'+f.sev;
const h=document.createElement('div');const sp=document.createElement('span');sp.className='sev';sp.textContent=f.sev.toUpperCase();sp.style.color=SEVC[f.sev];const b=document.createElement('b');b.textContent=f.title;h.append(sp,f.cat+' - ',b);
const p=document.createElement('div');p.textContent=f.desc;const ev=document.createElement('div');ev.className='mut';ev.textContent='Evidence: '+f.ev;const fx=document.createElement('div');fx.className='mut';fx.textContent='Fix: '+f.fix;d.append(h,p,ev,fx);
if(f.act){const bt=document.createElement('button');bt.textContent={entries:'View entries',settings:'Open settings',backup:'Open privacy',vault:'Open passwords'}[f.act];
bt.onclick=()=>{if(f.act==='entries'){FILT=new Set(f.ids);go('vault');if(V)render()}else go({settings:'set',backup:'priv',vault:'vault'}[f.act])};d.append(bt)}ls.append(d)});
if(!A.F.length)ls.textContent='No findings.';
if(A.P.length){const dt=document.createElement('details'),sm=document.createElement('summary');sm.textContent='Passed checks ('+A.P.length+')';dt.append(sm);A.P.forEach(p=>{const d=document.createElement('div');d.className='mut';d.textContent='Pass: '+p.cat+' - '+p.title;dt.append(d)});ls.append(dt)}
renderCharts(A)}
const PCOL={'Very Weak':'#ff6b6b',Weak:'#ff9f3b',Moderate:'#ffd23b',Strong:'#9be15d','Very Strong':'#2ecc71'};
function sv(tag,at,par){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const k in at)e.setAttribute(k,at[k]);if(par)par.append(e);return e}
function cc(title){const c=document.createElement('div');c.className='card';const h=document.createElement('div');h.textContent=title;h.style.fontWeight='700';c.append(h);return c}
function legend(c,parts){parts.forEach(p=>{const d=document.createElement('div');d.className='mut';d.textContent=p.l+': '+p.v;d.style.cssText='border-left:10px solid '+p.c+';padding-left:6px;text-align:left';c.append(d)})}
function donut(title,parts){const c=cc(title),tot=parts.reduce((s,p)=>s+p.v,0),s=sv('svg',{viewBox:'0 0 100 100',width:110,height:110,role:'img','aria-label':title+': '+parts.map(p=>p.l+' '+p.v).join(', ')},c),R=38,C=2*Math.PI*R;
sv('circle',{cx:50,cy:50,r:R,fill:'none',stroke:'rgba(255,255,255,.12)','stroke-width':12},s);let off=0;
if(tot)parts.forEach(p=>{if(!p.v)return;const len=C*p.v/tot;sv('circle',{cx:50,cy:50,r:R,fill:'none',stroke:p.c,'stroke-width':12,'stroke-dasharray':len+' '+(C-len),'stroke-dashoffset':-off,transform:'rotate(-90 50 50)'},s);off+=len});
const t=sv('text',{x:50,y:56,'text-anchor':'middle',fill:'#e8f3ff','font-size':18},s);t.textContent=tot;legend(c,parts);return c}
function lineC(title,pts){const c=cc(title);if(pts.length<2){const n=document.createElement('div');n.className='mut';n.textContent=pts.length?'Run the audit again to see a trend.':'No audits yet.';c.append(n);return c}
const W=200,H=80,s=sv('svg',{viewBox:'0 0 '+W+' '+H,width:'100%',role:'img','aria-label':title+': '+pts.join(', ')},c),xy=pts.map((v,i)=>[10+i*(W-20)/(pts.length-1),H-8-(v/100)*(H-16)]);
const pl=sv('polyline',{points:xy.map(a=>a.join(',')).join(' '),fill:'none','stroke-width':2},s);pl.style.stroke='var(--g)';xy.forEach(a=>sv('circle',{cx:a[0],cy:a[1],r:2.5,fill:'#fff'},s));
const d=document.createElement('div');d.className='mut';d.textContent='Latest: '+pts[pts.length-1]+' / 100';c.append(d);return c}
function barsC(title,vals){const c=cc(title),W=220,H=80,mx=Math.max(1,...vals.map(v=>v.v)),s=sv('svg',{viewBox:'0 0 '+W+' '+H,width:'100%',role:'img','aria-label':title+': '+vals.map(v=>v.l+' '+v.v).join(', ')},c),bw=(W-10)/vals.length;
vals.forEach((v,i)=>{const h=(v.v/mx)*(H-18),r=sv('rect',{x:5+i*bw+1,y:H-12-h,width:Math.max(2,bw-3),height:Math.max(1,h),rx:2},s);r.style.fill='var(--g)'});
const d=document.createElement('div');d.className='mut';d.textContent=vals.reduce((a,v)=>a+v.v,0)+' events in the last 14 days';c.append(d);return c}
function renderCharts(A){const ch=$('au-charts');if(!V){ch.textContent='Unlock the vault to see charts.';return}
const dist={};V.items.forEach(x=>{const r=analyze(x.pw).r;dist[r]=(dist[r]||0)+1});
ch.append(donut('Password strength',Object.keys(PCOL).map(k=>({l:k,v:dist[k]||0,c:PCOL[k]}))));
ch.append(donut('Findings by severity',['critical','warning','info'].map(k=>({l:k,v:A.F.filter(f=>f.sev===k).length,c:SEVC[k]}))));
const cnt={};V.items.forEach(x=>cnt[x.pw]=(cnt[x.pw]||0)+1);const ru=V.items.filter(x=>cnt[x.pw]>1).length;ch.append(donut('Unique vs reused',[{l:'Unique',v:V.items.length-ru,c:'#5ee08a'},{l:'Reused',v:ru,c:'#ff6b6b'}]));
const dn=V.items.filter(due).length;ch.append(donut('Review status',[{l:'Up to date',v:V.items.length-dn,c:'#5ee08a'},{l:'Due',v:dn,c:'#ffb84d'}]));
ch.append(lineC('Score trend',(V.sc||[]).map(p=>p.s)));
const days=[...Array(14)].map((_,k)=>new Date(Date.now()-(13-k)*864e5).toISOString().slice(0,10));ch.append(barsC('Activity (14 days)',days.map(d=>({l:d.slice(5),v:(V.log||[]).filter(e=>e.t.slice(0,10)===d).length}))))}
async function runAudit(){const A=await computeAudit();AU=A;if(V){V.sc=[...(V.sc||[]),{t:new Date().toISOString().slice(0,16).replace('T',' '),s:A.score}].slice(-30);logEv('Security audit run: score '+A.score);await persist()}renderAudit()}
function auditMd(){const A=AU,L=['# Security audit report','Generated: '+new Date().toISOString().slice(0,16).replace('T',' ')+' UTC','Score: '+A.score+'/100 (grade '+A.grade+')','','This report contains counts and evidence summaries only: no passwords, usernames or notes. It is the result of automated checks, not a penetration test.','','## Findings'];
if(!A.F.length)L.push('None.');['critical','warning','info'].forEach(s=>A.F.filter(f=>f.sev===s).forEach(f=>L.push('- ['+s.toUpperCase()+'] '+f.cat+': '+f.title+'. Evidence: '+f.ev+'. Fix: '+f.fix)));
L.push('','## Passed checks');A.P.forEach(p=>L.push('- '+p.cat+': '+p.title));return L.join('\n')}
$('au-run').onclick=()=>{msg('Running audit...');runAudit().then(()=>msg('Audit complete.'))};
$('au-exp').onclick=()=>{if(!AU)return msg('Run the audit first.',1);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([auditMd()],{type:'text/markdown'}));a.download='security-audit.md';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('pv-ver').onclick=()=>$('vf').click();
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));

/* Speed test for the key-derivation settings */
$('kd-test').onclick=async()=>{const o=$('kd-out');o.textContent='Testing...';await new Promise(r=>setTimeout(r,30));const salt=crypto.getRandomValues(new Uint8Array(16)),res=[];
let t0=performance.now();await mkKey('benchmark-password',salt,ITER);res.push('PBKDF2-SHA256, '+ITER.toLocaleString()+' rounds: '+Math.round(performance.now()-t0)+' ms');
if(await SODP){const P={k:'argon2id',m:ST.mem,t:argT(ST.mem),p:1};t0=performance.now();await deriveKey('benchmark-password',salt,P);const ms=Math.round(performance.now()-t0);
res.push('Argon2id, '+Math.round(P.m/1024)+' MiB, '+P.t+' passes: '+ms+' ms'+(ms>1500?'. Slow here: choose less memory.':ms<150?'. Fast here: you could use more memory.':'. Good range.'))}else res.push('Argon2id is not available (vendor/sodium.js did not load), so PBKDF2 is used.');
o.textContent='';res.forEach(r=>{const d=document.createElement('div');d.textContent=r;o.append(d)})};
/* Security Center: combined status overview */
function renderCenter(){const g=$('ce-status'),nx=$('ce-next');g.textContent='';nx.textContent='';
const card=(t,v,d)=>{const c=document.createElement('div');c.className='card';const h=document.createElement('div');h.className='mut';h.textContent=t;const b=document.createElement('b');b.textContent=v;b.style.fontSize='18px';const x=document.createElement('div');x.className='mut';x.textContent=d;c.append(h,b,x);g.append(c)};
let lb=null,lv=null;try{lb=localStorage.getItem('last-backup-mpv');lv=localStorage.getItem('last-verify-mpv')}catch(e){}
card('Vault',V?'Unlocked':S?'Locked':'Signed out',V?'Auto-lock after '+ST.idle+' min':S?'Enter your master password':'Choose a local profile');
const ls=V&&V.sc&&V.sc.length?V.sc[V.sc.length-1]:null;card('Last audit',ls?ls.s+'/100 ('+grade(ls.s)+')':'Not run',ls?ls.t:'Open Security audit');
card('Encrypted backup',lb||'None','Verified: '+(lv||'never')+(lb&&(!lv||lv<lb)?' (backup not verified yet)':''));
const kp=V?V.kp:null;card('Key derivation',kp?(kp.k==='argon2id'?'Argon2id':'PBKDF2'):'Unknown',kp?(kp.k==='argon2id'?Math.round(kp.m/1024)+' MiB, '+kp.t+' passes':kp.it.toLocaleString()+' rounds'):'Unlock to see');
const idv=V?V.id:S?S.id:null;card('Profile',idv?'Local vault':'None','No third-party identity provider');
card('Manual checks',MAN.filter(([k])=>MC[k]).length+' of '+MAN.length,'Tick them on the Security audit page');
const h=document.createElement('h3');h.textContent='Next steps';nx.append(h);
if(AU){const o={critical:0,warning:1},top=AU.F.filter(f=>f.sev!=='info').sort((a,b)=>o[a.sev]-o[b.sev]).slice(0,3);
if(!top.length){const d=document.createElement('div');d.className='mut';d.textContent='No open findings from the last audit.';nx.append(d)}else top.forEach(f=>{const d=document.createElement('div');d.className='finding f-'+f.sev;d.textContent=f.title+'. '+f.fix;nx.append(d)})}
else{const d=document.createElement('div');d.className='mut';d.textContent=V?'Open Security audit to see recommended next steps here.':'Unlock the vault and run the Security audit for next steps.';nx.append(d)}}
