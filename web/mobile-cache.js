/* Account-scoped encrypted cache. No HTTP response cache or mail passwords. */
window.InboxCheapCache=(()=>{
 'use strict';
 const NAME='inboxcheap-mail-cache-v1',MAX_COUNT=100,MAX_BYTES=25*1024*1024,MAX_AGE=7*86400000;
 let database=null,scope=null,key=null,generation=0,queue=Promise.resolve();
 const run=task=>{const next=queue.then(task,task);queue=next.catch(()=>{});return next;};
 function open(){
  if(database)return Promise.resolve(database);
  if(!window.indexedDB||!window.crypto?.subtle)return Promise.reject(Error('Encrypted cache unavailable'));
  return new Promise((resolve,reject)=>{const req=indexedDB.open(NAME,1);req.onupgradeneeded=()=>{const db=req.result;db.createObjectStore('keys');db.createObjectStore('messages',{keyPath:'id'});};req.onsuccess=()=>{database=req.result;resolve(database);};req.onerror=()=>reject(req.error);});
 }
 async function transaction(stores,mode,task){
  const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(stores,mode);let result;try{result=task(tx);}catch(error){tx.abort();reject(error);return;}tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Cache transaction aborted'));});
 }
 async function read(store,id){const db=await open();return new Promise((resolve,reject)=>{const req=db.transaction(store).objectStore(store).get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
 async function entries(){const db=await open();return new Promise((resolve,reject)=>{const req=db.transaction('messages').objectStore('messages').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
 async function wipe(){await transaction(['keys','messages'],'readwrite',tx=>{tx.objectStore('keys').clear();tx.objectStore('messages').clear();});}
 async function init(value){
  if(value===scope&&key)return;
  const epoch=++generation;scope=null;key=null;
  return run(async()=>{try{
   if(!value)return;await open();const previous=await read('keys','scope');
   if(previous!==value)await wipe();
   let stored=await read('keys','key');
   if(!stored){stored=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);await transaction(['keys'],'readwrite',tx=>{tx.objectStore('keys').put(value,'scope');tx.objectStore('keys').put(stored,'key');});}
   const now=Date.now(),records=await entries();
   await transaction(['messages'],'readwrite',tx=>{for(const row of records)if(row.scope!==value||now-row.storedAt>MAX_AGE)tx.objectStore('messages').delete(row.id);});
   if(epoch===generation){scope=value;key=stored;}
  }catch{scope=null;key=null;}});
 }
 async function clear(){
  ++generation;scope=null;key=null;return run(async()=>{try{await wipe();}catch{}});
 }
 async function get(id,mailbox){
  const epoch=generation,currentScope=scope,currentKey=key;if(!currentKey)return null;
  return run(async()=>{try{
   if(epoch!==generation)return null;const record=await read('messages',id);
   if(!record||record.scope!==currentScope||record.mailbox!==mailbox)return null;
   if(Date.now()-record.storedAt>MAX_AGE){await transaction(['messages'],'readwrite',tx=>tx.objectStore('messages').delete(id));return null;}
   const additionalData=new TextEncoder().encode(currentScope+':'+mailbox+':'+id);
   const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:record.iv,additionalData},currentKey,record.cipher);
   if(epoch!==generation)return null;
   const message=JSON.parse(new TextDecoder().decode(plain));if(message.id!==id)return null;
   record.usedAt=Date.now();await transaction(['messages'],'readwrite',tx=>tx.objectStore('messages').put(record));return message;
  }catch{return null;}});
 }
 async function put(message,mailbox){
  const epoch=generation,currentScope=scope,currentKey=key;if(!currentKey)return;
  return run(async()=>{try{
   if(epoch!==generation)return;const plain=new TextEncoder().encode(JSON.stringify(message));if(plain.byteLength>MAX_BYTES)return;
   const iv=crypto.getRandomValues(new Uint8Array(12)),additionalData=new TextEncoder().encode(currentScope+':'+mailbox+':'+message.id);
   const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData},currentKey,plain);
   if(epoch!==generation)return;const now=Date.now(),record={id:message.id,mailbox,scope:currentScope,iv,cipher,size:cipher.byteLength,storedAt:now,usedAt:now};
   const records=(await entries()).filter(r=>r.id!==message.id).sort((a,b)=>b.usedAt-a.usedAt);let bytes=record.size,count=1;
   await transaction(['messages'],'readwrite',tx=>{const store=tx.objectStore('messages');for(const row of records){if(row.scope!==currentScope||now-row.storedAt>MAX_AGE||count>=MAX_COUNT||bytes+row.size>MAX_BYTES)store.delete(row.id);else{count++;bytes+=row.size;}}store.put(record);});
  }catch{/* Storage exhaustion must not prevent reading mail. */}});
 }
 async function prune(mailbox,ids){
  const epoch=generation;if(!scope)return;return run(async()=>{try{if(epoch!==generation)return;const allowed=new Set(ids),records=await entries();await transaction(['messages'],'readwrite',tx=>{for(const row of records)if(row.mailbox===mailbox&&!allowed.has(row.id))tx.objectStore('messages').delete(row.id);});}catch{}});
 }
 async function remove(id){const epoch=generation;return run(async()=>{try{if(epoch===generation)await transaction(['messages'],'readwrite',tx=>tx.objectStore('messages').delete(id));}catch{}});}
 return {init,clear,get,put,prune,remove};
})();
