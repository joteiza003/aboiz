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
 for(const val of ['choose-admin','choose-manager','choose-guest'])assert.ok(js.includes(val));
});
test('el modo local está configurado y sus datos no entran en Git',()=>{
 const pkg=JSON.parse(read('package.json'));assert.equal(pkg.scripts.start,'node server/local-server.mjs');
 assert.match(read('assets/app.js'),/\/api\/aboiz26/);assert.match(read('.gitignore'),/^\.data\/$/m);
});
test('el cliente no contiene passwords ni pares precargados',()=>{
 const js=read('assets/app.js');assert.doesNotMatch(js,/Julen López/);
 assert.doesNotMatch(read('config.js'),/ABOIZ_SIGNING_KEY/);
});
