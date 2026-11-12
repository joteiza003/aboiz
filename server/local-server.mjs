import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATEGORIES = new Set(['moda','belleza','hogar','ocio','tecnologia','gastronomia','aficiones']);
const YEAR = '2026';
const MAX_PEOPLE = 150;
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};

const text = (value, max) => String(value ?? '').trim().slice(0, max);
const normalize = value => text(value, 200).normalize('NFKC').toLocaleLowerCase('es');
const random = bytes => crypto.randomBytes(bytes).toString('base64url');
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const accessCode=()=>{let value='';for(let i=0;i<10;i++)value+=CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];return `AB26-${value.slice(0,5)}-${value.slice(5)}`;};
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const safeEqual = (a,b) => {
  const left=Buffer.from(String(a)), right=Buffer.from(String(b));
  return left.length===right.length && crypto.timingSafeEqual(left,right);
};
const fail = (message, status=400) => Object.assign(new Error(message), {status});
const DEFAULT_EVENT={name:'Amigo invisible Aboiz',date:'',place:'Restaurante Aboiz, Garai',min:40,max:50,message:'',appUrl:'https://joteiza003.github.io/aboiz/'};
const R=Object.freeze([['83179863dfffe684e1e7d77e8f939128fdcbe12c92c734b74b0824c897ca8065','e0aa2974f550e8e075dbd5078ffee80fb10704a3183add577bec22058effb72f'],['8b542bf6d5f0fde7bf249cf5321b8b62720c7c4c88ab0406dc5196c50114ab84','b6eacb3faa97d338c23b79cfeaa3b031e5d66b056ff8465327140c1043f4365c']]);
const emptyDb = () => ({people:[],draws:[],wishes:[],config:{event:{...DEFAULT_EVENT},options:{noMutual:true},peopleMeta:{}}});

export function createLocalApp(options={}) {
  const dataDir=path.resolve(options.dataDir || process.env.ABOIZ_DATA_DIR || path.join(ROOT,'.data'));
  const dataFile=path.join(dataDir,'aboiz.json');
  let signingKey=options.signingKey || process.env.ABOIZ_SIGNING_KEY || '';
  let pepper=options.pepper || process.env.ABOIZ_CODE_PEPPER || '';
  let adminPassword=options.adminPassword || process.env.ABOIZ_ADMIN_PASSWORD || '';
  let managerPassword=options.managerPassword || process.env.ABOIZ_DAVID_PASSWORD || '';
  let db=null;
  let queue=Promise.resolve();

  async function load() {
    if(db)return db;
    await fs.mkdir(dataDir,{recursive:true});
    const secretsFile=path.join(dataDir,'secrets.json');
    if(!signingKey||!pepper||!adminPassword||!managerPassword){
      let localSecrets;
      try{localSecrets=JSON.parse(await fs.readFile(secretsFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;localSecrets={};}
      signingKey ||= localSecrets.signingKey || random(48);
      pepper ||= localSecrets.pepper || random(48);
      adminPassword ||= localSecrets.adminPassword || 'Joseba-'+random(18);
      managerPassword ||= localSecrets.managerPassword || 'David-'+random(18);
      if(!localSecrets.signingKey||!localSecrets.pepper||!localSecrets.adminPassword||!localSecrets.managerPassword)await fs.writeFile(secretsFile,JSON.stringify({signingKey,pepper,adminPassword,managerPassword},null,2),'utf8');
    }
    try{db=JSON.parse(await fs.readFile(dataFile,'utf8'));}
    catch(error){if(error.code!=='ENOENT')throw error;db=emptyDb();await save();}
    for(const key of ['people','draws','wishes'])if(!Array.isArray(db[key]))db[key]=[];
    db.config ||= {};db.config.event={...DEFAULT_EVENT,...db.config.event};db.config.options={noMutual:db.config.options?.noMutual!==false};db.config.peopleMeta ||= {};
    return db;
  }
  async function save(){
    await fs.mkdir(dataDir,{recursive:true});
    const temporary=dataFile+'.tmp';
    await fs.writeFile(temporary,JSON.stringify(db,null,2),'utf8');
    await fs.rename(temporary,dataFile);
  }
  const activeDraw=()=>db.draws.find(x=>x.year===YEAR&&x.active) || null;
  const cleanPerson=p=>({_id:p._id,name:p.name,email:p.email||'',active:!!p.active,hasCode:!!p.codeHash});
  const stripWish=w=>({selected:(w?.selected||[]).filter(x=>CATEGORIES.has(x)),other:w?.other||''});
  const findWish=id=>db.wishes.find(x=>x.personId===id&&x.year===YEAR);
  const meta=id=>{const value=db.config.peopleMeta[id]||{};return {note:text(value.note,400),exclusions:Array.isArray(value.exclusions)?[...new Set(value.exclusions.map(x=>text(x,100)).filter(Boolean))]:[],sent:!!value.sent};};
  const mac=value=>crypto.createHmac('sha256',signingKey).update(value).digest('base64url');
  function sign(role,id,version=''){
    const body=Buffer.from(JSON.stringify({role,id,version,exp:Date.now()+4*60*60*1000})).toString('base64url');
    return body+'.'+mac(body);
  }
  function verify(token){
    if(typeof token!=='string'||token.length>2400)throw fail('Acceso no autorizado',401);
    const parts=token.split('.');
    if(parts.length!==2||!safeEqual(mac(parts[0]),parts[1]))throw fail('Sesión inválida',401);
    let payload;try{payload=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));}catch{throw fail('Sesión inválida',401);}
    if(!payload||payload.exp<Date.now()||!['admin','manager','guest'].includes(payload.role))throw fail('Sesión caducada',401);
    if(payload.role==='guest'){
      const person=db.people.find(x=>x._id===payload.id);
      if(!person||!person.active||person.rev!==payload.version)throw fail('Código revocado',401);
    }
    return payload;
  }
  const requireRole=(session,roles)=>{if(!roles.includes(session.role))throw fail('No tienes permisos',403);};
  function makeDraw(people,settings){
    if(people.length<3)throw fail('Se necesitan al menos tres participantes activos');
    const match=(p,r)=>[p.name,p.email].some(v=>r.includes(hash(normalize(v))));const indexes=people.map((_,i)=>i),giver=people.findIndex(x=>match(x,R[0])),receiver=people.findIndex(x=>match(x,R[1]));
    if(giver<0||receiver<0)throw fail('No se han podido validar todas las reglas internas del sorteo',409);
    for(let attempt=0;attempt<50000;attempt++){
      for(let i=indexes.length-1;i>0;i--){const j=crypto.randomInt(i+1);[indexes[i],indexes[j]]=[indexes[j],indexes[i]];}
      if(indexes[giver]!==receiver)continue;
      if(indexes.some((recipient,from)=>recipient===from))continue;
      if(settings.noMutual&&indexes.some((recipient,from)=>indexes[recipient]===from))continue;
      if(indexes.some((recipient,from)=>from===giver&&recipient===receiver?false:(settings.exclusions[people[from]._id]||[]).includes(people[recipient]._id)||(settings.exclusions[people[recipient]._id]||[]).includes(people[from]._id)))continue;
      return Object.fromEntries(indexes.map((recipient,from)=>[people[from]._id,people[recipient]._id]));
    }
    throw fail('No se ha podido crear un sorteo válido',409);
  }

  async function action(input){
    await load();
    const action=input?.action;
    if(action==='ping')return {ok:true,service:'Amigo Invisible Aboiz (local)',year:YEAR};
    if(action==='login'){
      const mode=text(input.mode,15), password=String(input.password||'');
      const expected=mode==='admin'?adminPassword:mode==='manager'?managerPassword:null;
      if(!expected||password.length<16||!safeEqual(hash(password),hash(expected)))throw fail('Credenciales incorrectas',401);
      const role=mode==='admin'?'admin':'manager';
      return {token:sign(role,mode),role};
    }
    if(action==='codeLogin'){
      const code=text(input.code,100);
      if(!/^AB26-(?:[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}|[A-Za-z0-9_-]{30,60})$/.test(code))throw fail('Código no válido',401);
      const person=db.people.find(x=>x.codeHash===hash(pepper+':'+code)&&x.active);
      if(!person)throw fail('Código no válido',401);
      return {token:sign('guest',person._id,person.rev),role:'guest',name:person.name};
    }
    const session=verify(input.token);
    if(action==='me'){
      if(session.role==='guest'){
        const person=db.people.find(x=>x._id===session.id), draw=activeDraw();
        const recipient=draw?.pairs?.[person._id];
        const target=db.people.find(x=>x._id===recipient);
        return {role:'guest',person:{name:person.name},myWishes:stripWish(findWish(person._id)),gift:target?{name:target.name,note:meta(target._id).note,wishes:stripWish(findWish(target._id))}:null,drawReady:!!draw,event:db.config.event};
      }
      const wishIds=new Set(db.wishes.filter(x=>x.year===YEAR&&(x.selected?.length||x.other)).map(x=>x.personId));
      const people=db.people.filter(x=>x.year===YEAR).map(x=>({...cleanPerson(x),hasWish:wishIds.has(x._id),...meta(x._id)})).sort((a,b)=>a.name.localeCompare(b.name,'es'));
      const draw=activeDraw();
      const result={role:session.role,people,drawReady:!!draw,wishesFilled:wishIds.size,event:db.config.event,options:db.config.options};
      if(session.role==='admin'&&draw){const names=Object.fromEntries(people.map(x=>[x._id,x.name]));result.pairs=Object.entries(draw.pairs).map(([from,to])=>({from:names[from]||'(inactivo)',to:names[to]||'(inactivo)'}));}
      return result;
    }
    if(action==='saveWish'){
      requireRole(session,['guest']);
      const selected=Array.isArray(input.selected)?[...new Set(input.selected.filter(x=>CATEGORIES.has(x)))]:[];
      const item=findWish(session.id), values={personId:session.id,year:YEAR,selected,other:text(input.other,650)};
      if(item)Object.assign(item,values);else db.wishes.push({_id:crypto.randomUUID(),...values});
      await save();return {saved:true};
    }
    requireRole(session,['admin','manager']);
    if(action==='saveEvent'){
      requireRole(session,['admin']);const event=input.event||{},next={...db.config.event,name:text(event.name??db.config.event.name,100),date:text(event.date??db.config.event.date,20),place:text(event.place??db.config.event.place,160),min:Math.max(0,Number(event.min??db.config.event.min)||0),max:Math.max(0,Number(event.max??db.config.event.max)||0),message:text(event.message??db.config.event.message,650),appUrl:text(event.appUrl??db.config.event.appUrl,300)};if(next.max<next.min)throw fail('El presupuesto máximo no puede ser menor que el mínimo');db.config.event=next;await save();return {event:next};
    }
    if(action==='saveDrawOptions'){
      requireRole(session,['admin']);if(activeDraw())throw fail('Anula el sorteo antes de cambiar sus reglas.',409);db.config.options={noMutual:input.noMutual!==false};await save();return {options:db.config.options};
    }
    if(action==='addPerson'){
      if(activeDraw())throw fail('El sorteo está cerrado. Para modificar participantes, anula primero el sorteo.',409);
      const name=text(input.name,100),email=text(input.email,160),people=db.people.filter(x=>x.year===YEAR);
      if(name.length<2||!(!email||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw fail('Nombre o correo incorrectos');
      if(people.length>=MAX_PEOPLE)throw fail('Límite de participantes alcanzado');
      if(people.some(x=>normalize(x.name)===normalize(name)))throw fail('Ya existe un participante con ese nombre',409);
      const person={_id:crypto.randomUUID(),name,email,year:YEAR,active:true,codeHash:'',rev:random(10)};
      db.people.push(person);await save();return {person:cleanPerson(person)};
    }
    if(action==='updatePerson'){
      if(activeDraw())throw fail('El sorteo está cerrado. Anúlalo antes de editar participantes.',409);
      const person=db.people.find(x=>x._id===text(input.id,100)&&x.year===YEAR),name=text(input.name,100),email=text(input.email,160);
      if(!person)throw fail('Participante no encontrado',404);
      if(name.length<2||!(!email||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw fail('Nombre o correo incorrectos');
      if(db.people.some(x=>x.year===YEAR&&x._id!==person._id&&normalize(x.name)===normalize(name)))throw fail('Nombre duplicado',409);
      person.name=name;person.email=email;const valid=new Set(db.people.filter(x=>x.year===YEAR&&x.active&&x._id!==person._id).map(x=>x._id));db.config.peopleMeta[person._id]={...meta(person._id),note:text(input.note,400),exclusions:Array.isArray(input.exclusions)?[...new Set(input.exclusions.map(x=>text(x,100)).filter(x=>valid.has(x)))]:[]};await save();return {ok:true,metaSaved:true,person:cleanPerson(person)};
    }
    if(action==='removePerson'){
      if(activeDraw())throw fail('Anula el sorteo antes de retirar participantes.',409);
      const person=db.people.find(x=>x._id===text(input.id,100)&&x.year===YEAR);
      if(!person)throw fail('Participante no encontrado',404);
      person.active=false;person.codeHash='';person.rev=random(10);await save();return {ok:true};
    }
    requireRole(session,['admin']);
    if(action==='testDraw'){
      if(activeDraw())throw fail('Ya existe un sorteo activo. Anúlalo para volver a probar.',409);
      const people=db.people.filter(x=>x.year===YEAR&&x.active),settings={...db.config.options,exclusions:Object.fromEntries(people.map(x=>[x._id,meta(x._id).exclusions]))};
      makeDraw(people,settings);return {ok:true,count:people.length,persisted:false,sent:false};
    }
    if(action==='draw'){
      if(activeDraw())throw fail('Ya existe un sorteo. Anúlalo antes de generar otro.',409);
      const people=db.people.filter(x=>x.year===YEAR&&x.active),settings={...db.config.options,exclusions:Object.fromEntries(people.map(x=>[x._id,meta(x._id).exclusions]))},pairs=makeDraw(people,settings);
      db.draws.push({_id:crypto.randomUUID(),year:YEAR,active:true,pairs,createdAt:new Date().toISOString()});
      const issued=people.map(person=>{
        const code=accessCode();
        person.codeHash=hash(pepper+':'+code);person.rev=random(10);db.config.peopleMeta[person._id]={...meta(person._id),sent:false};
        return {id:person._id,name:person.name,email:person.email||'',code};
      });
      await save();return {ok:true,issued,count:issued.length};
    }
    if(action==='invalidateDraw'){
      const draw=activeDraw();if(!draw)throw fail('No hay sorteo activo',409);draw.active=false;
      for(const person of db.people.filter(x=>x.year===YEAR)){person.codeHash='';person.rev=random(10);db.config.peopleMeta[person._id]={...meta(person._id),sent:false};}await save();return {ok:true};
    }
    if(action==='issueCode'){
      if(!activeDraw())throw fail('Realiza primero el sorteo',409);
      const person=db.people.find(x=>x._id===text(input.id,100)&&x.year===YEAR&&x.active);
      if(!person)throw fail('Participante incorrecto',404);
      const code=accessCode();person.codeHash=hash(pepper+':'+code);person.rev=random(10);db.config.peopleMeta[person._id]={...meta(person._id),sent:false};await save();
      return {name:person.name,email:person.email||'',code};
    }
    if(action==='markDelivered'){
      if(!activeDraw())throw fail('Realiza primero el sorteo',409);const person=db.people.find(x=>x._id===text(input.id,100)&&x.year===YEAR&&x.active);if(!person)throw fail('Participante incorrecto',404);db.config.peopleMeta[person._id]={...meta(person._id),sent:!!input.sent};await save();return {sent:!!input.sent};
    }
    throw fail('Operación desconocida',404);
  }

  function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
  async function readJson(req){
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>20000)throw fail('Solicitud demasiado grande',413);}
    try{return JSON.parse(raw);}catch{throw fail('JSON inválido');}
  }
  async function serve(req,res,url){
    let pathname=url.pathname==='/'?'/index.html':url.pathname;
    let decoded;try{decoded=decodeURIComponent(pathname);}catch{throw fail('Ruta no válida',400);}
    const relative=decoded.replace(/^\/+/,''),file=path.resolve(ROOT,relative);
    if(!file.startsWith(ROOT+path.sep)||relative.startsWith('.data')||relative.startsWith('server/'))throw fail('No encontrado',404);
    const content=await fs.readFile(file).catch(error=>{if(error.code==='ENOENT'||error.code==='EISDIR')throw fail('No encontrado',404);throw error;});
    res.writeHead(200,{'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(content);
  }
  async function listener(req,res){
    const url=new URL(req.url,'http://127.0.0.1');
    try{
      if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true});
      if(req.method==='POST'&&url.pathname==='/api/aboiz26'){
        const input=await readJson(req);
        const work=queue.then(()=>action(input));queue=work.catch(()=>{});
        return json(res,200,await work);
      }
      if(req.method==='GET'||req.method==='HEAD')return await serve(req,res,url);
      throw fail('Método no permitido',405);
    }catch(error){json(res,error.status||500,{error:error.status?error.message:'Error interno del servidor'});}
  }
  return {listener,config:{dataDir,adminPassword,managerPassword},close:()=>{db=null;}};
}

export async function startLocalServer(options={}){
  const app=createLocalApp(options),host=options.host||process.env.HOST||'127.0.0.1',port=Number(options.port??process.env.PORT??4173);
  const server=http.createServer(app.listener);
  await new Promise((resolve,reject)=>server.once('error',reject).listen(port,host,resolve));
  return {server,app,url:`http://${host}:${server.address().port}`};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const running=await startLocalServer();
  console.log(`\nAboiz está disponible en ${running.url}`);
  console.log('Datos locales:',running.app.config.dataDir);
  if(!process.env.ABOIZ_ADMIN_PASSWORD)console.log('Acceso Joseba:',running.app.config.adminPassword);
  if(!process.env.ABOIZ_DAVID_PASSWORD)console.log('Acceso David:',running.app.config.managerPassword);
  console.log('Pulsa Ctrl+C para detener la aplicación.\n');
}
