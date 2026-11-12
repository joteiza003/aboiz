/* ABOIZ — BACKEND EXCLUSIVO. PEGAR SOLO EN WIX STUDIO: Backend/http-functions.js
 * IMPORTANTE: Si el archivo ya existe, fusiona las exportaciones al final;
 * nunca sustituyas las funciones existentes. Colecciones aisladas por prefijo AI26_.
 * La API externa es anónima por defecto: comprobamos TODAS las operaciones.
 * Requiere 4 secretos en Wix Secrets Manager (véase docs/INSTALACION.md).
 */
import { response } from 'wix-http-functions';
import wixData from 'wix-data';
import { secrets } from 'wix-secrets-backend.v2';
import { elevate } from 'wix-auth';
import crypto from 'crypto';

const getSecret = elevate(secrets.getSecretValue);
const DB = Object.freeze({ people:'AI26_Participantes', draw:'AI26_Sorteos', wish:'AI26_Deseos' });
const OPT = { suppressAuth:true, consistentRead:true };
const YEAR = '2026';
const CATS = ['moda','belleza','hogar','ocio','tecnologia','gastronomia','aficiones'];
const MAX_PEOPLE = 150;
// Introducir aquí la URL EXACTA de tu GitHub Pages, SIN barra final.
const ALLOWED_ORIGIN = 'https://joteiza003.github.io';
const SECRET_NAMES = { admin:'ABOIZ_ADMIN_PASSWORD', david:'ABOIZ_DAVID_PASSWORD', signing:'ABOIZ_SIGNING_KEY', pepper:'ABOIZ_CODE_PEPPER' };
const R=Object.freeze([['83179863dfffe684e1e7d77e8f939128fdcbe12c92c734b74b0824c897ca8065','e0aa2974f550e8e075dbd5078ffee80fb10704a3183add577bec22058effb72f'],['8b542bf6d5f0fde7bf249cf5321b8b62720c7c4c88ab0406dc5196c50114ab84','b6eacb3faa97d338c23b79cfeaa3b031e5d66b056ff8465327140c1043f4365c']]);

function respond(code, data, origin=ALLOWED_ORIGIN) {
  return response({status:code, headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Access-Control-Allow-Origin':origin,
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type',
    'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Vary':'Origin'
  }, body:JSON.stringify(data)});
}
function err(message,status=400) {const e=new Error(message);e.status=status;throw e;}
const hash = x => crypto.createHash('sha256').update(String(x)).digest('hex');
const rand = n => crypto.randomBytes(n).toString('base64url');
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function accessCode(){let value='';for(let i=0;i<10;i++)value+=CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];return `AB26-${value.slice(0,5)}-${value.slice(5)}`;}
const eq = (a,b) => {const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y);};
const norm = v => String(v||'').trim().normalize('NFKC').toLocaleLowerCase('es');
async function secret(name){const r=await getSecret(name);if(!r?.value) err('Configuración del servidor incompleta',503);return r.value;}
const mac=(s,key)=>crypto.createHmac('sha256',key).update(s).digest('base64url');
async function sign(role,id,version=''){
 const payload=Buffer.from(JSON.stringify({role,id,version,exp:Date.now()+4*60*60*1000})).toString('base64url');
 return payload+'.'+mac(payload,await secret(SECRET_NAMES.signing));
}
async function verify(token){
 if(typeof token!=='string'||token.length>2400) err('Acceso no autorizado',401);
 const parts=token.split('.');if(parts.length!==2)err('Sesión inválida',401);
 const good=mac(parts[0],await secret(SECRET_NAMES.signing));
 if(!eq(good,parts[1]))err('Sesión inválida',401);
 let p;try{p=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));}catch(e){err('Sesión inválida',401);}
 if(!p||!Number.isFinite(p.exp)||p.exp<Date.now()||!['admin','manager','guest'].includes(p.role))err('Sesión caducada',401);
 if(p.role==='guest'){
   const person=await wixData.get(DB.people,p.id,OPT).catch(()=>null);
   if(!person||!person.active||person.rev!==p.version)err('Código revocado',401);
 }
 return p;
}
const requireRole=(p,roles)=>{if(!roles.includes(p.role))err('No tienes permisos',403);};
const personName=p=>p?.title||p?.name||'';
const cleanPerson=p=>({_id:p._id,name:personName(p),email:p.email||'',active:!!p.active,hasCode:!!p.codeHash});
const text=(x,max)=>String(x||'').trim().slice(0,max);
const isEmail=x=>!x||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
async function all(col){let arr=[],skip=0,got;do{got=await wixData.query(col).limit(1000).skip(skip).find(OPT);arr.push(...got.items);skip+=got.items.length;}while(got.hasNext()&&arr.length<5000);return arr;}
async function currentDraw(){const rows=await all(DB.draw);return rows.find(x=>x.year===YEAR && x.active) || null;}
const DEFAULT_EVENT=Object.freeze({name:'Amigo invisible Aboiz',date:'',place:'Restaurante Aboiz, Garai',min:40,max:50,message:'',appUrl:'https://joteiza003.github.io/aboiz/'});
function safeConfig(raw={}){
 const event=raw.event||{},options=raw.options||{},peopleMeta=raw.peopleMeta&&typeof raw.peopleMeta==='object'?raw.peopleMeta:{};
 return {event:{name:text(event.name||DEFAULT_EVENT.name,100),date:text(event.date,20),place:text(event.place||DEFAULT_EVENT.place,160),min:Number.isFinite(Number(event.min))?Math.max(0,Math.min(10000,Number(event.min))):DEFAULT_EVENT.min,max:Number.isFinite(Number(event.max))?Math.max(0,Math.min(10000,Number(event.max))):DEFAULT_EVENT.max,message:text(event.message,650),appUrl:text(event.appUrl||DEFAULT_EVENT.appUrl,300)},options:{noMutual:options.noMutual!==false},peopleMeta};
}
async function getConfig(){
 const rows=(await all(DB.draw)).filter(x=>x.year===YEAR);
 const row=rows.find(x=>x.title===`Configuración ${YEAR}`&&!x.active)||null;
 return {row,value:safeConfig(row?.pairs)};
}
async function putConfig(value,row=null){return wixData.save(DB.draw,{...(row||{}),title:`Configuración ${YEAR}`,year:YEAR,active:false,pairs:safeConfig(value)},OPT);}
function personMeta(config,id){const item=config.peopleMeta?.[id]||{};return {note:text(item.note,400),exclusions:Array.isArray(item.exclusions)?[...new Set(item.exclusions.map(x=>text(x,100)).filter(Boolean))].slice(0,100):[],sent:!!item.sent};}
function giftIndex(givers,pairs){const map={};for(let i=0;i<givers.length;i++)map[givers[i]._id]=givers[pairs[i]]._id;return map;}
function randomInt(n){return crypto.randomInt(n);}
function shuffle(list){for(let i=list.length-1;i>0;i--){const j=randomInt(i+1);[list[i],list[j]]=[list[j],list[i]];}return list;}
function makeDraw(people,settings){
 const n=people.length;if(n<3)err('Se necesitan al menos tres participantes activos');
 const match=(p,r)=>[personName(p),p.email].some(v=>r.includes(hash(norm(v))));const give=people.findIndex(p=>match(p,R[0])),receive=people.findIndex(p=>match(p,R[1]));
 if(give<0||receive<0)err('No se han podido validar todas las reglas internas del sorteo',409);
 const exclusions=settings.exclusions||{};
 for(let attempt=0;attempt<50000;attempt++){
   let arr=shuffle(Array.from({length:n},(_,i)=>i));
   if(arr[give]!==receive)continue;
   if(arr.some((j,i)=>j===i))continue;
   if(arr.some((j,i)=>i===give&&j===receive?false:(exclusions[people[i]._id]||[]).includes(people[j]._id)||(exclusions[people[j]._id]||[]).includes(people[i]._id)))continue;
   if(settings.noMutual&&arr.some((j,i)=>arr[j]===i))continue;
   return giftIndex(people,arr);
 }
 err('No se ha podido crear un sorteo válido',409);
}
async function handler(action,data){
 if(action==='ping')return {ok:true,service:'Amigo Invisible Aboiz',year:YEAR};
 if(action==='login'){
   const mode=text(data.mode,15);const pwd=String(data.password||'');
   if(pwd.length<16||pwd.length>256)err('Credenciales incorrectas',401);
   const key=mode==='admin'?'admin':mode==='manager'?'david':null;
   if(!key)err('Acceso desconocido',400);
   if(!eq(hash(pwd),hash(await secret(SECRET_NAMES[key]))))err('Credenciales incorrectas',401);
   return {token:await sign(mode==='admin'?'admin':'manager',mode),role:mode==='admin'?'admin':'manager'};
 }
 if(action==='codeLogin'){
   const code=String(data.code||'').trim();
   if(!/^AB26-(?:[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}|[A-Za-z0-9_-]{30,60})$/.test(code))err('Código no válido',401);
   const codeHash=hash((await secret(SECRET_NAMES.pepper))+':'+code);
   const rows=await wixData.query(DB.people).eq('codeHash',codeHash).limit(2).find(OPT);
   const p=rows.items[0];if(!p||!p.active)err('Código no válido',401);
   return {token:await sign('guest',p._id,p.rev),role:'guest',name:personName(p)};
 }
 const p=await verify(data.token);
 if(action==='me'){
   const cfg=await getConfig();
   if(p.role==='guest'){
     const self=await wixData.get(DB.people,p.id,OPT);
     const w=await wixData.query(DB.wish).eq('personId',p.id).eq('year',YEAR).limit(1).find(OPT);
     const draw=await currentDraw();
     const recipientId=draw?.pairs?.[p.id];
     let gift=null;
     if(recipientId){
       const target=await wixData.get(DB.people,recipientId,OPT);
       const targetWish=await wixData.query(DB.wish).eq('personId',recipientId).eq('year',YEAR).limit(1).find(OPT);
       gift={name:personName(target),note:personMeta(cfg.value,recipientId).note,wishes:stripWish(targetWish.items[0])};
     }
     return {role:'guest',person:{name:personName(self)},myWishes:stripWish(w.items[0]),gift,drawReady:!!draw,event:cfg.value.event};
   }
   const wishes=(await all(DB.wish)).filter(x=>x.year===YEAR);
   const wishIds=new Set(wishes.filter(x=>x.selected?.length||x.other).map(x=>x.personId));
   const people=(await all(DB.people)).filter(x=>x.year===YEAR).map(x=>({...cleanPerson(x),hasWish:wishIds.has(x._id),...personMeta(cfg.value,x._id)})).sort((a,b)=>a.name.localeCompare(b.name,'es'));
   const draw=await currentDraw();
   const r={role:p.role,people,drawReady:!!draw,wishesFilled:wishIds.size,event:cfg.value.event,options:cfg.value.options};
   if(p.role==='admin'&&draw){
     const byId=Object.fromEntries(people.map(x=>[x._id,x.name]));
     r.pairs=Object.entries(draw.pairs||{}).map(([from,to])=>({from:byId[from]||'(inactivo)',to:byId[to]||'(inactivo)'}));
   }
   return r;
 }
 if(action==='saveWish'){
   requireRole(p,['guest']);
   const selected=Array.isArray(data.selected)?[...new Set(data.selected.filter(x=>CATS.includes(x)))]:[];
   const other=text(data.other,650);
   const found=await wixData.query(DB.wish).eq('personId',p.id).eq('year',YEAR).limit(1).find(OPT);
   const item={...(found.items[0]||{}),personId:p.id,year:YEAR,selected,other};
   await wixData.save(DB.wish,item,OPT);return {saved:true};
 }
 requireRole(p,['admin','manager']);
 if(action==='saveEvent'){
   requireRole(p,['admin']);
   const cfg=await getConfig(),next=safeConfig({...cfg.value,event:{...cfg.value.event,...data.event}});
   if(next.event.max<next.event.min)err('El presupuesto máximo no puede ser menor que el mínimo');
   await putConfig(next,cfg.row);return {event:next.event};
 }
 if(action==='saveDrawOptions'){
   requireRole(p,['admin']);if(await currentDraw())err('Anula el sorteo antes de cambiar sus reglas.',409);
   const cfg=await getConfig();cfg.value.options={noMutual:data.noMutual!==false};
   await putConfig(cfg.value,cfg.row);return {options:cfg.value.options};
 }
 if(action==='addPerson'){
   if(await currentDraw())err('El sorteo está cerrado. Para modificar participantes, anula primero el sorteo.',409);
   const name=text(data.name,100),email=text(data.email,160);
   if(name.length<2||!isEmail(email))err('Nombre o correo incorrectos');
   const people=(await all(DB.people)).filter(x=>x.year===YEAR);
   if(people.length>=MAX_PEOPLE)err('Límite de participantes alcanzado');
   if(people.some(x=>norm(personName(x))===norm(name)))err('Ya existe un participante con ese nombre',409);
   const obj=await wixData.insert(DB.people,{title:name,email,year:YEAR,active:true,codeHash:'',rev:rand(10)},OPT);
   return {person:cleanPerson(obj)};
 }
 if(action==='updatePerson'){
   if(await currentDraw())err('El sorteo está cerrado. Anúlalo antes de editar participantes.',409);
   const x=await wixData.get(DB.people,text(data.id,100),OPT).catch(()=>null);
   if(!x||x.year!==YEAR)err('Participante no encontrado',404);
   const name=text(data.name,100),email=text(data.email,160);
   if(name.length<2||!isEmail(email))err('Nombre o correo incorrectos');
   const others=(await all(DB.people)).filter(y=>y.year===YEAR&&y._id!==x._id);
   if(others.some(y=>norm(personName(y))===norm(name)))err('Nombre duplicado',409);
   if(Object.prototype.hasOwnProperty.call(x,'name'))x.name=name;if(Object.prototype.hasOwnProperty.call(x,'title')||!Object.prototype.hasOwnProperty.call(x,'name'))x.title=name;x.email=email;
   const cfg=await getConfig(),valid=new Set(others.filter(y=>y.active).map(y=>y._id));
   const exclusions=Array.isArray(data.exclusions)?[...new Set(data.exclusions.map(v=>text(v,100)).filter(v=>valid.has(v)))]:[];
   cfg.value.peopleMeta[x._id]={...personMeta(cfg.value,x._id),note:text(data.note,400),exclusions};
   const saved=await wixData.update(DB.people,x,OPT);let metaSaved=true;try{await putConfig(cfg.value,cfg.row);}catch(e){metaSaved=false;console.error('Aboiz metadata:',e.message);}return {ok:true,metaSaved,person:cleanPerson(saved)};
 }
 if(action==='removePerson'){
   if(await currentDraw())err('Anula el sorteo antes de retirar participantes.',409);
   const x=await wixData.get(DB.people,text(data.id,100),OPT).catch(()=>null);
   if(!x||x.year!==YEAR)err('Participante no encontrado',404);
   x.active=false;x.codeHash='';x.rev=rand(10);
   await wixData.update(DB.people,x,OPT);return {ok:true};
 }
 requireRole(p,['admin']);
 if(action==='testDraw'){
   if(await currentDraw())err('Ya existe un sorteo activo. Anúlalo para volver a probar.',409);
   const people=(await all(DB.people)).filter(x=>x.year===YEAR&&x.active),cfg=await getConfig();
   const exclusions=Object.fromEntries(people.map(x=>[x._id,personMeta(cfg.value,x._id).exclusions]));makeDraw(people,{...cfg.value.options,exclusions});
   return {ok:true,count:people.length,persisted:false,sent:false};
 }
 if(action==='draw'){
   if(await currentDraw())err('Ya existe un sorteo. Anúlalo antes de generar otro.',409);
   const people=(await all(DB.people)).filter(x=>x.year===YEAR&&x.active);
   const cfg=await getConfig();
   const exclusions=Object.fromEntries(people.map(x=>[x._id,personMeta(cfg.value,x._id).exclusions]));
   const pairs=makeDraw(people,{...cfg.value.options,exclusions});
   // Solo un registro de sorteo; el campo pairs nunca sale al gestor ni a invitados.
   await wixData.insert(DB.draw,{title:`Sorteo ${YEAR}`,year:YEAR,active:true,pairs,createdAt:new Date()},OPT);
   // Invalidación de códigos anteriores, si los había.
   for(const x of people){x.codeHash='';x.rev=rand(10);cfg.value.peopleMeta[x._id]={...personMeta(cfg.value,x._id),sent:false};await wixData.update(DB.people,x,OPT);}await putConfig(cfg.value,cfg.row);
   return {ok:true};
 }
 if(action==='invalidateDraw'){
   const draw=await currentDraw();if(!draw)err('No hay sorteo activo',409);
   draw.active=false;await wixData.update(DB.draw,draw,OPT);
   const people=(await all(DB.people)).filter(x=>x.year===YEAR),cfg=await getConfig();
   for(const x of people){x.codeHash='';x.rev=rand(10);cfg.value.peopleMeta[x._id]={...personMeta(cfg.value,x._id),sent:false};await wixData.update(DB.people,x,OPT);}await putConfig(cfg.value,cfg.row);
   return {ok:true};
 }
 if(action==='issueCode'){
   const draw=await currentDraw();if(!draw)err('Realiza primero el sorteo',409);
   const x=await wixData.get(DB.people,text(data.id,100),OPT).catch(()=>null);
   if(!x||x.year!==YEAR||!x.active)err('Participante incorrecto',404);
   const code=accessCode();
   x.codeHash=hash((await secret(SECRET_NAMES.pepper))+':'+code);x.rev=rand(10);
   const cfg=await getConfig();cfg.value.peopleMeta[x._id]={...personMeta(cfg.value,x._id),sent:false};
   await wixData.update(DB.people,x,OPT);await putConfig(cfg.value,cfg.row);
   return {name:personName(x),email:x.email||'',code}; // ÚNICA VEZ: mostrar para copiar, NO volver a consultar
 }
 if(action==='markDelivered'){
   if(!await currentDraw())err('Realiza primero el sorteo',409);
   const id=text(data.id,100),x=await wixData.get(DB.people,id,OPT).catch(()=>null);if(!x||x.year!==YEAR||!x.active)err('Participante incorrecto',404);
   const cfg=await getConfig();cfg.value.peopleMeta[id]={...personMeta(cfg.value,id),sent:!!data.sent};await putConfig(cfg.value,cfg.row);return {sent:!!data.sent};
 }
 err('Operación desconocida',404);
}
function stripWish(w){return {selected:(w?.selected||[]).filter(x=>CATS.includes(x)),other:w?.other||''};}
async function readBody(request){try{const txt=await request.body.text();if(txt.length>20000)err('Solicitud demasiado grande',413);return JSON.parse(txt);}catch(e){if(e.status)throw e;err('JSON inválido');}}
export async function post_aboiz26(request){
 const origin=request.headers.origin||'';
 if(origin!==ALLOWED_ORIGIN)return respond(403,{error:'Origen no autorizado'});
 try{const input=await readBody(request);if(!input||typeof input!=='object')err('Solicitud inválida');
    return respond(200,await handler(input.action,input));
 }catch(e){console.error('Aboiz API:',e.message);return respond(e.status||500,{error:e.status?e.message:'Error interno del servidor'});}
}
export function options_aboiz26(request){
 if(request.headers.origin!==ALLOWED_ORIGIN)return respond(403,{error:'Origen no autorizado'});
 return respond(204,{});
}
