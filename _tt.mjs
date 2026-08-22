import fs from "fs"; import WebSocket from "ws";
const ATOK=fs.readFileSync("C:/tmp/atok.txt","utf8").trim();
const list=await (await fetch("http://localhost:9333/json")).json();
let tab=list.find(t=>t.type==="page")||list[0];
const ws=new WebSocket(tab.webSocketDebuggerUrl,{perMessageDeflate:false});
let id=0; const pend=new Map();
const send=(m,pr={})=>new Promise((res,rej)=>{const i=++id;pend.set(i,{res,rej});ws.send(JSON.stringify({id:i,method:m,params:pr}));});
ws.on("message",d=>{const m=JSON.parse(d);if(m.id&&pend.has(m.id)){const{res,rej}=pend.get(m.id);pend.delete(m.id);m.error?rej(new Error(m.error.message)):res(m.result);}});
const ev=(e)=>send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true}).then(r=>r.result&&r.result.value);
await new Promise(r=>ws.on("open",r));
await send("Page.enable");await send("Runtime.enable");await send("Network.enable");
try{await send("Browser.grantPermissions",{origin:"http://localhost:8799",permissions:["clipboardReadWrite","clipboardSanitizedWrite"]});}catch(e){console.error("perm:",e.message);}
await send("Network.setCookie",{name:"ips_session",value:ATOK,domain:"localhost",path:"/"});
await send("Page.navigate",{url:"http://localhost:8799/admin"});
await new Promise(r=>setTimeout(r,3500));
await ev(`(()=>{const t=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Comercial'));t&&t.click();})()`);
await new Promise(r=>setTimeout(r,1600));
// abrir menu Ações da 1a linha e clicar Copiar link
await ev(`(()=>{const tr=document.querySelector('tbody tr');const b=[...tr.querySelectorAll('button')].pop();b&&b.click();})()`);
await new Promise(r=>setTimeout(r,500));
const clicked=await ev(`(async()=>{const b=[...document.querySelectorAll('button,a')].find(x=>/Copiar link/.test(x.textContent));if(b){b.click();return true;}return false;})()`);
console.error("copy-clicked:",clicked);
await new Promise(r=>setTimeout(r,600));
const s=(await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false})).data;
fs.writeFileSync("C:/tmp/toast.png",Buffer.from(s,"base64"));
console.error("saved");
ws.close();
