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
// Pareja fija OPCIONAL desde secretos Wix; no dejar nombres en repositorios públicos.
// Introducir aquí la URL EXACTA de tu GitHub Pages, SIN barra final.
const ALLOWED_ORIGIN = 'https://joteiza003.github.io';
const SECRET_NAMES = { admin:'ABOIZ_ADMIN_PASSWORD', david:'ABOIZ_DAVID_PASSWORD', signing:'ABOIZ_SIGNING_KEY', pepper:'ABOIZ_CODE_PEPPER', fixedGiver:'ABOIZ_FIXED_GIVER', fixedReceiver:'ABOIZ_FIXED_RECEIVER' };

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
const cleanPerson=p=>({_id:p._id,name:p.name,email:p.email||'',active:!!p.active,hasCode:!!p.codeHash});
const text=(x,max)=>String(x||'').trim().slice(0,max);
const isEmail=x=>!x||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
async function all(col){let arr=[],skip=0,got;do{got=await wixData.query(col).limit(1000).skip(skip).find(OPT);arr.push(...got.items);skip+=got.items.length;}while(got.hasNext()&&arr.length<5000);return arr;}
async function currentDraw(){const rows=await all(DB.draw);return rows.find(x=>x.year===YEAR && x.active) || null;}
function giftIndex(givers,pairs){const map={};for(let i=0;i<givers.length;i++)map[givers[i]._id]=givers[pairs[i]]._id;return map;}
function randomInt(n){return crypto.randomInt(n);}
function shuffle(list){for(let i=list.length-1;i>0;i--){const j=randomInt(i+1);[list[i],list[j]]=[list[j],list[i]];}return list;}
function makeDraw(people,fixed){
 const n=people.length;if(n<3)err('Se necesitan al menos tres participantes activos');
 const give=fixed.giver?people.findIndex(p=>norm(p.name)===norm(fixed.giver)):-1;
 const receive=fixed.receiver?people.findIndex(p=>norm(p.name)===norm(fixed.receiver)):-1;
 if(fixed.giver&&fixed.receiver&&(give<0||receive<0))err('Falta una persona de la pareja fija configurada',409);
 for(let attempt=0;attempt<20000;attempt++){
   let arr=shuffle(Array.from({length:n},(_,i)=>i));
   if(give>=0 && arr[give]!==receive)continue;
   if(arr.some((j,i)=>j===i))continue;
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
   if(!/^AB26-[A-Za-z0-9_-]{30,60}$/.test(code))err('Código no válido',401);
   const codeHash=hash((await secret(SECRET_NAMES.pepper))+':'+code);
   const rows=await wixData.query(DB.people).eq('codeHash',codeHash).limit(2).find(OPT);
   const p=rows.items[0];if(!p||!p.active)err('Código no válido',401);
   return {token:await sign('guest',p._id,p.rev),role:'guest',name:p.name};
 }
 const p=await verify(data.token);
 if(action==='me'){
   if(p.role==='guest'){
     const self=await wixData.get(DB.people,p.id,OPT);
     const w=await wixData.query(DB.wish).eq('personId',p.id).eq('year',YEAR).limit(1).find(OPT);
     const draw=await currentDraw();
     const recipientId=draw?.pairs?.[p.id];
     let gift=null;
     if(recipientId){
       const target=await wixData.get(DB.people,recipientId,OPT);
       const targetWish=await wixData.query(DB.wish).eq('personId',recipientId).eq('year',YEAR).limit(1).find(OPT);
       gift={name:target.name,wishes:stripWish(targetWish.items[0])};
     }
     return {role:'guest',person:{name:self.name},myWishes:stripWish(w.items[0]),gift,drawReady:!!draw};
   }
   const people=(await all(DB.people)).filter(x=>x.year===YEAR).map(cleanPerson).sort((a,b)=>a.name.localeCompare(b.name,'es'));
   const draw=await currentDraw();
   const count=(await all(DB.wish)).filter(x=>x.year===YEAR).filter(x=>x.selected?.length||x.other).length;
   const r={role:p.role,people,drawReady:!!draw,wishesFilled:count};
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
 if(action==='addPerson'){
   if(await currentDraw())err('El sorteo está cerrado. Para modificar participantes, anula primero el sorteo.',409);
   const name=text(data.name,100),email=text(data.email,160);
   if(name.length<2||!isEmail(email))err('Nombre o correo incorrectos');
   const people=(await all(DB.people)).filter(x=>x.year===YEAR);
   if(people.length>=MAX_PEOPLE)err('Límite de participantes alcanzado');
   if(people.some(x=>norm(x.name)===norm(name)))err('Ya existe un participante con ese nombre',409);
   const obj=await wixData.insert(DB.people,{name,email,year:YEAR,active:true,codeHash:'',rev:rand(10)},OPT);
   return {person:cleanPerson(obj)};
 }
 if(action==='updatePerson'){
   if(await currentDraw())err('El sorteo está cerrado. Anúlalo antes de editar participantes.',409);
   const x=await wixData.get(DB.people,text(data.id,100),OPT).catch(()=>null);
   if(!x||x.year!==YEAR)err('Participante no encontrado',404);
   const name=text(data.name,100),email=text(data.email,160);
   if(name.length<2||!isEmail(email))err('Nombre o correo incorrectos');
   const others=(await all(DB.people)).filter(y=>y.year===YEAR&&y._id!==x._id);
   if(others.some(y=>norm(y.name)===norm(name)))err('Nombre duplicado',409);
   x.name=name;x.email=email;
   await wixData.update(DB.people,x,OPT);return {ok:true};
 }
 if(action==='removePerson'){
   if(await currentDraw())err('Anula el sorteo antes de retirar participantes.',409);
   const x=await wixData.get(DB.people,text(data.id,100),OPT).catch(()=>null);
   if(!x||x.year!==YEAR)err('Participante no encontrado',404);
   x.active=false;x.codeHash='';x.rev=rand(10);
   await wixData.update(DB.people,x,OPT);return {ok:true};
 }
 requireRole(p,['admin']);
 if(action==='draw'){
   if(await currentDraw())err('Ya existe un sorteo. Anúlalo antes de generar otro.',409);
   const people=(await all(DB.people)).filter(x=>x.year===YEAR&&x.active);
   let fixedGiver='',fixedReceiver='';
   try{fixedGiver=(await secret(SECRET_NAMES.fixedGiver))||'';}catch(e){}
   try{fixedReceiver=(await secret(SECRET_NAMES.fixedReceiver))||'';}catch(e){}
   if(Boolean(fixedGiver)!==Boolean(fixedReceiver))err('Configura ambos secretos de pareja fija o ninguno',503);
   const pairs=makeDraw(people,{giver:fixedGiver,receiver:fixedReceiver});
   // Solo un registro de sorteo; el campo pairs nunca sale al gestor ni a invitados.
   await wixData.insert(DB.draw,{year:YEAR,active:true,pairs,createdAt:new Date()},OPT);
   // Invalidación de códigos anteriores, si los había.
   for(const x of people){x.codeHash='';x.rev=rand(10);await wixData.update(DB.people,x,OPT);}
   return {ok:true};
 }
 if(action==='invalidateDraw'){
   const draw=await currentDraw();if(!draw)err('No hay sorteo activo',409);
   draw.active=false;await wixData.update(DB.draw,draw,OPT);
   const people=(await all(DB.people)).filter(x=>x.year===YEAR);
   for(const x of people){x.codeHash='';x.rev=rand(10);await wixData.update(DB.people,x,OPT);}
   return {ok:true};
 }
 if(action==='issueCode'){
   const draw=await currentDraw();if(!draw)err('Realiza primero el sorteo',409);
   const x=await wixData.get(DB.people,text(data.id,100),OPT).catch(()=>null);
   if(!x||x.year!==YEAR||!x.active)err('Participante incorrecto',404);
   const code='AB26-'+rand(27);
   x.codeHash=hash((await secret(SECRET_NAMES.pepper))+':'+code);x.rev=rand(10);
   await wixData.update(DB.people,x,OPT);
   return {name:x.name,email:x.email||'',code}; // ÚNICA VEZ: mostrar para copiar, NO volver a consultar
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
