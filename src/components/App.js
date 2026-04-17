"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { loadState, saveState, subscribeState } from "@/lib/firestore";
import { DEMO_STATE, DEFAULT_STATE } from "@/lib/seed";
import {
  SURFS, REACTS, DEFAULT_CONFIG, MAX_FORUM_CHARS,
  uid, now, fmtD, mAgo, dAgo, toI, frI,
  sortLg, calcPts, computeTournamentPts,
  computePointsAtDate as _computePointsAtDate,
  mCat, nRM,
  parseMentions, renderMentionSegments, getForumActivity, hasUnreadForumActivity, matchHasActivity,
  findPendingScheduled, isScheduledExpired, SCHEDULED_EXPIRY_DAYS,
  buildWeeklyHistory, fmtWeekShort,
  computePlayerStats, daysSinceLastMatch, daysUntilInactivityPenalty, findFreshRivals,
} from "@/lib/logic";
import { LogoSVG } from "@/lib/logo";


const W={bg:"#1a0f2e",bg2:"#0d1b0d",card:"#1c3520",card2:"#2a1650",accent:"#d4af37",text:"#f5f0e1",dim:"#a8b89a",border:"#3d5c3d",danger:"#c0392b",warn:"#d4a012",gold:"#d4af37",silver:"#b0b0b0",bronze:"#cd8032",blue:"#6b8bc4",green:"#2d6a2d",purple:"#5a30a0",darkGreen:"#0f3f10",lightGreen:"#5a9c5a",cream:"#f5f0e1",cream2:"#e8dcc8",cream3:"#d4c9a8"};

function Av({player,size}){
const sz=size||36;
if(player&&player.photo)return(<img src={player.photo} style={{width:sz,height:sz,borderRadius:"50%",objectFit:"cover",border:"2px solid "+W.gold,flexShrink:0,opacity:player.suspended?0.5:1}}/>);
const ini=player?(player.firstName[0]+player.lastName[0]).toUpperCase():"?";
const cols=[W.gold,W.lightGreen,W.blue,"#8b5e3c",W.purple,"#c0392b","#2e86ab","#a23b72"];
const bgc=player?cols[player.firstName.charCodeAt(0)%cols.length]:"#666";
return(<div style={{width:sz,height:sz,borderRadius:"50%",background:bgc+"22",border:"2px solid "+bgc,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:sz*.38,color:bgc,flexShrink:0,opacity:player&&player.suspended?0.5:1}}>{ini}</div>);
}
function SfB({s}){const c={Dura:"#6b8bc4",Tierra:"#cd8032",Hierba:"#5a9c5a"};if(!s)return null;return(<span style={{display:"inline-block",padding:"2px 7px",borderRadius:4,fontSize:10,fontWeight:600,background:(c[s]||"#666")+"22",color:c[s]||"#666",border:"1px solid "+(c[s]||"#666")+"33",letterSpacing:.5}}>{s}</span>);}

function SuspB(){return(<span style={{display:"inline-block",padding:"2px 7px",borderRadius:4,fontSize:10,fontWeight:700,background:W.danger+"22",color:W.danger,border:"1px solid "+W.danger+"55",letterSpacing:.5}}>SUSPENDIDO</span>);}

function FormDots({playerId,matches}){
  const last5=matches.filter(m=>!m.annulled&&m.status==="confirmed"&&(m.player1===playerId||m.player2===playerId)&&m.winner).sort((a,b)=>b.date-a.date).slice(0,5);
  if(last5.length===0)return <span style={{color:W.dim,fontSize:11}}>—</span>;
  return(<div style={{display:"flex",gap:3,alignItems:"center"}}>{last5.map((m,i)=>{const won=m.winner===playerId;return(<span key={m.id||i} style={{width:14,height:14,borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,background:won?"#2d6a2d":"#c0392b",color:"#fff",lineHeight:1}}>{won?"V":"D"}</span>);})}</div>);
}

const si={width:"100%",padding:"10px 14px",borderRadius:8,border:"1px solid "+W.gold+"33",background:W.darkGreen,color:W.cream,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
const ss={...si,appearance:"auto"};
const sbt=v=>({padding:"10px 20px",borderRadius:8,border:v==="ghost"?"1px solid "+W.gold+"44":"none",fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"inherit",background:v==="primary"?"linear-gradient(135deg,"+W.gold+",#b8941f)":v==="danger"?W.danger:"transparent",color:v==="primary"?"#1a0a0a":v==="danger"?"#fff":W.cream2,letterSpacing:v==="primary"?.5:0,transition:"all .2s"});
const scd={background:W.card+"ee",borderRadius:12,padding:20,marginBottom:16,border:"1px solid "+W.gold+"22",backdropFilter:"blur(8px)"};
const bdg=c=>({display:"inline-block",padding:"2px 10px",borderRadius:50,fontSize:11,fontWeight:600,background:c+"18",color:c,letterSpacing:.3});
const snv=a=>({padding:"8px 14px",borderRadius:8,border:"none",background:a?"linear-gradient(135deg,"+W.gold+",#b8941f)":"transparent",color:a?"#1a0a0a":W.cream3,fontWeight:a?700:500,fontSize:13,cursor:"pointer",fontFamily:"inherit",letterSpacing:a?.5:0,transition:"all .2s"});
const slb={fontSize:12,color:W.cream3,display:"block",marginBottom:4,marginTop:10,letterSpacing:.5,textTransform:"uppercase"};

export default function App(){
const[S,setS]=useState(null);const[ld,setLd]=useState(true);const[view,setView]=useState("standings");const[auth,setAuth]=useState(()=>{try{if(typeof window==="undefined")return null;const raw=window.localStorage.getItem("atp-auth-v1");return raw?JSON.parse(raw):null;}catch{return null;}});const[lN,setLN]=useState("");const[lP,setLP]=useState("");const[showReg,setShowReg]=useState(false);const[rF,setRF]=useState({firstName:"",lastName:"",nickname:"",age:"",hand:"right",backhand:"two",password:"",email:"",photo:""});const[modal,setModal]=useState(null);const[tf,setTf]=useState("all");const[surfF,setSurfF]=useState("all");const[dateF,setDateF]=useState("");const[h1,setH1]=useState("");const[h2,setH2]=useState("");const[msg,setMsg]=useState("");const[expT,setExpT]=useState(null);const[mTypeF,setMTypeF]=useState("all");const[mSurfF,setMSurfF]=useState("all");const[mStatusF,setMStatusF]=useState("played");const[forumLastSeen,setForumLastSeen]=useState(0);

useEffect(()=>{let unsub=null;let mounted=true;(async()=>{try{const stored=await loadState();if(mounted){if(stored&&stored.players&&stored.players.length>0){const migrated={...stored,players:stored.players.map(pl=>({...pl,suspended:pl.suspended||false})),forum:stored.forum||[]};setS({...DEFAULT_STATE,...migrated,config:{...DEFAULT_CONFIG,...(migrated.config||{})}});}else{const demo={...DEMO_STATE};await saveState(demo);setS(demo);}setLd(false);}unsub=subscribeState((data)=>{if(mounted&&data){const migrated={...data,players:(data.players||[]).map(pl=>({...pl,suspended:pl.suspended||false})),forum:data.forum||[]};setS({...DEFAULT_STATE,...migrated,config:{...DEFAULT_CONFIG,...(migrated.config||{})}});}});}catch(e){console.error("Init error:",e);if(mounted){setS({...DEMO_STATE});setLd(false);}}})();return()=>{mounted=false;if(unsub)unsub();};},[]);
const up=useCallback(fn=>{setS(p=>{const n=fn(p);saveState(n);return n;});},[]);
const hPh=(e,cb)=>{const f=e.target.files[0];if(!f)return;if(f.size>500000){flash("Max 500KB");return;}const r=new FileReader();r.onload=ev=>cb(ev.target.result);r.readAsDataURL(f);};
const flash=m=>{setMsg(m);setTimeout(()=>setMsg(""),3000);};

// Persistir la sesión en localStorage del dispositivo. El login se mantiene al refrescar.
useEffect(()=>{try{if(typeof window==="undefined")return;if(auth)window.localStorage.setItem("atp-auth-v1",JSON.stringify(auth));else window.localStorage.removeItem("atp-auth-v1");}catch{}},[auth]);

// Validar la sesión contra el estado cargado. Si el jugador guardado ya no existe
// o ya no está aprobado (p.ej. el admin lo eliminó), cerramos sesión automáticamente.
// Solo lo hacemos si el estado tiene jugadores, para evitar cerrar sesiones por un
// estado transitorio vacío durante la carga inicial.
useEffect(()=>{if(!S||!auth||auth.isAdmin)return;if(!S.players||S.players.length===0)return;const pl=S.players.find(p=>p.id===auth.id&&p.approved);if(!pl)setAuth(null);},[S,auth]);

// Cargar/guardar el timestamp de "última vez que vi el foro" por usuario (local al dispositivo).
// Al abrir la pestaña "Foro" se actualiza a Date.now() para apagar el indicador de novedades.
useEffect(()=>{if(!auth)return;try{if(typeof window==="undefined")return;const key="atp-forum-seen-"+auth.id;const raw=window.localStorage.getItem(key);setForumLastSeen(raw?parseInt(raw):0);}catch{setForumLastSeen(0);}},[auth]);
useEffect(()=>{if(view!=="forum"||!auth)return;const ts=Date.now();setForumLastSeen(ts);try{if(typeof window==="undefined")return;window.localStorage.setItem("atp-forum-seen-"+auth.id,String(ts));}catch{}},[view,auth]);

const pSh=useCallback(id=>{if(!S)return"?";const p=S.players.find(x=>x.id===id);return p?p.nickname:"?";},[S]);
const pO=useCallback(id=>S?S.players.find(x=>x.id===id)||null:null,[S]);
const canPl=useCallback((a,b)=>{if(!S)return true;const pa=S.players.find(p=>p.id===a);const pb=S.players.find(p=>p.id===b);if((pa&&pa.suspended)||(pb&&pb.suspended))return false;const ws=dAgo(S.config.sameOppDays);return S.matches.filter(m=>!m.tournamentId&&!m.annulled&&((m.player1===a&&m.player2===b)||(m.player1===b&&m.player2===a))&&m.date>=ws).length<S.config.maxSameOpp;},[S]);
const canCh=useCallback((a,b)=>{if(!S)return false;const pa=S.players.find(p=>p.id===a);const pb=S.players.find(p=>p.id===b);if((pa&&pa.suspended)||(pb&&pb.suspended))return false;return!S.challenges.some(c=>c.challengerId===a&&c.targetId===b&&c.date>=dAgo(S.config.chCoolDays));},[S]);
const hasH2H=useCallback((a,b)=>S?S.matches.some(m=>!m.annulled&&((m.player1===a&&m.player2===b)||(m.player1===b&&m.player2===a))):false,[S]);

const computePointsAtDate=useCallback((targetDate,surface)=>_computePointsAtDate(S,targetDate,surface),[S]);

const standings=useMemo(()=>{
if(!S)return[];
const dateCutoff=dateF?frI(dateF):Date.now();
const co=tf==="all"?0:tf==="3m"?mAgo(3):tf==="6m"?mAgo(6):mAgo(12);
const ptsMap=computePointsAtDate(dateCutoff,surfF);
const allRows=S.players.filter(p=>p.approved).map(pl=>{
const fm=m=>!m.annulled&&m.status==="confirmed"&&(m.player1===pl.id||m.player2===pl.id)&&m.date>=co&&(surfF==="all"||m.surface===surfF)&&m.date<=dateCutoff;
const pm=S.matches.filter(fm);const w=pm.filter(m=>m.winner===pl.id).length;const l=pm.filter(m=>m.winner&&m.winner!==pl.id).length;
const tot=w+l;
return{...pl,wins:w,losses:l,total:tot,points:ptsMap[pl.id]||0,winRate:tot>0?((w/tot)*100).toFixed(1):"0.0"};
});
// Separate suspended from active, sort each group, then concatenate
const active=allRows.filter(p=>!p.suspended).sort((a,b)=>b.points-a.points||parseFloat(b.winRate)-parseFloat(a.winRate));
const suspended=allRows.filter(p=>p.suspended).sort((a,b)=>b.points-a.points||parseFloat(b.winRate)-parseFloat(a.winRate));
return[...active,...suspended];
},[S,tf,surfF,dateF,computePointsAtDate]);

const h2hData=useMemo(()=>{if(!h1||!h2||!S)return null;const ms=S.matches.filter(m=>!m.annulled&&m.status==="confirmed"&&((m.player1===h1&&m.player2===h2)||(m.player1===h2&&m.player2===h1)));const bS={};SURFS.forEach(sf=>{const sm=ms.filter(m=>m.surface===sf);bS[sf]={w1:sm.filter(m=>m.winner===h1).length,w2:sm.filter(m=>m.winner===h2).length};});return{matches:ms,w1:ms.filter(m=>m.winner===h1).length,w2:ms.filter(m=>m.winner===h2).length,bS};},[h1,h2,S]);

if(ld||!S)return(<div style={{fontFamily:"'Georgia',serif",background:W.bg2,color:W.cream,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center"}}><div style={{display:"flex",justifyContent:"center",marginBottom:8}}><LogoSVG size={64}/></div><div style={{color:W.cream3,marginTop:8,fontStyle:"italic"}}>Conectando...</div></div></div>);

if(!auth){
const doL=()=>{if(lN.toLowerCase()==="admin"&&lP===S.adminPw){setAuth({id:"admin",isAdmin:true});setLN("");setLP("");return;}const p=S.players.find(x=>(x.nickname.toLowerCase()===lN.toLowerCase()||x.email.toLowerCase()===lN.toLowerCase())&&x.password===lP&&x.approved);if(p){setAuth({id:p.id,isAdmin:false});setLN("");setLP("");}else flash("Credenciales incorrectas");};
const doR=()=>{if(!rF.firstName.trim()||!rF.lastName.trim()||!rF.nickname.trim()||!rF.password.trim()||!rF.age||!rF.email.trim()){flash("Rellena todo");return;}if(S.players.some(p=>p.nickname.toLowerCase()===rF.nickname.toLowerCase()||p.email.toLowerCase()===rF.email.toLowerCase())||S.pending.some(p=>p.nickname.toLowerCase()===rF.nickname.toLowerCase())){flash("En uso");return;}up(s=>({...s,pending:[...s.pending,{id:uid(),...rF,age:+rF.age,requestedAt:now()}]}));setRF({firstName:"",lastName:"",nickname:"",age:"",hand:"right",backhand:"two",password:"",email:"",photo:""});setShowReg(false);flash("Solicitud enviada");};
return(
<div style={{fontFamily:"'Georgia','Times New Roman',serif",background:"linear-gradient(180deg,"+W.bg2+" 0%,"+W.bg+" 100%)",color:W.cream,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{...scd,maxWidth:400,width:"100%",textAlign:"center",background:"linear-gradient(180deg,"+W.card+" 0%,"+W.card2+" 100%)",borderColor:W.gold+"44"}}>
<div style={{display:"flex",justifyContent:"center",margin:"0 auto 12px"}}><LogoSVG size={96}/></div>
<div style={{fontSize:11,color:W.cream3,letterSpacing:5,fontWeight:400,marginBottom:4,textTransform:"uppercase"}}>THE CHAMPIONSHIPS</div>
<h1 style={{fontSize:28,fontWeight:700,marginBottom:4,color:W.gold,fontFamily:"'Georgia',serif"}}>ATP Atentado</h1>
<div style={{width:60,height:2,background:"linear-gradient(90deg,transparent,"+W.gold+",transparent)",margin:"8px auto 20px"}}/>
{msg&&<div style={{...bdg(W.warn),marginBottom:12,fontSize:13,padding:"6px 12px"}}>{msg}</div>}
{!showReg?(<div>
<input style={{...si,marginBottom:10}} placeholder="Apodo o email" value={lN} onChange={e=>setLN(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doL()}/>
<input style={{...si,marginBottom:16}} placeholder="Contraseña" type="password" value={lP} onChange={e=>setLP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doL()}/>
<button style={{...sbt("primary"),width:"100%",marginBottom:12,letterSpacing:2}} onClick={doL}>ENTRAR</button>
<button style={{...sbt("ghost"),width:"100%",fontSize:13}} onClick={()=>setShowReg(true)}>Solicitar registro</button>
<p style={{color:W.cream3,fontSize:11,marginTop:16,fontStyle:"italic",opacity:.5}}>Introduce tu apodo o email y contraseña para acceder.</p>
</div>):(<div style={{textAlign:"left"}}>
<label style={slb}>Email</label><input style={si} type="email" value={rF.email} onChange={e=>setRF(p=>({...p,email:e.target.value}))}/>
<label style={slb}>Nombre</label><input style={si} value={rF.firstName} onChange={e=>setRF(p=>({...p,firstName:e.target.value}))}/>
<label style={slb}>Apellido</label><input style={si} value={rF.lastName} onChange={e=>setRF(p=>({...p,lastName:e.target.value}))}/>
<label style={slb}>Apodo</label><input style={si} value={rF.nickname} onChange={e=>setRF(p=>({...p,nickname:e.target.value}))}/>
<label style={slb}>Edad</label><input style={si} type="number" value={rF.age} onChange={e=>setRF(p=>({...p,age:e.target.value}))}/>
<label style={slb}>Mano</label><select style={ss} value={rF.hand} onChange={e=>setRF(p=>({...p,hand:e.target.value}))}><option value="right">Diestro</option><option value="left">Zurdo</option></select>
<label style={slb}>Reves</label><select style={ss} value={rF.backhand} onChange={e=>setRF(p=>({...p,backhand:e.target.value}))}><option value="two">Dos manos</option><option value="one">Una mano</option></select>
<label style={slb}>Contraseña</label><input style={si} type="password" value={rF.password} onChange={e=>setRF(p=>({...p,password:e.target.value}))}/>
<label style={slb}>Foto</label>
<div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>{rF.photo?(<img src={rF.photo} style={{width:48,height:48,borderRadius:"50%",objectFit:"cover"}}/>):(<div style={{width:48,height:48,borderRadius:"50%",background:W.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:W.dim}}>Foto</div>)}<label style={{...sbt("ghost"),padding:"8px 14px",fontSize:13,cursor:"pointer"}}>Subir<input type="file" accept="image/*" style={{display:"none"}} onChange={e=>hPh(e,d=>setRF(p=>({...p,photo:d})))}/></label></div>
<button style={{...sbt("primary"),width:"100%",marginBottom:12}} onClick={doR}>ENVIAR</button>
<button style={{...sbt("ghost"),width:"100%",fontSize:13}} onClick={()=>setShowReg(false)}>Volver</button>
</div>)}
</div>
</div>
);
}

const isA=auth.isAdmin;const myId=auth.id;const appr=S.players.filter(p=>p.approved);
const apprActive=appr.filter(p=>!p.suspended);
const myPlayer=S.players.find(p=>p.id===myId);
const amISuspended=myPlayer&&myPlayer.suspended;
const gR=pid=>{const i=standings.findIndex(s=>s.id===pid);return i>=0?i+1:standings.length;};
const gP=pid=>{const s=standings.find(s=>s.id===pid);return s?s.points:0;};
const hPl=pid=>S.matches.some(m=>!m.annulled&&!m.tournamentId&&(m.player1===pid||m.player2===pid));
const nRM={r16:"qf",qf:"sf",sf:"final"};

function ScoreInput({p1Name,p2Name,bestOf,onBestOfChange,onScoreChange,onWinnerChange,showBestOfToggle}){
  const maxSets=bestOf||3;
  const setsNeeded=Math.ceil(maxSets/2);
  const[sets,setSets]=useState([{a:"",b:""},{a:"",b:""},{a:"",b:""},{a:"",b:""},{a:"",b:""}]);
  const update=(i,side,val)=>{
    const v=val.replace(/[^0-9]/g,"").slice(0,1);
    const ns=[...sets];ns[i]={...ns[i],[side]:v};setSets(ns);
    let sW1=0,sW2=0,scoreStr="";const parts=[];
    for(let j=0;j<maxSets;j++){
      const a=parseInt(ns[j].a);const b=parseInt(ns[j].b);
      if(isNaN(a)||isNaN(b))break;
      parts.push(a+"-"+b);
      if(a>b)sW1++;else if(b>a)sW2++;
      if(sW1>=setsNeeded||sW2>=setsNeeded)break;
    }
    scoreStr=parts.join(", ");
    onScoreChange(scoreStr);
    if(sW1>=setsNeeded)onWinnerChange("p1");
    else if(sW2>=setsNeeded)onWinnerChange("p2");
    else onWinnerChange(null);
  };
  let completedSets=0;
  for(let j=0;j<maxSets;j++){const a=parseInt(sets[j].a);const b=parseInt(sets[j].b);if(!isNaN(a)&&!isNaN(b)&&(a>0||b>0))completedSets++;else break;}
  let sW1=0,sW2=0;for(let j=0;j<completedSets;j++){const a=parseInt(sets[j].a);const b=parseInt(sets[j].b);if(a>b)sW1++;else if(b>a)sW2++;}
  const matchOver=sW1>=setsNeeded||sW2>=setsNeeded;
  const visibleSets=matchOver?completedSets:Math.min(completedSets+1,maxSets);

  const cellSt={width:36,height:36,textAlign:"center",fontSize:16,fontWeight:700,borderRadius:6,border:"1px solid "+W.gold+"33",background:W.darkGreen,color:W.cream,outline:"none",fontFamily:"inherit"};
  return(<div>
    {showBestOfToggle&&(<div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}><span style={{fontSize:12,color:W.cream3}}>Formato:</span>{[3,5].map(n=>(<button key={n} style={{...snv(bestOf===n),padding:"6px 12px",fontSize:12}} onClick={()=>{onBestOfChange(n);setSets([{a:"",b:""},{a:"",b:""},{a:"",b:""},{a:"",b:""},{a:"",b:""}]);onScoreChange("");onWinnerChange(null);}}>{n===3?"Al mejor de 3":"Al mejor de 5"}</button>))}</div>)}
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:80,fontSize:13,fontWeight:600,color:W.gold,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p1Name||"J1"}</div>
        {Array.from({length:visibleSets}).map((_,i)=>(<input key={"a"+i} style={{...cellSt,color:parseInt(sets[i].a)>parseInt(sets[i].b)?W.gold:W.cream}} value={sets[i].a} onChange={e=>update(i,"a",e.target.value)} placeholder="-" inputMode="numeric" maxLength={1}/>))}
        {matchOver&&<span style={{fontSize:14,fontWeight:700,color:sW1>sW2?W.gold:W.cream3,marginLeft:8}}>{sW1>sW2?"GANA":""}</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:80,fontSize:13,fontWeight:600,color:W.gold,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p2Name||"J2"}</div>
        {Array.from({length:visibleSets}).map((_,i)=>(<input key={"b"+i} style={{...cellSt,color:parseInt(sets[i].b)>parseInt(sets[i].a)?W.gold:W.cream}} value={sets[i].b} onChange={e=>update(i,"b",e.target.value)} placeholder="-" inputMode="numeric" maxLength={1}/>))}
        {matchOver&&<span style={{fontSize:14,fontWeight:700,color:sW2>sW1?W.gold:W.cream3,marginLeft:8}}>{sW2>sW1?"GANA":""}</span>}
      </div>
    </div>
    {visibleSets>0&&(<div style={{display:"flex",gap:4,marginTop:6}}>{Array.from({length:visibleSets}).map((_,i)=>(<div key={i} style={{width:36,textAlign:"center",fontSize:9,color:W.cream3}}>{"Set "+(i+1)}</div>))}</div>)}
  </div>);
}

function Mdl({title,children}){return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}} onClick={()=>setModal(null)}><div style={{background:"linear-gradient(180deg,"+W.card+" 0%,"+W.card2+" 100%)",borderRadius:14,padding:24,maxWidth:520,width:"100%",maxHeight:"85vh",overflowY:"auto",border:"1px solid "+W.gold+"33",boxShadow:"0 8px 32px rgba(0,0,0,.6)"}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h3 style={{fontSize:18,fontWeight:700,margin:0,color:W.gold,fontFamily:"'Georgia',serif"}}>{title}</h3><button onClick={()=>setModal(null)} style={{background:"none",border:"none",color:W.cream3,cursor:"pointer",fontSize:20}}>✕</button></div>{children}</div></div>);}

function ReactBar({matchId}){const m=S.matches.find(x=>x.id===matchId);const[showTip,setShowTip]=useState(null);if(!m)return null;const rx=m.reactions||{};return(<div style={{position:"relative"}}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{REACTS.map(emoji=>{const users=rx[emoji]||[];const mine=users.includes(myId);return(<button key={emoji} onClick={e=>{e.stopPropagation();up(s=>({...s,matches:s.matches.map(x=>x.id===matchId?{...x,reactions:{...x.reactions,[emoji]:mine?(x.reactions[emoji]||[]).filter(u=>u!==myId):[...(x.reactions[emoji]||[]),myId]}}:x)}));}} onMouseEnter={()=>users.length>0&&setShowTip(emoji)} onMouseLeave={()=>setShowTip(null)} style={{padding:"4px 8px",borderRadius:16,border:"1px solid "+(mine?W.gold:W.gold+"33"),background:mine?W.gold+"22":"transparent",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",gap:3}}><span>{emoji}</span>{users.length>0&&<span style={{fontSize:11,color:mine?W.gold:W.cream3}}>{String(users.length)}</span>}</button>);})}</div>{showTip&&rx[showTip]&&rx[showTip].length>0&&(<div style={{position:"absolute",bottom:"100%",left:0,background:W.card2,border:"1px solid "+W.gold+"33",borderRadius:8,padding:"6px 10px",fontSize:12,color:W.cream,marginBottom:4,zIndex:10,whiteSpace:"nowrap",boxShadow:"0 4px 12px rgba(0,0,0,.5)"}}>{showTip+" "}{rx[showTip].map(u=>pSh(u)).join(", ")}</div>)}</div>);}

function MatchDetailView(){const m=modal.match;const cms=m.comments||[];const[cm,setCm]=useState("");const rivalId=m.player1===myId?m.player2:m.player1;return(<Mdl title={pSh(m.player1)+" vs "+pSh(m.player2)}><div style={{display:"flex",justifyContent:"center",gap:16,alignItems:"center",marginBottom:16}}><div style={{textAlign:"center"}}><Av player={pO(m.player1)} size={48}/><div style={{fontSize:13,fontWeight:m.winner===m.player1?700:400,color:m.winner===m.player1?W.gold:W.cream,marginTop:4}}>{pSh(m.player1)}</div></div><div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:700,color:W.gold}}>{m.score||"vs"}</div><div style={{fontSize:11,color:W.cream3}}>{fmtD(m.date)}</div><SfB s={m.surface}/>{m.status==="pending"&&<div style={{...bdg(W.warn),marginTop:4}}>Pendiente</div>}{m.status==="disputed"&&<div style={{...bdg(W.danger),marginTop:4}}>Disputado</div>}</div><div style={{textAlign:"center"}}><Av player={pO(m.player2)} size={48}/><div style={{fontSize:13,fontWeight:m.winner===m.player2?700:400,color:m.winner===m.player2?W.gold:W.cream,marginTop:4}}>{pSh(m.player2)}</div></div></div>{m.status==="pending"&&myId===rivalId&&(<div style={{display:"flex",gap:8,marginBottom:12}}><button style={{...sbt("primary"),flex:1}} onClick={()=>{up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,status:"confirmed"}:x)}));setModal(null);flash("Confirmado");}}>Confirmar</button><button style={{...sbt("danger"),flex:1}} onClick={()=>{up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,status:"disputed"}:x)}));setModal(null);flash("Disputado");}}>Disputar</button></div>)}{m.status==="pending"&&isA&&(<button style={{...sbt("primary"),width:"100%",marginBottom:12}} onClick={()=>{up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,status:"confirmed"}:x)}));setModal(null);}}>Validar (admin)</button>)}{m.status==="disputed"&&isA&&(<div style={{display:"flex",gap:8,marginBottom:12}}><button style={{...sbt("primary"),flex:1}} onClick={()=>{up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,status:"confirmed"}:x)}));setModal(null);}}>Confirmar</button><button style={{...sbt("danger"),flex:1}} onClick={()=>{up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,annulled:true}:x)}));setModal(null);}}>Anular</button></div>)}{isA&&m.status==="confirmed"&&!m.annulled&&(<button style={{...sbt("danger"),width:"100%",marginBottom:12}} onClick={()=>{up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,annulled:true}:x)}));setModal(null);}}>Anular</button>)}{isA&&m.annulled&&(<button style={{...sbt("primary"),width:"100%",marginBottom:12}} onClick={()=>{up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,annulled:false}:x)}));setModal(null);flash("Partido restaurado");}}>Desanular</button>)}<div style={{marginBottom:12}}><ReactBar matchId={m.id}/></div><h4 style={{fontSize:14,fontWeight:600,marginBottom:8,color:W.gold}}>Comentarios</h4><div style={{maxHeight:200,overflowY:"auto",marginBottom:8}}>{cms.length===0&&<div style={{color:W.cream3,fontSize:13,fontStyle:"italic"}}>Sin comentarios</div>}{cms.map((c,i)=>(<div key={String(i)} style={{padding:"8px 0",borderBottom:"1px solid "+W.gold+"11",fontSize:13}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><Av player={pO(c.userId)} size={20}/><span style={{fontWeight:600,color:W.cream}}>{pSh(c.userId)}</span><span style={{color:W.cream3,fontSize:11}}>{fmtD(c.date)}</span></div><div style={{color:W.cream2}}>{c.text}</div></div>))}</div><div style={{display:"flex",gap:8}}><input style={{...si,flex:1,padding:"8px 12px"}} placeholder="Escribe..." value={cm} onChange={e=>setCm(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&cm.trim()){up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,comments:[...(x.comments||[]),{userId:myId,text:cm.trim(),date:now()}]}:x)}));setCm("");}}} /><button style={{...sbt("primary"),padding:"8px 14px"}} onClick={()=>{if(!cm.trim())return;up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,comments:[...(x.comments||[]),{userId:myId,text:cm.trim(),date:now()}]}:x)}));setCm("");}}>{">"}</button></div></Mdl>);}

function MatchModal({scheduled}){
  // If invoked from a scheduled match, pre-fill players / date / surface and treat submit as "resolve + delete programado".
  const[p1,sp1]=useState(scheduled?scheduled.player1:(isA?"":myId));
  const[p2,sp2]=useState(scheduled?scheduled.player2:"");
  const[w,sw]=useState("");
  const[scr,sscr]=useState("");
  const[dt,sdt]=useState(scheduled?toI(scheduled.date):toI(now()));
  const[sf,ssf]=useState(scheduled?scheduled.surface:"Dura");
  const[bo,setBo]=useState(3);
  const ok=p1&&p2&&p1!==p2?canPl(p1,p2):true;
  const h2h=p1&&p2?hasH2H(p1,p2):false;
  const actualW=w==="p1"?p1:w==="p2"?p2:"";
  const pp=actualW&&p1&&p2?calcPts(gP(actualW),gP(actualW===p1?p2:p1),S.config.eloBase,S.config.equityBonusPct,S.config.equityMatchesGap,h2h):S.config.eloBase;
  const isBonus=actualW&&pp>S.config.eloBase;
  const eligibleP1=isA?apprActive:(amISuspended?[]:apprActive);
  const eligibleP2=apprActive.filter(p=>p.id!==p1);
  // Date-age check: non-admins cannot register matches more than maxPastDays ago.
  const maxPast=S.config.maxPastDays||15;
  const dtTs=dt?frI(dt):0;
  const daysBehind=dtTs?Math.floor((Date.now()-dtTs)/86400000):0;
  const tooOld=!isA&&daysBehind>maxPast;
  const inFuture=dtTs>Date.now()+86400000;
  // Pending scheduled check between p1 & p2 (ignoring the one we are resolving)
  const pendingSched=p1&&p2?findPendingScheduled(S,p1,p2):null;
  const blockedByScheduled=pendingSched&&(!scheduled||pendingSched.id!==scheduled.id);
  return(<Mdl title={scheduled?"Registrar resultado":"Registrar Partido"}>
    {amISuspended&&!isA&&(<div style={{...bdg(W.danger),padding:"10px 14px",marginBottom:12,fontSize:13,display:"block",textAlign:"center"}}>Estás suspendido. No puedes registrar partidos hasta que el administrador levante la suspensión.</div>)}
    {scheduled&&(<div style={{background:W.blue+"22",border:"1px solid "+W.blue+"55",borderRadius:8,padding:"10px 12px",marginBottom:12,fontSize:12,color:W.cream}}>Registrando resultado de partido programado. Al guardar, el programado desaparecerá.</div>)}
    <label style={slb}>Fecha</label><input style={{...si,marginBottom:8}} type="date" value={dt} onChange={e=>sdt(e.target.value)}/>
    {tooOld&&(<div style={{background:W.warn+"22",border:"1px solid "+W.warn,borderRadius:8,padding:"10px 12px",marginBottom:8,fontSize:12,color:W.cream}}>Esta fecha tiene {String(daysBehind)} días. El límite para jugadores es {String(maxPast)} días. Pide al admin que lo registre manualmente, o ajusta la fecha.</div>)}
    {inFuture&&(<div style={{...bdg(W.warn),marginBottom:8}}>La fecha está en el futuro — usa "Programar partido" en su lugar</div>)}
    <label style={slb}>Superficie</label><select style={{...ss,marginBottom:8}} value={sf} onChange={e=>ssf(e.target.value)}>{SURFS.map(s=>(<option key={s} value={s}>{s}</option>))}</select>
    {isA&&!scheduled&&(<><label style={slb}>Jugador 1</label><select style={{...ss,marginBottom:8}} value={p1} onChange={e=>{sp1(e.target.value);sw("");sscr("");}}><option value="">...</option>{eligibleP1.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select></>)}
    {!scheduled&&(<><label style={slb}>{isA?"Jugador 2":"Rival"}</label><select style={{...ss,marginBottom:8}} value={p2} onChange={e=>{sp2(e.target.value);sw("");sscr("");}} disabled={amISuspended&&!isA}><option value="">...</option>{eligibleP2.map(p=>(<option key={p.id} value={p.id}>{p.nickname+" ("+String(gP(p.id))+" pts)"}</option>))}</select></>)}
    {scheduled&&(<div style={{background:W.darkGreen,borderRadius:8,padding:10,marginBottom:12,border:"1px solid "+W.gold+"22",display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}><Av player={pO(p1)} size={28}/><span style={{fontWeight:600,color:W.cream}}>{pSh(p1)}</span><span style={{color:W.cream3,fontSize:12}}>vs</span><Av player={pO(p2)} size={28}/><span style={{fontWeight:600,color:W.cream}}>{pSh(p2)}</span></div>)}
    {blockedByScheduled&&(<div style={{background:W.warn+"22",border:"1px solid "+W.warn,borderRadius:8,padding:"10px 12px",marginBottom:8,fontSize:12,color:W.cream}}>Hay un partido programado pendiente entre estos jugadores ({fmtD(pendingSched.date)}). Resuélvelo o bórralo antes de registrar uno nuevo.</div>)}
    {p1&&p2&&!ok&&!blockedByScheduled&&<div style={{...bdg(W.warn),marginBottom:8}}>No cuenta — se registrará como Amistoso</div>}
    {p1&&p2&&!blockedByScheduled&&(<><label style={slb}>Resultado</label><div style={{marginBottom:12}}><ScoreInput p1Name={pSh(p1)} p2Name={pSh(p2)} bestOf={bo} onBestOfChange={setBo} showBestOfToggle={true} onScoreChange={s=>sscr(s)} onWinnerChange={side=>sw(side||"")}/></div></>)}
    {actualW&&!blockedByScheduled&&(<div style={{background:W.darkGreen,borderRadius:8,padding:10,marginBottom:12,border:"1px solid "+W.gold+"22",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:W.cream3}}>{!ok?"Amistoso — no puntúa":isBonus?"Bonus equidad aplicado":"Base"}</span><span style={{fontSize:16,fontWeight:700,color:W.gold}}>{ok?(String(pp)+" pts"):"0 pts"}</span></div>)}
    <button style={{...sbt("primary"),width:"100%",opacity:actualW&&!(amISuspended&&!isA)&&!tooOld&&!inFuture&&!blockedByScheduled?1:.4}} disabled={(amISuspended&&!isA)||tooOld||inFuture||blockedByScheduled} onClick={()=>{
      if(!p1||!p2||!actualW||p1===p2)return;
      if(amISuspended&&!isA)return;
      if(tooOld||inFuture||blockedByScheduled)return;
      const pts=calcPts(gP(actualW),gP(actualW===p1?p2:p1),S.config.eloBase,S.config.equityBonusPct,S.config.equityMatchesGap,h2h);
      up(s=>{
        let matches=s.matches;
        // If resolving a scheduled match, delete it first
        if(scheduled)matches=matches.filter(m=>m.id!==scheduled.id);
        return{...s,matches:[...matches,{id:uid(),player1:p1,player2:p2,winner:actualW,score:scr,date:frI(dt),points:pts,countsForStandings:ok,isChallenge:false,tournamentId:null,annulled:false,surface:sf,status:isA?"confirmed":"pending",submittedBy:myId,reactions:{},comments:[]}]};
      });
      setModal(null);
      flash(isA?"Registrado":"Enviado");
    }}>REGISTRAR</button>
  </Mdl>);
}

function BracketMatchModal(){const{tournament:t,round,matchIdx,bracketMatch:bm}=modal;const[w,sw]=useState("");const[scr,sscr]=useState(bm.score||"");const[dt,sdt]=useState(toI(now()));const[sf,ssf]=useState("Dura");const[bo,setBo]=useState(3);const[eP1,seP1]=useState(bm.p1||"");const[eP2,seP2]=useState(bm.p2||"");const tp=S.players.filter(p=>t.players.includes(p.id));const rl=round==="r16"?"Octavos":round==="qf"?"Cuartos":round==="sf"?"Semifinal":"Final";const titleP1=eP1?pSh(eP1):"TBD";const titleP2=eP2?pSh(eP2):"TBD";const actualW=w==="p1"?eP1:w==="p2"?eP2:"";return(<Mdl title={rl+": "+titleP1+" vs "+titleP2}><div style={{display:"flex",justifyContent:"center",gap:20,alignItems:"center",marginBottom:16}}><div style={{textAlign:"center"}}>{eP1?<Av player={pO(eP1)} size={48}/>:<div style={{width:48,height:48,borderRadius:"50%",background:W.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:W.cream3}}>?</div>}<div style={{fontSize:13,marginTop:4,fontWeight:600,color:W.gold}}>{titleP1}</div></div><div style={{fontSize:18,color:W.cream3}}>vs</div><div style={{textAlign:"center"}}>{eP2?<Av player={pO(eP2)} size={48}/>:<div style={{width:48,height:48,borderRadius:"50%",background:W.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:W.cream3}}>?</div>}<div style={{fontSize:13,marginTop:4,fontWeight:600,color:W.gold}}>{titleP2}</div></div></div>{isA&&(<div style={{background:W.darkGreen,borderRadius:8,padding:10,marginBottom:12,border:"1px solid "+W.gold+"22"}}><div style={{fontSize:11,color:W.warn,marginBottom:6}}>Admin: asignar / cambiar jugadores</div><div style={{display:"flex",gap:8}}><select style={{...ss,flex:1}} value={eP1} onChange={e=>{seP1(e.target.value);sw("");}}><option value="">Seleccionar...</option>{tp.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select><select style={{...ss,flex:1}} value={eP2} onChange={e=>{seP2(e.target.value);sw("");}}><option value="">Seleccionar...</option>{tp.filter(p=>p.id!==eP1).map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select></div></div>)}{eP1&&eP2&&(<><label style={slb}>Fecha</label><input style={{...si,marginBottom:8}} type="date" value={dt} onChange={e=>sdt(e.target.value)}/><label style={slb}>Superficie</label><select style={{...ss,marginBottom:8}} value={sf} onChange={e=>ssf(e.target.value)}>{SURFS.map(s=>(<option key={s} value={s}>{s}</option>))}</select><label style={slb}>Resultado</label><div style={{marginBottom:12}}><ScoreInput p1Name={pSh(eP1)} p2Name={pSh(eP2)} bestOf={bo} onBestOfChange={setBo} showBestOfToggle={true} onScoreChange={s=>sscr(s)} onWinnerChange={side=>sw(side||"")}/></div></>)}{bm.winner&&<div style={{...bdg(W.cream3),marginBottom:8}}>Sobreescribir resultado anterior</div>}<button style={{...sbt("primary"),width:"100%"}} onClick={()=>{if(!eP1||!eP2)return;
if(!actualW){up(s=>{const t2={...s.tournaments.find(x=>x.id===t.id)};if(!t2.bracket)return s;const uR=[...(t2.bracket[round]||[])];uR[matchIdx]={...uR[matchIdx],p1:eP1,p2:eP2};t2.bracket={...t2.bracket,[round]:uR};return{...s,tournaments:s.tournaments.map(x=>x.id===t.id?t2:x)};});setModal(null);flash("Jugadores asignados");return;}const mid=uid();const ac=isA;up(s=>{const t2={...s.tournaments.find(x=>x.id===t.id)};if(!t2.bracket)return s;const uR=[...(t2.bracket[round]||[])];uR[matchIdx]={...uR[matchIdx],p1:eP1,p2:eP2,winner:actualW,score:scr,status:ac?"confirmed":"pending"};t2.bracket={...t2.bracket,[round]:uR};if(ac){const allDone=uR.every(m=>m.winner&&m.status==="confirmed");const nr=nRM[round];if(allDone&&nr&&(!t2.bracket[nr]||t2.bracket[nr].length===0)){const nm=[];for(let i=0;i<uR.length;i+=2){if(i+1<uR.length)nm.push({p1:uR[i].winner,p2:uR[i+1].winner,winner:null,score:"",status:"pending_play"});}t2.bracket={...t2.bracket,[nr]:nm};}}const mObj={id:mid,player1:eP1,player2:eP2,winner:actualW,score:scr,date:frI(dt),phase:round,status:ac?"confirmed":"pending",submittedBy:myId};t2.matches=[...t2.matches,mObj];return{...s,tournaments:s.tournaments.map(x=>x.id===t.id?t2:x),matches:[...s.matches,{id:mid,player1:eP1,player2:eP2,winner:actualW,score:scr,date:frI(dt),points:0,countsForStandings:false,isChallenge:false,tournamentId:t.id,annulled:false,surface:sf,status:ac?"confirmed":"pending",submittedBy:myId,reactions:{},comments:[]}]};});setModal(null);}}>{eP1&&eP2&&!actualW?"ASIGNAR JUGADORES":actualW?"REGISTRAR":"SELECCIONAR JUGADORES"}</button></Mdl>);}

const pendM=S.matches.filter(m=>m.status==="pending"&&!m.annulled&&(m.player1===myId||m.player2===myId)&&m.submittedBy!==myId);
const dispM=isA?S.matches.filter(m=>m.status==="disputed"&&!m.annulled):[];
const pendCh=S.challenges.filter(c=>c.status==="pending"&&c.targetId===myId);
const rc=[W.gold,W.silver,W.bronze];

const mCat=m=>{if(m.tournamentId)return{label:"Torneo",color:W.lightGreen};if(m.isChallenge)return{label:"Reto",color:W.warn};if(!m.countsForStandings)return{label:"Amistoso",color:W.cream3};return{label:"Liga Regular",color:W.blue};};
const matchCard=m=>{const cat=mCat(m);return(<div key={m.id} style={{...scd,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,opacity:m.annulled?.3:m.status==="pending"?.6:1,cursor:"pointer"}} onClick={()=>setModal({type:"detail",match:m})}><div><span style={{fontWeight:m.winner===m.player1?700:400,color:m.winner===m.player1?W.gold:W.cream}}>{pSh(m.player1)}</span><span style={{color:W.cream3,margin:"0 8px"}}>vs</span><span style={{fontWeight:m.winner===m.player2?700:400,color:m.winner===m.player2?W.gold:W.cream}}>{pSh(m.player2)}</span>{m.score&&<span style={{color:W.cream2,marginLeft:8,fontSize:13}}>{m.score}</span>}</div><div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}><SfB s={m.surface}/><span style={bdg(cat.color)}>{cat.label}</span>{m.annulled&&<span style={bdg(W.danger)}>ANULADO</span>}{m.status==="pending"&&<span style={bdg(W.warn)}>Pendiente</span>}{m.status==="disputed"&&<span style={bdg(W.danger)}>Disputado</span>}{(m.comments||[]).length>0&&<span style={{fontSize:11,color:W.cream3}}>{"💬"+String(m.comments.length)}</span>}<span style={{fontSize:12,color:W.cream3}}>{fmtD(m.date)}</span></div></div>);};

const forumHasNew=hasUnreadForumActivity(S,forumLastSeen);
const tabs=[["standings","Clasif."],["matches","Partidos"+(pendM.length+dispM.length>0?" ("+String(pendM.length+dispM.length)+")":"")],["simulator","Simulador"],["tournaments","Torneos"],["challenges","Retos"+(pendCh.length>0?" ("+String(pendCh.length)+")":"")],["h2h","H2H"],["forum","Foro"],["rules","Reglas"],...(isA?[["admin","Admin"+(S.pending.length>0?" ("+String(S.pending.length)+")":"")]]:[])]
const cfg=S.config;
const equityBonusPts=Math.floor(cfg.eloBase*(1+cfg.equityBonusPct/100));
const equityThresholdPts=cfg.equityMatchesGap*cfg.eloBase;
const inactExampleBase=600;
const inactExamplePenalty=Math.floor(inactExampleBase*(cfg.inactPct/100));
const sysR=[
  {label:"Puntos por victoria (partido regular)",key:"eloBase",suf:" pts",
   desc:"Cantidad de puntos que obtiene el ganador de un partido regular. No aplica a torneos, que cuentan con su propio sistema de puntuación. Esta cifra base puede verse afectada por el sistema de equidad descrito en la siguiente regla."},
  {label:"Sistema de equidad — % de bonificación",key:"equityBonusPct",suf:" %",
   desc:"Bonificación porcentual que se aplica sobre los puntos base para el jugador peor clasificado en el momento del partido, cuando consigue la victoria. Aplica exclusivamente si ambos jugadores ya se han enfrentado anteriormente y si la diferencia de puntos entre ambos supera el umbral definido en la siguiente regla. Con la configuración actual, el ganador recibiría "+String(equityBonusPts)+" puntos (en lugar de "+String(cfg.eloBase)+"). Los resultados con decimales se redondean siempre hacia abajo."},
  {label:"Sistema de equidad — umbral en partidos",key:"equityMatchesGap",suf:" partidos",
   desc:"Número de partidos regulares cuya suma equivalente de puntos marca el umbral mínimo de diferencia entre dos jugadores para activar la bonificación por equidad. Con la configuración actual, la diferencia de puntos debe ser igual o superior a "+String(equityThresholdPts)+" puntos (es decir, "+String(cfg.equityMatchesGap)+" × "+String(cfg.eloBase)+") para que el peor clasificado reciba la bonificación si gana."},
  {label:"Límite de enfrentamientos",key:"maxSameOpp",suf:" partidos",
   desc:"No existe un límite estricto de enfrentamientos, pero sólo los primeros "+String(cfg.maxSameOpp)+" partidos regulares entre dos jugadores dentro del plazo temporal definido en la regla siguiente computarán para la clasificación. Antes de registrar un partido regular, el sistema revisa los últimos "+String(cfg.sameOppDays)+" días: si ya existen "+String(cfg.maxSameOpp)+" o más partidos regulares entre esos dos jugadores, el nuevo partido se registra como Amistoso y no suma puntos (se indicará claramente en la pestaña de Partidos). Los partidos de torneo no cuentan para este límite."},
  {label:"Plazo temporal de límite de enfrentamiento",key:"sameOppDays",suf:" días",
   desc:"Periodo considerado para la regla de límite de enfrentamientos, expresado en días naturales. Siempre incluye el día actual. Con la configuración actual, se consideran los últimos "+String(cfg.sameOppDays)+" días."},
  {label:"Penalización por inactividad",key:"inactPct",suf:" %",
   desc:"Porcentaje de puntos que se deduce a un jugador por cada periodo completo de inactividad (definido en la regla siguiente). Ejemplo: un jugador con "+String(inactExampleBase)+" puntos acumulados que permanece inactivo durante "+String(cfg.inactDays)+" días perderá "+String(inactExamplePenalty)+" puntos ("+String(cfg.inactPct)+"% de "+String(inactExampleBase)+") al llegar al día "+String(cfg.inactDays+1)+". A partir de ese mismo día comenzaría a contar el siguiente periodo de inactividad. Los decimales se redondean siempre hacia abajo. Los jugadores suspendidos no se ven afectados por esta penalización mientras dure su suspensión."},
  {label:"Periodo de inactividad",key:"inactDays",suf:" días",
   desc:"Establece cada cuántos días se aplica la penalización por inactividad. La penalización solo se aplica cuando se completa el periodo entero, por lo que un jugador puede evitarla jugando un partido dentro de los "+String(cfg.inactDays)+" días."},
  {label:"Límite temporal de retos",key:"chCoolDays",suf:" días",
   desc:"Periodo mínimo entre retos dirigidos al mismo rival, en días naturales. Ejemplo: si un jugador lanza un reto hoy, no podrá volver a retar al mismo oponente hasta el día "+String(cfg.chCoolDays+1)+" del ciclo."},
  {label:"Antigüedad máxima al registrar partido",key:"maxPastDays",suf:" días",
   desc:"Al registrar un partido con resultado, la fecha de juego no puede tener más de "+String(cfg.maxPastDays||15)+" días de antigüedad para un jugador normal. Si alguien se acuerda de un partido más antiguo, debe pedir al administrador que lo registre manualmente (el admin no tiene este límite). Los puntos se reasignan cronológicamente automáticamente cuando se inserta un partido antiguo, respetando la línea temporal correcta."}
];

return(
<div style={{fontFamily:"'Georgia','Times New Roman',serif",background:"linear-gradient(180deg,"+W.bg2+" 0%,"+W.bg+" 100%)",color:W.cream,minHeight:"100vh",maxWidth:960,margin:"0 auto",padding:"0 16px 40px"}}>
{msg&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,"+W.gold+",#b8941f)",color:"#1a0a0a",padding:"10px 24px",borderRadius:8,fontWeight:700,fontSize:14,zIndex:2000,letterSpacing:1,boxShadow:"0 4px 16px rgba(212,175,55,.4)"}}>{msg}</div>}
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 0 16px",borderBottom:"1px solid "+W.gold+"33",marginBottom:20,flexWrap:"wrap",gap:12}}>
<div style={{display:"flex",alignItems:"center",gap:12}}><LogoSVG size={56}/><div><div style={{fontSize:10,color:W.cream3,letterSpacing:4,textTransform:"uppercase"}}>The Championships</div><span style={{fontSize:22,fontWeight:700,color:W.gold}}>ATP Atentado</span></div></div>
<div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:13,color:W.cream2}}>{isA?"Admin":pSh(myId)}{amISuspended&&<span style={{color:W.danger,marginLeft:6,fontWeight:700}}>(Suspendido)</span>}</span><button style={{...sbt("ghost"),padding:"6px 12px",fontSize:12}} onClick={()=>setAuth(null)}>Salir</button></div>
</div>
{amISuspended&&!isA&&(<div style={{background:W.danger+"22",border:"1px solid "+W.danger,borderRadius:8,padding:"12px 16px",marginBottom:16,color:W.cream,fontSize:13,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>⚠️</span><div><strong style={{color:W.danger}}>Jugador suspendido.</strong> No puedes registrar partidos ni ser retado mientras dure la suspensión. Tus puntos permanecen congelados y no se aplica penalización por inactividad.</div></div>)}
{!isA&&!amISuspended&&(()=>{const du=daysUntilInactivityPenalty(S,myId);if(du===null||du>7)return null;const inactPct=S.config.inactPct;if(du>0)return(<div style={{background:W.warn+"22",border:"1px solid "+W.warn,borderRadius:8,padding:"12px 16px",marginBottom:16,color:W.cream,fontSize:13,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><span style={{fontSize:20}}>⏰</span><div style={{flex:1,minWidth:200}}><strong style={{color:W.warn}}>Penalización por inactividad próxima.</strong> Te {du===1?"queda 1 día":"quedan "+String(du)+" días"} para perder el {String(inactPct)}% de tus puntos. Juega un partido para resetear el contador.</div><button style={{...sbt("ghost"),padding:"6px 12px",fontSize:12}} onClick={()=>{setView("standings");setModal({type:"profile",player:myPlayer});}}>Ver rivales disponibles</button></div>);return(<div style={{background:W.danger+"22",border:"1px solid "+W.danger,borderRadius:8,padding:"12px 16px",marginBottom:16,color:W.cream,fontSize:13,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><span style={{fontSize:20}}>⚠️</span><div style={{flex:1,minWidth:200}}><strong style={{color:W.danger}}>Inactividad en curso.</strong> Ya has pasado el periodo de inactividad. Al siguiente cálculo perderás el {String(inactPct)}% de tus puntos. Juega cuanto antes.</div><button style={{...sbt("ghost"),padding:"6px 12px",fontSize:12}} onClick={()=>{setView("standings");setModal({type:"profile",player:myPlayer});}}>Ver rivales disponibles</button></div>);})()}
<nav style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:20}}>{tabs.map(([id,l])=>(<button key={id} style={{...snv(view===id),position:"relative"}} onClick={()=>setView(id)}>{l}{id==="forum"&&forumHasNew&&view!=="forum"&&<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:W.danger,marginLeft:6,verticalAlign:"middle",boxShadow:"0 0 6px "+W.danger}}/>}</button>))}</nav>

  {view==="standings"&&(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}><h2 style={{fontSize:18,fontWeight:700,margin:0,color:W.gold,fontFamily:"'Georgia',serif"}}>Clasificacion</h2><div style={{display:"flex",gap:3,flexWrap:"wrap",alignItems:"center"}}>{[["all","Todo"],["3m","3M"],["6m","6M"],["12m","1A"]].map(([k,l])=>(<button key={k} style={snv(tf===k)} onClick={()=>setTf(k)}>{l}</button>))}<span style={{width:1,height:20,background:W.gold+"33",margin:"0 3px"}}/>{[["all","Todas"],...SURFS.map(s=>[s,s])].map(([k,l])=>(<button key={k} style={snv(surfF===k)} onClick={()=>setSurfF(k)}>{l}</button>))}</div></div>
  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}><span style={{fontSize:12,color:W.cream3}}>Fecha exacta:</span><input type="date" style={{...si,width:160,padding:"6px 10px",fontSize:12}} value={dateF} onChange={e=>setDateF(e.target.value)}/>{dateF&&<button style={{...sbt("ghost"),padding:"4px 10px",fontSize:11}} onClick={()=>setDateF("")}>Limpiar</button>}{dateF&&<span style={{fontSize:11,color:W.warn}}>Clasificacion al {fmtD(frI(dateF))}</span>}</div>
  <div style={{...scd,padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{["#","Jugador","V","D","%","Forma","Pts"].map((h,i)=>(<th key={h} style={{textAlign:i>1?(i===6?"right":"center"):"left",padding:"10px 8px",borderBottom:"2px solid "+W.gold+"33",color:W.cream3,fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>{h}</th>))}</tr></thead><tbody>{standings.map((p,i)=>{const suspended=p.suspended;return(<tr key={p.id} style={{background:suspended?W.danger+"11":(i%2===0?"transparent":W.darkGreen+"40"),cursor:"pointer",transition:"background .15s",opacity:suspended?0.65:1}} onClick={()=>setModal({type:"profile",player:p})}><td style={{padding:"10px 8px"}}><span style={{fontWeight:700,color:suspended?W.danger:(i<3?rc[i]:W.cream3)}}>{String(i+1)}</span></td><td style={{padding:"10px 8px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><Av player={p} size={30}/><div><div style={{fontWeight:600,fontSize:13,color:suspended?W.cream3:W.cream,display:"flex",alignItems:"center",gap:6}}>{p.firstName+" "+p.lastName}{suspended&&<SuspB/>}</div><div style={{fontSize:10,color:W.cream3,fontStyle:"italic"}}>{'"'+p.nickname+'"'}</div></div></div></td><td style={{padding:"10px 8px",textAlign:"center",color:W.lightGreen,fontWeight:600}}>{String(p.wins)}</td><td style={{padding:"10px 8px",textAlign:"center",color:W.danger,fontWeight:600}}>{String(p.losses)}</td><td style={{padding:"10px 8px",textAlign:"center",color:W.cream2}}>{p.winRate+"%"}</td><td style={{padding:"10px 6px",textAlign:"center"}}><FormDots playerId={p.id} matches={S.matches}/></td><td style={{padding:"10px 8px",textAlign:"right",fontWeight:700,fontSize:16,color:suspended?W.cream3:W.gold}}>{String(p.points)}{suspended&&<span style={{fontSize:9,color:W.danger,marginLeft:4}}>❄</span>}</td></tr>);})}</tbody></table></div></div>)}

  {view==="matches"&&(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}><h2 style={{fontSize:18,fontWeight:700,margin:0,color:W.gold}}>Partidos</h2><div style={{display:"flex",gap:6}}><button style={{...sbt("ghost"),padding:"8px 14px",fontSize:13,opacity:amISuspended&&!isA?0.4:1}} disabled={amISuspended&&!isA} onClick={()=>{if(amISuspended&&!isA){flash("Estás suspendido");return;}setModal("schedule");}}>+ Programar</button><button style={{...sbt("primary"),opacity:amISuspended&&!isA?0.4:1}} disabled={amISuspended&&!isA} onClick={()=>{if(amISuspended&&!isA){flash("Estás suspendido");return;}setModal("match");}}>+ Resultado</button></div></div>
  <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}><span style={{fontSize:11,color:W.cream3,marginRight:4}}>Estado:</span>{[["all","Todos"],["played","Jugados"],["scheduled","Próximamente"]].map(([k,l])=>(<button key={k} style={snv(mStatusF===k)} onClick={()=>setMStatusF(k)}>{l}</button>))}</div>
  {mStatusF!=="scheduled"&&(<div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}><span style={{fontSize:11,color:W.cream3,marginRight:4}}>Tipo:</span>{[["all","Todos"],["regular","Regular"],["torneo","Torneo"],["amistoso","Amistoso"],["reto","Reto"]].map(([k,l])=>(<button key={k} style={snv(mTypeF===k)} onClick={()=>setMTypeF(k)}>{l}</button>))}<span style={{width:1,height:20,background:W.gold+"33",margin:"0 4px"}}/><span style={{fontSize:11,color:W.cream3,marginRight:4}}>Superficie:</span>{[["all","Todas"],...SURFS.map(s=>[s,s])].map(([k,l])=>(<button key={k} style={snv(mSurfF===k)} onClick={()=>setMSurfF(k)}>{l}</button>))}</div>)}
  {mStatusF!=="played"&&(()=>{const sched=S.matches.filter(m=>!m.annulled&&m.status==="scheduled"&&!m.winner&&!m.tournamentId).sort((a,b)=>a.date-b.date);if(sched.length===0)return mStatusF==="scheduled"?<div style={{...scd,color:W.cream3,fontSize:13,fontStyle:"italic",textAlign:"center"}}>No hay partidos programados.</div>:null;return(<div style={{marginBottom:16}}><h3 style={{fontSize:14,fontWeight:600,color:W.blue,marginBottom:8}}>Próximamente</h3>{sched.map(m=>{const expired=isScheduledExpired(m);const canManage=isA||m.player1===myId||m.player2===myId;return(<div key={m.id} style={{...scd,padding:14,borderColor:expired?W.warn+"55":W.blue+"33",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}><div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:200}}><Av player={pO(m.player1)} size={28}/><span style={{fontWeight:600,color:W.cream}}>{pSh(m.player1)}</span><span style={{color:W.cream3,fontSize:12}}>vs</span><Av player={pO(m.player2)} size={28}/><span style={{fontWeight:600,color:W.cream}}>{pSh(m.player2)}</span></div><div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}><SfB s={m.surface}/><span style={{fontSize:12,color:expired?W.warn:W.cream3,fontWeight:expired?600:400}}>{fmtD(m.date)}</span>{expired&&<span style={bdg(W.warn)}>Caducado</span>}{canManage&&<button style={{...sbt("primary"),padding:"6px 12px",fontSize:12}} onClick={()=>setModal({type:"resolveScheduled",scheduled:m})}>Registrar resultado</button>}{canManage&&<button style={{...sbt("ghost"),padding:"6px 10px",fontSize:11,color:W.danger}} onClick={()=>setModal({type:"confirmDeleteScheduled",matchId:m.id})}>Borrar</button>}</div></div>);})}</div>);})()}
  {mStatusF!=="scheduled"&&(<>
  {pendM.length>0&&<div style={{marginBottom:16}}><h3 style={{fontSize:14,fontWeight:600,color:W.warn,marginBottom:8}}>Pendientes de confirmacion</h3>{pendM.map(m=>matchCard(m))}</div>}
  {dispM.length>0&&<div style={{marginBottom:16}}><h3 style={{fontSize:14,fontWeight:600,color:W.danger,marginBottom:8}}>Disputados</h3>{dispM.map(m=>matchCard(m))}</div>}
  {(()=>{const filtered=[...S.matches].filter(m=>(m.status==="confirmed"||m.status==="pending"||m.status==="disputed")&&(m.winner||m.score)).sort((a,b)=>b.date-a.date).filter(m=>{if(mSurfF!=="all"&&m.surface!==mSurfF)return false;if(mTypeF==="all")return true;const cat=mCat(m);if(mTypeF==="regular")return cat.label==="Liga Regular";if(mTypeF==="torneo")return cat.label==="Torneo";if(mTypeF==="amistoso")return cat.label==="Amistoso";if(mTypeF==="reto")return cat.label==="Reto";return true;});return filtered.length>0?filtered.map(m=>matchCard(m)):<div style={{...scd,color:W.cream3,fontSize:13,fontStyle:"italic",textAlign:"center"}}>No hay partidos con estos filtros.</div>;})()}
  </>)}
  </div>)}

  {view==="simulator"&&(<SimulatorView/>)}

  {view==="tournaments"&&(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:18,fontWeight:700,margin:0,color:W.gold}}>Torneos</h2>{isA&&<button style={sbt("primary")} onClick={()=>setModal("tournament")}>+ Crear</button>}</div>{S.tournaments.map(t=>{const isExp=expT===t.id;const bk=t.bracket||{};const ls=t.leagueStandings;const livePts=computeTournamentPts(t);return(<div key={t.id} style={{...scd,borderColor:t.status==="active"?W.gold+"55":W.gold+"22"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setExpT(isExp?null:t.id)}><div><h3 style={{fontSize:16,fontWeight:700,margin:0,color:W.gold}}>{t.name}</h3><span style={{fontSize:12,color:W.cream3,fontStyle:"italic"}}>{(t.format==="elimination"?"Eliminacion":"Liguilla")+" • "+String(t.players.length)+" jug."}</span></div><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={bdg(t.status==="active"?W.lightGreen:W.cream3)}>{t.status==="active"?"En juego":"Fin"}</span><span style={{color:W.cream3,fontSize:18}}>{isExp?"▲":"▼"}</span></div></div>{isExp&&(<div style={{marginTop:16}}>
    {ls&&ls.length>0&&(<div style={{marginBottom:16}}><h4 style={{fontSize:14,fontWeight:600,marginBottom:8,color:W.cream3,fontStyle:"italic"}}>Fase de Grupos</h4><div style={{background:W.darkGreen,borderRadius:8,padding:12,border:"1px solid "+W.gold+"22"}}><div style={{display:"flex",padding:"4px 0",borderBottom:"1px solid "+W.gold+"22",fontSize:11,color:W.cream3,fontWeight:600}}><span style={{flex:2}}>Jugador</span><span style={{width:28,textAlign:"center"}}>V</span><span style={{width:28,textAlign:"center"}}>D</span><span style={{width:34,textAlign:"center"}}>S</span><span style={{width:34,textAlign:"center"}}>G</span></div>{[...ls].sort((a,b)=>a.pos-b.pos).map((x,i)=>{const cutoff=(t.playoffStart==="sf"?4:t.playoffStart==="r16"?16:8);return(<div key={x.playerId} style={{display:"flex",padding:"5px 0",borderBottom:"1px solid "+W.gold+"11",fontSize:13}}><span style={{flex:2,fontWeight:600,color:i<cutoff?W.cream:W.cream3}}><span style={{color:i<cutoff?W.gold:W.cream3,marginRight:4}}>{String(i+1)+"."}</span>{pSh(x.playerId)}{i===cutoff-1&&t.leagueFinished&&<span style={{fontSize:9,color:W.warn,marginLeft:4}}>corte</span>}</span><span style={{width:28,textAlign:"center",color:W.lightGreen}}>{String(x.w)}</span><span style={{width:28,textAlign:"center",color:W.danger}}>{String(x.l)}</span><span style={{width:34,textAlign:"center",color:(x.sd||0)>0?W.lightGreen:(x.sd||0)<0?W.danger:W.cream3}}>{(x.sd||0)>0?"+"+String(x.sd):String(x.sd||0)}</span><span style={{width:34,textAlign:"center",color:(x.gd||0)>0?W.lightGreen:(x.gd||0)<0?W.danger:W.cream3}}>{(x.gd||0)>0?"+"+String(x.gd):String(x.gd||0)}</span></div>);})}</div></div>)}
    {Object.keys(bk).some(r=>bk[r]&&bk[r].length>0)&&(<div><h4 style={{fontSize:14,fontWeight:600,marginBottom:8,color:W.cream3,fontStyle:"italic"}}>Cuadro</h4><div style={{overflowX:"auto"}}><div style={{display:"flex",gap:12,minWidth:500,alignItems:"flex-start"}}>{["r16","qf","sf","final"].filter(r=>bk[r]&&bk[r].length>0).map(r=>(<div key={r} style={{flex:1,minWidth:120}}><div style={{fontSize:10,fontWeight:700,color:W.gold,marginBottom:8,textTransform:"uppercase",textAlign:"center",letterSpacing:2}}>{r==="r16"?"Octavos":r==="qf"?"Cuartos":r==="sf"?"Semis":"Final"}</div><div style={{display:"flex",flexDirection:"column",justifyContent:r==="final"?"center":"space-around",minHeight:r==="r16"?480:r==="qf"?300:r==="sf"?240:80}}>{(bk[r]||[]).map((m2,i)=>{const hasPlayers=m2.p1&&m2.p2;const canTap=t.status==="active"&&(hasPlayers?(!m2.winner||isA):isA);const isMyM=m2.p1===myId||m2.p2===myId;const tappable=canTap&&(isA||isMyM);return(<div key={String(i)} onClick={e=>{e.stopPropagation();if(tappable)setModal({type:"bracketMatch",tournament:t,round:r,matchIdx:i,bracketMatch:m2});}} style={{background:W.darkGreen,borderRadius:8,padding:8,marginBottom:6,border:"1px solid "+(m2.status==="pending"?W.warn:!m2.winner&&m2.p1?W.gold+"44":W.gold+"22"),cursor:tappable?"pointer":"default"}}><div style={{padding:"2px 0",fontWeight:m2.winner===m2.p1?700:400,color:m2.winner===m2.p1?W.gold:m2.p1?W.cream:W.cream3,fontSize:12}}>{m2.p1?pSh(m2.p1):"TBD"}</div><div style={{padding:"2px 0",fontWeight:m2.winner===m2.p2?700:400,color:m2.winner===m2.p2?W.gold:m2.p2?W.cream:W.cream3,fontSize:12}}>{m2.p2?pSh(m2.p2):"TBD"}</div>{m2.score&&<div style={{fontSize:10,color:W.cream3,marginTop:2}}>{m2.score}</div>}{tappable&&!m2.winner&&<div style={{fontSize:9,color:W.gold,marginTop:2}}>{hasPlayers?"jugar":"asignar"}</div>}</div>);})}</div></div>))}<div style={{minWidth:90,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center"}}><div style={{fontSize:10,fontWeight:700,color:W.gold,marginBottom:8,letterSpacing:2}}>CAMPEON</div>{bk.final&&bk.final[0]&&bk.final[0].winner&&bk.final[0].status==="confirmed"?(<div style={{background:W.gold+"18",border:"2px solid "+W.gold,borderRadius:12,padding:"14px 16px",textAlign:"center"}}><div style={{fontSize:28}}>🏆</div><div style={{fontWeight:700,fontSize:14,color:W.gold}}>{pSh(bk.final[0].winner)}</div></div>):(<div style={{color:W.cream3,fontSize:12,fontStyle:"italic"}}>TBD</div>)}</div></div></div></div>)}
    {livePts.filter(r=>r.points>0).length>0&&(<div style={{marginTop:12}}><h4 style={{fontSize:14,fontWeight:600,marginBottom:8,color:W.gold}}>{"Puntos"+((t.status==="active")?" (LIVE)":"")}</h4>{livePts.filter(r=>r.points>0).sort((a,b)=>b.points-a.points).map((r,i)=>(<div key={r.playerId} style={{fontSize:13,display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>{(i<3?["🥇","🥈","🥉"][i]:String(i+1)+".")+" "+pSh(r.playerId)}<span style={{color:W.cream3,fontSize:11,marginLeft:6}}>{r.position}</span></span><span style={{fontWeight:600,color:W.gold}}>{"+"+String(r.points)}</span></div>))}</div>)}
    {t.status==="active"&&(<div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>{t.format==="league"&&!t.leagueFinished&&<button style={sbt("ghost")} onClick={e=>{e.stopPropagation();setModal({type:"tMatch",tournament:t});}}>+ Partido liguilla</button>}{isA&&t.format==="league"&&!t.leagueFinished&&(<button style={sbt("primary")} onClick={e=>{e.stopPropagation();const ls2=t.leagueStandings;const pSt=t.playoffStart||"qf";const slots=pSt==="r16"?16:pSt==="qf"?8:pSt==="sf"?4:2;if(!ls2||ls2.length<slots){flash("Necesitas "+String(slots)+" jugadores");return;}const topN=ls2.slice(0,slots);let pairs=[];if(slots===4)pairs=[[0,3],[1,2]];else if(slots===8)pairs=[[0,7],[2,5],[1,6],[3,4]];else if(slots===16)pairs=[[0,15],[7,8],[2,13],[5,10],[1,14],[6,9],[3,12],[4,11]];const bkM=pairs.map(([a,b])=>({p1:topN[a].playerId,p2:topN[b].playerId,winner:null,score:"",status:"pending_play"}));const newBk={r16:[],qf:[],sf:[],final:[]};newBk[pSt]=bkM;up(s=>({...s,tournaments:s.tournaments.map(x=>x.id===t.id?{...x,leagueFinished:true,bracket:newBk}:x)}));flash("Cuadro!");}}>Cerrar liguilla</button>)}{isA&&<button style={sbt("primary")} onClick={e=>{e.stopPropagation();setModal({type:"tResults",tournament:t});}}>Finalizar</button>}{isA&&<button style={{...sbt("danger"),padding:"10px 14px"}} onClick={e=>{e.stopPropagation();setModal({type:"confirmDelete",tournamentId:t.id,tournamentName:t.name});}}>Eliminar</button>}</div>)}
    {isA&&t.status!=="active"&&(<div style={{marginTop:12}}><button style={{...sbt("danger"),padding:"10px 14px"}} onClick={e=>{e.stopPropagation();setModal({type:"confirmDelete",tournamentId:t.id,tournamentName:t.name});}}>Eliminar</button></div>)}
  </div>)}</div>);})}</div>)}

  {view==="challenges"&&(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:18,fontWeight:700,margin:0,color:W.gold}}>Retos</h2><button style={{...sbt("primary"),opacity:amISuspended&&!isA?0.4:1}} disabled={amISuspended&&!isA} onClick={()=>{if(amISuspended&&!isA){flash("Estás suspendido");return;}setModal("challenge");}}>Lanzar</button></div><div style={{...scd,padding:14,background:W.darkGreen}}><p style={{fontSize:13,color:W.cream3,margin:0,fontStyle:"italic"}}>{"El rival debe aceptar. Puntos dinamicos. Cooldown: "+String(S.config.chCoolDays)+" dias."}</p></div>{pendCh.length>0&&!isA&&(<div style={{marginTop:12}}><h3 style={{fontSize:14,fontWeight:600,color:W.warn,marginBottom:8}}>Te han retado!</h3>{pendCh.map(c=>(<div key={c.id} style={{...scd,border:"1px solid "+W.warn}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}><div style={{display:"flex",alignItems:"center",gap:8}}><Av player={pO(c.challengerId)} size={32}/><span style={{fontWeight:600,color:W.cream}}>{pSh(c.challengerId)+" te reta!"}</span></div><div style={{display:"flex",gap:8}}><button style={sbt("primary")} onClick={()=>up(s=>({...s,challenges:s.challenges.map(x=>x.id===c.id?{...x,status:"accepted"}:x)}))}>Aceptar</button><button style={sbt("danger")} onClick={()=>up(s=>({...s,challenges:s.challenges.map(x=>x.id===c.id?{...x,status:"rejected"}:x)}))}>No</button></div></div></div>))}</div>)}{[...S.challenges].reverse().map(c=>{let rm=c.matchId?S.matches.find(m=>m.id===c.matchId):null;if(!rm&&c.status==="resolved"){rm=S.matches.filter(m=>!m.annulled&&m.isChallenge&&((m.player1===c.challengerId&&m.player2===c.targetId)||(m.player1===c.targetId&&m.player2===c.challengerId))).sort((a,b)=>b.date-a.date)[0]||null;}const winner=rm?rm.winner:null;return(<div key={c.id} style={{...scd,padding:14}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
    <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:200}}>
      <Av player={pO(c.challengerId)} size={28}/>
      <span style={{fontWeight:600,color:winner===c.challengerId?W.gold:W.cream}}>{pSh(c.challengerId)}</span>
      <span style={{color:W.cream3,fontSize:12}}>vs</span>
      <Av player={pO(c.targetId)} size={28}/>
      <span style={{fontWeight:600,color:winner===c.targetId?W.gold:W.cream}}>{pSh(c.targetId)}</span>
    </div>
    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
      <span style={bdg(c.status==="pending"?W.warn:c.status==="accepted"?W.blue:c.status==="rejected"?W.danger:W.lightGreen)}>{c.status==="pending"?"Pendiente":c.status==="accepted"?"Aceptado":c.status==="rejected"?"Rechazado":"Jugado"}</span>
      {isA&&c.status==="pending"&&<button style={{...sbt("ghost"),padding:"6px 10px",fontSize:12}} onClick={()=>up(s=>({...s,challenges:s.challenges.map(x=>x.id===c.id?{...x,status:"accepted"}:x)}))}>Forzar</button>}
      {c.status==="accepted"&&(isA||c.challengerId===myId||c.targetId===myId)&&<button style={{...sbt("ghost"),padding:"6px 10px",fontSize:12}} onClick={()=>setModal({type:"resCh",challenge:c})}>Resultado</button>}
    </div>
  </div>
  {rm&&c.status==="resolved"&&(<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid "+W.gold+"22",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
    <div style={{fontSize:13}}><span style={{color:W.gold,fontWeight:700}}>{"Ganador: "+pSh(winner)}</span>{rm.score&&<span style={{color:W.cream2,marginLeft:10}}>{rm.score}</span>}</div>
    <div style={{display:"flex",gap:6,alignItems:"center"}}><SfB s={rm.surface}/><span style={{fontSize:11,color:W.cream3}}>{fmtD(rm.date)}</span></div>
  </div>)}
  {!rm&&c.status!=="resolved"&&<div style={{fontSize:11,color:W.cream3,marginTop:4}}>{fmtD(c.date)}</div>}
</div>);})}</div>)}

  {view==="h2h"&&(<div><h2 style={{fontSize:18,fontWeight:700,marginBottom:16,color:W.gold}}>Head to Head</h2><div style={scd}><div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:90}}><Av player={pO(h1)} size={32}/><select style={{...ss,flex:1}} value={h1} onChange={e=>setH1(e.target.value)}><option value="">...</option>{appr.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select></div><span style={{color:W.gold,fontWeight:700}}>vs</span><div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:90}}><select style={{...ss,flex:1}} value={h2} onChange={e=>setH2(e.target.value)}><option value="">...</option>{appr.filter(p=>p.id!==h1).map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select><Av player={pO(h2)} size={32}/></div></div>{h2hData&&(<div><div style={{display:"flex",justifyContent:"center",gap:28,padding:"16px 0"}}><div style={{textAlign:"center"}}><Av player={pO(h1)} size={44}/><div style={{fontSize:32,fontWeight:700,color:h2hData.w1>h2hData.w2?W.gold:W.cream,marginTop:4}}>{String(h2hData.w1)}</div><div style={{fontSize:13,color:W.cream3}}>{pSh(h1)}</div></div><div style={{fontSize:18,color:W.cream3,alignSelf:"center"}}>—</div><div style={{textAlign:"center"}}><Av player={pO(h2)} size={44}/><div style={{fontSize:32,fontWeight:700,color:h2hData.w2>h2hData.w1?W.gold:W.cream,marginTop:4}}>{String(h2hData.w2)}</div><div style={{fontSize:13,color:W.cream3}}>{pSh(h2)}</div></div></div><div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:12}}>{SURFS.map(sf=>{const d=h2hData.bS[sf];return(<div key={sf} style={{background:W.darkGreen,borderRadius:8,padding:6,textAlign:"center",border:"1px solid "+W.gold+"22",minWidth:70}}><SfB s={sf}/><div style={{marginTop:3,fontSize:12}}><span style={{color:W.gold}}>{String(d.w1)}</span>{"-"}<span style={{color:W.gold}}>{String(d.w2)}</span></div></div>);})}</div>{[...h2hData.matches].sort((a,b)=>b.date-a.date).map(m=>(<div key={m.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid "+W.gold+"11",fontSize:13,cursor:"pointer"}} onClick={()=>setModal({type:"detail",match:m})}><div><strong style={{color:m.winner===m.player1?W.gold:W.cream}}>{pSh(m.player1)}</strong><span style={{color:W.cream3}}>{" vs "}</span><strong style={{color:m.winner===m.player2?W.gold:W.cream}}>{pSh(m.player2)}</strong>{m.score&&<span style={{color:W.cream2,marginLeft:8,fontSize:12}}>{m.score}</span>}</div><span style={{display:"flex",gap:4,alignItems:"center"}}><SfB s={m.surface}/><span style={{color:W.cream3,fontSize:11}}>{fmtD(m.date)}</span></span></div>))}</div>)}</div></div>)}

  {view==="forum"&&(<ForumView/>)}

  {view==="rules"&&(<div><h2 style={{fontSize:18,fontWeight:700,marginBottom:16,color:W.gold}}>Reglas</h2><h3 style={{fontSize:14,fontWeight:600,marginBottom:10,color:W.gold,fontStyle:"italic"}}>Reglas del sistema</h3><div style={scd}>{sysR.map((r,i)=>(<div key={r.key} style={{padding:"14px 0",borderBottom:i<sysR.length-1?"1px solid "+W.gold+"11":"none"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexWrap:"wrap",gap:8}}><span style={{fontSize:14,fontWeight:600,color:W.cream}}>{r.label}</span><div style={{display:"flex",alignItems:"center",gap:4}}>{isA?(<input style={{...si,width:70,textAlign:"center",padding:"6px",fontSize:14,fontWeight:700}} type="number" value={S.config[r.key]} onChange={e=>up(s=>({...s,config:{...s.config,[r.key]:+e.target.value}}))}/>):(<span style={{fontWeight:700,fontSize:16,color:W.gold}}>{String(S.config[r.key])}</span>)}<span style={{fontSize:12,color:W.cream3}}>{r.suf}</span></div></div><div style={{fontSize:13,color:W.cream3,lineHeight:1.6}}>{r.desc}</div></div>))}</div><h3 style={{fontSize:14,fontWeight:600,marginBottom:10,marginTop:20,color:W.warn,fontStyle:"italic"}}>Reglas adicionales</h3><div style={scd}>{S.rules.length===0&&<div style={{color:W.cream3,fontSize:13,fontStyle:"italic"}}>Sin reglas adicionales.</div>}{S.rules.map((r,i)=>(<div key={String(i)} style={{padding:"10px 0",borderBottom:i<S.rules.length-1?"1px solid "+W.gold+"11":"none",fontSize:14,display:"flex",gap:10,alignItems:"flex-start"}}><span style={{color:W.warn,fontWeight:700,minWidth:20}}>{String(i+1)+"."}</span>{isA?(<div style={{flex:1,display:"flex",gap:8,alignItems:"center"}}><input style={{...si,flex:1,padding:"6px 10px"}} value={r} onChange={e=>{const v=e.target.value;up(s=>({...s,rules:s.rules.map((x,j)=>j===i?v:x)}));}}/><button style={{...sbt("danger"),padding:"6px 10px",fontSize:12}} onClick={()=>up(s=>({...s,rules:s.rules.filter((_,j)=>j!==i)}))}>✕</button></div>):(<span style={{flex:1,color:W.cream2,lineHeight:1.6}}>{r}</span>)}</div>))}{isA&&<button style={{...sbt("ghost"),width:"100%",marginTop:10}} onClick={()=>up(s=>({...s,rules:[...s.rules,"Nueva regla..."]}))}>+ Regla</button>}</div></div>)}

  {view==="admin"&&isA&&(<div><h2 style={{fontSize:18,fontWeight:700,marginBottom:20,color:W.gold}}>Admin</h2><h3 style={{fontSize:15,fontWeight:600,marginBottom:12,color:W.warn}}>{"Solicitudes ("+String(S.pending.length)+")"}</h3>{S.pending.length===0&&<div style={{...scd,color:W.cream3,fontSize:13,fontStyle:"italic"}}>Nada</div>}{S.pending.map(r=>(<div key={r.id} style={{...scd,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}><div style={{display:"flex",alignItems:"center",gap:10}}><Av player={r} size={40}/><div><span style={{fontWeight:600,color:W.cream}}>{r.firstName+" "+r.lastName+' "'+r.nickname+'"'}</span><br/><span style={{fontSize:12,color:W.cream3}}>{r.email}</span></div></div><div style={{display:"flex",gap:8}}><button style={sbt("primary")} onClick={()=>up(s=>({...s,players:[...s.players,{id:r.id,firstName:r.firstName,lastName:r.lastName,nickname:r.nickname,age:r.age,hand:r.hand,backhand:r.backhand,password:r.password,email:r.email,photo:r.photo||"",approved:true,suspended:false,sanctions:[],joinedAt:now()}],pending:s.pending.filter(x=>x.id!==r.id)}))}>OK</button><button style={sbt("danger")} onClick={()=>up(s=>({...s,pending:s.pending.filter(x=>x.id!==r.id)}))}>No</button></div></div>))}

  {/* SUSPENSIONS PANEL */}
  <h3 style={{fontSize:15,fontWeight:600,marginTop:24,marginBottom:12,color:W.danger}}>Suspensiones</h3>
  <div style={{...scd,background:W.darkGreen,marginBottom:12}}>
    <p style={{fontSize:12,color:W.cream3,margin:0,fontStyle:"italic",lineHeight:1.6}}>
      Un jugador suspendido queda relegado a la última posición del ranking con sus puntos congelados. No puede registrar partidos ni ser retado mientras dure la suspensión. No le afecta la penalización por inactividad. La suspensión puede levantarse en cualquier momento.
    </p>
  </div>
  <button style={{...sbt("danger"),marginBottom:12}} onClick={()=>setModal("suspend")}>+ Suspender jugador</button>
  {appr.filter(p=>p.suspended).length>0&&(<div>
    <div style={{fontSize:13,color:W.danger,fontWeight:600,marginBottom:8}}>Jugadores suspendidos actualmente:</div>
    {appr.filter(p=>p.suspended).map(p=>(<div key={p.id} style={{...scd,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,borderColor:W.danger+"44"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <Av player={p} size={36}/>
        <div>
          <div style={{fontWeight:600,color:W.cream,display:"flex",alignItems:"center",gap:6}}>{p.nickname}<SuspB/></div>
          {p.suspensionReason&&<div style={{fontSize:12,color:W.cream3,marginTop:2}}>{"Motivo: "+p.suspensionReason}</div>}
          {p.suspendedAt&&<div style={{fontSize:11,color:W.cream3,fontStyle:"italic",marginTop:2}}>{"Desde: "+fmtD(p.suspendedAt)}</div>}
        </div>
      </div>
      <button style={sbt("primary")} onClick={()=>{up(s=>({...s,players:s.players.map(x=>x.id===p.id?{...x,suspended:false,suspendedAt:null,suspensionReason:""}:x)}));flash("Suspensión levantada");}}>Levantar</button>
    </div>))}
  </div>)}
  {appr.filter(p=>p.suspended).length===0&&<div style={{...scd,color:W.cream3,fontSize:13,fontStyle:"italic"}}>No hay jugadores suspendidos actualmente.</div>}

  <h3 style={{fontSize:15,fontWeight:600,marginTop:24,marginBottom:12,color:W.danger}}>Sanciones</h3><button style={{...sbt("danger"),marginBottom:12}} onClick={()=>setModal("sanction")}>+ Sancion</button>{S.players.filter(p=>p.sanctions&&p.sanctions.length>0).map(p=>(<div key={p.id} style={scd}><span style={{fontWeight:600,color:W.cream}}>{p.nickname}</span>{p.sanctions.map((x,i)=>(<div key={String(i)} style={{fontSize:13,color:x.type==="bonus"?W.lightGreen:W.cream3,marginTop:4}}>{(x.type==="bonus"?"+":"-")+String(x.amount)+" • "+x.reason}</div>))}</div>))}<h3 style={{fontSize:15,fontWeight:600,marginTop:24,marginBottom:12,color:W.lightGreen}}>Otorgar puntos (Bonus)</h3><button style={{...sbt("primary"),marginBottom:12}} onClick={()=>setModal("bonus")}>+ Bonus</button><h3 style={{fontSize:15,fontWeight:600,marginTop:24,marginBottom:12,color:W.cream}}>Reset password</h3><div style={scd}><select style={{...ss,marginBottom:8}} id="rpid">{appr.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select><div style={{display:"flex",gap:8}}><input style={{...si,flex:1}} placeholder="Nueva" id="rpw"/><button style={sbt("primary")} onClick={()=>{const pid=document.getElementById("rpid").value;const pw=document.getElementById("rpw").value;if(pid&&pw.trim()){up(s=>({...s,players:s.players.map(p=>p.id===pid?{...p,password:pw.trim()}:p)}));flash("OK");}}}>OK</button></div></div><h3 style={{fontSize:15,fontWeight:600,marginTop:24,marginBottom:12,color:W.cream}}>Admin pw</h3><div style={{...scd,display:"flex",gap:8}}><input style={{...si,flex:1}} type="password" placeholder="Nueva" id="apw"/><button style={sbt("primary")} onClick={()=>{const v=document.getElementById("apw").value;if(v.trim()){up(s=>({...s,adminPw:v.trim()}));flash("OK");}}}>OK</button></div><button style={{...sbt("danger"),marginTop:24}} onClick={()=>setModal({type:"confirmReset"})}>Reset</button></div>)}

  {modal==="match"&&<MatchModal/>}
  {modal==="schedule"&&(<Mdl title="Programar partido"><ScheduleForm/></Mdl>)}
  {modal&&modal.type==="resolveScheduled"&&<MatchModal scheduled={modal.scheduled}/>}
  {modal&&modal.type==="confirmDeleteScheduled"&&(<Mdl title="Borrar partido programado"><p style={{color:W.cream2,fontSize:14,marginBottom:16}}>¿Seguro que quieres borrar este partido programado? Esta acción no se puede deshacer.</p><div style={{display:"flex",gap:8}}><button style={{...sbt("danger"),flex:1}} onClick={()=>{up(s=>({...s,matches:s.matches.filter(m=>m.id!==modal.matchId)}));setModal(null);flash("Programado borrado");}}>Borrar</button><button style={{...sbt("ghost"),flex:1}} onClick={()=>setModal(null)}>Cancelar</button></div></Mdl>)}
  {modal==="challenge"&&(<Mdl title="Lanzar Reto"><ChallengeForm/></Mdl>)}
  {modal==="sanction"&&(<Mdl title="Sancion"><SanctionForm/></Mdl>)}
  {modal==="bonus"&&(<Mdl title="Otorgar Bonus"><BonusForm/></Mdl>)}
  {modal==="suspend"&&(<Mdl title="Suspender jugador"><SuspendForm/></Mdl>)}
  {modal==="tournament"&&(<Mdl title="Crear Torneo"><TournamentForm/></Mdl>)}
  {modal&&modal.type==="tMatch"&&(<Mdl title={modal.tournament.name}><TMatchForm tournament={modal.tournament}/></Mdl>)}
  {modal&&modal.type==="tResults"&&(<Mdl title={"Finalizar: "+modal.tournament.name}><TResultsForm tournament={modal.tournament}/></Mdl>)}
  {modal&&modal.type==="resCh"&&(<Mdl title="Resultado Reto"><ResChallengeForm challenge={modal.challenge}/></Mdl>)}
  {modal&&modal.type==="bracketMatch"&&<BracketMatchModal/>}
  {modal&&modal.type==="detail"&&<MatchDetailView/>}
  {modal&&modal.type==="profile"&&(<Mdl title={modal.player.firstName+" "+modal.player.lastName}><ProfileView player={modal.player}/></Mdl>)}
  {modal&&modal.type==="confirmDelete"&&(<Mdl title="Confirmar eliminación"><p style={{color:W.cream2,fontSize:14,marginBottom:16}}>{"¿Seguro que quieres eliminar el torneo \""+modal.tournamentName+"\"? Se borrarán todos sus partidos asociados. Esta acción no se puede deshacer."}</p><div style={{display:"flex",gap:8}}><button style={{...sbt("danger"),flex:1}} onClick={()=>{up(s=>({...s,tournaments:s.tournaments.filter(x=>x.id!==modal.tournamentId),matches:s.matches.filter(m=>m.tournamentId!==modal.tournamentId)}));setModal(null);flash("Torneo eliminado");}}>Eliminar</button><button style={{...sbt("ghost"),flex:1}} onClick={()=>setModal(null)}>Cancelar</button></div></Mdl>)}
  {modal&&modal.type==="editForumMsg"&&(<Mdl title="Editar mensaje"><ForumEditForm target={modal.target}/></Mdl>)}
  {modal&&modal.type==="confirmDeleteMsg"&&(<Mdl title="Borrar mensaje"><p style={{color:W.cream2,fontSize:14,marginBottom:16}}>¿Seguro que quieres borrar este mensaje? Esta acción no se puede deshacer.</p><div style={{display:"flex",gap:8}}><button style={{...sbt("danger"),flex:1}} onClick={()=>{const t=modal.target;up(s=>{if(t.kind==="msg"){return{...s,forum:s.forum.filter(m=>m.id!==t.msgId)};}if(t.kind==="reply"){return{...s,forum:s.forum.map(m=>m.id===t.msgId?{...m,replies:(m.replies||[]).filter(r=>r.id!==t.replyId)}:m)};}return s;});setModal(null);flash("Mensaje borrado");}}>Borrar</button><button style={{...sbt("ghost"),flex:1}} onClick={()=>setModal(null)}>Cancelar</button></div></Mdl>)}
  {modal&&modal.type==="confirmReset"&&(<Mdl title="Confirmar reset total"><p style={{color:W.cream2,fontSize:14,marginBottom:16}}>¿Seguro que quieres borrar TODOS los datos? Se restaurarán los valores de demo. Esta acción no se puede deshacer.</p><div style={{display:"flex",gap:8}}><button style={{...sbt("danger"),flex:1}} onClick={()=>{up(()=>({...DEFAULT_STATE}));setModal(null);setAuth(null);flash("Reset completo");}}>Borrar todo</button><button style={{...sbt("ghost"),flex:1}} onClick={()=>setModal(null)}>Cancelar</button></div></Mdl>)}
</div>
);

function SimulatorView(){
  const[sP1,setSP1]=useState("");
  const[sP2,setSP2]=useState("");
  const[sDt,setSDt]=useState(toI(now()));
  const simDate=sDt?frI(sDt):Date.now();
  const simPts=computePointsAtDate(simDate,"all");

  const wouldCount=(a,b)=>{
    if(!a||!b||!S)return true;
    const pa=S.players.find(p=>p.id===a);const pb=S.players.find(p=>p.id===b);
    if((pa&&pa.suspended)||(pb&&pb.suspended))return false;
    const ws=simDate-S.config.sameOppDays*86400000;
    const count=S.matches.filter(m=>!m.tournamentId&&!m.annulled&&m.status==="confirmed"&&((m.player1===a&&m.player2===b)||(m.player1===b&&m.player2===a))&&m.date>=ws&&m.date<=simDate).length;
    return count<S.config.maxSameOpp;
  };
  const counts=sP1&&sP2?wouldCount(sP1,sP2):true;
  const anySuspended=sP1&&sP2?((pO(sP1)&&pO(sP1).suspended)||(pO(sP2)&&pO(sP2).suspended)):false;
  const h2h=sP1&&sP2?S.matches.some(m=>!m.annulled&&m.date<=simDate&&((m.player1===sP1&&m.player2===sP2)||(m.player1===sP2&&m.player2===sP1))):false;

  const ptsP1=simPts[sP1]||0;
  const ptsP2=simPts[sP2]||0;
  const earnIfP1Wins=counts?calcPts(ptsP1,ptsP2,S.config.eloBase,S.config.equityBonusPct,S.config.equityMatchesGap,h2h):0;
  const earnIfP2Wins=counts?calcPts(ptsP2,ptsP1,S.config.eloBase,S.config.equityBonusPct,S.config.equityMatchesGap,h2h):0;
  const bonusP1=earnIfP1Wins>S.config.eloBase;
  const bonusP2=earnIfP2Wins>S.config.eloBase;

  const matchesInWindow=sP1&&sP2?S.matches.filter(m=>!m.tournamentId&&!m.annulled&&m.status==="confirmed"&&((m.player1===sP1&&m.player2===sP2)||(m.player1===sP2&&m.player2===sP1))&&m.date>=(simDate-S.config.sameOppDays*86400000)&&m.date<=simDate).length:0;

  return(<div>
    <h2 style={{fontSize:18,fontWeight:700,marginBottom:8,color:W.gold}}>Simulador de Partido</h2>
    <p style={{fontSize:13,color:W.cream3,marginBottom:16,lineHeight:1.5}}>Consulta cuántos puntos obtendría cada jugador en un partido hipotético en una fecha concreta. La simulación tiene en cuenta la clasificación proyectada a esa fecha, el sistema de equidad y el límite de enfrentamientos. Es totalmente informativo.</p>
    <div style={scd}>
      <label style={slb}>Jugador 1</label>
      <select style={{...ss,marginBottom:8}} value={sP1} onChange={e=>setSP1(e.target.value)}>
        <option value="">Seleccionar...</option>
        {appr.map(p=>(<option key={p.id} value={p.id}>{p.nickname+(p.suspended?" (suspendido)":"")}</option>))}
      </select>
      <label style={slb}>Jugador 2</label>
      <select style={{...ss,marginBottom:8}} value={sP2} onChange={e=>setSP2(e.target.value)}>
        <option value="">Seleccionar...</option>
        {appr.filter(p=>p.id!==sP1).map(p=>(<option key={p.id} value={p.id}>{p.nickname+(p.suspended?" (suspendido)":"")}</option>))}
      </select>
      <label style={slb}>Fecha del partido</label>
      <input type="date" style={{...si,marginBottom:16}} value={sDt} onChange={e=>setSDt(e.target.value)}/>

      {sP1&&sP2&&(<div>
        <div style={{display:"flex",justifyContent:"center",gap:24,marginBottom:16,padding:"12px 0",borderTop:"1px solid "+W.gold+"22",borderBottom:"1px solid "+W.gold+"22"}}>
          <div style={{textAlign:"center"}}><Av player={pO(sP1)} size={40}/><div style={{fontSize:13,fontWeight:600,color:W.gold,marginTop:4}}>{pSh(sP1)}{pO(sP1)&&pO(sP1).suspended&&<span style={{color:W.danger,marginLeft:4,fontSize:9}}>SUSP</span>}</div><div style={{fontSize:18,fontWeight:700,color:W.cream}}>{String(ptsP1)+" pts"}</div></div>
          <div style={{alignSelf:"center",color:W.cream3,fontSize:16}}>vs</div>
          <div style={{textAlign:"center"}}><Av player={pO(sP2)} size={40}/><div style={{fontSize:13,fontWeight:600,color:W.gold,marginTop:4}}>{pSh(sP2)}{pO(sP2)&&pO(sP2).suspended&&<span style={{color:W.danger,marginLeft:4,fontSize:9}}>SUSP</span>}</div><div style={{fontSize:18,fontWeight:700,color:W.cream}}>{String(ptsP2)+" pts"}</div></div>
        </div>

        <div style={{background:W.darkGreen,borderRadius:8,padding:12,marginBottom:12,border:"1px solid "+W.gold+"22"}}>
          {anySuspended?(<div style={{fontSize:13,color:W.danger,fontWeight:600}}>Al menos uno de los jugadores está suspendido. Este partido no se podría registrar.</div>):(<>
            <div style={{fontSize:13,color:W.cream2,marginBottom:4}}>Enfrentamientos en los últimos {String(S.config.sameOppDays)} días: <strong style={{color:counts?W.lightGreen:W.danger}}>{String(matchesInWindow)} / {String(S.config.maxSameOpp)}</strong></div>
            {counts?(<div style={{fontSize:12,color:W.lightGreen}}>El partido contaría como Liga Regular</div>):(<div style={{fontSize:12,color:W.warn}}>Se ha alcanzado el límite — el partido se registraría como Amistoso (sin puntos)</div>)}
            {h2h&&<div style={{fontSize:12,color:W.cream3,marginTop:4}}>Los jugadores ya se han enfrentado previamente (h2h activo para equidad)</div>}
          </>)}
        </div>

        {counts&&!anySuspended&&(<div style={{display:"flex",gap:12,marginBottom:8}}>
          <div style={{flex:1,background:W.darkGreen,borderRadius:8,padding:12,border:"1px solid "+W.gold+"22",textAlign:"center"}}>
            <div style={{fontSize:11,color:W.cream3,marginBottom:4}}>Si gana {pSh(sP1)}</div>
            <div style={{fontSize:24,fontWeight:700,color:W.gold}}>{"+"+String(earnIfP1Wins)}</div>
            {bonusP1&&<div style={{fontSize:10,color:W.warn,marginTop:2}}>Incluye bonificación por equidad</div>}
          </div>
          <div style={{flex:1,background:W.darkGreen,borderRadius:8,padding:12,border:"1px solid "+W.gold+"22",textAlign:"center"}}>
            <div style={{fontSize:11,color:W.cream3,marginBottom:4}}>Si gana {pSh(sP2)}</div>
            <div style={{fontSize:24,fontWeight:700,color:W.gold}}>{"+"+String(earnIfP2Wins)}</div>
            {bonusP2&&<div style={{fontSize:10,color:W.warn,marginTop:2}}>Incluye bonificación por equidad</div>}
          </div>
        </div>)}

        {!counts&&!anySuspended&&(<div style={{textAlign:"center",padding:16,color:W.cream3,fontSize:14,fontStyle:"italic"}}>
          Este partido no sumaría puntos — límite de enfrentamientos alcanzado para la fecha seleccionada.
        </div>)}
      </div>)}
    </div>
  </div>);
}

function ChallengeForm(){const[ci,sci]=useState(isA?"":myId);const[ti,sti]=useState("");const ok=ci&&ti?canCh(ci,ti):true;const availableChallengers=isA?apprActive:apprActive.filter(p=>p.id===myId);const availableTargets=apprActive.filter(p=>p.id!==ci);return(<div><p style={{color:W.cream3,fontSize:13,marginBottom:16,fontStyle:"italic"}}>{"El rival debe aceptar. Cooldown: "+String(S.config.chCoolDays)+" dias. Los jugadores suspendidos no pueden ser retados."}</p>{isA&&(<><label style={slb}>Retador</label><select style={{...ss,marginBottom:8}} value={ci} onChange={e=>sci(e.target.value)}><option value="">...</option>{availableChallengers.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select></>)}<label style={slb}>Retar a</label><select style={{...ss,marginBottom:8}} value={ti} onChange={e=>sti(e.target.value)}><option value="">...</option>{availableTargets.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select>{!ok&&ci&&ti&&<div style={{...bdg(W.danger),marginBottom:8}}>Cooldown o jugador suspendido</div>}<button style={{...sbt("primary"),width:"100%"}} onClick={()=>{if(!ci||!ti||ci===ti||!ok)return;up(s=>({...s,challenges:[...s.challenges,{id:uid(),challengerId:ci,targetId:ti,date:now(),status:"pending"}]}));setModal(null);flash("Reto!");}}>LANZAR</button></div>);}

function ScheduleForm(){
  // Para admin: puede programar cualquier partido entre cualquier par.
  // Para jugador: solo partidos en los que participa él.
  const tomorrow=toI(Date.now()+86400000);
  const[p1,sp1]=useState(isA?"":myId);
  const[p2,sp2]=useState("");
  const[dt,sdt]=useState(tomorrow);
  const[sf,ssf]=useState("Dura");
  const eligibleP1=isA?apprActive:apprActive.filter(p=>p.id===myId);
  const eligibleP2=apprActive.filter(p=>p.id!==p1);
  const dtTs=dt?frI(dt):0;
  const isPast=dtTs<Date.now()-86400000;
  const pendingSched=p1&&p2?findPendingScheduled(S,p1,p2):null;
  const blockedByScheduled=!!pendingSched;
  return(<div>
    <p style={{color:W.cream3,fontSize:12,marginBottom:16,fontStyle:"italic",lineHeight:1.5}}>
      Programa un partido futuro sin resultado. No requiere aceptación del rival. Cuando se juegue, cualquiera de los dos puede registrar el resultado desde la pestaña de Partidos — la confirmación del rival se pedirá en ese momento, igual que con un partido normal.
    </p>
    {isA&&(<><label style={slb}>Jugador 1</label><select style={{...ss,marginBottom:8}} value={p1} onChange={e=>sp1(e.target.value)}><option value="">Seleccionar...</option>{eligibleP1.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select></>)}
    <label style={slb}>{isA?"Jugador 2":"Rival"}</label>
    <select style={{...ss,marginBottom:8}} value={p2} onChange={e=>sp2(e.target.value)}><option value="">Seleccionar...</option>{eligibleP2.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select>
    <label style={slb}>Fecha del partido</label>
    <input style={{...si,marginBottom:8}} type="date" value={dt} onChange={e=>sdt(e.target.value)}/>
    {isPast&&<div style={{...bdg(W.warn),marginBottom:8}}>La fecha está en el pasado — normalmente se programan partidos futuros</div>}
    <label style={slb}>Superficie</label>
    <select style={{...ss,marginBottom:12}} value={sf} onChange={e=>ssf(e.target.value)}>{SURFS.map(s=>(<option key={s} value={s}>{s}</option>))}</select>
    {blockedByScheduled&&(<div style={{background:W.warn+"22",border:"1px solid "+W.warn,borderRadius:8,padding:"10px 12px",marginBottom:8,fontSize:12,color:W.cream}}>Ya hay un partido programado pendiente entre estos jugadores ({fmtD(pendingSched.date)}). Bórralo o registra su resultado antes de programar otro.</div>)}
    <button style={{...sbt("primary"),width:"100%",opacity:p1&&p2&&!blockedByScheduled?1:.4}} disabled={!p1||!p2||blockedByScheduled} onClick={()=>{
      if(!p1||!p2||p1===p2||blockedByScheduled)return;
      up(s=>({...s,matches:[...s.matches,{id:uid(),player1:p1,player2:p2,winner:null,score:"",date:frI(dt),points:0,countsForStandings:false,isChallenge:false,tournamentId:null,annulled:false,surface:sf,status:"scheduled",submittedBy:myId,reactions:{},comments:[]}]}));
      setModal(null);
      flash("Partido programado");
    }}>PROGRAMAR</button>
  </div>);
}
function ResChallengeForm({challenge:ch}){const[w,sw]=useState("");const[scr,sscr]=useState("");const[dt,sdt]=useState(toI(now()));const[sf,ssf]=useState("Dura");const lid=w?(w===ch.challengerId?ch.targetId:ch.challengerId):"";const h2h=hasH2H(ch.challengerId,ch.targetId);const pp=w?calcPts(gP(w),gP(lid),S.config.eloBase,S.config.equityBonusPct,S.config.equityMatchesGap,h2h):S.config.eloBase;return(<div><p style={{color:W.cream3,fontSize:13,marginBottom:12}}>{pSh(ch.challengerId)+" vs "+pSh(ch.targetId)}</p><label style={slb}>Fecha</label><input style={{...si,marginBottom:8}} type="date" value={dt} onChange={e=>sdt(e.target.value)}/><label style={slb}>Superficie</label><select style={{...ss,marginBottom:8}} value={sf} onChange={e=>ssf(e.target.value)}>{SURFS.map(s=>(<option key={s} value={s}>{s}</option>))}</select><label style={slb}>Resultado</label><div style={{marginBottom:12}}><ScoreInput p1Name={pSh(ch.challengerId)} p2Name={pSh(ch.targetId)} bestOf={3} onBestOfChange={()=>{}} showBestOfToggle={true} onScoreChange={s=>sscr(s)} onWinnerChange={side=>{if(side==="p1")sw(ch.challengerId);else if(side==="p2")sw(ch.targetId);else sw("");}}/></div>{w&&<div style={{background:W.darkGreen,borderRadius:8,padding:10,marginBottom:8,border:"1px solid "+W.gold+"22",fontSize:13}}>+<span style={{color:W.gold,fontWeight:700}}>{String(pp)}</span>{" / -"}<span style={{color:W.danger,fontWeight:700}}>{String(S.config.eloBase)}</span></div>}<button style={{...sbt("primary"),width:"100%"}} onClick={()=>{if(!w)return;const mid=uid();const pts=calcPts(gP(w),gP(lid),S.config.eloBase,S.config.equityBonusPct,S.config.equityMatchesGap,h2h);up(s=>({...s,matches:[...s.matches,{id:mid,player1:ch.challengerId,player2:ch.targetId,winner:w,score:scr,date:frI(dt),points:pts,countsForStandings:true,isChallenge:true,annulled:false,surface:sf,status:isA?"confirmed":"pending",submittedBy:myId,reactions:{},comments:[]}],challenges:s.challenges.map(c=>c.id===ch.id?{...c,status:"resolved",matchId:mid}:c)}));setModal(null);}}>REGISTRAR</button></div>);}
function SanctionForm(){const[pid,spid]=useState("");const[amt,samt]=useState(50);const[rsn,srsn]=useState("");return(<div><select style={{...ss,marginBottom:8}} value={pid} onChange={e=>spid(e.target.value)}><option value="">...</option>{appr.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select><input style={{...si,marginBottom:8}} type="number" value={amt} onChange={e=>samt(+e.target.value)}/><input style={{...si,marginBottom:16}} placeholder="Motivo" value={rsn} onChange={e=>srsn(e.target.value)}/><button style={{...sbt("danger"),width:"100%"}} onClick={()=>{if(!pid||!rsn)return;up(s=>({...s,players:s.players.map(p=>p.id===pid?{...p,sanctions:[...(p.sanctions||[]),{amount:amt,reason:rsn,date:now(),type:"sanction"}]}:p)}));setModal(null);}}>Aplicar</button></div>);}
function BonusForm(){const[pid,spid]=useState("");const[amt,samt]=useState(50);const[rsn,srsn]=useState("");return(<div><label style={slb}>Jugador</label><select style={{...ss,marginBottom:8}} value={pid} onChange={e=>spid(e.target.value)}><option value="">...</option>{appr.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select><label style={slb}>Puntos a otorgar</label><input style={{...si,marginBottom:8}} type="number" value={amt} onChange={e=>samt(+e.target.value)}/><label style={slb}>Motivo</label><input style={{...si,marginBottom:16}} placeholder="Motivo del bonus" value={rsn} onChange={e=>srsn(e.target.value)}/><button style={{...sbt("primary"),width:"100%"}} onClick={()=>{if(!pid||!rsn||amt<=0)return;up(s=>({...s,players:s.players.map(p=>p.id===pid?{...p,sanctions:[...(p.sanctions||[]),{amount:amt,reason:rsn,date:now(),type:"bonus"}]}:p)}));setModal(null);flash("+"+String(amt)+" pts a "+pSh(pid));}}>Otorgar</button></div>);}

function SuspendForm(){
  const[pid,spid]=useState("");
  const[rsn,srsn]=useState("");
  const activePlayers=appr.filter(p=>!p.suspended);
  return(<div>
    <p style={{color:W.cream3,fontSize:13,marginBottom:16,fontStyle:"italic",lineHeight:1.5}}>
      El jugador suspendido quedará relegado a la última posición del ranking con sus puntos congelados. No podrá registrar partidos ni ser retado. La penalización por inactividad no se aplicará durante la suspensión. Puedes levantar la suspensión en cualquier momento.
    </p>
    <label style={slb}>Jugador a suspender</label>
    <select style={{...ss,marginBottom:8}} value={pid} onChange={e=>spid(e.target.value)}>
      <option value="">Seleccionar...</option>
      {activePlayers.map(p=>(<option key={p.id} value={p.id}>{p.firstName+" "+p.lastName+' "'+p.nickname+'"'}</option>))}
    </select>
    {activePlayers.length===0&&<div style={{...bdg(W.cream3),marginBottom:8}}>No hay jugadores activos para suspender</div>}
    <label style={slb}>Motivo (opcional)</label>
    <input style={{...si,marginBottom:16}} placeholder="Motivo de la suspensión" value={rsn} onChange={e=>srsn(e.target.value)}/>
    <button style={{...sbt("danger"),width:"100%"}} onClick={()=>{
      if(!pid)return;
      up(s=>({...s,players:s.players.map(p=>p.id===pid?{...p,suspended:true,suspendedAt:now(),suspensionReason:rsn.trim()}:p)}));
      setModal(null);
      flash("Jugador suspendido");
    }}>SUSPENDER</button>
  </div>);
}

function TournamentForm(){const[nm,snm]=useState("");const[fm,sfm]=useState("league");const[pS2,sPS]=useState("qf");const[pw,spw]=useState(500);const[pf,spf]=useState(300);const[ps,sps]=useState(150);const[pq,spq]=useState(75);const[pr16,spr16]=useState(40);const[sel,ssel]=useState([]);const tog=id=>ssel(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
const elimRound=n=>{if(n<=2)return"final";if(n<=4)return"sf";if(n<=8)return"qf";return"r16";};
const elimSlots=n=>{if(n<=2)return 1;if(n<=4)return 2;if(n<=8)return 4;return 8;};
const elimPointFields=()=>{const r=elimRound(sel.length);const fields=[["C",pw,spw],["F",pf,spf]];if(r==="sf"||r==="qf"||r==="r16")fields.push(["SF",ps,sps]);if(r==="qf"||r==="r16")fields.push(["QF",pq,spq]);if(r==="r16")fields.push(["R16",pr16,spr16]);return fields;};
const leaguePointFields=()=>{const fields=[["C",pw,spw],["F",pf,spf]];if(pS2==="sf"||pS2==="qf"||pS2==="r16")fields.push(["SF",ps,sps]);if(pS2==="qf"||pS2==="r16")fields.push(["QF",pq,spq]);if(pS2==="r16")fields.push(["R16",pr16,spr16]);return fields;};
const ptFields=fm==="elimination"?elimPointFields():leaguePointFields();
return(<div><input style={{...si,marginBottom:8}} placeholder="Nombre" value={nm} onChange={e=>snm(e.target.value)}/><label style={slb}>Formato</label><select style={{...ss,marginBottom:8}} value={fm} onChange={e=>sfm(e.target.value)}><option value="elimination">Eliminacion directa</option><option value="league">Liguilla + Eliminacion</option></select>{fm==="league"&&(<><label style={slb}>Playoff desde...</label><select style={{...ss,marginBottom:8}} value={pS2} onChange={e=>sPS(e.target.value)}><option value="sf">Semifinales (4)</option><option value="qf">Cuartos (8)</option><option value="r16">Octavos (16)</option></select></>)}<label style={slb}>Puntos por ronda</label><div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>{ptFields.map(([l,v,fn])=>(<div key={l} style={{flex:1,minWidth:60}}><span style={{fontSize:11,color:W.cream3}}>{l}</span><input style={si} type="number" value={v} onChange={e=>fn(+e.target.value)}/></div>))}</div><label style={slb}>{"Jugadores ("+String(sel.length)+")"}{fm==="elimination"&&sel.length>=2&&<span style={{color:W.cream3,fontSize:11,marginLeft:6}}>{"→ Empieza en "+({final:"Final",sf:"Semis",qf:"Cuartos",r16:"Octavos"}[elimRound(sel.length)])}</span>}</label><div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>{apprActive.map(p=>(<button key={p.id} onClick={()=>tog(p.id)} style={{padding:"6px 12px",borderRadius:20,border:"1px solid "+(sel.includes(p.id)?W.gold:W.gold+"33"),background:sel.includes(p.id)?W.gold+"18":"transparent",color:sel.includes(p.id)?W.gold:W.cream3,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>{p.nickname}</button>))}</div>{fm==="elimination"&&sel.length>=2&&sel.length<=16&&(<div style={{background:W.darkGreen,borderRadius:8,padding:10,marginBottom:12,border:"1px solid "+W.gold+"22",fontSize:12,color:W.cream3}}>Se creará un cuadro de eliminación directa con {String(elimSlots(sel.length))} cruces. El admin asignará los jugadores a cada cruce manualmente.</div>)}<button style={{...sbt("primary"),width:"100%"}} onClick={()=>{if(!nm.trim()||sel.length<2)return;const ptsDist={w:pw,f:pf,sf:ps,qf:pq,r16:pr16};if(fm==="elimination"){const startRound=elimRound(sel.length);const slots=elimSlots(sel.length);const emptyMatches=[];for(let i=0;i<slots;i++)emptyMatches.push({p1:null,p2:null,winner:null,score:"",status:"pending_play"});const bk={r16:[],qf:[],sf:[],final:[]};bk[startRound]=emptyMatches;up(s=>({...s,tournaments:[...s.tournaments,{id:uid(),name:nm.trim(),format:"elimination",playoffStart:startRound,ptsDist,players:sel,matches:[],results:[],leagueStandings:null,leagueFinished:true,bracket:bk,status:"active",createdAt:now()}]}));}else{up(s=>({...s,tournaments:[...s.tournaments,{id:uid(),name:nm.trim(),format:"league",playoffStart:pS2,ptsDist,players:sel,matches:[],results:[],leagueStandings:sortLg(sel,[]),leagueFinished:false,bracket:null,status:"active",createdAt:now()}]}));}setModal(null);flash("Creado");}}>CREAR</button></div>);}
function TMatchForm({tournament:t}){const tp=S.players.filter(p=>t.players.includes(p.id));const[p1,sp1]=useState("");const[p2,sp2]=useState("");const[w,sw]=useState("");const[scr,sscr]=useState("");const[dt,sdt]=useState(toI(now()));const[sf,ssf]=useState("Dura");return(<div><label style={slb}>Fecha</label><input style={{...si,marginBottom:8}} type="date" value={dt} onChange={e=>sdt(e.target.value)}/><label style={slb}>Superficie</label><select style={{...ss,marginBottom:8}} value={sf} onChange={e=>ssf(e.target.value)}>{SURFS.map(s=>(<option key={s} value={s}>{s}</option>))}</select><select style={{...ss,marginBottom:8}} value={p1} onChange={e=>sp1(e.target.value)}><option value="">J1...</option>{tp.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select><select style={{...ss,marginBottom:8}} value={p2} onChange={e=>sp2(e.target.value)}><option value="">J2...</option>{tp.filter(p=>p.id!==p1).map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select>{p1&&p2&&(<div style={{marginBottom:12}}><ScoreInput p1Name={pSh(p1)} p2Name={pSh(p2)} bestOf={3} onBestOfChange={()=>{}} showBestOfToggle={false} onScoreChange={s=>sscr(s)} onWinnerChange={side=>{if(side==="p1")sw(p1);else if(side==="p2")sw(p2);else sw("");}}/></div>)}<button style={{...sbt("primary"),width:"100%"}} onClick={()=>{if(!p1||!p2||!w||p1===p2)return;const mid=uid();const mObj={id:mid,player1:p1,player2:p2,winner:w,score:scr,date:frI(dt),phase:"league",status:isA?"confirmed":"pending",submittedBy:myId};up(s=>{const t2={...s.tournaments.find(x=>x.id===t.id)};t2.matches=[...t2.matches,mObj];t2.leagueStandings=sortLg(t2.players,t2.matches.filter(m=>m.phase==="league"&&m.status!=="disputed"));return{...s,tournaments:s.tournaments.map(x=>x.id===t.id?t2:x),matches:[...s.matches,{id:mid,player1:p1,player2:p2,winner:w,score:scr,date:frI(dt),points:0,countsForStandings:false,isChallenge:false,tournamentId:t.id,annulled:false,surface:sf,status:isA?"confirmed":"pending",submittedBy:myId,reactions:{},comments:[]}]};});setModal(null);}}>REGISTRAR</button></div>);}
function TResultsForm({tournament:t}){const live=computeTournamentPts(t);const[res,sres]=useState(live.length>0?live:t.players.map(pid=>({playerId:pid,position:"",points:0})));const upR=(i,f,v)=>sres(r=>r.map((x,j)=>j===i?{...x,[f]:v}:x));return(<div><p style={{fontSize:12,color:W.cream3,marginBottom:12,fontStyle:"italic"}}>Los puntos se han calculado automaticamente. Puedes ajustar si es necesario.</p>{res.map((r,i)=>(<div key={r.playerId} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}><span style={{flex:1,fontSize:14,color:W.cream}}>{pSh(r.playerId)}</span><input style={{...si,width:60}} value={r.position} onChange={e=>upR(i,"position",e.target.value)}/><input style={{...si,width:70}} type="number" value={r.points} onChange={e=>upR(i,"points",+e.target.value)}/></div>))}<button style={{...sbt("primary"),width:"100%",marginTop:12}} onClick={()=>{up(s=>({...s,tournaments:s.tournaments.map(x=>x.id===t.id?{...x,results:res,status:"finished"}:x)}));setModal(null);flash("Finalizado");}}>FINALIZAR TORNEO</button></div>);}

function ProfileView({player:pl}){const canE=myId===pl.id||isA;const isMe=myId===pl.id;const[editing,setEditing]=useState(false);const[eNick,setENick]=useState(pl.nickname);const[eAge,setEAge]=useState(String(pl.age));const[eHand,setEHand]=useState(pl.hand);const[eBH,setEBH]=useState(pl.backhand);const[ePw,setEPw]=useState("");
const pm=S.matches.filter(m=>!m.annulled&&m.status==="confirmed"&&(m.player1===pl.id||m.player2===pl.id)).sort((a,b)=>b.date-a.date);const w=pm.filter(m=>m.winner===pl.id).length;const l=pm.filter(m=>m.winner&&m.winner!==pl.id).length;const bS={};SURFS.forEach(sf=>{const sm=pm.filter(m=>m.surface===sf);bS[sf]={w:sm.filter(m=>m.winner===pl.id).length,l:sm.filter(m=>m.winner&&m.winner!==pl.id).length};});
const saveProfile=()=>{if(!eNick.trim()||!eAge)return;up(s=>({...s,players:s.players.map(p=>p.id===pl.id?{...p,nickname:eNick.trim(),age:+eAge,hand:eHand,backhand:eBH,...(ePw.trim()?{password:ePw.trim()}:{})}:p)}));setEditing(false);setEPw("");flash("Perfil actualizado");};
const changePhoto=e=>{hPh(e,d=>{up(s=>({...s,players:s.players.map(p=>p.id===pl.id?{...p,photo:d}:p)}));flash("Foto actualizada");});};
return(<div><div style={{textAlign:"center",marginBottom:16}}><div style={{display:"flex",justifyContent:"center",marginBottom:8,position:"relative"}}><Av player={pl} size={80}/>{isMe&&(<label style={{position:"absolute",bottom:0,right:"calc(50% - 50px)",background:W.gold,color:"#1a0a0a",borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,fontWeight:700,border:"2px solid "+W.card,boxShadow:"0 2px 8px rgba(0,0,0,.4)"}} title="Cambiar foto">📷<input type="file" accept="image/*" style={{display:"none"}} onChange={changePhoto}/></label>)}</div>
{pl.suspended&&<div style={{margin:"0 auto 12px",display:"inline-block"}}><SuspB/>{pl.suspensionReason&&<div style={{fontSize:12,color:W.cream3,marginTop:4,fontStyle:"italic"}}>{"Motivo: "+pl.suspensionReason}</div>}</div>}
{!editing?(<><div style={{fontSize:20,fontWeight:700,color:W.gold,fontStyle:"italic"}}>{'"'+pl.nickname+'"'}</div><div style={{color:W.cream3,fontSize:13,marginTop:4}}>{String(pl.age)+" años • "+(pl.hand==="right"?"Diestro":"Zurdo")+" • "+(pl.backhand==="two"?"Revés a dos manos":"Revés a una mano")}</div><div style={{color:W.cream3,fontSize:11,marginTop:2}}>{pl.email}</div>{isMe&&<button style={{...sbt("ghost"),padding:"6px 14px",fontSize:12,marginTop:8,marginRight:6}} onClick={()=>setEditing(true)}>Editar perfil</button>}{isMe&&<label style={{...sbt("ghost"),padding:"6px 14px",fontSize:12,marginTop:8,cursor:"pointer",display:"inline-block"}}>Cambiar foto<input type="file" accept="image/*" style={{display:"none"}} onChange={changePhoto}/></label>}</>):(
<div style={{textAlign:"left",marginTop:8}}>
<label style={slb}>Apodo</label><input style={si} value={eNick} onChange={e=>setENick(e.target.value)}/>
<label style={slb}>Edad</label><input style={si} type="number" value={eAge} onChange={e=>setEAge(e.target.value)}/>
<label style={slb}>Mano</label><select style={ss} value={eHand} onChange={e=>setEHand(e.target.value)}><option value="right">Diestro</option><option value="left">Zurdo</option></select>
<label style={slb}>Revés</label><select style={ss} value={eBH} onChange={e=>setEBH(e.target.value)}><option value="two">Dos manos</option><option value="one">Una mano</option></select>
<label style={slb}>Nueva contraseña (dejar vacío para no cambiar)</label><input style={si} type="password" value={ePw} onChange={e=>setEPw(e.target.value)} placeholder="••••"/>
<div style={{display:"flex",gap:8,marginTop:12}}><button style={{...sbt("primary"),flex:1}} onClick={saveProfile}>Guardar</button><button style={{...sbt("ghost"),flex:1}} onClick={()=>setEditing(false)}>Cancelar</button></div>
</div>)}
</div>
<div style={{display:"flex",justifyContent:"center",gap:24,marginBottom:16}}><div style={{textAlign:"center"}}><div style={{fontSize:24,fontWeight:700,color:W.lightGreen}}>{String(w)}</div><div style={{fontSize:12,color:W.cream3}}>V</div></div><div style={{textAlign:"center"}}><div style={{fontSize:24,fontWeight:700,color:W.danger}}>{String(l)}</div><div style={{fontSize:12,color:W.cream3}}>D</div></div><div style={{textAlign:"center"}}><div style={{fontSize:24,fontWeight:700,color:W.cream}}>{(w+l>0?((w/(w+l))*100).toFixed(0):"0")+"%"}</div><div style={{fontSize:12,color:W.cream3}}>%</div></div></div><div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>{SURFS.map(sf=>{const d=bS[sf];return(<div key={sf} style={{flex:1,minWidth:75,background:W.darkGreen,borderRadius:8,padding:8,textAlign:"center",border:"1px solid "+W.gold+"22"}}><SfB s={sf}/><div style={{marginTop:4,fontSize:13}}><span style={{color:W.lightGreen,fontWeight:600}}>{String(d.w)+"V"}</span>{" "}<span style={{color:W.danger,fontWeight:600}}>{String(d.l)+"D"}</span></div></div>);})}</div><div style={{marginBottom:8}}><h4 style={{fontSize:13,fontWeight:600,color:W.gold,marginBottom:6}}>Forma reciente</h4><FormDots playerId={pl.id} matches={S.matches}/></div>{pm.slice(0,10).map(m=>(<div key={m.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid "+W.gold+"11",fontSize:13,cursor:"pointer"}} onClick={()=>{setModal({type:"detail",match:m});}}><div><strong style={{color:m.winner===m.player1?W.gold:W.cream}}>{pSh(m.player1)}</strong><span style={{color:W.cream3}}>{" vs "}</span><strong style={{color:m.winner===m.player2?W.gold:W.cream}}>{pSh(m.player2)}</strong>{m.score&&<span style={{color:W.cream2,marginLeft:8,fontSize:12}}>{m.score}</span>}</div><span style={{display:"flex",gap:4,alignItems:"center"}}><SfB s={m.surface}/><span style={{color:W.cream3,fontSize:11}}>{fmtD(m.date)}</span></span></div>))}

{/* Admin actions on profile */}
{isA&&!isMe&&(<div style={{marginTop:16,paddingTop:16,borderTop:"1px solid "+W.gold+"22"}}>
  <h4 style={{fontSize:13,fontWeight:600,color:W.warn,marginBottom:10}}>Acciones de admin</h4>
  {!pl.suspended?(<button style={{...sbt("danger"),width:"100%"}} onClick={()=>{up(s=>({...s,players:s.players.map(p=>p.id===pl.id?{...p,suspended:true,suspendedAt:now(),suspensionReason:"Suspendido desde perfil"}:p)}));setModal(null);flash("Jugador suspendido");}}>Suspender jugador</button>):(<button style={{...sbt("primary"),width:"100%"}} onClick={()=>{up(s=>({...s,players:s.players.map(p=>p.id===pl.id?{...p,suspended:false,suspendedAt:null,suspensionReason:""}:p)}));setModal(null);flash("Suspensión levantada");}}>Levantar suspensión</button>)}
</div>)}

{/* Extended stats section */}
<ProfileExtendedStats player={pl} isMe={isMe}/>

{/* Fresh rivals widget (solo visible en mi propio perfil) */}
{isMe&&!pl.suspended&&<ProfileFreshRivals player={pl}/>}

{/* Weekly evolution chart */}
<ProfileEvolutionChart player={pl} isMe={isMe}/>
</div>);}

// ==================== PROFILE EXTENDED COMPONENTS ====================

function ProfileExtendedStats({player:pl,isMe}){
  const stats=computePlayerStats(S,pl.id);
  if(!stats)return null;
  const hasAnyRivalStat=stats.bestRival||stats.nemesis;
  const hasAnyStreak=stats.bestStreak>0||stats.currentStreak>0;
  const hasAnyLongMatch=stats.threeSetW+stats.threeSetL+stats.fiveSetW+stats.fiveSetL>0;
  const hasAnyTb=stats.tbW+stats.tbL>0;
  if(!hasAnyRivalStat&&!hasAnyStreak&&!hasAnyLongMatch&&!hasAnyTb)return null;
  const blockSt={background:W.darkGreen,borderRadius:8,padding:10,border:"1px solid "+W.gold+"22"};
  return(<div style={{marginTop:16,paddingTop:16,borderTop:"1px solid "+W.gold+"22"}}>
    <h4 style={{fontSize:13,fontWeight:600,color:W.gold,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Estadísticas</h4>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8}}>
      {hasAnyStreak&&(<div style={blockSt}>
        <div style={{fontSize:10,color:W.cream3,textTransform:"uppercase",letterSpacing:.8,marginBottom:4}}>Racha</div>
        <div style={{fontSize:13,color:W.cream}}>
          {stats.currentStreak>0&&(<div>
            <span style={{fontWeight:700,color:stats.currentStreakType==="W"?W.lightGreen:W.danger}}>{String(stats.currentStreak)}</span>
            <span style={{fontSize:11,color:W.cream3,marginLeft:4}}>{stats.currentStreakType==="W"?"V seguidas":"D seguidas"}</span>
          </div>)}
          {stats.bestStreak>0&&(<div style={{fontSize:11,color:W.cream3,marginTop:2}}>Mejor: <span style={{color:W.gold,fontWeight:600}}>{String(stats.bestStreak)}V</span></div>)}
        </div>
      </div>)}
      {stats.bestRival&&(<div style={{...blockSt,cursor:"pointer"}} onClick={()=>{const r=pO(stats.bestRival.rivalId);if(r)setModal({type:"profile",player:r});}}>
        <div style={{fontSize:10,color:W.cream3,textTransform:"uppercase",letterSpacing:.8,marginBottom:4}}>Rival favorito</div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <Av player={pO(stats.bestRival.rivalId)} size={22}/>
          <span style={{fontWeight:600,color:W.cream,fontSize:13}}>{pSh(stats.bestRival.rivalId)}</span>
        </div>
        <div style={{fontSize:11,color:W.lightGreen,marginTop:2}}>{String(stats.bestRival.w)+"-"+String(stats.bestRival.l)+" ("+stats.bestRival.winPct.toFixed(0)+"%)"}</div>
      </div>)}
      {stats.nemesis&&stats.nemesis.rivalId!==(stats.bestRival&&stats.bestRival.rivalId)&&(<div style={{...blockSt,cursor:"pointer"}} onClick={()=>{const r=pO(stats.nemesis.rivalId);if(r)setModal({type:"profile",player:r});}}>
        <div style={{fontSize:10,color:W.cream3,textTransform:"uppercase",letterSpacing:.8,marginBottom:4}}>Bestia negra</div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <Av player={pO(stats.nemesis.rivalId)} size={22}/>
          <span style={{fontWeight:600,color:W.cream,fontSize:13}}>{pSh(stats.nemesis.rivalId)}</span>
        </div>
        <div style={{fontSize:11,color:W.danger,marginTop:2}}>{String(stats.nemesis.w)+"-"+String(stats.nemesis.l)+" ("+stats.nemesis.winPct.toFixed(0)+"%)"}</div>
      </div>)}
      {hasAnyLongMatch&&(<div style={blockSt}>
        <div style={{fontSize:10,color:W.cream3,textTransform:"uppercase",letterSpacing:.8,marginBottom:4}}>Partidos al límite</div>
        <div style={{fontSize:13,color:W.cream}}>
          {(stats.threeSetW+stats.threeSetL>0)&&<div style={{fontSize:12}}>A 3 sets: <span style={{color:W.lightGreen,fontWeight:600}}>{String(stats.threeSetW)}V</span> <span style={{color:W.danger,fontWeight:600}}>{String(stats.threeSetL)}D</span></div>}
          {(stats.fiveSetW+stats.fiveSetL>0)&&<div style={{fontSize:12,marginTop:2}}>A 5 sets: <span style={{color:W.lightGreen,fontWeight:600}}>{String(stats.fiveSetW)}V</span> <span style={{color:W.danger,fontWeight:600}}>{String(stats.fiveSetL)}D</span></div>}
        </div>
      </div>)}
      {hasAnyTb&&(<div style={blockSt}>
        <div style={{fontSize:10,color:W.cream3,textTransform:"uppercase",letterSpacing:.8,marginBottom:4}}>Tie-breaks</div>
        <div style={{fontSize:13,color:W.cream}}>
          <span style={{color:W.lightGreen,fontWeight:700}}>{String(stats.tbW)}V</span>
          <span style={{color:W.cream3,margin:"0 6px"}}>/</span>
          <span style={{color:W.danger,fontWeight:700}}>{String(stats.tbL)}D</span>
        </div>
        {(stats.tbW+stats.tbL>=3)&&<div style={{fontSize:11,color:W.cream3,marginTop:2}}>{((stats.tbW/(stats.tbW+stats.tbL))*100).toFixed(0)+"% ganados"}</div>}
      </div>)}
    </div>
  </div>);
}

function ProfileFreshRivals({player:pl}){
  const fresh=findFreshRivals(S,pl.id);
  if(fresh.length===0)return null;
  const dsl=daysSinceLastMatch(S,pl.id);
  const du=daysUntilInactivityPenalty(S,pl.id);
  return(<div style={{marginTop:16,paddingTop:16,borderTop:"1px solid "+W.gold+"22"}}>
    <h4 style={{fontSize:13,fontWeight:600,color:W.gold,marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>¿Contra quién jugar?</h4>
    {dsl!==null&&(<p style={{fontSize:12,color:W.cream3,marginBottom:10,fontStyle:"italic"}}>
      Último partido hace {String(dsl)} días{du!==null&&du>0&&". "+"Te "+(du===1?"queda 1 día":"quedan "+String(du)+" días")+" antes de la penalización por inactividad."}{du!==null&&du<=0&&". Ya has sobrepasado el periodo de inactividad."}
    </p>)}
    {dsl===null&&(<p style={{fontSize:12,color:W.cream3,marginBottom:10,fontStyle:"italic"}}>Aún no has jugado ningún partido regular.</p>)}
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {fresh.slice(0,8).map(fr=>{
        const r=pO(fr.rivalId);
        if(!r)return null;
        const label=fr.daysSinceLast===null?"nunca habéis jugado":"último partido hace "+String(fr.daysSinceLast)+" días";
        return(<div key={fr.rivalId} style={{background:W.darkGreen,borderRadius:8,padding:"8px 12px",border:"1px solid "+W.gold+"22",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6,cursor:"pointer"}} onClick={()=>setModal({type:"profile",player:r})}>
          <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:140}}>
            <Av player={r} size={28}/>
            <div>
              <div style={{fontWeight:600,color:W.cream,fontSize:13}}>{r.nickname}</div>
              <div style={{fontSize:10,color:W.cream3,fontStyle:"italic"}}>{label}</div>
            </div>
          </div>
          <span style={{fontSize:11,color:fr.remainingSlots===S.config.maxSameOpp?W.lightGreen:W.cream3}}>{String(fr.remainingSlots)+" partidos disponibles"}</span>
        </div>);
      })}
    </div>
  </div>);
}

function ProfileEvolutionChart({player:pl,isMe}){
  const[range,setRange]=useState(26); // weeks
  const[compareId,setCompareId]=useState(isMe?"":myId);
  // Data
  const history=useMemo(()=>buildWeeklyHistory(S,range),[range]);
  if(!history||history.length===0)return null;
  const showCompare=!isMe&&compareId&&compareId!==pl.id;
  const compareToSelf=!isMe&&compareId===myId;
  // Data series
  const ptsMain=history.map(h=>h.points[pl.id]||0);
  const rankMain=history.map(h=>h.rank[pl.id]||null);
  const ptsCompare=showCompare?history.map(h=>h.points[compareId]||0):null;
  const rankCompare=showCompare?history.map(h=>h.rank[compareId]||null):null;
  // Scales
  const maxPts=Math.max(1,...ptsMain,...(ptsCompare||[]));
  const totalPlayers=S.players.filter(p=>p.approved).length||1;
  // SVG dimensions
  const W_=600;
  const H_=240;
  const padL=40,padR=40,padT=18,padB=28;
  const innerW=W_-padL-padR;
  const innerH=H_-padT-padB;
  const xAt=i=>padL+(history.length===1?innerW/2:(i/(history.length-1))*innerW);
  const yPts=p=>padT+innerH-(p/(maxPts||1))*innerH;
  // Rank axis inverted: position 1 on top, position N at bottom
  const yRank=r=>{if(!r)return null;return padT+((r-1)/Math.max(1,totalPlayers-1))*innerH;};
  // Path generators
  const linePath=(ys,skipNull)=>{let d="";let started=false;for(let i=0;i<ys.length;i++){const y=ys[i];if(y===null||y===undefined){if(skipNull){started=false;continue;}}if(!started){d+="M "+xAt(i)+" "+y;started=true;}else{d+=" L "+xAt(i)+" "+y;}}return d;};
  const ptsPathMain=linePath(ptsMain.map(p=>yPts(p)),false);
  const rankPathMain=linePath(rankMain.map(r=>yRank(r)),true);
  const ptsPathCmp=showCompare?linePath(ptsCompare.map(p=>yPts(p)),false):null;
  const rankPathCmp=showCompare?linePath(rankCompare.map(r=>yRank(r)),true):null;
  // Hover state
  const[hover,setHover]=useState(-1);
  // Step for X axis labels
  const xStep=Math.max(1,Math.floor(history.length/6));
  // Tick grid for points axis
  const ptsTicks=4;
  const otherPlayers=apprActive.filter(p=>p.id!==pl.id);
  return(<div style={{marginTop:16,paddingTop:16,borderTop:"1px solid "+W.gold+"22"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
      <h4 style={{fontSize:13,fontWeight:600,color:W.gold,margin:0,textTransform:"uppercase",letterSpacing:1}}>Evolución semanal</h4>
      <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
        {[[12,"3M"],[26,"6M"],[52,"12M"]].map(([wk,l])=>(<button key={l} style={snv(range===wk)} onClick={()=>setRange(wk)}>{l}</button>))}
      </div>
    </div>
    {!isMe&&(<div style={{marginBottom:10,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
      <span style={{fontSize:11,color:W.cream3}}>Comparar con:</span>
      <select style={{...ss,padding:"6px 10px",fontSize:12,width:"auto",minWidth:120}} value={compareId} onChange={e=>setCompareId(e.target.value)}>
        <option value="">— ninguno —</option>
        <option value={myId}>Yo ({pSh(myId)})</option>
        {otherPlayers.filter(p=>p.id!==myId).map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}
      </select>
    </div>)}
    <div style={{background:W.darkGreen,borderRadius:8,padding:"10px 6px 6px",border:"1px solid "+W.gold+"22",overflow:"hidden"}}>
      <svg viewBox={"0 0 "+W_+" "+H_} style={{width:"100%",height:"auto",display:"block"}} preserveAspectRatio="xMidYMid meet">
        {/* Y-axis ticks (left = points) */}
        {Array.from({length:ptsTicks+1}).map((_,i)=>{
          const v=Math.round((maxPts/ptsTicks)*i);
          const y=yPts(v);
          return(<g key={"ptick"+String(i)}>
            <line x1={padL} y1={y} x2={W_-padR} y2={y} stroke={W.gold+"11"} strokeWidth={1}/>
            <text x={padL-6} y={y+3} textAnchor="end" fontSize={9} fill={W.cream3}>{String(v)}</text>
          </g>);
        })}
        {/* Right axis labels (rank) */}
        {[1,Math.ceil(totalPlayers/2),totalPlayers].filter((v,i,a)=>a.indexOf(v)===i).map(r=>{
          const y=yRank(r);
          return(<text key={"rtick"+String(r)} x={W_-padR+6} y={y+3} textAnchor="start" fontSize={9} fill={W.cream3+"aa"}>#{String(r)}</text>);
        })}
        {/* X labels */}
        {history.map((h,i)=>{
          if(i%xStep!==0&&i!==history.length-1)return null;
          return(<text key={"xl"+String(i)} x={xAt(i)} y={H_-8} textAnchor="middle" fontSize={9} fill={W.cream3}>{h.label}</text>);
        })}
        {/* Compare lines (behind main) */}
        {showCompare&&rankPathCmp&&<path d={rankPathCmp} fill="none" stroke={W.cream2} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.6}/>}
        {showCompare&&ptsPathCmp&&<path d={ptsPathCmp} fill="none" stroke={W.cream2} strokeWidth={2} opacity={0.7}/>}
        {/* Main rank line (thin, cream) */}
        {rankPathMain&&<path d={rankPathMain} fill="none" stroke={W.cream3} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7}/>}
        {/* Main points line (thick, gold) */}
        {ptsPathMain&&<path d={ptsPathMain} fill="none" stroke={W.gold} strokeWidth={2.5}/>}
        {/* Hover dots */}
        {history.map((h,i)=>(<circle key={"dot"+String(i)} cx={xAt(i)} cy={yPts(h.points[pl.id]||0)} r={hover===i?4:2.5} fill={W.gold} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(-1)} style={{cursor:"crosshair"}}/>))}
        {/* Vertical hover line */}
        {hover>=0&&(<line x1={xAt(hover)} y1={padT} x2={xAt(hover)} y2={H_-padB} stroke={W.gold} strokeWidth={0.5} opacity={0.4}/>)}
      </svg>
    </div>
    <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:6,fontSize:11,color:W.cream3,justifyContent:"center"}}>
      <span><span style={{display:"inline-block",width:14,height:2.5,background:W.gold,verticalAlign:"middle",marginRight:4}}/>Puntos ({pSh(pl.id)})</span>
      <span><span style={{display:"inline-block",width:14,height:1.5,background:W.cream3,borderTop:"1.5px dashed "+W.cream3,verticalAlign:"middle",marginRight:4}}/>Ranking ({pSh(pl.id)})</span>
      {showCompare&&<span><span style={{display:"inline-block",width:14,height:2,background:W.cream2,verticalAlign:"middle",marginRight:4,opacity:.7}}/>{pSh(compareId)}</span>}
    </div>
    {hover>=0&&(<div style={{marginTop:8,padding:"8px 12px",background:W.card2,borderRadius:8,border:"1px solid "+W.gold+"33",fontSize:12}}>
      <div style={{color:W.cream3,fontSize:10,marginBottom:4}}>Semana {history[hover].label}</div>
      <div style={{color:W.cream}}>
        <strong style={{color:W.gold}}>{pSh(pl.id)}</strong>: {String(history[hover].points[pl.id]||0)}pts {history[hover].rank[pl.id]&&<span style={{color:W.cream3}}>(#{String(history[hover].rank[pl.id])})</span>}
      </div>
      {showCompare&&(<div style={{color:W.cream2,marginTop:2}}>
        <strong>{pSh(compareId)}</strong>: {String(history[hover].points[compareId]||0)}pts {history[hover].rank[compareId]&&<span style={{color:W.cream3}}>(#{String(history[hover].rank[compareId])})</span>}
      </div>)}
    </div>)}
  </div>);
}

// ==================== FORUM COMPONENTS ====================

// Renders text with @mentions highlighted in gold. Uses renderMentionSegments
// to split the raw text into alternating text/mention parts.
function MentionText({text}){
  const segs=renderMentionSegments(text,S.players);
  return(<span style={{whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{segs.map((seg,i)=>{
    if(seg.type==="mention"){
      const pl=pO(seg.playerId);
      const isMeMentioned=seg.playerId===myId;
      return(<span key={i} style={{color:isMeMentioned?W.warn:W.gold,fontWeight:600,background:isMeMentioned?W.warn+"18":"transparent",padding:isMeMentioned?"1px 4px":0,borderRadius:3,cursor:"pointer"}} onClick={()=>{if(pl)setModal({type:"profile",player:pl});}}>{seg.label}</span>);
    }
    return(<span key={i}>{seg.value}</span>);
  })}</span>);
}

// Reaction bar specific to forum messages/replies (stored in the forum array,
// not in matches). Mirrors the behaviour of ReactBar for matches.
function ForumReactBar({target}){
  // target: {kind:"msg", msgId} | {kind:"reply", msgId, replyId}
  const[showTip,setShowTip]=useState(null);
  const findRx=()=>{
    const msg=S.forum.find(m=>m.id===target.msgId);
    if(!msg)return{};
    if(target.kind==="msg")return msg.reactions||{};
    const reply=(msg.replies||[]).find(r=>r.id===target.replyId);
    return reply?(reply.reactions||{}):{};
  };
  const rx=findRx();
  const toggle=emoji=>{
    up(s=>({...s,forum:s.forum.map(m=>{
      if(m.id!==target.msgId)return m;
      if(target.kind==="msg"){
        const cur=(m.reactions||{})[emoji]||[];
        const mine=cur.includes(myId);
        return{...m,reactions:{...m.reactions,[emoji]:mine?cur.filter(u=>u!==myId):[...cur,myId]}};
      }
      return{...m,replies:(m.replies||[]).map(r=>{
        if(r.id!==target.replyId)return r;
        const cur=(r.reactions||{})[emoji]||[];
        const mine=cur.includes(myId);
        return{...r,reactions:{...r.reactions,[emoji]:mine?cur.filter(u=>u!==myId):[...cur,myId]}};
      })};
    })}));
  };
  return(<div style={{position:"relative"}}>
    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{REACTS.map(emoji=>{
      const users=rx[emoji]||[];
      const mine=users.includes(myId);
      return(<button key={emoji} onClick={e=>{e.stopPropagation();toggle(emoji);}} onMouseEnter={()=>users.length>0&&setShowTip(emoji)} onMouseLeave={()=>setShowTip(null)} style={{padding:"3px 7px",borderRadius:14,border:"1px solid "+(mine?W.gold:W.gold+"33"),background:mine?W.gold+"22":"transparent",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",gap:3}}>
        <span>{emoji}</span>{users.length>0&&<span style={{fontSize:10,color:mine?W.gold:W.cream3}}>{String(users.length)}</span>}
      </button>);
    })}</div>
    {showTip&&rx[showTip]&&rx[showTip].length>0&&(<div style={{position:"absolute",bottom:"100%",left:0,background:W.card2,border:"1px solid "+W.gold+"33",borderRadius:8,padding:"6px 10px",fontSize:12,color:W.cream,marginBottom:4,zIndex:10,whiteSpace:"nowrap",boxShadow:"0 4px 12px rgba(0,0,0,.5)"}}>{showTip+" "}{rx[showTip].map(u=>pSh(u)).join(", ")}</div>)}
  </div>);
}

// Text input with @-mention autocomplete. Calls onSubmit(text, mentionedIds) when user presses Enter or clicks the send button.
function ForumComposer({initialText,placeholder,onSubmit,onCancel,submitLabel,autoFocus}){
  const[text,setText]=useState(initialText||"");
  const[showMentions,setShowMentions]=useState(false);
  const[mentionQuery,setMentionQuery]=useState("");
  const[mentionStart,setMentionStart]=useState(-1);
  const[taRef,setTaRef]=useState(null);
  // Mention dropdown candidates: approved players, case-insensitive prefix match on nickname
  const candidates=appr.filter(p=>p.id!==myId&&p.nickname.toLowerCase().startsWith((mentionQuery||"").toLowerCase())).slice(0,6);

  const onChange=e=>{
    const val=e.target.value;
    if(val.length>MAX_FORUM_CHARS)return;
    setText(val);
    // Detect @... being typed at caret: find the last @ before caret with no space between
    const caret=e.target.selectionStart||val.length;
    let at=-1;
    for(let i=caret-1;i>=0;i--){
      const c=val[i];
      if(c==="@"){at=i;break;}
      if(/\s/.test(c))break;
    }
    if(at>=0){
      const q=val.substring(at+1,caret);
      if(/^[a-zA-Z0-9_áéíóúñüÁÉÍÓÚÑÜ]*$/.test(q)){
        setMentionStart(at);
        setMentionQuery(q);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
    setMentionStart(-1);
    setMentionQuery("");
  };

  const pickMention=p=>{
    if(mentionStart<0)return;
    const before=text.substring(0,mentionStart);
    const caret=taRef?taRef.selectionStart:text.length;
    const after=text.substring(caret);
    const inserted="@"+p.nickname+" ";
    const newText=before+inserted+after;
    if(newText.length>MAX_FORUM_CHARS)return;
    setText(newText);
    setShowMentions(false);
    setMentionStart(-1);
    setMentionQuery("");
    setTimeout(()=>{if(taRef){const pos=before.length+inserted.length;taRef.focus();taRef.setSelectionRange(pos,pos);}},10);
  };

  const submit=()=>{
    const t=text.trim();
    if(!t)return;
    const mentioned=parseMentions(t,S.players);
    onSubmit(t,mentioned);
    setText("");
  };

  const remaining=MAX_FORUM_CHARS-text.length;
  const counterColor=remaining<=0?W.danger:remaining<20?W.warn:W.cream3;

  return(<div style={{position:"relative"}}>
    <textarea ref={setTaRef} autoFocus={autoFocus} rows={2} style={{...si,resize:"vertical",minHeight:50,fontFamily:"inherit",lineHeight:1.4}} placeholder={placeholder||"Escribe un mensaje... usa @ para mencionar"} value={text} onChange={onChange} onKeyDown={e=>{
      if(e.key==="Enter"&&!e.shiftKey&&!showMentions){e.preventDefault();submit();}
      if(e.key==="Escape"&&showMentions){setShowMentions(false);}
    }}/>
    {showMentions&&candidates.length>0&&(<div style={{position:"absolute",top:"100%",left:0,right:0,background:W.card2,border:"1px solid "+W.gold+"55",borderRadius:8,marginTop:4,zIndex:20,maxHeight:200,overflowY:"auto",boxShadow:"0 4px 16px rgba(0,0,0,.5)"}}>
      {candidates.map(p=>(<div key={p.id} onClick={()=>pickMention(p)} style={{padding:"8px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid "+W.gold+"11"}} onMouseEnter={e=>e.currentTarget.style.background=W.gold+"18"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <Av player={p} size={24}/><span style={{fontWeight:600,color:W.cream}}>{p.nickname}</span><span style={{color:W.cream3,fontSize:11}}>{p.firstName+" "+p.lastName}</span>
      </div>))}
    </div>)}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,gap:8}}>
      <span style={{fontSize:11,color:counterColor,fontWeight:remaining<20?700:400}}>{String(remaining)+" / "+String(MAX_FORUM_CHARS)}</span>
      <div style={{display:"flex",gap:6}}>
        {onCancel&&<button style={{...sbt("ghost"),padding:"6px 12px",fontSize:12}} onClick={onCancel}>Cancelar</button>}
        <button style={{...sbt("primary"),padding:"6px 14px",fontSize:13,opacity:text.trim()?1:.4}} disabled={!text.trim()} onClick={submit}>{submitLabel||"Publicar"}</button>
      </div>
    </div>
  </div>);
}

// Edit form for an existing message or reply. Uses ForumComposer.
function ForumEditForm({target}){
  // target: {kind:"msg",msgId,initialText} | {kind:"reply",msgId,replyId,initialText}
  return(<ForumComposer initialText={target.initialText||""} autoFocus submitLabel="Guardar" onCancel={()=>setModal(null)} onSubmit={(newText,mentioned)=>{
    up(s=>({...s,forum:s.forum.map(m=>{
      if(m.id!==target.msgId)return m;
      if(target.kind==="msg")return{...m,text:newText,mentionedIds:mentioned,editedAt:now()};
      return{...m,replies:(m.replies||[]).map(r=>r.id===target.replyId?{...r,text:newText,mentionedIds:mentioned,editedAt:now()}:r)};
    })}));
    setModal(null);
    flash("Editado");
  }}/>);
}

// Renders a single forum message (with its replies) or a match entry (with its comments)
function ForumEntry({entry}){
  const[replying,setReplying]=useState(false);
  if(entry.kind==="match"){
    const m=entry.match;
    const nComments=(m.comments||[]).length;
    const nReactions=Object.values(m.reactions||{}).reduce((acc,arr)=>acc+(arr||[]).length,0);
    return(<div style={{...scd,padding:14,borderColor:W.lightGreen+"33",cursor:"pointer"}} onClick={()=>setModal({type:"detail",match:m})}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
        <span style={{fontSize:11,color:W.lightGreen,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>🎾 Partido con actividad</span>
        <span style={{fontSize:11,color:W.cream3,marginLeft:"auto"}}>{fmtD(entry.activityTs)}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
        <Av player={pO(m.player1)} size={28}/>
        <span style={{fontWeight:m.winner===m.player1?700:400,color:m.winner===m.player1?W.gold:W.cream}}>{pSh(m.player1)}</span>
        <span style={{color:W.cream3,fontSize:12}}>vs</span>
        <Av player={pO(m.player2)} size={28}/>
        <span style={{fontWeight:m.winner===m.player2?700:400,color:m.winner===m.player2?W.gold:W.cream}}>{pSh(m.player2)}</span>
        {m.score&&<span style={{color:W.cream2,fontSize:13,marginLeft:6}}>{m.score}</span>}
        <SfB s={m.surface}/>
      </div>
      <div style={{display:"flex",gap:10,fontSize:12,color:W.cream3}}>
        {nComments>0&&<span>💬 {String(nComments)} comentario{nComments!==1?"s":""}</span>}
        {nReactions>0&&<span>⚡ {String(nReactions)} reacción{nReactions!==1?"es":""}</span>}
        <span style={{marginLeft:"auto",color:W.gold,fontSize:11}}>Ver detalle →</span>
      </div>
    </div>);
  }
  // kind === "message"
  const msg=entry.message;
  const author=pO(msg.userId);
  const isMine=msg.userId===myId;
  const canEdit=isMine;
  const canDelete=isMine||isA;
  const replies=msg.replies||[];
  return(<div style={{...scd,padding:14,borderColor:msg.pinned?W.warn+"55":W.gold+"22",position:"relative"}}>
    {msg.pinned&&(<div style={{position:"absolute",top:-10,left:14,background:W.warn,color:"#1a0a0a",padding:"2px 10px",borderRadius:4,fontSize:10,fontWeight:700,letterSpacing:1}}>📌 FIJADO</div>)}
    <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
      <Av player={author} size={36}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2,flexWrap:"wrap"}}>
          <span style={{fontWeight:600,color:W.cream,cursor:"pointer"}} onClick={()=>author&&setModal({type:"profile",player:author})}>{author?author.nickname:"?"}</span>
          <span style={{fontSize:11,color:W.cream3}}>{fmtD(msg.date)}</span>
          {msg.editedAt&&<span style={{fontSize:10,color:W.cream3,fontStyle:"italic"}}>(editado)</span>}
        </div>
        <div style={{fontSize:14,color:W.cream,lineHeight:1.5}}><MentionText text={msg.text}/></div>
      </div>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginTop:8}}>
      <ForumReactBar target={{kind:"msg",msgId:msg.id}}/>
      <button style={{...sbt("ghost"),padding:"4px 10px",fontSize:11}} onClick={()=>setReplying(!replying)}>{replying?"Cancelar":"Responder"}</button>
      {canEdit&&<button style={{...sbt("ghost"),padding:"4px 10px",fontSize:11}} onClick={()=>setModal({type:"editForumMsg",target:{kind:"msg",msgId:msg.id,initialText:msg.text}})}>Editar</button>}
      {canDelete&&<button style={{...sbt("ghost"),padding:"4px 10px",fontSize:11,color:W.danger}} onClick={()=>setModal({type:"confirmDeleteMsg",target:{kind:"msg",msgId:msg.id}})}>Borrar</button>}
      {isA&&(<button style={{...sbt("ghost"),padding:"4px 10px",fontSize:11,color:msg.pinned?W.warn:W.cream3}} onClick={()=>up(s=>({...s,forum:s.forum.map(m=>m.id===msg.id?{...m,pinned:!m.pinned,pinnedAt:!m.pinned?now():null}:m)}))}>{msg.pinned?"Desfijar":"Fijar"}</button>)}
    </div>
    {replying&&(<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid "+W.gold+"11"}}>
      <ForumComposer autoFocus placeholder="Escribe una respuesta..." submitLabel="Responder" onCancel={()=>setReplying(false)} onSubmit={(text,mentioned)=>{
        up(s=>({...s,forum:s.forum.map(m=>m.id===msg.id?{...m,replies:[...(m.replies||[]),{id:uid(),userId:myId,text,mentionedIds:mentioned,date:now(),editedAt:null,reactions:{}}]}:m)}));
        setReplying(false);
      }}/>
    </div>)}
    {replies.length>0&&(<div style={{marginTop:12,paddingLeft:14,borderLeft:"2px solid "+W.gold+"22"}}>
      {[...replies].sort((a,b)=>a.date-b.date).map(r=>{
        const rAuthor=pO(r.userId);
        const rMine=r.userId===myId;
        return(<div key={r.id} style={{padding:"8px 0",borderBottom:"1px solid "+W.gold+"11"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:4}}>
            <Av player={rAuthor} size={24}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                <span style={{fontWeight:600,fontSize:13,color:W.cream}}>{rAuthor?rAuthor.nickname:"?"}</span>
                <span style={{fontSize:10,color:W.cream3}}>{fmtD(r.date)}</span>
                {r.editedAt&&<span style={{fontSize:9,color:W.cream3,fontStyle:"italic"}}>(editado)</span>}
              </div>
              <div style={{fontSize:13,color:W.cream,lineHeight:1.4,marginTop:2}}><MentionText text={r.text}/></div>
            </div>
          </div>
          <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
            <ForumReactBar target={{kind:"reply",msgId:msg.id,replyId:r.id}}/>
            {rMine&&<button style={{...sbt("ghost"),padding:"2px 8px",fontSize:10}} onClick={()=>setModal({type:"editForumMsg",target:{kind:"reply",msgId:msg.id,replyId:r.id,initialText:r.text}})}>Editar</button>}
            {(rMine||isA)&&<button style={{...sbt("ghost"),padding:"2px 8px",fontSize:10,color:W.danger}} onClick={()=>setModal({type:"confirmDeleteMsg",target:{kind:"reply",msgId:msg.id,replyId:r.id}})}>Borrar</button>}
          </div>
        </div>);
      })}
    </div>)}
  </div>);
}

function ForumView(){
  const{pinned,feed}=getForumActivity(S);
  const post=(text,mentioned)=>{
    up(s=>({...s,forum:[...(s.forum||[]),{id:uid(),userId:myId,text,mentionedIds:mentioned,date:now(),editedAt:null,pinned:false,pinnedAt:null,reactions:{},replies:[]}]}));
    flash("Publicado");
  };
  return(<div>
    <h2 style={{fontSize:18,fontWeight:700,marginBottom:6,color:W.gold}}>Foro</h2>
    <p style={{fontSize:12,color:W.cream3,marginBottom:16,lineHeight:1.5,fontStyle:"italic"}}>
      Mensajes cortos (máx. {String(MAX_FORUM_CHARS)} caracteres). Usa @ para mencionar a un jugador — le aparecerá destacado cuando abra el foro. Los partidos con comentarios o reacciones aparecen automáticamente aquí.
    </p>
    <div style={{...scd,padding:14}}>
      <ForumComposer onSubmit={post}/>
    </div>
    {pinned.length>0&&(<div style={{marginTop:16}}>
      <h3 style={{fontSize:13,fontWeight:600,color:W.warn,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>📌 Fijados</h3>
      {pinned.map(e=>(<ForumEntry key={e.message.id} entry={e}/>))}
    </div>)}
    {feed.length===0&&pinned.length===0&&(<div style={{...scd,textAlign:"center",color:W.cream3,fontSize:13,fontStyle:"italic",padding:30}}>Aún no hay actividad en el foro. ¡Sé el primero en escribir!</div>)}
    {feed.length>0&&(<div style={{marginTop:pinned.length>0?16:0}}>
      {pinned.length>0&&<h3 style={{fontSize:13,fontWeight:600,color:W.cream3,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Reciente</h3>}
      {feed.map(e=>{
        const key=e.kind==="match"?"m-"+e.match.id:"f-"+e.message.id;
        return(<ForumEntry key={key} entry={e}/>);
      })}
    </div>)}
  </div>);
}
}
