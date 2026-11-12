import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=(name)=>fs.readFileSync(new URL(name,root),'utf8');
test('solo 3 colecciones aisladas, permiso ADMIN',()=>{
 const s=read('tools/collections.mjs');assert.match(s,/AI26_/);assert.match(s,/read:'ADMIN'/);
 assert.doesNotMatch(s, /method:\s*['"]DELETE['"]|method:\s*['"]PATCH['"]|method:\s*['"]PUT['"]/);
});
test('HTML bloquea indexación y tiene tres opciones',()=>{
 const s=read('index.html'),js=read('assets/app.js');assert.match(s,/noindex/);
 assert.match(s,/app\.js\?v=/);assert.match(s,/style\.css\?v=/);
 for(const val of ['choose-admin','choose-manager','choose-guest'])assert.ok(js.includes(val));
});
test('la interfaz separa evento, sorteo, entrega y permisos',()=>{
 const js=read('assets/app.js');
 for(const val of ['adminEvent','saveDrawOptions','markDelivered','deliveryMessage','exclusions'])assert.ok(js.includes(val));
 assert.doesNotMatch(js,/pareja fija|fixedGiver|fixedReceiver/i);
 assert.ok(js.includes('testDraw'));assert.match(js,/data-action="saveEdit"/);assert.match(js,/function saveEditedPerson/);
 assert.match(js,/function emailMessageUrl/);assert.match(js,/data-email-link/);
 assert.match(js,/state\.role === "admin"/);assert.match(js,/El acceso a participantes no puede ver/);
 assert.match(js,/Acceso a participantes/);assert.match(js,/Cualquier persona con la contraseña/);
 assert.match(js,/giftbox premium/);assert.match(js,/state\.opening/);assert.match(js,/gift-light/);
 assert.match(js,/startWishes/);assert.match(js,/skipWishes/);assert.match(js,/wishDecisionMade/);
 assert.match(js,/issuedBatch/);assert.match(js,/batchIssued:/);assert.match(js,/Sortear y generar códigos/);
 assert.match(js,/function loadingLayer/);assert.match(js,/busyLabel/);assert.match(read('assets/style.css'),/loading-jewel/);
});
test('el modo local está configurado y sus datos no entran en Git',()=>{
 const pkg=JSON.parse(read('package.json'));assert.equal(pkg.scripts.start,'node server/local-server.mjs');
 assert.match(read('assets/app.js'),/\/api\/aboiz26/);assert.match(read('.gitignore'),/^\.data\/$/m);
});
test('el cliente no contiene passwords ni pares precargados',()=>{
 const js=read('assets/app.js');assert.doesNotMatch(js,/Julen López/);
 assert.doesNotMatch(read('config.js'),/ABOIZ_SIGNING_KEY/);
});
