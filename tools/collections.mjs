/**
 * Instalador AISLADO de colecciones Wix CMS para un sitio EXISTENTE.
 * Node 20+. Sin dependencias. Por defecto: solo plan, ningún cambio.
 * --check consulta Wix en modo lectura.
 * --apply requiere confirmación literal; crea EXCLUSIVAMENTE 3 colecciones nuevas.
 * Si cualquiera ya existe, aborta todo sin modificarla. Sin DELETE, PATCH o PUT.
 */
import process from 'node:process';
import readline from 'node:readline/promises';
const PFX='AI26_';
const admin={insert:'ADMIN',update:'ADMIN',remove:'ADMIN',read:'ADMIN'};
const f=(key,label,type='TEXT')=>({key,displayName:label,type});
const specs=[
 {id:PFX+'Participantes',displayName:'Amigo Invisible 2026 — Participantes',displayField:'name',fields:[f('name','Nombre'),f('email','Correo'),f('year','Edición'),f('active','Activo','BOOLEAN'),f('codeHash','Código hash'),f('rev','Versión de código')]},
 {id:PFX+'Sorteos',displayName:'Amigo Invisible 2026 — Sorteos PRIVADO',displayField:'year',fields:[f('year','Edición'),f('active','Sorteo activo','BOOLEAN'),f('pairs','Emparejamientos','OBJECT'),f('createdAt','Fecha','DATETIME')]},
 {id:PFX+'Deseos',displayName:'Amigo Invisible 2026 — Deseos',displayField:'personId',fields:[f('personId','ID participante'),f('year','Edición'),f('selected','Categorías','ARRAY'),f('other','Preferencias')]}
].map(x=>({...x,permissions:admin}));
const apply=process.argv.includes('--apply'),check=process.argv.includes('--check');
console.log('\nABOIZ — instalador de 3 colecciones. No modifica páginas ni datos existentes.');
console.log('Modo:',apply?'CREACIÓN CON CONFIRMACIÓN':check?'COMPROBACIÓN DE SOLO LECTURA':'PLAN LOCAL (sin llamadas ni cambios)');
for(const s of specs)console.log('  +',s.id,'\n     campos:',s.fields.map(f=>f.key).join(', '),'\n     permisos: solo ADMIN');
if(!apply&&!check){console.log('\nPara consultar Wix: npm run wix:check; para crear: npm run wix:create');process.exit(0);}
const site=process.env.WIX_SITE_ID||'',key=process.env.WIX_API_KEY||'';
if(!/^[0-9a-f-]{20,}$/i.test(site)||!key){console.error('\nConfigura WIX_SITE_ID y WIX_API_KEY como variables de ENTORNO, no en archivos de GitHub.');process.exit(2);}
const base='https://www.wixapis.com/data/v2/collections';
const headers={'Authorization':key,'wix-site-id':site,'Content-Type':'application/json'};
async function getStatus(id){
 const r=await fetch(`${base}/${encodeURIComponent(id)}`,{headers,redirect:'error'});
 if(r.status===404)return 'MISSING';
 if(!r.ok)throw new Error(`No se puede comprobar ${id}: HTTP ${r.status}. Revisa sitio y permisos.`);
 return 'EXISTS';
}
let statuses;
try{statuses=await Promise.all(specs.map(s=>getStatus(s.id)));}catch(e){console.error(e.message);process.exit(3);}
statuses.forEach((s,i)=>console.log(`${specs[i].id}: ${s}`));
if(!apply){console.log('\nSolo lectura. No se ha creado nada.');process.exit(0);}
if(statuses.some(x=>x!=='MISSING')){console.error('\nABORTADO: existe alguna colección del proyecto. No se sobrescribe, modifica ni elimina ninguna.');process.exit(4);}
console.log('\nSe crearán exactamente 3 colecciones NUEVAS, con permisos ADMIN.');
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
let answer;try{answer=await rl.question(`Para confirmar escribe CREAR ${site}: `);}finally{rl.close();}
if(answer!==`CREAR ${site}`){console.log('Cancelado. Sin cambios.');process.exit(0);}
for(const spec of specs){
 const status=await getStatus(spec.id);if(status!=='MISSING'){console.error('ABORTADO: colisión detectada durante la instalación.');process.exit(5);}
 const r=await fetch(base,{method:'POST',headers,body:JSON.stringify({collection:spec}),redirect:'error'});
 if(!r.ok){const info=(await r.text()).slice(0,500);console.error(`Error creando ${spec.id}, HTTP ${r.status}: ${info}`);console.error('Las colecciones creadas antes de este fallo no se eliminan automáticamente. Revísalas en Wix CMS.');process.exit(6);}
 console.log('CREADA:',spec.id);
}
console.log('\nHecho. Comprueba las tres colecciones en Wix CMS y sus permisos antes de publicar el backend.');
