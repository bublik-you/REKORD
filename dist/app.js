'use strict';
(() => {
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const canvas=$('#map'),ctx=canvas.getContext('2d',{alpha:false});
const W=1280,H=900,colors=['#e88b59','#87a9c2','#c89bbb','#d8bb62'];
const info={
 campus:{tag:'ТОЧКА СБОРА',title:'НГТУ НЭТИ',description:'Первый корпус · проспект Карла Маркса, 20 к1',hint:'Отсюда начинается прогулка',color:'#50784d'},
 burger:{tag:'ЧЕРЕЗ ДОРОГУ ОТ КАМПУСА',title:'Burger King',description:'Геодезическая, 13А · отдельное здание рядом со «Студенческой»',hint:'Идём по дорожкам через переход',color:'#d47b46'},
 tea:{tag:'ТЦ «АМСТЕРДАМ» · ЭТАЖ −1',title:'Молочай',description:'Геодезическая, 4/1 · внутри торгового центра, на минус первом этаже',hint:'До входа в ТЦ, затем спускаемся на −1',color:'#ab7894'}
};
let data,ground,scenery,markers=[],people=[],trees=[],zoom=1,pan={x:0,y:0},view={w:1,h:1,scale:1,x:0,y:0};
let selected='campus',personSelected=-1,showRoute=true,walking=false,started=false,arrived=false,lastTime=0,time=0,drag=null,dragged=false,hover=null;
let route=[],routeLengths=[],routeTotal=0,progress=0,journeyFrom='campus';
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let seed=98234;
function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const quant=n=>Math.round(n/3)*3;
function polygon(c,p,fill,dx=0,dy=0){if(!p.length)return;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(quant(x+dx),quant(y+dy)):c.moveTo(quant(x+dx),quant(y+dy)));c.closePath();c.fillStyle=fill;c.fill();}
function line(c,p,color,width,dash=[]){if(p.length<2)return;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(quant(x),quant(y)):c.moveTo(quant(x),quant(y)));c.strokeStyle=color;c.lineWidth=width;c.lineJoin='miter';c.lineCap='butt';c.setLineDash(dash);c.stroke();c.setLineDash([]);}
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function pointIn(x,y,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){let a=p[i],b=p[j];if(((a[1]>y)!=(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))inside=!inside;}return inside;}
function segDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1];const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);}
function nearLine(x,y,p,width){for(let i=1;i<p.length;i++)if(segDistance(x,y,p[i-1],p[i])<width)return true;return false;}
function center(p){const pts=p.slice(0,-1);return [pts.reduce((s,a)=>s+a[0],0)/pts.length,pts.reduce((s,a)=>s+a[1],0)/pts.length];}
function bounds(p){return {x:Math.min(...p.map(v=>v[0])),y:Math.min(...p.map(v=>v[1])),r:Math.max(...p.map(v=>v[0])),b:Math.max(...p.map(v=>v[1]))};}
function surface(){const c=document.createElement('canvas');c.width=W;c.height=H;return c;}
function tree(c,x,y,size=1,type=0){c.save();c.translate(quant(x),quant(y));c.scale(size,size);rect(c,-13,1,32,10,'#4e774a27');rect(c,-2,-10,5,16,'#7a7650');if(type===0){rect(c,-15,-28,30,23,'#537e51');rect(c,-20,-23,36,15,'#537e51');rect(c,-12,-35,24,26,'#659456');rect(c,-17,-27,27,15,'#73a25d');rect(c,-7,-37,15,20,'#7da964');rect(c,-14,-24,6,6,'#88b76a');rect(c,7,-19,8,8,'#496f48');}else{rect(c,-7,-43,14,8,'#79a161');rect(c,-12,-35,24,10,'#6d9455');rect(c,-17,-25,34,9,'#59834b');rect(c,-21,-16,42,9,'#507949');rect(c,-8,-35,4,7,'#88ac68');rect(c,-10,-23,6,6,'#7da25c');}c.restore();}
function bench(c,x,y){rect(c,x+2,y+5,3,9,'#6d7950');rect(c,x+22,y+5,3,9,'#6d7950');rect(c,x,y,28,4,'#a2885d');rect(c,x,y+6,28,5,'#bda274');}
function lamp(c,x,y){rect(c,x-2,y-23,3,24,'#61705a');rect(c,x-5,y-28,9,6,'#f3e8b6');rect(c,x-7,y-30,13,3,'#5b6e52');}
function drawBuilding(c,b){const special=b.id==='36136717'?'campus':b.id==='205519637'?'burger':b.id==='453655001'?'tea':null;
 let height=special==='campus'?30:special==='tea'?27:special==='burger'?17:Math.min(27,8+Number(b.levels||3)*2),roof=special==='campus'?'#e0ba9b':special==='burger'?'#d99464':special==='tea'?'#ddcba6':['#dbd3b6','#cbd0b0','#d7c5a5','#c9cdb9'][parseInt(b.id)%4];
 polygon(c,b.p,'#54734b22',10,10);polygon(c,b.p,special==='campus'?'#a47a61':special==='burger'?'#a76b4a':'#9eaa89',0,0);
 const p=b.p;
 for(let i=1;i<p.length;i++){const a=p[i-1],z=p[i];if(Math.abs(z[0]-a[0])>8||Math.abs(z[1]-a[1])>8){polygon(c,[a,z,[z[0],z[1]-height],[a[0],a[1]-height]],a[0]<z[0]?'#b6b89a':'#c5c2a0');if(special==='campus')polygon(c,[a,z,[z[0],z[1]-height],[a[0],a[1]-height]],'#c18c70');}}
 polygon(c,p,roof,0,-height);line(c,[...p],special==='campus'?'#bd947a':'#a5ad8e',3); // base edge
 c.save();c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(quant(x),quant(y-height)):c.moveTo(quant(x),quant(y-height)));c.closePath();c.clip();
 const bb=bounds(p);for(let y=bb.y-height+9;y<bb.b-height;y+=12)for(let x=bb.x+9;x<bb.r-5;x+=16){if(special==='burger')continue;rect(c,x,y,7,3,special==='campus'?'#c99d82':'#bec3a3');}
 c.restore();
 // Windows on visible lower walls keep the simple 16-bit building treatment.
 for(let i=1;i<p.length;i++){const a=p[i-1],z=p[i];if(Math.abs(z[1]-a[1])<13&&Math.abs(z[0]-a[0])>30){let left=Math.min(a[0],z[0]),right=Math.max(a[0],z[0]),yy=(a[1]+z[1])/2;for(let x=left+7;x<right-5;x+=13){rect(c,x,yy-height+6,5,6,'#6e8d83');rect(c,x,yy-height+6,2,2,'#aac6ae');if(height>23)rect(c,x,yy-height+17,5,5,'#7e9585');}}}
 const [x,y]=center(p);
 if(special==='campus'){
  rect(c,x-40,y-height-4,80,15,'#6d875c');label(c,'НГТУ НЭТИ',x,y-height+7,12,'#f3efce');rect(c,x-11,y+9,22,8,'#6b8070');for(let i=0;i<3;i++)rect(c,x-18-i*4,y+17+i*4,36+i*8,4,'#d7ceb2');
 }else if(special==='burger'){
  rect(c,x-40,y-height-7,80,15,'#bf6543');label(c,'BURGER KING',x,y-height+4,11,'#fff0c8');rect(c,x-17,y-3,34,10,'#738a79');rect(c,x-18,y+9,36,3,'#dfbf8a');
 }else if(special==='tea'){
  rect(c,x-49,y-height-7,98,15,'#6e8263');label(c,'АМСТЕРДАМ',x,y-height+4,11,'#f5e7c2');
  const bx=bb.x,bw=bb.r-bb.x;for(let k=0;k<4;k++){let px=bx+9+k*(bw-20)/4;rect(c,px,bb.y-height-5,14,7,k%2?'#bb9d82':'#cdb294');rect(c,px+3,bb.y-height-10,8,5,'#c7ad89');}
 }
}
function label(c,text,x,y,size=13,color='#637e4d',bg=null){c.font=`500 ${size}px 'Pixelify Sans', monospace`;c.textAlign='center';c.textBaseline='alphabetic';if(bg){const w=c.measureText(text).width;rect(c,x-w/2-7,y-size, w+14,size+7,bg);}c.fillStyle=color;c.fillText(text,Math.round(x),Math.round(y));}
function makeWorld(){ground=surface();scenery=surface();const g=ground.getContext('2d'),s=scenery.getContext('2d');g.imageSmoothingEnabled=s.imageSmoothingEnabled=false;
 rect(g,0,0,W,H,'#b8ce94');
 for(let y=0;y<H;y+=24)for(let x=0;x<W;x+=24){let n=rand();if(n<.17)rect(g,x,y,24,24,'#b5cb90');else if(n>.87)rect(g,x,y,24,24,'#bed49a');}
 for(const a of data.areas)polygon(g,a.p,a.type==='pitch'?'#99b881':'#a9c686');
 for(let i=0;i<1900;i++){let x=rand()*W,y=rand()*H;rect(g,x,y,3,2,i%3?'#9fbc7c55':'#d6dfab80');if(i%4===0)rect(g,x+3,y-3,2,3,'#91b07355');}
 for(const r of data.roads){let w=r.type==='primary'?32:r.type==='tertiary'?21:r.type==='residential'?15:r.type==='service'?10:13;line(g,r.p,'#a4b98b',w+14);line(g,r.p,'#d6d2ae',w+10);line(g,r.p,'#919c83',w+2);line(g,r.p,'#8a9580',w);if(w>18)line(g,r.p,'#d0cfb1',2,[10,15]);}
 for(const p of data.paths){line(g,p.p,'#a9b989',10);line(g,p.p,p.type==='steps'?'#c3b99a':'#ddd2af',7);}
 // Crossing stripes use the mapped pedestrian crossings over road geometry.
 for(const p of data.paths)for(let i=1;i<p.p.length;i++){
  const a=p.p[i-1],b=p.p[i],x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;
  if(data.roads.some(r=>['primary','tertiary'].includes(r.type)&&nearLine(x,y,r.p,15))){const len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len>7&&len<100){g.save();g.translate(a[0],a[1]);g.rotate(Math.atan2(b[1]-a[1],b[0]-a[0]));for(let t=0;t<len;t+=8)rect(g,t,-6,4,12,'#e9e2c2');g.restore();}}
 }
 let objects=data.buildings.map(b=>({y:bounds(b.p).b,draw:c=>drawBuilding(c,b)}));
 for(let i=0;i<900;i++){
  let x=35+rand()*(W-70),y=50+rand()*(H-80);
  if(data.buildings.some(b=>pointIn(x,y,b.p)||nearLine(x,y,b.p,22)))continue;
  if(data.roads.some(r=>nearLine(x,y,r.p,r.type==='primary'?36:r.type==='tertiary'?26:18)))continue;
  if(data.paths.some(p=>nearLine(x,y,p.p,16)))continue;
  if(trees.some(t=>Math.hypot(x-t.x,y-t.y)<26))continue;
  const t={x,y,size:.65+rand()*.4,type:rand()>.83?1:0};trees.push(t);objects.push({y,draw:c=>tree(c,t.x,t.y,t.size,t.type)});
 }
 objects.sort((a,b)=>a.y-b.y);objects.forEach(o=>o.draw(s));
 // A few small campus details, kept deliberately simple.
 for(const [x,y] of [[865,542],[970,528],[719,490],[435,460]]){bench(s,x,y);lamp(s,x+35,y+7);}
 label(s,'ул. Геодезическая',600,337,15,'#647456','#d9dfbbdd');
 s.save();s.translate(675,694);s.rotate(-Math.PI/2);label(s,'проспект Карла Маркса',0,0,15,'#617153','#d9dfbbdd');s.restore();
 label(s,'КАМПУС НГТУ',1015,738,18,'#7c9a60');label(s,'СТУДГОРОДОК',336,737,15,'#78955c');
 // Metro is a local landmark rather than another selectable destination.
 const mp=[690,390];rect(s,mp[0]-9,mp[1]-11,18,18,'#e7dfc3');label(s,'М',mp[0],mp[1]+3,16,'#b86455');label(s,'Студенческая',mp[0]-3,mp[1]+24,12,'#536d46','#cad9a7ee');
 const specs={campus:{x:912,y:490,label:'НГТУ · 1 корпус',icon:'Н',color:'#507849'},burger:{x:807,y:348,label:'Burger King',icon:'Б',color:'#c67647'},tea:{x:366,y:358,label:'Молочай',icon:'Ч',color:'#a97d98'}};
 markers=Object.entries(specs).map(([id,v])=>({id,...v}));
}
function sprite(c,x,y,color,step=0,scale=1,facing=1){c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);if(facing<0)c.scale(-1,1);
 rect(c,-5,-1,12,3,'#3b5c3b36');const foot=Math.floor(step)%2;rect(c,-4,-5-foot*2,3,6,'#415a50');rect(c,2,-7+foot*2,3,7,'#415a50');rect(c,-6,-15,12,10,color);rect(c,-8,-13+(foot?1:0),3,8,'#edbf92');rect(c,6,-13-(foot?1:0),3,8,'#edbf92');rect(c,-6,-22,12,9,'#efc69b');rect(c,-6,-25,12,5,'#635649');rect(c,-7,-22,3,4,'#635649');rect(c,1,-19,2,2,'#435348');rect(c,-4,-14,8,2,'#f3ddaf');rect(c,-4,-12,3,5,'#ffffff24');c.restore();}
function placePeople(){const p=data.routes.campus[0]||data.locations.campus;people=colors.map((color,i)=>({color,x:p[0]+(i-1.5)*18,y:p[1]+(i%2)*9+12,facing:1,step:0}));}
function drawMarkers(){for(const m of markers){const active=m.id===selected,isHover=hover===m.id;const c=ctx;const yy=m.y-(active?4:0);const size=active?32:28;
 rect(c,m.x-size/2+3,yy-size+3,size,size,'#40623e27');rect(c,m.x-size/2,yy-size,size,size,active?'#faf3d5':'#f3efd7');rect(c,m.x-size/2+3,yy-size+3,size-6,size-6,m.color);rect(c,m.x-3,yy,6,5,active?'#faf3d5':'#f3efd7');label(c,m.icon,m.x,yy-8,17,'#fff3d0');
 const text=m.label+(m.id==='tea'?'  −1':''),fs=active||isHover?17:15;c.font=`500 ${fs}px 'Pixelify Sans',monospace`;const tw=c.measureText(text).width;
 rect(c,m.x-tw/2-11,yy-size-26,tw+22,22,active?'#244535':'#f5f1d9');label(c,text,m.x,yy-size-11,fs,active?'#f4eed2':'#496743');
 }}
function updateView(){view.scale=Math.max(view.w/W,view.h/H)*zoom;view.x=view.w/2-660*view.scale+pan.x;view.y=view.h/2-470*view.scale+pan.y;$('#zoomLevel').value=Math.round(zoom*100)+'%';}
function resize(){const r=canvas.getBoundingClientRect();view.w=r.width;view.h=r.height;const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;updateView();render();}
function drawRoute(){if(!showRoute||route.length<2)return;line(ctx,route,'#edf0c7',10);line(ctx,route,'#79904e',4,[8,7]);const last=route[route.length-1];rect(ctx,last[0]-6,last[1]-6,12,12,'#f8efd1');rect(ctx,last[0]-3,last[1]-3,6,6,info[selected].color);}
function render(){if(!ground)return;const dpr=Math.min(window.devicePixelRatio||1,2);ctx.setTransform(dpr,0,0,dpr,0,0);rect(ctx,0,0,view.w,view.h,'#b8ce94');ctx.save();ctx.translate(view.x,view.y);ctx.scale(view.scale,view.scale);ctx.imageSmoothingEnabled=false;ctx.drawImage(ground,0,0);drawRoute();ctx.drawImage(scenery,0,0);
 people.slice().sort((a,b)=>a.y-b.y).forEach(p=>{const i=people.indexOf(p);if(personSelected===i){rect(ctx,p.x-10,p.y+2,20,3,'#f4edbd');label(ctx,String(i+1).padStart(2,'0'),p.x,p.y-39,12,'#38563a','#f5f0d3');}sprite(ctx,p.x,p.y,p.color,p.step,1,p.facing);});drawMarkers();ctx.restore();}
function routeFrom(a,b){const ra=data.routes[a]||[],rb=data.routes[b]||[];if(a==='campus')return rb.map(p=>[...p]);if(b==='campus')return [...ra].reverse().map(p=>[...p]);let shared=0;while(shared<Math.min(ra.length,rb.length)&&Math.hypot(ra[shared][0]-rb[shared][0],ra[shared][1]-rb[shared][1])<1)shared++;return [...ra.slice(Math.max(0,shared-1)).reverse(),...rb.slice(shared)].map(p=>[...p]);}
function setRoute(points){route=points;routeLengths=[0];for(let i=1;i<route.length;i++)routeLengths.push(routeLengths[i-1]+Math.hypot(route[i][0]-route[i-1][0],route[i][1]-route[i-1][1]));routeTotal=routeLengths.at(-1)||0;progress=0;}
function positionAt(d){if(route.length<2)return {x:people[0]?.x||0,y:people[0]?.y||0,dx:1,dy:0};d=Math.min(routeTotal,Math.max(0,d));let i=1;while(i<route.length-1&&routeLengths[i]<d)i++;const a=route[i-1],b=route[i],len=routeLengths[i]-routeLengths[i-1],t=len?(d-routeLengths[i-1])/len:0;return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,dx:b[0]-a[0],dy:b[1]-a[1]};}
function buttonState(){const b=$('#walkButton');b.querySelector('.play-symbol').textContent=walking?'Ⅱ':arrived?'↻':'▶';b.querySelector('span:nth-child(2)').textContent=walking?'Пауза':arrived?'Ещё раз':started?'Продолжить':'На прогулку';}
function showCard(id){const i=info[id];$('#locationCard').hidden=false;$('#cardTag').textContent=i.tag;$('#cardTitle').textContent=i.title;$('#cardDescription').textContent=i.description;$('#cardHint').textContent=i.hint;}
function select(id){if(!data||!info[id])return;if(selected!==id){
 // A new destination starts a clear new walk; interrupted walks reset to the campus.
 if(started&&!arrived){journeyFrom='campus';placePeople();}else if(arrived){journeyFrom=selected;}
 selected=id;walking=false;started=false;arrived=false;setRoute(routeFrom(journeyFrom,id));
 if(route.length<2&&id==='campus'){journeyFrom='campus';placePeople();}
 }
 $$('.place').forEach(b=>{b.classList.toggle('active',b.dataset.place===id);b.setAttribute('aria-pressed',b.dataset.place===id?'true':'false');});showCard(id);$('#walkStatus').textContent=id==='campus'?'Компания собирается у первого корпуса':'Маршрут готов · '+info[id].title;buttonState();render();}
function toggleWalk(){if(!data)return;if(selected==='campus'&&(routeTotal<1||arrived)){journeyFrom='campus';select('burger');}
 if(arrived){journeyFrom='campus';placePeople();setRoute(routeFrom('campus',selected));arrived=false;started=false;}
 walking=!walking;started=true;buttonState();$('#walkStatus').textContent=walking?'В пути · '+info[selected].title:'Прогулка на паузе';}
function tick(now){const wasWalking=walking;const dt=Math.min((now-lastTime)/1000||0,.05);lastTime=now;time+=dt;
 if(walking&&routeTotal>0){progress+=dt*43;people.forEach((p,i)=>{const pos=positionAt(progress-i*16);const perpendicular=Math.hypot(pos.dx,pos.dy)||1;const off=(i%2?1:-1)*4;p.x=pos.x-pos.dy/perpendicular*off;p.y=pos.y+pos.dx/perpendicular*off;p.facing=pos.dx<-.1?-1:1;p.step=reduced?0:time*7+i;});if(progress>=routeTotal+people.length*16){walking=false;arrived=true;people.forEach((p,i)=>{const end=route.at(-1);p.x=end[0]+(i-1.5)*16;p.y=end[1]+(i%2)*9;});buttonState();$('#walkStatus').textContent='Пришли! · '+info[selected].title;$('#cardHint').textContent=selected==='tea'?'Компания у «Амстердама» · Молочай на −1 этаже':'Компания на месте';}}
 if(wasWalking)render();requestAnimationFrame(tick);}
function changeZoom(delta){zoom=Math.min(2.5,Math.max(.7,Math.round((zoom+delta)*10)/10));updateView();render();}
function reset(){zoom=1;pan={x:0,y:0};updateView();render();}
function clampPan(){pan.x=Math.max(-view.w*.65,Math.min(view.w*.65,pan.x));pan.y=Math.max(-view.h*.7,Math.min(view.h*.7,pan.y));}
function worldAt(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left-view.x)/view.scale,y:(e.clientY-r.top-view.y)/view.scale};}
function hit(e){const p=worldAt(e);for(const m of markers){const [x,y]=[m.x,m.y];if(Math.abs(p.x-x)<85&&p.y>y-65&&p.y<y+15)return {type:'place',id:m.id};}
 for(let i=0;i<people.length;i++)if(Math.abs(p.x-people[i].x)<14&&p.y>people[i].y-30&&p.y<people[i].y+8)return {type:'person',id:i};
 for(const b of data?.buildings||[]){const id=b.id==='36136717'?'campus':b.id==='205519637'?'burger':b.id==='453655001'?'tea':null;if(id&&pointIn(p.x,p.y+18,b.p))return {type:'place',id};}return null;}
const pointers=new Map();let pinchDistance=null;
canvas.addEventListener('pointerdown',e=>{if(!data)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,panX:pan.x,panY:pan.y};dragged=false;});
canvas.addEventListener('pointermove',e=>{
 if(pointers.has(e.pointerId)){pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const ps=[...pointers.values()],d=Math.hypot(ps[1].x-ps[0].x,ps[1].y-ps[0].y);if(pinchDistance){zoom=Math.min(2.5,Math.max(.7,zoom*d/pinchDistance));updateView();}pinchDistance=d;dragged=true;render();return;}
 if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)dragged=true;pan.x=drag.panX+dx;pan.y=drag.panY+dy;clampPan();updateView();}}
 else{const h=hit(e);hover=h?.type==='place'?h.id:null;canvas.style.cursor=h?'pointer':'grab';}
 render();
});
canvas.addEventListener('pointerup',e=>{const h=!dragged?hit(e):null;pointers.delete(e.pointerId);pinchDistance=null;drag=null;if(h?.type==='place')select(h.id);if(h?.type==='person')selectPerson(h.id);});
canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);drag=null;pinchDistance=null;});
canvas.addEventListener('pointerleave',()=>{hover=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();changeZoom(e.deltaY<0?.1:-.1);},{passive:false});
canvas.addEventListener('dblclick',e=>{if(!hit(e))changeZoom(.2);});
function selectPerson(i){personSelected=personSelected===i?-1:i;$$('.walker').forEach((b,n)=>{b.classList.toggle('selected',n===personSelected);b.setAttribute('aria-pressed',n===personSelected?'true':'false');});render();}
$$('.place').forEach(b=>b.addEventListener('click',()=>select(b.dataset.place)));
$$('.walker').forEach(b=>b.addEventListener('click',()=>selectPerson(Number(b.dataset.person))));
$('#walkButton').addEventListener('click',toggleWalk);
$('#routeToggle').addEventListener('click',()=>{showRoute=!showRoute;$('#routeToggle').classList.toggle('on',showRoute);$('#routeToggle').setAttribute('aria-checked',String(showRoute));render();});
$('#zoomIn').addEventListener('click',()=>changeZoom(.2));$('#zoomOut').addEventListener('click',()=>changeZoom(-.2));$('#reset').addEventListener('click',reset);
$('#closeCard').addEventListener('click',()=>{$('#locationCard').hidden=true;});
for(const id of ['info','sources'])$('#'+id).addEventListener('click',()=>$('#about').showModal());
$('#about').addEventListener('click',e=>{if(e.target===$('#about')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#fullscreen').addEventListener('click',async()=>{const area=$('#mapArea');try{if(document.fullscreenElement)await document.exitFullscreen();else if(area.requestFullscreen)await area.requestFullscreen();else area.classList.toggle('expanded');}catch{area.classList.toggle('expanded');}resize();});
document.addEventListener('fullscreenchange',resize);
canvas.addEventListener('keydown',e=>{if([' ','+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape','0'].includes(e.key))e.preventDefault();if(e.key===' ')toggleWalk();if(e.key==='+'||e.key==='=')changeZoom(.2);if(e.key==='-')changeZoom(-.2);if(e.key==='0')reset();if(e.key==='ArrowLeft')pan.x+=40;if(e.key==='ArrowRight')pan.x-=40;if(e.key==='ArrowUp')pan.y+=40;if(e.key==='ArrowDown')pan.y-=40;if(e.key==='Escape'){$('#mapArea').classList.remove('expanded');$('#locationCard').hidden=true;}clampPan();updateView();render();});
new ResizeObserver(resize).observe($('#mapArea'));
async function init(){try{const response=await fetch('map-data.json');if(!response.ok)throw Error('map data');data=await response.json();await document.fonts.ready;makeWorld();placePeople();setRoute(data.routes.campus);select('campus');$$('.walker canvas').forEach((cv,i)=>{const c=cv.getContext('2d');c.imageSmoothingEnabled=false;sprite(c,12,29,colors[i],0,1);});$('#loading').hidden=true;resize();requestAnimationFrame(tick);}catch(e){console.error(e);$('#loading').textContent='Не удалось загрузить карту. Обновить страницу ↻';$('#loading').style.cursor='pointer';$('#loading').onclick=()=>location.reload();$('#walkButton').disabled=true;}}
init();
})();
