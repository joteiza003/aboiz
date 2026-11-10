import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startLocalServer } from '../server/local-server.mjs';

test('flujo local completo con roles, sorteo, deseos y revocación',async t=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'aboiz-test-'));
  const running=await startLocalServer({port:0,dataDir,adminPassword:'Admin-super-segura-123',managerPassword:'David-super-segura-123',signingKey:'test-signing-key',pepper:'test-pepper'});
  t.after(async()=>{await new Promise(resolve=>running.server.close(resolve));await fs.rm(dataDir,{recursive:true,force:true});});
  const call=async(action,params={})=>{
    const response=await fetch(running.url+'/api/aboiz26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...params})});
    const body=await response.json();return {status:response.status,body};
  };
  const admin=(await call('login',{mode:'admin',password:'Admin-super-segura-123'})).body.token;
  const manager=(await call('login',{mode:'manager',password:'David-super-segura-123'})).body.token;
  for(const [name,email] of [['Ana','ana@example.com'],['Bea','bea@example.com'],['Carlos','carlos@example.com']])assert.equal((await call('addPerson',{token:manager,name,email})).status,200);
  assert.equal((await call('draw',{token:manager})).status,403,'David no puede sortear');
  assert.equal((await call('draw',{token:admin})).status,200);
  const adminView=(await call('me',{token:admin})).body;
  assert.equal(adminView.pairs.length,3);
  assert.ok(adminView.pairs.every(pair=>pair.from!==pair.to));
  const managerView=(await call('me',{token:manager})).body;
  assert.equal('pairs' in managerView,false,'David no recibe emparejamientos');
  const ana=adminView.people.find(person=>person.name==='Ana');
  const issued=(await call('issueCode',{token:admin,id:ana._id})).body;
  const guest=(await call('codeLogin',{code:issued.code})).body.token;
  assert.equal((await call('saveWish',{token:guest,selected:['moda','invalida'],other:'Color verde'})).status,200);
  const guestView=(await call('me',{token:guest})).body;
  assert.deepEqual(guestView.myWishes,{selected:['moda'],other:'Color verde'});
  assert.ok(guestView.gift?.name);
  await call('issueCode',{token:admin,id:ana._id});
  assert.equal((await call('me',{token:guest})).status,401,'regenerar el código revoca la sesión anterior');
});

test('los códigos locales sobreviven al reinicio del servidor',async t=>{
  const dataDir=await fs.mkdtemp(path.join(os.tmpdir(),'aboiz-restart-'));
  t.after(()=>fs.rm(dataDir,{recursive:true,force:true}));
  const password='Admin-persistente-123';
  const post=async(url,action,params={})=>{
    const response=await fetch(url+'/api/aboiz26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...params})});
    return {status:response.status,body:await response.json()};
  };
  let running=await startLocalServer({port:0,dataDir,adminPassword:password});
  const admin=(await post(running.url,'login',{mode:'admin',password})).body.token;
  const ids=[];
  for(const name of ['Uno','Dos','Tres'])ids.push((await post(running.url,'addPerson',{token:admin,name})).body.person._id);
  await post(running.url,'draw',{token:admin});
  const code=(await post(running.url,'issueCode',{token:admin,id:ids[0]})).body.code;
  await new Promise(resolve=>running.server.close(resolve));
  running=await startLocalServer({port:0,dataDir,adminPassword:password});
  t.after(()=>new Promise(resolve=>running.server.close(resolve)));
  assert.equal((await post(running.url,'codeLogin',{code})).status,200);
});
