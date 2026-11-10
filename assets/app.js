/* Aboiz GitHub Pages: interfaz pública. NINGÚN resultado o secreto se almacena aquí. */
(() => {
'use strict';
const app=document.getElementById('app');
const CATS=[['moda','Ropa y complementos'],['belleza','Belleza y cuidado personal'],['hogar','Decoración, hogar y cocina'],['ocio','Libros, música y entretenimiento'],['tecnologia','Tecnología y accesorios'],['gastronomia','Gastronomía y experiencias'],['aficiones','Deporte, naturaleza y aficiones']];
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={view:'home',token:sessionStorage.getItem('aboiz_auth')||'',role:sessionStorage.getItem('aboiz_role')||'',info:null,opened:false,notice:'',error:'',busy:false,lastIssued:null};
const config=window.ABOIZ_CONFIG||{};
// Sin URL explícita se usa el servidor local incluido. En GitHub Pages hay que
// indicar la URL HTTPS de Wix en config.js.
const apiUrl=String(config.apiUrl||'/api/aboiz26').trim();
const btn=(action,label,cls='btn')=>`<button type="button" class="${cls}" data-action="${action}">${label}</button>`;
function message(){return `${state.error?`<div class="error" role="alert">${escape(state.error)}</div>`:''}${state.notice?`<div class="success">${escape(state.notice)}</div>`:''}`;}
function setMsg(error='',notice=''){state.error=error;state.notice=notice;}
function el(html){app.innerHTML=html;window.scrollTo({top:0,behavior:'instant'});}
async function req(action,params={}){
 if(!(/^https:\/\/[^\s]+\/_functions\/aboiz26\/?$/.test(apiUrl)||apiUrl==='/api/aboiz26'))throw new Error('La URL del backend no es válida. Revisa config.js.');
 const resp=await fetch(apiUrl,{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',referrerPolicy:'no-referrer',body:JSON.stringify({action,token:state.token,...params})});
 let data;try{data=await resp.json();}catch{throw new Error('El servidor no devolvió JSON. Comprueba que la aplicación esté arrancada.');}
 if(!resp.ok)throw new Error(data.error||'Error de conexión');
 return data;
}
async function task(f){if(state.busy)return;state.busy=true;setMsg();try{await f();}catch(e){setMsg(e.message||'Error inesperado');}finally{state.busy=false;render();}}
const card=(inside)=>`<section class="card">${inside}</section>`;
function render(){
 let h='';
 if(state.view==='home'){
   h=card(`<h2>¿Cómo quieres acceder?</h2><p class="lead">Una sola web. Tres formas de participar.</p>${message()}<div class="auth-grid">
    ${btn('choose-admin','Administración · Joseba　›','btn auth-choice')}
    ${btn('choose-manager','Participantes · David　›','btn auth-choice')}
    ${btn('choose-guest','Código personal · Abrir mi regalo　›','btn auth-choice primary')}
   </div><p class="small">Las secciones son privadas. No compartas tus claves o códigos.</p>`);
 } else if(state.view==='login'){
   const admin=state.loginMode==='admin';
   h=card(`<h2>${admin?'Administración':'Participantes'}</h2><p class="lead">${admin?'Acceso exclusivo de Joseba.':'Gestión de participantes · David.'}</p>${message()}
    <form id="login-form"><label class="f">Contraseña<input class="in" name="password" type="password" minlength="16" autocomplete="current-password" required></label><div class="btns"><button class="btn primary" type="submit">Entrar</button>${btn('home','Volver')}</div></form>`);
 } else if(state.view==='code'){
   h=card(`<h2>Introduce tu código</h2><p class="lead">Es personal y secreto. Permite consultar tus deseos y abrir la caja.</p>${message()}<form id="code-form"><label class="f">Código de acceso<input class="in" name="code" autocomplete="off" autocapitalize="none" spellcheck="false" required placeholder="AB26-…"></label><div class="btns"><button class="btn primary" type="submit">Continuar</button>${btn('home','Volver')}</div></form>`);
 } else if(state.view==='panel'){
    if(!state.info)h=card(`<h2>Conectando…</h2>${message()}`);
    else if(state.role==='guest')h=guestPanel();
    else h=staffPanel();
 }
 el(h);
}
function staffPanel(){
 const d=state.info,admin=state.role==='admin';
 let h=card(`<div class="split"><h2>${admin?'Administración · Joseba':'Participantes · David'}</h2>${btn('logout','Salir')}</div>
 <p class="lead">${d.people.length} registros · ${d.people.filter(x=>x.active).length} activos · ${d.wishesFilled||0} listas con preferencias.</p>
 ${message()}<p class="${d.drawReady?'warn':'ok'}">${d.drawReady?'Sorteo realizado. Los cambios de participantes están bloqueados.':'Sorteo pendiente. Se pueden añadir y editar participantes.'}</p>
 <h3>Añadir participante</h3><form id="add-form" class="grid2"><label class="f">Nombre<input class="in" name="name" required maxlength="100"></label><label class="f">Correo (opcional)<input type="email" class="in" name="email" maxlength="160"></label><button class="btn primary" type="submit" ${d.drawReady?'disabled':''}>Añadir</button></form>`);
 if(admin){
    h+=card(`<h2>Sorteo y códigos</h2><p class="lead">Los códigos se generan individualmente. Al regenerar un código, el anterior queda invalidado. Guarda o envía el nuevo en el momento: después no se podrá recuperar.</p><div class="btns">${!d.drawReady?btn('draw','Realizar sorteo','btn primary'):btn('resetDraw','Anular sorteo y códigos','btn')}</div>
    ${state.lastIssued?`<div class="code-out"><strong>Código nuevo para ${escape(state.lastIssued.name)}</strong><p id="generated-code">${escape(state.lastIssued.code)}</p>${btn('copyCode','Copiar código')}</div>`:''}`);
 }
 h+=card(`<h2>Participantes</h2><div class="scroll-x"><table class="data-table"><thead><tr><th>Nombre</th><th>Correo</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
 ${d.people.map(x=>`<tr><td>${escape(x.name)}</td><td>${escape(x.email||'—')}</td><td>${x.active?'Activo':'Inactivo'}</td><td><div class="btns">${!d.drawReady&&x.active?`${btn('edit:'+x._id,'Editar')}${btn('remove:'+x._id,'Retirar')}`:''}${admin&&x.active&&d.drawReady?btn('issue:'+x._id,'Generar código'):''}</div></td></tr>`).join('')}
 </tbody></table></div>`);
 if(admin&&d.drawReady){
   h+=card(`<details><summary>Consultar emparejamientos · Solo Joseba</summary><p class="warn">Los resultados son confidenciales.</p><div class="scroll-x"><table class="data-table"><thead><tr><th>Regala</th><th>A</th></tr></thead><tbody>${(d.pairs||[]).map(x=>`<tr><td>${escape(x.from)}</td><td>${escape(x.to)}</td></tr>`).join('')}</tbody></table></div></details>`);
 }
 return h;
}
function wishSummary(w){if(!w?.selected?.length&&!w?.other)return '<p class="lead">Esta persona todavía no ha indicado preferencias.</p>';
 return `<div class="wish-summary">${(w.selected||[]).map(k=>{const c=CATS.find(x=>x[0]===k);return c?`<article><b>${escape(c[1])}</b></article>`:'';}).join('')}${w.other?`<article><b>Preferencias o cosas a evitar</b><p>${escape(w.other)}</p></article>`:''}</div>`;
}
function guestPanel(){
 const d=state.info,w=d.myWishes||{selected:[],other:''};
 const tile=CATS.map(([key,title])=>`<label class="wish-tile"><input type="checkbox" name="cat" value="${key}" ${w.selected?.includes(key)?'checked':''}><span>${escape(title)}</span></label>`).join('');
 return card(`<div class="split"><h2>Hola, ${escape(d.person.name)}</h2>${btn('logout','Salir')}</div>${message()}
 <details class="wish-dropdown" id="wish-details"><summary>Mi lista de deseos · Opcional</summary><form id="wish-form" class="wish-wrap">
 <p class="lead">Puedes elegir cero, una o varias categorías, escribir alguna preferencia o no rellenar nada.</p><div class="wish-grid">${tile}</div>
 <label class="f">Preferencias o cosas que evitar (opcional)<textarea name="other" maxlength="650" placeholder="Colores, tallas, gustos o cosas que prefieres evitar…">${escape(w.other||'')}</textarea></label>
 <button class="btn gold" type="submit">Guardar preferencias</button></form></details>
 ${!d.drawReady?`<p class="warn">El sorteo todavía no se ha realizado.</p>`:state.opened?
 `<section class="reveal"><h3>Te toca regalar a</h3><div class="giftee pop">${escape(d.gift?.name||'Pendiente')}</div><h3>Sus deseos</h3>${wishSummary(d.gift?.wishes)}<div class="btns">${btn('refreshGift','Actualizar deseos')}${btn('hideGift','Ocultar el nombre')}</div></section>`:
 `<section class="reveal"><h3>Un regalo para ti</h3><div class="unveil-stage"><div class="glow-halo"></div><div class="magic-sparks" aria-hidden="true">✧ <i>✦</i> ✧ <i>✶</i> ✧</div><button type="button" class="giftbox" data-action="openGift" aria-label="Abrir la caja de regalo"><span class="gift-shadow"></span><span class="body"></span><span class="lid"></span><span class="bow"></span></button><div class="stage-label">TOCA LA CAJA</div></div><p class="lead">Comprueba que nadie mire la pantalla antes de abrirla.</p></section>`}
 `);
}
function setLogin(role,token){state.role=role;state.token=token;sessionStorage.setItem('aboiz_auth',token);sessionStorage.setItem('aboiz_role',role);state.view='panel';state.opened=false;}
function logout(){state.token='';state.role='';state.info=null;state.lastIssued=null;state.view='home';state.opened=false;sessionStorage.removeItem('aboiz_auth');sessionStorage.removeItem('aboiz_role');}
async function refresh(){state.info=await req('me');}
app.addEventListener('submit',e=>{
 e.preventDefault();const form=e.target;const v=new FormData(form);
 if(form.id==='login-form')task(async()=>{const r=await req('login',{mode:state.loginMode,password:String(v.get('password'))});setLogin(r.role,r.token);await refresh();});
 else if(form.id==='code-form')task(async()=>{const r=await req('codeLogin',{code:String(v.get('code'))});setLogin(r.role,r.token);await refresh();});
 else if(form.id==='add-form')task(async()=>{await req('addPerson',{name:v.get('name'),email:v.get('email')});setMsg('','Participante añadido');await refresh();});
 else if(form.id==='wish-form')task(async()=>{const selected=v.getAll('cat');await req('saveWish',{selected,other:String(v.get('other'))});await refresh();setMsg('','Preferencias guardadas');});
});
app.addEventListener('click',e=>{
 const button=e.target.closest('button[data-action]');if(!button)return;
 const act=button.dataset.action;
 if(act==='home'){state.view='home';setMsg();render();return;}
 if(act==='choose-admin'||act==='choose-manager'){state.view='login';state.loginMode=act==='choose-admin'?'admin':'manager';setMsg();render();return;}
 if(act==='choose-guest'){state.view='code';setMsg();render();return;}
 if(act==='logout'){logout();render();return;}
 if(act==='openGift'){state.opened=true;render();return;}
 if(act==='hideGift'){state.opened=false;render();return;}
 if(act==='refreshGift'){task(async()=>{await refresh();setMsg('','Deseos actualizados');});return;}
 if(act==='copyCode'){const c=state.lastIssued?.code;if(c)navigator.clipboard.writeText(c).then(()=>{setMsg('','Código copiado');render();}).catch(()=>{setMsg('No se pudo copiar. Selecciona el código manualmente.');render();});return;}
 if(act==='draw'){if(!confirm('¿Confirmas el sorteo? Se bloqueará la edición de participantes.'))return;task(async()=>{await req('draw');await refresh();setMsg('','Sorteo realizado');});return;}
 if(act==='resetDraw'){if(!confirm('¿ANULAR el sorteo? Se invalidarán todos los códigos enviados. Esta acción no se puede deshacer.'))return;task(async()=>{await req('invalidateDraw');state.lastIssued=null;await refresh();setMsg('','Sorteo anulado; códigos invalidados');});return;}
 if(act.startsWith('issue:')){const id=act.slice(6);if(!confirm('Se invalidará el código anterior de esta persona. ¿Continuar?'))return;task(async()=>{state.lastIssued=await req('issueCode',{id});await refresh();setMsg('','Copia el código ahora; no se mostrará de nuevo.');});return;}
 if(act.startsWith('remove:')){const id=act.slice(7);if(!confirm('¿Retirar participante?'))return;task(async()=>{await req('removePerson',{id});await refresh();setMsg('','Participante desactivado');});return;}
 if(act.startsWith('edit:')){const id=act.slice(5),p=state.info.people.find(x=>x._id===id);if(!p)return;const name=prompt('Nombre:',p.name);if(name===null)return;const email=prompt('Correo (opcional):',p.email||'');if(email===null)return;task(async()=>{await req('updatePerson',{id,name,email});await refresh();setMsg('','Participante actualizado');});return;}
});
(async()=>{if(state.token&&state.role){state.view='panel';try{await refresh();}catch(e){logout();setMsg('La sesión ha caducado. Accede de nuevo.');}}render();})();
})();
