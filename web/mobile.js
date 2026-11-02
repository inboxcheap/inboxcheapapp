(() => {
 'use strict';
 const config=JSON.parse(document.getElementById('mobile-config').textContent),$=id=>document.getElementById(id);
 const cache=window.InboxCheapCache;
 let state=null,view='login',selected=null,rows=[],nextOffset=null,searchTimer,polling=false,linkTimer=null,revision=0,readerMessage=null,inboxKind='all',boxRequest=0;
 const notice=message=>{$('notice').textContent=message;$('notice').hidden=!message;};
 async function request(url,data,retried=false){
   const options={credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}};
   if(data!==undefined){options.method='POST';options.body=new URLSearchParams({_csrf:config.csrf,...data});}
   let response;try{response=await fetch(url,options);}catch{throw Error('Could not connect. Check your connection and try again.');}
   let result;try{result=await response.json();}catch{throw Error('Service temporarily unavailable. Please try again.');}
   if(response.status===419&&data!==undefined&&!retried){const refreshed=await request('/mobile/session');config.csrf=refreshed.csrf;return request(url,data,true);}
   if(!response.ok){if(response.status===401&&url!=='/mobile/login'){config.signedIn=false;boxRequest++;renderCodes([]);selected=null;readerMessage=null;state=null;rows=[];cache.clear();$('body').replaceChildren();$('subject').textContent='';$('sender').textContent='';$('received').textContent='';show('login',false);}const error=Error(result.error||'This request could not be completed.');error.status=response.status;throw error;}
   return result;
 }
 function show(next,push=true){
   revision++;view=next;for(const id of ['login','boxes','messages','reader'])$(id).hidden=id!==next;
   $('back').hidden=!['messages','reader'].includes(next);$('refresh').hidden=next==='login';$('profile').hidden=next==='login';
   if(push)history.pushState({view:next},'', '/mobile');
   window.scrollTo(0,0);
 }
 function relative(value){const date=new Date(value.replace(' ','T')+'Z'),minutes=Math.max(0,Math.floor((Date.now()-date)/60000));if(!Number.isFinite(minutes))return value+' UTC';if(minutes<1)return 'Just now';if(minutes<60)return minutes+'m ago';if(minutes<1440)return Math.floor(minutes/60)+'h ago';const days=Math.floor(minutes/1440);return days<=3?(days===1?'Yesterday':days+' days ago'):date.toLocaleString();}
 function empty(target,title,body){const box=document.createElement('div');box.className='empty';const h=document.createElement('strong');h.textContent=title;box.append(h,document.createTextNode(body));target.replaceChildren(box);}
 function renderBoxes(append=false){
   const list=$('box-list');if(!append)list.replaceChildren();
   if(!state.boxes.length&&!append){empty(list,inboxKind==='sms'?'Your phone, connected.':'A little more privacy.',inboxKind==='sms'?'Connect a phone above, or try another search.':'Create your first email inbox, or try another search.');return;}
   for(const box of state.boxes){
     const button=document.createElement('button');button.className='box';const line=document.createElement('div');line.className='row';
     const strong=document.createElement('strong');strong.textContent=box.source_phone||box.source_email||box.address;line.append(strong);
     if(Number(box.unread_count)){const count=document.createElement('span');count.className='count';count.textContent=box.unread_count+' new';line.append(count);}
     const sub=document.createElement('div');sub.className='hint';sub.textContent=(box.source_phone?'SMS inbox':box.source_email?'Forwarded email':'Email inbox')+' · ● Active · '+box.message_count+' messages';button.append(line,sub);
     if(box.source_email){const forwarding=document.createElement('div');forwarding.className='hint';forwarding.textContent=box.address;button.append(forwarding);}
     button.onclick=()=>openBox(box);list.append(button);
   }
 }
 async function loadBoxes(append=false){
   const ticket=++boxRequest,kind=inboxKind;
   const result=await request('/mobile/state?kind='+kind+'&q='+encodeURIComponent($('search').value)+'&offset='+(append?nextOffset:0));
   if(ticket!==boxRequest||kind!==inboxKind)return;
   await cache.init(result.cacheScope);state=result;nextOffset=result.nextOffset;
   $('quota').textContent=result.active+' / '+result.limit+' active · '+result.daily.createRemaining+' creates left today';
   $('account-email').textContent=result.email;$('account-plan').textContent=result.plan+' · Receive only';
   $('more').hidden=nextOffset===null;renderBoxes(append);
 }
 async function openBox(box,push=true){selected=box;rows=[];show('messages',push);$('address').textContent=box.source_phone||box.source_email||box.address;$('inbox-type').textContent=box.source_phone?'SMS inbox · Active':'● Active';$('phone-note').hidden=!box.source_phone;$('manage-phone').hidden=!box.source_phone;$('copy-address').textContent=box.source_phone?'Copy phone number':'Copy address';$('retire').hidden=!!box.source_email||!!box.source_phone;empty($('message-list'),'Loading messages…','');await loadMessages();}
 async function loadMessages(){
   if(!selected)return;const id=selected.id,version=revision;const result=await request('/inbox/data/mailboxes/'+id);
   if(id!==selected?.id||version!==revision)return;
   rows=result.data;cache.prune(id,rows.map(row=>row.id));$('message-count').textContent=rows.length+' messages';$('message-list').replaceChildren();
   if(!rows.length){empty($('message-list'),'You are all set.','New messages will appear here.');return;}
   for(const message of rows){
     const button=document.createElement('button');button.className='message '+(message.read_at?'read':'unread');
     const row=document.createElement('div');row.className='row';const sender=document.createElement('span');sender.className='sender';sender.textContent=message.sender||'Unknown sender';
     const time=document.createElement('time');time.textContent=relative(message.received_at);time.title=message.received_at+' UTC';row.append(sender,time);
     const subject=document.createElement('strong');subject.textContent=message.subject||'(No subject)';
     if(!message.read_at){const dot=document.createElement('span');dot.className='unread-dot';subject.append(dot);}
     button.append(row,subject);button.onclick=()=>openMessage(message.id);$('message-list').append(button);
   }
 }
 function renderBody(message,images=false){
   const body=$('body');body.replaceChildren();body.style.padding='';
   $('images').hidden=!message.html||images;$('image-note').hidden=!message.html||images;
   if(!message.html){body.textContent=message.body||'No readable message content.';return;}
   const doc=new DOMParser().parseFromString(message.html,'text/html');
   doc.querySelectorAll('script,iframe,frame,frameset,object,embed,form,input,button,textarea,select,base,meta,link,svg,math').forEach(el=>el.remove());
   for(const el of doc.querySelectorAll('*'))for(const a of [...el.attributes])if(a.name.toLowerCase().startsWith('on')||['srcdoc','srcset','action','formaction','background','ping'].includes(a.name.toLowerCase()))el.removeAttribute(a.name);
   for(const a of doc.querySelectorAll('a')){if(!/^https:\/\//i.test(a.getAttribute('href')||''))a.removeAttribute('href');a.target='_blank';a.rel='noopener noreferrer';}
   const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';policy.content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src "+(images?'https: data:':'data:')+"; font-src 'none'; connect-src 'none'; media-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";doc.head.prepend(policy);
   const viewport=doc.createElement('meta');viewport.name='viewport';viewport.content='width=device-width,initial-scale=1';doc.head.append(viewport);
   const style=doc.createElement('style');style.textContent='html,body{margin:0;overflow-wrap:anywhere}body{padding:8px;box-sizing:border-box}img{max-width:100%;height:auto}table{max-width:100%!important}';doc.head.append(style);
   const frame=document.createElement('iframe');frame.title='Email content';frame.setAttribute('sandbox','allow-popups allow-popups-to-escape-sandbox');frame.referrerPolicy='no-referrer';frame.srcdoc='<!doctype html>'+doc.documentElement.outerHTML;body.style.padding='0';body.append(frame);
 }
 async function openMessage(id,force=false){
   const sameMessage=readerMessage?.id===id;
   show('reader');const version=revision,mailbox=selected?.id;
   if(!sameMessage){renderCodes([]);readerMessage=null;$('subject').textContent='Loading message…';$('sender').textContent='';$('received').textContent='';$('body').replaceChildren();$('images').hidden=true;$('image-note').hidden=true;}
   $('cache-status').textContent='';
   try{
     let message=force?null:await cache.get(id,mailbox),cached=!!message;
     if(!message){message=await request('/inbox/data/messages/'+id);if(version!==revision)return;await cache.put(message,mailbox);}
     if(version!==revision)return;readerMessage=message;$('subject').textContent=message.subject||'(No subject)';$('sender').textContent=message.sender;$('received').textContent=message.received_at+' UTC';renderBody(message);renderCodes(message.codes||[]);
     if(!Array.isArray(message.codes)){request('/inbox/data/messages/'+id+'/codes').then(async data=>{if(version!==revision||readerMessage?.id!==id)return;message.codes=data.candidates;renderCodes(message.codes);await cache.put(message,mailbox);}).catch(()=>{});}
     $('cache-status').textContent=cached?'From encrypted device cache · Refresh to fetch again.':'';
     const row=rows.find(row=>row.id===id);
     if(row&&!row.read_at){try{await request('/inbox/data/messages/'+id+'/read',{});row.read_at=new Date().toISOString();}catch(error){notice('Message displayed. Read status could not be synced: '+error.message);}}
   }catch(error){if([403,404,410].includes(error.status)){await cache.remove(id);readerMessage=null;renderCodes([]);$('body').replaceChildren();$('subject').textContent='Message unavailable';$('cache-status').textContent='';}notice(error.message);}
 }
 function renderCodes(candidates){
   const panel=$('code-panel');panel.replaceChildren();panel.hidden=!candidates.length;if(!candidates.length)return;
   const title=document.createElement('strong');title.textContent=candidates.length>1?'Possible verification codes':'Possible verification code';
   const note=document.createElement('p');note.className='hint';note.textContent='Automatically detected. Check the sender and message before using a code.';panel.append(title,note);
   for(const item of candidates){if(!/^[0-9]{4,8}$/.test(String(item.value)))continue;const button=document.createElement('button');button.className='secondary small';button.type='button';button.textContent=item.value+' · Copy';button.onclick=async()=>{try{await navigator.clipboard.writeText(item.value);button.textContent=item.value+' · Copied';}catch{const field=document.createElement('input');field.readOnly=true;field.value=item.value;field.setAttribute('aria-label','Verification code to copy');button.replaceWith(field);field.select();}};panel.append(button);}
 }
 async function action(button,task,errorTarget){button.disabled=true;try{notice('');if(errorTarget)errorTarget.textContent='';await task();}catch(error){if(errorTarget)errorTarget.textContent=error.message;else notice(error.message);}finally{button.disabled=false;}}
 function back(){if(view==='reader'){show('messages',false);loadMessages().catch(e=>notice(e.message));}else if(view==='messages'){selected=null;show('boxes',false);loadBoxes().catch(e=>notice(e.message));}}
 window.addEventListener('popstate',back);$('back').onclick=()=>history.back();
 $('login-form').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;action(form.querySelector('button'),async()=>{await request('/mobile/login',Object.fromEntries(new FormData(form)));form.elements.password.value='';location.replace('/mobile');});};
 async function pollLogin(){try{const result=await request('/mobile/link/poll',{});if(result.ready){location.replace('/mobile');return;}linkTimer=setTimeout(pollLogin,2500);}catch(error){$('browser-login').disabled=false;$('browser-wait').hidden=true;notice(error.message);}}
 $('browser-login').onclick=()=>action($('browser-login'),async()=>{if(linkTimer)clearTimeout(linkTimer);const result=await request('/mobile/link/start',{});$('browser-wait').hidden=false;const anchor=document.createElement('a');anchor.href=result.url;anchor.textContent='Open sign-in browser';anchor.id='open-browser';anchor.onclick=()=>setTimeout(pollLogin,1500);$('browser-wait').replaceChildren(document.createTextNode('Open your browser to approve sign-in, then return here. '),anchor);anchor.click();});
 $('search').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>loadBoxes().catch(e=>notice(e.message)),300);};
 for(const button of document.querySelectorAll('[data-kind]'))button.onclick=async()=>{inboxKind=button.dataset.kind;for(const other of document.querySelectorAll('[data-kind]'))other.setAttribute('aria-pressed',String(other===button));$('more').hidden=true;try{await loadBoxes();}catch(e){notice(e.message);}};
 $('more').onclick=()=>action($('more'),()=>loadBoxes(true));
 $('refresh').onclick=()=>action($('refresh'),async()=>{if(view==='boxes')await loadBoxes();else if(view==='messages')await loadMessages();else if(readerMessage)await openMessage(readerMessage.id,true);});
 $('new-inbox').onclick=()=>{$('create-error').textContent='';const form=$('create-form');form.reset();form.elements.domain.replaceChildren();for(const domain of state.domains){const option=document.createElement('option');option.value=domain.name;option.textContent='@'+domain.name;form.elements.domain.append(option);}$('prefix-help').textContent=state.minimum+'–63 characters for custom prefixes. Letters, numbers, dots, underscores or hyphens.';$('create-dialog').showModal();};
 $('create-form').onsubmit=e=>{e.preventDefault();action(e.currentTarget.querySelector('.primary'),async()=>{const result=await request('/mobile/create',Object.fromEntries(new FormData($('create-form'))));$('create-dialog').close();await openBox(result.mailbox);},$('create-error'));};
 $('retire').onclick=()=>{$('retire-error').textContent='';$('retire-address').textContent=selected.address;$('retire-dialog').showModal();};
 $('confirm-retire').onclick=()=>action($('confirm-retire'),async()=>{await request('/mobile/destroy',{id:selected.id});await cache.prune(selected.id,[]);$('retire-dialog').close();selected=null;show('boxes');await loadBoxes();notice('Inbox destroyed. Its address will never be reused.');},$('retire-error'));
 $('copy-address').onclick=()=>action($('copy-address'),async()=>{try{await navigator.clipboard.writeText(selected.source_phone||selected.address);}catch{const input=document.createElement('textarea');input.value=selected.source_phone||selected.address;document.body.append(input);input.select();const copied=document.execCommand('copy');input.remove();if(!copied)throw Error('Copy is unavailable. Press and hold the address to copy.');}notice(selected.source_phone?'Phone number copied.':'Address copied.');});
 $('images').onclick=()=>{if(readerMessage)renderBody(readerMessage,true);};
 $('profile').onclick=()=>$('account-dialog').showModal();
 $('clear-cache').onclick=()=>action($('clear-cache'),async()=>{await cache.clear();if(state)await cache.init(state.cacheScope);$('cache-cleared').textContent='Cached mail removed from this device. Server mail is unchanged.';});
 $('sign-out').onclick=()=>action($('sign-out'),async()=>{boxRequest++;await cache.clear();await request('/mobile/logout',{});location.replace('/mobile');});
 document.querySelectorAll('.close').forEach(button=>button.onclick=()=>button.closest('dialog').close());
 async function tick(){if(!polling&&!document.hidden&&view==='messages'&&selected){polling=true;try{await loadMessages();}catch(error){notice(error.message);}finally{polling=false;}}setTimeout(tick,10000);}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&view==='messages')loadMessages().catch(e=>notice(e.message));});
 history.replaceState({view:config.signedIn?'boxes':'login'},'', '/mobile');
 show(config.signedIn?'boxes':'login',false);if(config.signedIn)loadBoxes().catch(e=>notice(e.message));else cache.clear();tick();
})();
