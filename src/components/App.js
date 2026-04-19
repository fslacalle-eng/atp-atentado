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
  computeHallOfFame, pickTop,
  seasonBoundsForDate, seasonIdFor, seasonNameFor, getCurrentSeasonInfo,
  computeSeasonStandings, buildClosedSeasonRecord,
  getAllChampions, isChampion, countChampionships,
  computeH2HDetails,
  getYearlyPodiums,
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

/**
 * Flash toast: slide-in notification shown at top of the viewport.
 * Variants: info (gold), success (green), warn (orange), error (red).
 * Accepts { text, type } object from the `msg` state.
 */
function FlashToast({msg}){
  if(!msg||!msg.text)return null;
  const type=msg.type||"info";
  const palettes={
    info:{bg:"linear-gradient(135deg,"+W.gold+",#b8941f)",fg:"#1a0a0a",ico:"",glow:"rgba(212,175,55,.45)"},
    success:{bg:"linear-gradient(135deg,"+W.lightGreen+",#3e7a3e)",fg:"#f5f0e1",ico:"✓ ",glow:"rgba(90,156,90,.45)"},
    warn:{bg:"linear-gradient(135deg,"+W.warn+",#a67c0f)",fg:"#1a0a0a",ico:"⚠ ",glow:"rgba(212,160,18,.45)"},
    error:{bg:"linear-gradient(135deg,"+W.danger+",#8f241e)",fg:"#f5f0e1",ico:"✗ ",glow:"rgba(192,57,43,.45)"},
  };
  const p=palettes[type]||palettes.info;
  return(<div key={msg.at} style={{
    position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",
    background:p.bg,color:p.fg,
    padding:"12px 22px",borderRadius:10,fontWeight:700,fontSize:14,
    zIndex:2000,letterSpacing:.3,maxWidth:"92vw",textAlign:"center",
    boxShadow:"0 6px 20px "+p.glow,
    animation:"flashIn .28s cubic-bezier(.2,.9,.3,1.2)",
    whiteSpace:"normal",wordBreak:"break-word",lineHeight:1.35,
  }}>
    <style>{"@keyframes flashIn{from{transform:translate(-50%,-24px);opacity:0}to{transform:translate(-50%,0);opacity:1}}"}</style>
    {p.ico&&<span style={{marginRight:4}}>{p.ico}</span>}
    {msg.text}
  </div>);
}

function SuspB(){return(<span style={{display:"inline-block",padding:"2px 7px",borderRadius:4,fontSize:10,fontWeight:700,background:W.danger+"22",color:W.danger,border:"1px solid "+W.danger+"55",letterSpacing:.5}}>SUSPENDIDO</span>);}

function FormDots({playerId,matches,surface}){
  const surfaceFilter=(surface&&surface!=="all")?surface:null;
  const last5=matches.filter(m=>!m.annulled&&m.status==="confirmed"&&(m.player1===playerId||m.player2===playerId)&&m.winner&&(!surfaceFilter||m.surface===surfaceFilter)).sort((a,b)=>b.date-a.date).slice(0,5);
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
const[S,setS]=useState(null);const[ld,setLd]=useState(true);const[view,setView]=useState("home");const[simH2HSub,setSimH2HSub]=useState("simulator");const[trophiesSub,setTrophiesSub]=useState("hof");const[auth,setAuth]=useState(()=>{try{if(typeof window==="undefined")return null;const raw=window.localStorage.getItem("atp-auth-v1");return raw?JSON.parse(raw):null;}catch{return null;}});const[lN,setLN]=useState("");const[lP,setLP]=useState("");const[showReg,setShowReg]=useState(false);const[rF,setRF]=useState({firstName:"",lastName:"",nickname:"",age:"",hand:"right",backhand:"two",password:"",email:"",photo:""});const[modal,setModal]=useState(null);const[tf,setTf]=useState("all");const[surfF,setSurfF]=useState("all");const[dateF,setDateF]=useState("");const[h1,setH1]=useState("");const[h2,setH2]=useState("");const[msg,setMsg]=useState(null);const[expT,setExpT]=useState(null);const[mTypeF,setMTypeF]=useState("all");const[mSurfF,setMSurfF]=useState("all");const[mStatusF,setMStatusF]=useState("played");const[forumLastSeen,setForumLastSeen]=useState(0);

useEffect(()=>{let unsub=null;let mounted=true;(async()=>{try{const stored=await loadState();if(mounted){if(stored&&stored.players&&stored.players.length>0){const migrated={...stored,players:stored.players.map(pl=>({...pl,suspended:pl.suspended||false})),forum:stored.forum||[]};setS({...DEFAULT_STATE,...migrated,config:{...DEFAULT_CONFIG,...(migrated.config||{})}});}else{const demo={...DEMO_STATE};await saveState(demo);setS(demo);}setLd(false);}unsub=subscribeState((data)=>{if(mounted&&data){const migrated={...data,players:(data.players||[]).map(pl=>({...pl,suspended:pl.suspended||false})),forum:data.forum||[]};setS({...DEFAULT_STATE,...migrated,config:{...DEFAULT_CONFIG,...(migrated.config||{})}});}});}catch(e){console.error("Init error:",e);if(mounted){setS({...DEMO_STATE});setLd(false);}}})();return()=>{mounted=false;if(unsub)unsub();};},[]);
const up=useCallback(fn=>{setS(p=>{const n=fn(p);saveState(n);return n;});},[]);
const hPh=(e,cb)=>{const f=e.target.files[0];if(!f)return;if(f.size>500000){flash("La imagen es demasiado grande (máx. 500KB)","error");return;}const r=new FileReader();r.onload=ev=>cb(ev.target.result);r.readAsDataURL(f);};
const flash=(text,type)=>{
  const t=type||"info";
  setMsg({text,type:t,at:Date.now()});
  // Haptic feedback on success (mobile only)
  if(t==="success"&&typeof navigator!=="undefined"&&navigator.vibrate){try{navigator.vibrate(30);}catch(_){}}
  setTimeout(()=>{setMsg(m=>{if(!m)return null;return Date.now()-m.at>=2900?null:m;});},3000);
};

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
const doL=()=>{if(lN.toLowerCase()==="admin"&&lP===S.adminPw){setAuth({id:"admin",isAdmin:true});setLN("");setLP("");return;}const p=S.players.find(x=>(x.nickname.toLowerCase()===lN.toLowerCase()||x.email.toLowerCase()===lN.toLowerCase())&&x.password===lP&&x.approved);if(p){setAuth({id:p.id,isAdmin:false});setLN("");setLP("");}else flash("Usuario o contraseña incorrectos","error");};
const doR=()=>{if(!rF.firstName.trim()||!rF.lastName.trim()||!rF.nickname.trim()||!rF.password.trim()||!rF.age||!rF.email.trim()){flash("Por favor, rellena todos los campos","warn");return;}if(S.players.some(p=>p.nickname.toLowerCase()===rF.nickname.toLowerCase()||p.email.toLowerCase()===rF.email.toLowerCase())||S.pending.some(p=>p.nickname.toLowerCase()===rF.nickname.toLowerCase())){flash("Ese nickname o email ya están en uso","error");return;}up(s=>({...s,pending:[...s.pending,{id:uid(),...rF,age:+rF.age,requestedAt:now()}]}));setRF({firstName:"",lastName:"",nickname:"",age:"",hand:"right",backhand:"two",password:"",email:"",photo:""});setShowReg(false);flash("Solicitud enviada — te avisaremos cuando el admin te apruebe","success");};
return(
<div style={{fontFamily:"'Georgia','Times New Roman',serif",background:"linear-gradient(180deg,"+W.bg2+" 0%,"+W.bg+" 100%)",color:W.cream,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{...scd,maxWidth:400,width:"100%",textAlign:"center",background:"linear-gradient(180deg,"+W.card+" 0%,"+W.card2+" 100%)",borderColor:W.gold+"44"}}>
<div style={{display:"flex",justifyContent:"center",margin:"0 auto 12px"}}><LogoSVG size={96}/></div>
<div style={{fontSize:11,color:W.cream3,letterSpacing:5,fontWeight:400,marginBottom:4,textTransform:"uppercase"}}>THE CHAMPIONSHIPS</div>
<h1 style={{fontSize:28,fontWeight:700,marginBottom:4,color:W.gold,fontFamily:"'Georgia',serif"}}>ATP Atentado</h1>
<div style={{width:60,height:2,background:"linear-gradient(90deg,transparent,"+W.gold+",transparent)",margin:"8px auto 20px"}}/>
{msg&&<FlashToast msg={msg}/>}
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

// Validates a single tennis set score: true if 6-X (X<5), 7-5, 7-6 or 6-7, 5-7, X-6(X<5).
// Empty set is neutral. Returns { valid, legal, full } where legal means the set is
// mathematically-possible, full means the set is resolved (someone won it).
const validateSet=(a,b)=>{
  if((a===""||a===undefined||a===null)&&(b===""||b===undefined||b===null))return{valid:true,legal:true,full:false};
  const na=parseInt(a),nb=parseInt(b);
  if(isNaN(na)||isNaN(nb))return{valid:true,legal:true,full:false};
  // Legal scores for a set: 6-0..4, 6-7 variants go via 7-6. 7-5, 7-6.
  const isHighLow=(hi,lo)=>{
    if(hi===6&&lo<=4)return true;
    if(hi===7&&(lo===5||lo===6))return true;
    return false;
  };
  const legal=isHighLow(na,nb)||isHighLow(nb,na);
  return{valid:legal,legal,full:legal};
};

function ScoreInput({p1Name,p2Name,bestOf,onBestOfChange,onScoreChange,onWinnerChange,showBestOfToggle}){
  const maxSets=bestOf||3;
  const setsNeeded=Math.ceil(maxSets/2);
  const[sets,setSets]=useState([{a:"",b:""},{a:"",b:""},{a:"",b:""},{a:"",b:""},{a:"",b:""}]);
  const update=(i,side,val)=>{
    const v=val.replace(/[^0-9]/g,"").slice(0,1);
    const ns=[...sets];ns[i]={...ns[i],[side]:v};setSets(ns);
    // Require every completed set to be legal before emitting score/winner
    let sW1=0,sW2=0,scoreStr="";const parts=[];let anyIllegal=false;
    for(let j=0;j<maxSets;j++){
      const a=parseInt(ns[j].a);const b=parseInt(ns[j].b);
      if(isNaN(a)||isNaN(b))break;
      const vs=validateSet(ns[j].a,ns[j].b);
      if(!vs.legal){anyIllegal=true;break;}
      parts.push(a+"-"+b);
      if(a>b)sW1++;else if(b>a)sW2++;
      if(sW1>=setsNeeded||sW2>=setsNeeded)break;
    }
    if(anyIllegal){
      onScoreChange("");
      onWinnerChange(null);
      return;
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
  const anyInvalid=sets.slice(0,visibleSets).some(s=>!validateSet(s.a,s.b).legal);

  const cellSt={width:36,height:36,textAlign:"center",fontSize:16,fontWeight:700,borderRadius:6,border:"1px solid "+W.gold+"33",background:W.darkGreen,color:W.cream,outline:"none",fontFamily:"inherit"};
  const invalidCellSt={...cellSt,border:"1px solid "+W.danger,background:W.danger+"22"};
  return(<div>
    {showBestOfToggle&&(<div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}><span style={{fontSize:12,color:W.cream3}}>Formato:</span>{[3,5].map(n=>(<button key={n} style={{...snv(bestOf===n),padding:"6px 12px",fontSize:12}} onClick={()=>{onBestOfChange(n);setSets([{a:"",b:""},{a:"",b:""},{a:"",b:""},{a:"",b:""},{a:"",b:""}]);onScoreChange("");onWinnerChange(null);}}>{n===3?"Al mejor de 3":"Al mejor de 5"}</button>))}</div>)}
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:80,fontSize:13,fontWeight:600,color:W.gold,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p1Name||"J1"}</div>
        {Array.from({length:visibleSets}).map((_,i)=>{const vs=validateSet(sets[i].a,sets[i].b);return(<input key={"a"+i} style={{...(vs.legal?cellSt:invalidCellSt),color:parseInt(sets[i].a)>parseInt(sets[i].b)?W.gold:(vs.legal?W.cream:W.danger)}} value={sets[i].a} onChange={e=>update(i,"a",e.target.value)} placeholder="-" inputMode="numeric" maxLength={1}/>);})}
        {matchOver&&!anyInvalid&&<span style={{fontSize:14,fontWeight:700,color:sW1>sW2?W.gold:W.cream3,marginLeft:8}}>{sW1>sW2?"GANA":""}</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:80,fontSize:13,fontWeight:600,color:W.gold,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p2Name||"J2"}</div>
        {Array.from({length:visibleSets}).map((_,i)=>{const vs=validateSet(sets[i].a,sets[i].b);return(<input key={"b"+i} style={{...(vs.legal?cellSt:invalidCellSt),color:parseInt(sets[i].b)>parseInt(sets[i].a)?W.gold:(vs.legal?W.cream:W.danger)}} value={sets[i].b} onChange={e=>update(i,"b",e.target.value)} placeholder="-" inputMode="numeric" maxLength={1}/>);})}
        {matchOver&&!anyInvalid&&<span style={{fontSize:14,fontWeight:700,color:sW2>sW1?W.gold:W.cream3,marginLeft:8}}>{sW2>sW1?"GANA":""}</span>}
      </div>
    </div>
    {anyInvalid&&(<div style={{fontSize:11,color:W.danger,marginTop:6,fontStyle:"italic"}}>⚠️ Marcador de set inválido. Los sets legales son: 6-0, 6-1, 6-2, 6-3, 6-4, 7-5, 7-6 (o a la inversa).</div>)}
    {visibleSets>0&&(<div style={{display:"flex",gap:4,marginTop:6}}>{Array.from({length:visibleSets}).map((_,i)=>(<div key={i} style={{width:36,textAlign:"center",fontSize:9,color:W.cream3}}>{"Set "+(i+1)}</div>))}</div>)}
  </div>);
}

function Mdl({title,children}){return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}} onClick={()=>setModal(null)}><div style={{background:"linear-gradient(180deg,"+W.card+" 0%,"+W.card2+" 100%)",borderRadius:14,padding:24,maxWidth:520,width:"100%",maxHeight:"85vh",overflowY:"auto",border:"1px solid "+W.gold+"33",boxShadow:"0 8px 32px rgba(0,0,0,.6)"}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h3 style={{fontSize:18,fontWeight:700,margin:0,color:W.gold,fontFamily:"'Georgia',serif"}}>{title}</h3><button onClick={()=>setModal(null)} style={{background:"none",border:"none",color:W.cream3,cursor:"pointer",fontSize:20}}>✕</button></div>{children}</div></div>);}

function ReactBar({matchId}){const m=S.matches.find(x=>x.id===matchId);const[showTip,setShowTip]=useState(null);if(!m)return null;const rx=m.reactions||{};return(<div style={{position:"relative"}}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{REACTS.map(emoji=>{const users=rx[emoji]||[];const mine=users.includes(myId);return(<button key={emoji} onClick={e=>{e.stopPropagation();up(s=>({...s,matches:s.matches.map(x=>x.id===matchId?{...x,reactions:{...x.reactions,[emoji]:mine?(x.reactions[emoji]||[]).filter(u=>u!==myId):[...(x.reactions[emoji]||[]),myId]}}:x)}));}} onMouseEnter={()=>users.length>0&&setShowTip(emoji)} onMouseLeave={()=>setShowTip(null)} style={{padding:"4px 8px",borderRadius:16,border:"1px solid "+(mine?W.gold:W.gold+"33"),background:mine?W.gold+"22":"transparent",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",gap:3}}><span>{emoji}</span>{users.length>0&&<span style={{fontSize:11,color:mine?W.gold:W.cream3}}>{String(users.length)}</span>}</button>);})}</div>{showTip&&rx[showTip]&&rx[showTip].length>0&&(<div style={{position:"absolute",bottom:"100%",left:0,background:W.card2,border:"1px solid "+W.gold+"33",borderRadius:8,padding:"6px 10px",fontSize:12,color:W.cream,marginBottom:4,zIndex:10,whiteSpace:"nowrap",boxShadow:"0 4px 12px rgba(0,0,0,.5)"}}>{showTip+" "}{rx[showTip].map(u=>pSh(u)).join(", ")}</div>)}</div>);}

function MatchDetailView(){const m=modal.match;const cms=m.comments||[];const[cm,setCm]=useState("");const rivalId=m.player1===myId?m.player2:m.player1;return(<Mdl title={pSh(m.player1)+" vs "+pSh(m.player2)}><div style={{display:"flex",justifyContent:"center",gap:16,alignItems:"center",marginBottom:16}}><div style={{textAlign:"center"}}><Av player={pO(m.player1)} size={48}/><div style={{fontSize:13,fontWeight:m.winner===m.player1?700:400,color:m.winner===m.player1?W.gold:W.cream,marginTop:4}}>{pSh(m.player1)}</div></div><div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:700,color:W.gold}}>{m.score||"vs"}</div><div style={{fontSize:11,color:W.cream3}}>{fmtD(m.date)}</div><SfB s={m.surface}/>{m.status==="pending"&&<div style={{...bdg(W.warn),marginTop:4}}>Pendiente</div>}{m.status==="disputed"&&<div style={{...bdg(W.danger),marginTop:4}}>Disputado</div>}</div><div style={{textAlign:"center"}}><Av player={pO(m.player2)} size={48}/><div style={{fontSize:13,fontWeight:m.winner===m.player2?700:400,color:m.winner===m.player2?W.gold:W.cream,marginTop:4}}>{pSh(m.player2)}</div></div></div>{m.status==="pending"&&myId===rivalId&&(<div style={{display:"flex",gap:8,marginBottom:12}}><button style={{...sbt("primary"),flex:1}} onClick={()=>{up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,status:"confirmed"}:x)}));setModal(null);flash("Partido confirmado","success");}}>Confirmar</button><button style={{...sbt("danger"),flex:1}} onClick={()=>{up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,status:"disputed"}:x)}));setModal(null);flash("Partido marcado como disputado","warn");}}>Disputar</button></div>)}{m.status==="pending"&&isA&&(<button style={{...sbt("primary"),width:"100%",marginBottom:12}} onClick={()=>{up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,status:"confirmed"}:x)}));setModal(null);}}>Validar (admin)</button>)}{m.status==="disputed"&&isA&&(<div style={{display:"flex",gap:8,marginBottom:12}}><button style={{...sbt("primary"),flex:1}} onClick={()=>{up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,status:"confirmed"}:x)}));setModal(null);}}>Confirmar</button><button style={{...sbt("danger"),flex:1}} onClick={()=>{up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,annulled:true}:x)}));setModal(null);}}>Anular</button></div>)}{isA&&m.status==="confirmed"&&!m.annulled&&(<button style={{...sbt("danger"),width:"100%",marginBottom:12}} onClick={()=>{up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,annulled:true}:x)}));setModal(null);}}>Anular</button>)}{isA&&m.annulled&&(<button style={{...sbt("primary"),width:"100%",marginBottom:12}} onClick={()=>{up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,annulled:false}:x)}));setModal(null);flash("Partido restaurado","success");}}>Desanular</button>)}<div style={{marginBottom:12}}><ReactBar matchId={m.id}/></div><h4 style={{fontSize:14,fontWeight:600,marginBottom:8,color:W.gold}}>Comentarios</h4><div style={{maxHeight:200,overflowY:"auto",marginBottom:8}}>{cms.length===0&&<div style={{color:W.cream3,fontSize:13,fontStyle:"italic"}}>Sin comentarios</div>}{cms.map((c,i)=>(<div key={String(i)} style={{padding:"8px 0",borderBottom:"1px solid "+W.gold+"11",fontSize:13}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><Av player={pO(c.userId)} size={20}/><span style={{fontWeight:600,color:W.cream}}>{pSh(c.userId)}</span><span style={{color:W.cream3,fontSize:11}}>{fmtD(c.date)}</span></div><div style={{color:W.cream2}}>{c.text}</div></div>))}</div><div style={{display:"flex",gap:8}}><input style={{...si,flex:1,padding:"8px 12px"}} placeholder="Escribe..." value={cm} onChange={e=>setCm(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&cm.trim()){up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,comments:[...(x.comments||[]),{userId:myId,text:cm.trim(),date:now()}]}:x)}));setCm("");}}} /><button style={{...sbt("primary"),padding:"8px 14px"}} onClick={()=>{if(!cm.trim())return;up(s=>({...s,matches:s.matches.map(x=>x.id===m.id?{...x,comments:[...(x.comments||[]),{userId:myId,text:cm.trim(),date:now()}]}:x)}));setCm("");}}>{">"}</button></div></Mdl>);}

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
      flash(isA?"Partido registrado":"Partido enviado — pendiente de confirmación del rival","success");
    }}>REGISTRAR</button>
  </Mdl>);
}

function BracketMatchModal(){const{tournament:t,round,matchIdx,bracketMatch:bm}=modal;const[w,sw]=useState("");const[scr,sscr]=useState(bm.score||"");const[dt,sdt]=useState(toI(now()));const[sf,ssf]=useState("Dura");const[bo,setBo]=useState(3);const[eP1,seP1]=useState(bm.p1||"");const[eP2,seP2]=useState(bm.p2||"");const tp=S.players.filter(p=>t.players.includes(p.id));const rl=round==="r16"?"Octavos":round==="qf"?"Cuartos":round==="sf"?"Semifinal":"Final";const titleP1=eP1?pSh(eP1):"TBD";const titleP2=eP2?pSh(eP2):"TBD";const actualW=w==="p1"?eP1:w==="p2"?eP2:"";return(<Mdl title={rl+": "+titleP1+" vs "+titleP2}><div style={{display:"flex",justifyContent:"center",gap:20,alignItems:"center",marginBottom:16}}><div style={{textAlign:"center"}}>{eP1?<Av player={pO(eP1)} size={48}/>:<div style={{width:48,height:48,borderRadius:"50%",background:W.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:W.cream3}}>?</div>}<div style={{fontSize:13,marginTop:4,fontWeight:600,color:W.gold}}>{titleP1}</div></div><div style={{fontSize:18,color:W.cream3}}>vs</div><div style={{textAlign:"center"}}>{eP2?<Av player={pO(eP2)} size={48}/>:<div style={{width:48,height:48,borderRadius:"50%",background:W.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:W.cream3}}>?</div>}<div style={{fontSize:13,marginTop:4,fontWeight:600,color:W.gold}}>{titleP2}</div></div></div>{isA&&(<div style={{background:W.darkGreen,borderRadius:8,padding:10,marginBottom:12,border:"1px solid "+W.gold+"22"}}><div style={{fontSize:11,color:W.warn,marginBottom:6}}>Admin: asignar / cambiar jugadores</div><div style={{display:"flex",gap:8}}><select style={{...ss,flex:1}} value={eP1} onChange={e=>{seP1(e.target.value);sw("");}}><option value="">Seleccionar...</option>{tp.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select><select style={{...ss,flex:1}} value={eP2} onChange={e=>{seP2(e.target.value);sw("");}}><option value="">Seleccionar...</option>{tp.filter(p=>p.id!==eP1).map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select></div></div>)}{eP1&&eP2&&(<><label style={slb}>Fecha</label><input style={{...si,marginBottom:8}} type="date" value={dt} onChange={e=>sdt(e.target.value)}/><label style={slb}>Superficie</label><select style={{...ss,marginBottom:8}} value={sf} onChange={e=>ssf(e.target.value)}>{SURFS.map(s=>(<option key={s} value={s}>{s}</option>))}</select><label style={slb}>Resultado</label><div style={{marginBottom:12}}><ScoreInput p1Name={pSh(eP1)} p2Name={pSh(eP2)} bestOf={bo} onBestOfChange={setBo} showBestOfToggle={true} onScoreChange={s=>sscr(s)} onWinnerChange={side=>sw(side||"")}/></div></>)}{bm.winner&&<div style={{...bdg(W.cream3),marginBottom:8}}>Sobreescribir resultado anterior</div>}<button style={{...sbt("primary"),width:"100%"}} onClick={()=>{if(!eP1||!eP2)return;
if(!actualW){up(s=>{const t2={...s.tournaments.find(x=>x.id===t.id)};if(!t2.bracket)return s;const uR=[...(t2.bracket[round]||[])];uR[matchIdx]={...uR[matchIdx],p1:eP1,p2:eP2};t2.bracket={...t2.bracket,[round]:uR};return{...s,tournaments:s.tournaments.map(x=>x.id===t.id?t2:x)};});setModal(null);flash("Jugadores asignados al cuadro","success");return;}const mid=uid();const ac=isA;up(s=>{const t2={...s.tournaments.find(x=>x.id===t.id)};if(!t2.bracket)return s;const uR=[...(t2.bracket[round]||[])];uR[matchIdx]={...uR[matchIdx],p1:eP1,p2:eP2,winner:actualW,score:scr,status:ac?"confirmed":"pending"};t2.bracket={...t2.bracket,[round]:uR};if(ac){const allDone=uR.every(m=>m.winner&&m.status==="confirmed");const nr=nRM[round];if(allDone&&nr&&(!t2.bracket[nr]||t2.bracket[nr].length===0)){const nm=[];for(let i=0;i<uR.length;i+=2){if(i+1<uR.length)nm.push({p1:uR[i].winner,p2:uR[i+1].winner,winner:null,score:"",status:"pending_play"});}t2.bracket={...t2.bracket,[nr]:nm};}}const mObj={id:mid,player1:eP1,player2:eP2,winner:actualW,score:scr,date:frI(dt),phase:round,status:ac?"confirmed":"pending",submittedBy:myId};t2.matches=[...t2.matches,mObj];return{...s,tournaments:s.tournaments.map(x=>x.id===t.id?t2:x),matches:[...s.matches,{id:mid,player1:eP1,player2:eP2,winner:actualW,score:scr,date:frI(dt),points:0,countsForStandings:false,isChallenge:false,tournamentId:t.id,annulled:false,surface:sf,status:ac?"confirmed":"pending",submittedBy:myId,reactions:{},comments:[]}]};});setModal(null);}}>{eP1&&eP2&&!actualW?"ASIGNAR JUGADORES":actualW?"REGISTRAR":"SELECCIONAR JUGADORES"}</button></Mdl>);}

const pendM=S.matches.filter(m=>m.status==="pending"&&!m.annulled&&(m.player1===myId||m.player2===myId)&&m.submittedBy!==myId);
const dispM=isA?S.matches.filter(m=>m.status==="disputed"&&!m.annulled):[];
const pendCh=S.challenges.filter(c=>c.status==="pending"&&c.targetId===myId);
const rc=[W.gold,W.silver,W.bronze];

const mCat=m=>{if(m.tournamentId)return{label:"Torneo",color:W.lightGreen};if(m.isChallenge)return{label:"Reto",color:W.warn};if(!m.countsForStandings)return{label:"Amistoso",color:W.cream3};return{label:"Liga Regular",color:W.blue};};
const matchCard=m=>{const cat=mCat(m);return(<div key={m.id} style={{...scd,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,opacity:m.annulled?.3:m.status==="pending"?.6:1,cursor:"pointer"}} onClick={()=>setModal({type:"detail",match:m})}><div><span style={{fontWeight:m.winner===m.player1?700:400,color:m.winner===m.player1?W.gold:W.cream}}>{pSh(m.player1)}</span><span style={{color:W.cream3,margin:"0 8px"}}>vs</span><span style={{fontWeight:m.winner===m.player2?700:400,color:m.winner===m.player2?W.gold:W.cream}}>{pSh(m.player2)}</span>{m.score&&<span style={{color:W.cream2,marginLeft:8,fontSize:13}}>{m.score}</span>}</div><div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}><SfB s={m.surface}/><span style={bdg(cat.color)}>{cat.label}</span>{m.annulled&&<span style={bdg(W.danger)}>ANULADO</span>}{m.status==="pending"&&<span style={bdg(W.warn)}>Pendiente</span>}{m.status==="disputed"&&<span style={bdg(W.danger)}>Disputado</span>}{(m.comments||[]).length>0&&<span style={{fontSize:11,color:W.cream3}}>{"💬"+String(m.comments.length)}</span>}<span style={{fontSize:12,color:W.cream3}}>{fmtD(m.date)}</span></div></div>);};

const forumHasNew=hasUnreadForumActivity(S,forumLastSeen);
const tabs=[["home","Inicio"],["standings","Clasif."],["matches","Partidos"+(pendM.length+dispM.length>0?" ("+String(pendM.length+dispM.length)+")":"")],["simH2H","Simulador / H2H"],["tournaments","Torneos"],["challenges","Retos"+(pendCh.length>0?" ("+String(pendCh.length)+")":"")],["trophies","Trofeos"],["forum","Foro"],...(isA?[["admin","Admin"+(S.pending.length>0?" ("+String(S.pending.length)+")":"")]]:[])]
const cfg=S.config;
const equityBonusPts=Math.floor(cfg.eloBase*(1+cfg.equityBonusPct/100));
const equityThresholdPts=cfg.equityMatchesGap*cfg.eloBase;
const inactExampleBase=600;
const inactExamplePenalty=Math.floor(inactExampleBase*(cfg.inactPct/100));
const sysR=[
  {label:"Puntos por victoria (partido regular)",key:"eloBase",suf:" pts",
   desc:"Cantidad de puntos que obtiene el ganador de un partido regular. No aplica a torneos, que cuentan con su propio sistema de puntuación. Esta cifra base puede verse afectada por el sistema de equidad descrito en la siguiente regla."},
  {label:"Sistema de equidad — % de bonificación",key:"equityBonusPct",suf:" %",
   desc:"Bonificación porcentual que se aplica sobre los puntos base para el jugador peor clasificado en el momento del partido, cuando consigue la victoria. Se activa cuando la diferencia de puntos entre ambos supera el umbral definido en la siguiente regla — sin importar si es la primera vez que se enfrentan o no. Con la configuración actual, el ganador recibiría "+String(equityBonusPts)+" puntos (en lugar de "+String(cfg.eloBase)+"). Los resultados con decimales se redondean siempre hacia abajo."},
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
{msg&&<FlashToast msg={msg}/>}
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 0 16px",borderBottom:"1px solid "+W.gold+"33",marginBottom:20,flexWrap:"wrap",gap:12}}>
<div style={{display:"flex",alignItems:"center",gap:12}}><LogoSVG size={56}/><div><div style={{fontSize:10,color:W.cream3,letterSpacing:4,textTransform:"uppercase"}}>The Championships</div><span style={{fontSize:22,fontWeight:700,color:W.gold}}>ATP Atentado</span></div></div>
<div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:13,color:W.cream2}}>{isA?"Admin":pSh(myId)}{amISuspended&&<span style={{color:W.danger,marginLeft:6,fontWeight:700}}>(Suspendido)</span>}</span><button style={{...sbt("ghost"),padding:"6px 12px",fontSize:12}} onClick={()=>setAuth(null)}>Salir</button></div>
</div>
{S.announcement&&S.announcement.active&&S.announcement.text&&(<div style={{background:"linear-gradient(135deg,"+W.warn+"33,"+W.gold+"22)",border:"2px solid "+W.warn,borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"flex-start",gap:12,position:"relative"}}>
  <span style={{fontSize:22,flexShrink:0}}>📢</span>
  <div style={{flex:1,minWidth:0}}>
    <div style={{fontSize:10,color:W.warn,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:4}}>Aviso del admin</div>
    <div style={{fontSize:14,color:W.cream,lineHeight:1.5,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{S.announcement.text}</div>
    {S.announcement.date&&<div style={{fontSize:10,color:W.cream3,marginTop:6,fontStyle:"italic"}}>{"Publicado "+fmtD(S.announcement.date)}</div>}
  </div>
</div>)}
{amISuspended&&!isA&&(<div style={{background:W.danger+"22",border:"1px solid "+W.danger,borderRadius:8,padding:"12px 16px",marginBottom:16,color:W.cream,fontSize:13,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>⚠️</span><div><strong style={{color:W.danger}}>Jugador suspendido.</strong> No puedes registrar partidos ni ser retado mientras dure la suspensión. Tus puntos permanecen congelados y no se aplica penalización por inactividad.</div></div>)}
{!isA&&!amISuspended&&(()=>{const du=daysUntilInactivityPenalty(S,myId);if(du===null||du>7)return null;const inactPct=S.config.inactPct;if(du>0)return(<div style={{background:W.warn+"22",border:"1px solid "+W.warn,borderRadius:8,padding:"12px 16px",marginBottom:16,color:W.cream,fontSize:13,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><span style={{fontSize:20}}>⏰</span><div style={{flex:1,minWidth:200}}><strong style={{color:W.warn}}>Penalización por inactividad próxima.</strong> Te {du===1?"queda 1 día":"quedan "+String(du)+" días"} para perder el {String(inactPct)}% de tus puntos. Juega un partido para resetear el contador.</div><button style={{...sbt("ghost"),padding:"6px 12px",fontSize:12}} onClick={()=>{setView("standings");setModal({type:"profile",player:myPlayer});}}>Ver rivales disponibles</button></div>);return(<div style={{background:W.danger+"22",border:"1px solid "+W.danger,borderRadius:8,padding:"12px 16px",marginBottom:16,color:W.cream,fontSize:13,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><span style={{fontSize:20}}>⚠️</span><div style={{flex:1,minWidth:200}}><strong style={{color:W.danger}}>Inactividad en curso.</strong> Ya has pasado el periodo de inactividad. Al siguiente cálculo perderás el {String(inactPct)}% de tus puntos. Juega cuanto antes.</div><button style={{...sbt("ghost"),padding:"6px 12px",fontSize:12}} onClick={()=>{setView("standings");setModal({type:"profile",player:myPlayer});}}>Ver rivales disponibles</button></div>);})()}
<nav style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:20}}>{tabs.map(([id,l])=>(<button key={id} style={{...snv(view===id),position:"relative"}} onClick={()=>setView(id)}>{l}{id==="forum"&&forumHasNew&&view!=="forum"&&<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:W.danger,marginLeft:6,verticalAlign:"middle",boxShadow:"0 0 6px "+W.danger}}/>}</button>))}</nav>

  {view==="home"&&(<HomeView/>)}

  {view==="standings"&&(<div><SeasonBanner/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}><h2 style={{fontSize:18,fontWeight:700,margin:0,color:W.gold,fontFamily:"'Georgia',serif"}}>Clasificacion</h2><div style={{display:"flex",gap:3,flexWrap:"wrap",alignItems:"center"}}>{[["all","Todo"],["3m","3M"],["6m","6M"],["12m","1A"]].map(([k,l])=>(<button key={k} style={snv(tf===k)} onClick={()=>setTf(k)}>{l}</button>))}<span style={{width:1,height:20,background:W.gold+"33",margin:"0 3px"}}/>{[["all","Todas"],...SURFS.map(s=>[s,s])].map(([k,l])=>(<button key={k} style={snv(surfF===k)} onClick={()=>setSurfF(k)}>{l}</button>))}</div></div>
  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}><span style={{fontSize:12,color:W.cream3}}>Fecha exacta:</span><input type="date" style={{...si,width:160,padding:"6px 10px",fontSize:12}} value={dateF} onChange={e=>setDateF(e.target.value)}/>{dateF&&<button style={{...sbt("ghost"),padding:"4px 10px",fontSize:11}} onClick={()=>setDateF("")}>Limpiar</button>}{dateF&&<span style={{fontSize:11,color:W.warn}}>Clasificacion al {fmtD(frI(dateF))}</span>}</div>
  <div style={{...scd,padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{["#","Jugador","V","D","%","Forma","Pts"].map((h,i)=>(<th key={h} style={{textAlign:i>1?(i===6?"right":"center"):"left",padding:"10px 8px",borderBottom:"2px solid "+W.gold+"33",color:W.cream3,fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>{h}</th>))}</tr></thead><tbody>{standings.map((p,i)=>{const suspended=p.suspended;return(<tr key={p.id} style={{background:suspended?W.danger+"11":(i%2===0?"transparent":W.darkGreen+"40"),cursor:"pointer",transition:"background .15s",opacity:suspended?0.65:1}} onClick={()=>setModal({type:"profile",player:p})}><td style={{padding:"10px 8px"}}><span style={{fontWeight:700,color:suspended?W.danger:(i<3?rc[i]:W.cream3)}}>{String(i+1)}</span></td><td style={{padding:"10px 8px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><Av player={p} size={30}/><div><div style={{fontWeight:600,fontSize:13,color:suspended?W.cream3:W.cream,display:"flex",alignItems:"center",gap:6}}>{p.firstName+" "+p.lastName}<ChampionBadge playerId={p.id} size={12}/>{suspended&&<SuspB/>}</div><div style={{fontSize:10,color:W.cream3,fontStyle:"italic"}}>{'"'+p.nickname+'"'}</div></div></div></td><td style={{padding:"10px 8px",textAlign:"center",color:W.lightGreen,fontWeight:600}}>{String(p.wins)}</td><td style={{padding:"10px 8px",textAlign:"center",color:W.danger,fontWeight:600}}>{String(p.losses)}</td><td style={{padding:"10px 8px",textAlign:"center",color:W.cream2}}>{p.winRate+"%"}</td><td style={{padding:"10px 6px",textAlign:"center"}}><FormDots playerId={p.id} matches={S.matches} surface={surfF}/></td><td style={{padding:"10px 8px",textAlign:"right",fontWeight:700,fontSize:16,color:suspended?W.cream3:W.gold}}>{String(p.points)}{suspended&&<span style={{fontSize:9,color:W.danger,marginLeft:4}}>❄</span>}</td></tr>);})}</tbody></table></div></div>)}

  {view==="matches"&&(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}><h2 style={{fontSize:18,fontWeight:700,margin:0,color:W.gold}}>Partidos</h2><div style={{display:"flex",gap:6}}><button style={{...sbt("ghost"),padding:"8px 14px",fontSize:13,opacity:amISuspended&&!isA?0.4:1}} disabled={amISuspended&&!isA} onClick={()=>{if(amISuspended&&!isA){flash("No puedes hacer esto: estás suspendido","error");return;}setModal("schedule");}}>+ Programar</button><button style={{...sbt("primary"),opacity:amISuspended&&!isA?0.4:1}} disabled={amISuspended&&!isA} onClick={()=>{if(amISuspended&&!isA){flash("No puedes hacer esto: estás suspendido","error");return;}setModal("match");}}>+ Resultado</button></div></div>
  <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}><span style={{fontSize:11,color:W.cream3,marginRight:4}}>Estado:</span>{[["all","Todos"],["played","Jugados"],["scheduled","Próximamente"]].map(([k,l])=>(<button key={k} style={snv(mStatusF===k)} onClick={()=>setMStatusF(k)}>{l}</button>))}</div>
  {mStatusF!=="scheduled"&&(<div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}><span style={{fontSize:11,color:W.cream3,marginRight:4}}>Tipo:</span>{[["all","Todos"],["regular","Regular"],["torneo","Torneo"],["amistoso","Amistoso"],["reto","Reto"]].map(([k,l])=>(<button key={k} style={snv(mTypeF===k)} onClick={()=>setMTypeF(k)}>{l}</button>))}<span style={{width:1,height:20,background:W.gold+"33",margin:"0 4px"}}/><span style={{fontSize:11,color:W.cream3,marginRight:4}}>Superficie:</span>{[["all","Todas"],...SURFS.map(s=>[s,s])].map(([k,l])=>(<button key={k} style={snv(mSurfF===k)} onClick={()=>setMSurfF(k)}>{l}</button>))}</div>)}
  {mStatusF!=="played"&&(()=>{const sched=S.matches.filter(m=>!m.annulled&&m.status==="scheduled"&&!m.winner&&!m.tournamentId).sort((a,b)=>a.date-b.date);if(sched.length===0)return mStatusF==="scheduled"?<div style={{...scd,color:W.cream3,fontSize:13,fontStyle:"italic",textAlign:"center"}}>No hay partidos programados.</div>:null;return(<div style={{marginBottom:16}}><h3 style={{fontSize:14,fontWeight:600,color:W.blue,marginBottom:8}}>Próximamente</h3>{sched.map(m=>{const expired=isScheduledExpired(m);const canManage=isA||m.player1===myId||m.player2===myId;return(<div key={m.id} style={{...scd,padding:14,borderColor:expired?W.warn+"55":W.blue+"33",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}><div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:200}}><Av player={pO(m.player1)} size={28}/><span style={{fontWeight:600,color:W.cream}}>{pSh(m.player1)}</span><span style={{color:W.cream3,fontSize:12}}>vs</span><Av player={pO(m.player2)} size={28}/><span style={{fontWeight:600,color:W.cream}}>{pSh(m.player2)}</span></div><div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}><SfB s={m.surface}/><span style={{fontSize:12,color:expired?W.warn:W.cream3,fontWeight:expired?600:400}}>{fmtD(m.date)}</span>{expired&&<span style={bdg(W.warn)}>Caducado</span>}{canManage&&<button style={{...sbt("primary"),padding:"6px 12px",fontSize:12}} onClick={()=>setModal({type:"resolveScheduled",scheduled:m})}>Registrar resultado</button>}{canManage&&<button style={{...sbt("ghost"),padding:"6px 10px",fontSize:11,color:W.danger}} onClick={()=>setModal({type:"confirmDeleteScheduled",matchId:m.id})}>Borrar</button>}</div></div>);})}</div>);})()}
  {mStatusF!=="scheduled"&&(<>
  {pendM.length>0&&<div style={{marginBottom:16}}><h3 style={{fontSize:14,fontWeight:600,color:W.warn,marginBottom:8}}>Pendientes de confirmacion</h3>{pendM.map(m=>matchCard(m))}</div>}
  {dispM.length>0&&<div style={{marginBottom:16}}><h3 style={{fontSize:14,fontWeight:600,color:W.danger,marginBottom:8}}>Disputados</h3>{dispM.map(m=>matchCard(m))}</div>}
  {(()=>{const filtered=[...S.matches].filter(m=>(m.status==="confirmed"||m.status==="pending"||m.status==="disputed")&&(m.winner||m.score)).sort((a,b)=>b.date-a.date).filter(m=>{if(mSurfF!=="all"&&m.surface!==mSurfF)return false;if(mTypeF==="all")return true;const cat=mCat(m);if(mTypeF==="regular")return cat.label==="Liga Regular";if(mTypeF==="torneo")return cat.label==="Torneo";if(mTypeF==="amistoso")return cat.label==="Amistoso";if(mTypeF==="reto")return cat.label==="Reto";return true;});return filtered.length>0?filtered.map(m=>matchCard(m)):<div style={{...scd,color:W.cream3,fontSize:13,fontStyle:"italic",textAlign:"center"}}>No hay partidos con estos filtros.</div>;})()}
  </>)}
  </div>)}

  {view==="simH2H"&&(<SimH2HView/>)}

  {view==="tournaments"&&(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:18,fontWeight:700,margin:0,color:W.gold}}>Torneos</h2>{isA&&<button style={sbt("primary")} onClick={()=>setModal("tournament")}>+ Crear</button>}</div>{S.tournaments.map(t=>{const isExp=expT===t.id;const bk=t.bracket||{};const ls=t.leagueStandings;const livePts=computeTournamentPts(t);return(<div key={t.id} style={{...scd,borderColor:t.status==="active"?W.gold+"55":W.gold+"22"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setExpT(isExp?null:t.id)}><div><h3 style={{fontSize:16,fontWeight:700,margin:0,color:W.gold}}>{t.name}</h3><span style={{fontSize:12,color:W.cream3,fontStyle:"italic"}}>{(t.format==="elimination"?"Eliminacion":"Liguilla")+" • "+String(t.players.length)+" jug."}</span></div><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={bdg(t.status==="active"?W.lightGreen:W.cream3)}>{t.status==="active"?"En juego":"Fin"}</span><span style={{color:W.cream3,fontSize:18}}>{isExp?"▲":"▼"}</span></div></div>{isExp&&(<div style={{marginTop:16}}>
    {ls&&ls.length>0&&(<div style={{marginBottom:16}}><h4 style={{fontSize:14,fontWeight:600,marginBottom:8,color:W.cream3,fontStyle:"italic"}}>Fase de Grupos</h4><div style={{background:W.darkGreen,borderRadius:8,padding:12,border:"1px solid "+W.gold+"22"}}><div style={{display:"flex",padding:"4px 0",borderBottom:"1px solid "+W.gold+"22",fontSize:11,color:W.cream3,fontWeight:600}}><span style={{flex:2}}>Jugador</span><span style={{width:28,textAlign:"center"}}>V</span><span style={{width:28,textAlign:"center"}}>D</span><span style={{width:34,textAlign:"center"}}>S</span><span style={{width:34,textAlign:"center"}}>G</span></div>{[...ls].sort((a,b)=>a.pos-b.pos).map((x,i)=>{const cutoff=(t.playoffStart==="sf"?4:t.playoffStart==="r16"?16:8);return(<div key={x.playerId} style={{display:"flex",padding:"5px 0",borderBottom:"1px solid "+W.gold+"11",fontSize:13}}><span style={{flex:2,fontWeight:600,color:i<cutoff?W.cream:W.cream3}}><span style={{color:i<cutoff?W.gold:W.cream3,marginRight:4}}>{String(i+1)+"."}</span>{pSh(x.playerId)}{i===cutoff-1&&t.leagueFinished&&<span style={{fontSize:9,color:W.warn,marginLeft:4}}>corte</span>}</span><span style={{width:28,textAlign:"center",color:W.lightGreen}}>{String(x.w)}</span><span style={{width:28,textAlign:"center",color:W.danger}}>{String(x.l)}</span><span style={{width:34,textAlign:"center",color:(x.sd||0)>0?W.lightGreen:(x.sd||0)<0?W.danger:W.cream3}}>{(x.sd||0)>0?"+"+String(x.sd):String(x.sd||0)}</span><span style={{width:34,textAlign:"center",color:(x.gd||0)>0?W.lightGreen:(x.gd||0)<0?W.danger:W.cream3}}>{(x.gd||0)>0?"+"+String(x.gd):String(x.gd||0)}</span></div>);})}</div></div>)}
    {Object.keys(bk).some(r=>bk[r]&&bk[r].length>0)&&(<div><h4 style={{fontSize:14,fontWeight:600,marginBottom:8,color:W.cream3,fontStyle:"italic"}}>Cuadro</h4><div style={{overflowX:"auto"}}><div style={{display:"flex",gap:12,minWidth:500,alignItems:"flex-start"}}>{["r16","qf","sf","final"].filter(r=>bk[r]&&bk[r].length>0).map(r=>(<div key={r} style={{flex:1,minWidth:120}}><div style={{fontSize:10,fontWeight:700,color:W.gold,marginBottom:8,textTransform:"uppercase",textAlign:"center",letterSpacing:2}}>{r==="r16"?"Octavos":r==="qf"?"Cuartos":r==="sf"?"Semis":"Final"}</div><div style={{display:"flex",flexDirection:"column",justifyContent:r==="final"?"center":"space-around",minHeight:r==="r16"?480:r==="qf"?300:r==="sf"?240:80}}>{(bk[r]||[]).map((m2,i)=>{const hasPlayers=m2.p1&&m2.p2;const canTap=t.status==="active"&&(hasPlayers?(!m2.winner||isA):isA);const isMyM=m2.p1===myId||m2.p2===myId;const tappable=canTap&&(isA||isMyM);return(<div key={String(i)} onClick={e=>{e.stopPropagation();if(tappable)setModal({type:"bracketMatch",tournament:t,round:r,matchIdx:i,bracketMatch:m2});}} style={{background:W.darkGreen,borderRadius:8,padding:8,marginBottom:6,border:"1px solid "+(m2.status==="pending"?W.warn:!m2.winner&&m2.p1?W.gold+"44":W.gold+"22"),cursor:tappable?"pointer":"default"}}><div style={{padding:"2px 0",fontWeight:m2.winner===m2.p1?700:400,color:m2.winner===m2.p1?W.gold:m2.p1?W.cream:W.cream3,fontSize:12}}>{m2.p1?pSh(m2.p1):"TBD"}</div><div style={{padding:"2px 0",fontWeight:m2.winner===m2.p2?700:400,color:m2.winner===m2.p2?W.gold:m2.p2?W.cream:W.cream3,fontSize:12}}>{m2.p2?pSh(m2.p2):"TBD"}</div>{m2.score&&<div style={{fontSize:10,color:W.cream3,marginTop:2}}>{m2.score}</div>}{tappable&&!m2.winner&&<div style={{fontSize:9,color:W.gold,marginTop:2}}>{hasPlayers?"jugar":"asignar"}</div>}</div>);})}</div></div>))}<div style={{minWidth:90,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center"}}><div style={{fontSize:10,fontWeight:700,color:W.gold,marginBottom:8,letterSpacing:2}}>CAMPEON</div>{bk.final&&bk.final[0]&&bk.final[0].winner&&bk.final[0].status==="confirmed"?(<div style={{background:W.gold+"18",border:"2px solid "+W.gold,borderRadius:12,padding:"14px 16px",textAlign:"center"}}><div style={{fontSize:28}}>🏆</div><div style={{fontWeight:700,fontSize:14,color:W.gold}}>{pSh(bk.final[0].winner)}</div></div>):(<div style={{color:W.cream3,fontSize:12,fontStyle:"italic"}}>TBD</div>)}</div></div></div></div>)}
    {livePts.filter(r=>r.points>0).length>0&&(<div style={{marginTop:12}}><h4 style={{fontSize:14,fontWeight:600,marginBottom:8,color:W.gold}}>{"Puntos"+((t.status==="active")?" (LIVE)":"")}</h4>{livePts.filter(r=>r.points>0).sort((a,b)=>b.points-a.points).map((r,i)=>(<div key={r.playerId} style={{fontSize:13,display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>{(i<3?["🥇","🥈","🥉"][i]:String(i+1)+".")+" "+pSh(r.playerId)}<span style={{color:W.cream3,fontSize:11,marginLeft:6}}>{r.position}</span></span><span style={{fontWeight:600,color:W.gold}}>{"+"+String(r.points)}</span></div>))}</div>)}
    {t.status==="active"&&(<div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>{t.format==="league"&&!t.leagueFinished&&<button style={sbt("ghost")} onClick={e=>{e.stopPropagation();setModal({type:"tMatch",tournament:t});}}>+ Partido liguilla</button>}{isA&&t.format==="league"&&!t.leagueFinished&&(<button style={sbt("primary")} onClick={e=>{e.stopPropagation();const ls2=t.leagueStandings;const pSt=t.playoffStart||"qf";const slots=pSt==="r16"?16:pSt==="qf"?8:pSt==="sf"?4:2;if(!ls2||ls2.length<slots){flash("Necesitas "+String(slots)+" jugadores para generar el cuadro","warn");return;}const topN=ls2.slice(0,slots);let pairs=[];if(slots===4)pairs=[[0,3],[1,2]];else if(slots===8)pairs=[[0,7],[2,5],[1,6],[3,4]];else if(slots===16)pairs=[[0,15],[7,8],[2,13],[5,10],[1,14],[6,9],[3,12],[4,11]];const bkM=pairs.map(([a,b])=>({p1:topN[a].playerId,p2:topN[b].playerId,winner:null,score:"",status:"pending_play"}));const newBk={r16:[],qf:[],sf:[],final:[]};newBk[pSt]=bkM;up(s=>({...s,tournaments:s.tournaments.map(x=>x.id===t.id?{...x,leagueFinished:true,bracket:newBk}:x)}));flash("Cuadro eliminatorio generado","success");}}>Cerrar liguilla</button>)}{isA&&<button style={sbt("primary")} onClick={e=>{e.stopPropagation();setModal({type:"tResults",tournament:t});}}>Finalizar</button>}{isA&&<button style={{...sbt("danger"),padding:"10px 14px"}} onClick={e=>{e.stopPropagation();setModal({type:"confirmDelete",tournamentId:t.id,tournamentName:t.name});}}>Eliminar</button>}</div>)}
    {isA&&t.status!=="active"&&(<div style={{marginTop:12}}><button style={{...sbt("danger"),padding:"10px 14px"}} onClick={e=>{e.stopPropagation();setModal({type:"confirmDelete",tournamentId:t.id,tournamentName:t.name});}}>Eliminar</button></div>)}
  </div>)}</div>);})}</div>)}

  {view==="challenges"&&(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:18,fontWeight:700,margin:0,color:W.gold}}>Retos</h2><button style={{...sbt("primary"),opacity:amISuspended&&!isA?0.4:1}} disabled={amISuspended&&!isA} onClick={()=>{if(amISuspended&&!isA){flash("No puedes hacer esto: estás suspendido","error");return;}setModal("challenge");}}>Lanzar</button></div><div style={{...scd,padding:14,background:W.darkGreen}}><p style={{fontSize:13,color:W.cream3,margin:0,fontStyle:"italic"}}>{"El rival debe aceptar. Puntos dinamicos. Cooldown: "+String(S.config.chCoolDays)+" dias."}</p></div>{pendCh.length>0&&!isA&&(<div style={{marginTop:12}}><h3 style={{fontSize:14,fontWeight:600,color:W.warn,marginBottom:8}}>Te han retado!</h3>{pendCh.map(c=>(<div key={c.id} style={{...scd,border:"1px solid "+W.warn}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}><div style={{display:"flex",alignItems:"center",gap:8}}><Av player={pO(c.challengerId)} size={32}/><span style={{fontWeight:600,color:W.cream}}>{pSh(c.challengerId)+" te reta!"}</span></div><div style={{display:"flex",gap:8}}><button style={sbt("primary")} onClick={()=>up(s=>({...s,challenges:s.challenges.map(x=>x.id===c.id?{...x,status:"accepted"}:x)}))}>Aceptar</button><button style={sbt("danger")} onClick={()=>up(s=>({...s,challenges:s.challenges.map(x=>x.id===c.id?{...x,status:"rejected"}:x)}))}>No</button></div></div></div>))}</div>)}{[...S.challenges].reverse().map(c=>{let rm=c.matchId?S.matches.find(m=>m.id===c.matchId):null;if(!rm&&c.status==="resolved"){rm=S.matches.filter(m=>!m.annulled&&m.isChallenge&&((m.player1===c.challengerId&&m.player2===c.targetId)||(m.player1===c.targetId&&m.player2===c.challengerId))).sort((a,b)=>b.date-a.date)[0]||null;}const winner=rm?rm.winner:null;return(<div key={c.id} style={{...scd,padding:14}}>
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




  {view==="trophies"&&(<TrophiesView/>)}

  {view==="forum"&&(<ForumView/>)}


  {view==="admin"&&isA&&(<div><h2 style={{fontSize:18,fontWeight:700,marginBottom:20,color:W.gold}}>Admin</h2><h3 style={{fontSize:15,fontWeight:600,marginBottom:12,color:W.warn}}>📢 Anuncio global fijado</h3><AnnouncementForm/><h3 style={{fontSize:15,fontWeight:600,marginBottom:12,marginTop:24,color:W.warn}}>{"Solicitudes ("+String(S.pending.length)+")"}</h3>{S.pending.length===0&&<div style={{...scd,color:W.cream3,fontSize:13,fontStyle:"italic"}}>Nada</div>}{S.pending.map(r=>(<div key={r.id} style={{...scd,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}><div style={{display:"flex",alignItems:"center",gap:10}}><Av player={r} size={40}/><div><span style={{fontWeight:600,color:W.cream}}>{r.firstName+" "+r.lastName+' "'+r.nickname+'"'}</span><br/><span style={{fontSize:12,color:W.cream3}}>{r.email}</span></div></div><div style={{display:"flex",gap:8}}><button style={sbt("primary")} onClick={()=>up(s=>({...s,players:[...s.players,{id:r.id,firstName:r.firstName,lastName:r.lastName,nickname:r.nickname,age:r.age,hand:r.hand,backhand:r.backhand,password:r.password,email:r.email,photo:r.photo||"",approved:true,suspended:false,sanctions:[],joinedAt:now()}],pending:s.pending.filter(x=>x.id!==r.id)}))}>OK</button><button style={sbt("danger")} onClick={()=>up(s=>({...s,pending:s.pending.filter(x=>x.id!==r.id)}))}>No</button></div></div>))}

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
      <button style={sbt("primary")} onClick={()=>{up(s=>({...s,players:s.players.map(x=>x.id===p.id?{...x,suspended:false,suspendedAt:null,suspensionReason:""}:x)}));flash("Suspensión levantada","success");}}>Levantar</button>
    </div>))}
  </div>)}
  {appr.filter(p=>p.suspended).length===0&&<div style={{...scd,color:W.cream3,fontSize:13,fontStyle:"italic"}}>No hay jugadores suspendidos actualmente.</div>}

  <h3 style={{fontSize:15,fontWeight:600,marginTop:24,marginBottom:12,color:W.gold}}>Temporadas</h3>
  {(()=>{
    const currentInfo=getCurrentSeasonInfo(S);
    const prevTs=currentInfo.startDate-1;
    const prevBounds=seasonBoundsForDate(prevTs);
    const prevId=seasonIdFor(prevBounds.year,prevBounds.half);
    const prevName=seasonNameFor(prevBounds.year,prevBounds.half);
    const prevStored=(S.seasons||[]).find(s=>s.id===prevId);
    const currStored=(S.seasons||[]).find(s=>s.id===currentInfo.id);
    const prevClosed=!!(prevStored&&prevStored.closed);
    const currClosed=!!(currStored&&currStored.closed);
    const doClose=(kind)=>{
      const info=kind==="previous"
        ?{id:prevId,year:prevBounds.year,half:prevBounds.half,startDate:prevBounds.start,endDate:prevBounds.end,name:prevName}
        :currentInfo;
      if(!window.confirm("¿Cerrar "+info.name+"? El campeón quedará registrado para siempre y no se podrá deshacer fácilmente."))return;
      const record=buildClosedSeasonRecord(S,info);
      up(s=>{
        const filtered=(s.seasons||[]).filter(x=>x.id!==info.id);
        return{...s,seasons:[...filtered,record]};
      });
      flash(record.championId?"Temporada cerrada — Campeón: "+pSh(record.championId):"Temporada cerrada sin campeón","success");
    };
    return(<div style={scd}>
      <div style={{fontSize:13,color:W.cream,marginBottom:10}}>
        Al cerrar una temporada, el campeón queda registrado para siempre y aparece con el badge 🏆 en toda la web. El ranking global no se ve afectado.
      </div>
      <div style={{borderTop:"1px solid "+W.gold+"22",paddingTop:10,marginTop:4}}>
        <div style={{fontSize:12,color:W.cream3,marginBottom:4}}>Temporada anterior:</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{color:W.cream,fontSize:13,fontWeight:600}}>{prevName}</span>
          {prevClosed?(<span style={{fontSize:11,color:W.lightGreen,fontStyle:"italic"}}>{"✓ Cerrada — Campeón: "+(prevStored.championId?pSh(prevStored.championId):"ninguno")}</span>):(<button style={{...sbt("primary"),padding:"6px 12px",fontSize:12}} onClick={()=>doClose("previous")}>Cerrar temporada anterior</button>)}
        </div>
      </div>
      <div style={{borderTop:"1px solid "+W.gold+"22",paddingTop:10,marginTop:10}}>
        <div style={{fontSize:12,color:W.cream3,marginBottom:4}}>Temporada en curso:</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{color:W.cream,fontSize:13,fontWeight:600}}>{currentInfo.name}</span>
          {currClosed?(<span style={{fontSize:11,color:W.lightGreen,fontStyle:"italic"}}>{"✓ Cerrada — Campeón: "+(currStored.championId?pSh(currStored.championId):"ninguno")}</span>):(<button style={{...sbt("ghost"),padding:"6px 12px",fontSize:12,color:W.warn}} onClick={()=>doClose("current")}>Cerrar ahora (no recomendado antes de fin de semestre)</button>)}
        </div>
      </div>
    </div>);
  })()}

  <h3 style={{fontSize:15,fontWeight:600,marginTop:24,marginBottom:12,color:W.danger}}>Sanciones y bonus</h3>
  <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
    <button style={sbt("danger")} onClick={()=>setModal("sanction")}>+ Sanción</button>
    <button style={sbt("primary")} onClick={()=>setModal("bonus")}>+ Bonus</button>
  </div>
  {S.players.filter(p=>p.sanctions&&p.sanctions.length>0).length===0&&<div style={{...scd,color:W.cream3,fontSize:13,fontStyle:"italic"}}>No hay sanciones ni bonus registrados.</div>}
  {S.players.filter(p=>p.sanctions&&p.sanctions.length>0).map(p=>(<div key={p.id} style={scd}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
      <Av player={p} size={28}/>
      <span style={{fontWeight:600,color:W.cream}}>{p.nickname}</span>
    </div>
    {p.sanctions.map((x,i)=>{
      const xid=x.id||("legacy-"+String(i));
      return(<div key={xid} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderTop:i>0?"1px solid "+W.gold+"11":"none",gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:x.type==="bonus"?W.lightGreen:W.danger}}>{(x.type==="bonus"?"+":"-")+String(x.amount)+" pts"}</div>
          <div style={{fontSize:12,color:W.cream2,marginTop:2}}>{x.reason}</div>
          {x.date&&<div style={{fontSize:10,color:W.cream3,fontStyle:"italic",marginTop:2}}>{fmtD(x.date)}</div>}
        </div>
        <button style={{...sbt("ghost"),padding:"6px 10px",fontSize:11,color:W.danger}} onClick={()=>{
          up(s=>({
            ...s,
            // If sanction has id, filter by id. Otherwise filter by index (legacy).
            players:s.players.map(pp=>{
              if(pp.id!==p.id)return pp;
              if(x.id){
                return{...pp,sanctions:(pp.sanctions||[]).filter(ss=>ss.id!==x.id)};
              }
              return{...pp,sanctions:(pp.sanctions||[]).filter((_,idx)=>idx!==i)};
            }),
            // Cascade: remove any forum post whose sanctionRef points to this sanction
            forum:x.id?(s.forum||[]).filter(m=>!(m.sanctionRef&&m.sanctionRef.sanctionId===x.id&&m.sanctionRef.playerId===p.id)):(s.forum||[]),
          }));
          flash("Sanción/bonus borrado","success");
        }}>Borrar</button>
      </div>);
    })}
  </div>))}
  <h3 style={{fontSize:15,fontWeight:600,marginTop:24,marginBottom:12,color:W.cream}}>Reset password</h3><div style={scd}><select style={{...ss,marginBottom:8}} id="rpid">{appr.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select><div style={{display:"flex",gap:8}}><input style={{...si,flex:1}} placeholder="Nueva" id="rpw"/><button style={sbt("primary")} onClick={()=>{const pid=document.getElementById("rpid").value;const pw=document.getElementById("rpw").value;if(pid&&pw.trim()){up(s=>({...s,players:s.players.map(p=>p.id===pid?{...p,password:pw.trim()}:p)}));flash("Guardado","success");}}}>OK</button></div></div><h3 style={{fontSize:15,fontWeight:600,marginTop:24,marginBottom:12,color:W.cream}}>Admin pw</h3><div style={{...scd,display:"flex",gap:8}}><input style={{...si,flex:1}} type="password" placeholder="Nueva" id="apw"/><button style={sbt("primary")} onClick={()=>{const v=document.getElementById("apw").value;if(v.trim()){up(s=>({...s,adminPw:v.trim()}));flash("Guardado","success");}}}>OK</button></div><button style={{...sbt("danger"),marginTop:24}} onClick={()=>setModal({type:"confirmReset"})}>Reset</button></div>)}

  {modal==="match"&&<MatchModal/>}
  {modal==="schedule"&&(<Mdl title="Programar partido"><ScheduleForm/></Mdl>)}
  {modal&&modal.type==="resolveScheduled"&&<MatchModal scheduled={modal.scheduled}/>}
  {modal&&modal.type==="confirmDeleteScheduled"&&(<Mdl title="Borrar partido programado"><p style={{color:W.cream2,fontSize:14,marginBottom:16}}>¿Seguro que quieres borrar este partido programado? Esta acción no se puede deshacer.</p><div style={{display:"flex",gap:8}}><button style={{...sbt("danger"),flex:1}} onClick={()=>{up(s=>({...s,matches:s.matches.filter(m=>m.id!==modal.matchId)}));setModal(null);flash("Partido programado borrado","success");}}>Borrar</button><button style={{...sbt("ghost"),flex:1}} onClick={()=>setModal(null)}>Cancelar</button></div></Mdl>)}
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
  {modal&&modal.type==="confirmDelete"&&(<Mdl title="Confirmar eliminación"><p style={{color:W.cream2,fontSize:14,marginBottom:16}}>{"¿Seguro que quieres eliminar el torneo \""+modal.tournamentName+"\"? Se borrarán todos sus partidos asociados. Esta acción no se puede deshacer."}</p><div style={{display:"flex",gap:8}}><button style={{...sbt("danger"),flex:1}} onClick={()=>{up(s=>({...s,tournaments:s.tournaments.filter(x=>x.id!==modal.tournamentId),matches:s.matches.filter(m=>m.tournamentId!==modal.tournamentId)}));setModal(null);flash("Torneo eliminado","success");}}>Eliminar</button><button style={{...sbt("ghost"),flex:1}} onClick={()=>setModal(null)}>Cancelar</button></div></Mdl>)}
  {modal&&modal.type==="editForumMsg"&&(<Mdl title="Editar mensaje"><ForumEditForm target={modal.target}/></Mdl>)}
  {modal&&modal.type==="confirmDeleteMsg"&&(<Mdl title="Borrar mensaje"><p style={{color:W.cream2,fontSize:14,marginBottom:16}}>¿Seguro que quieres borrar este mensaje? Esta acción no se puede deshacer.</p><div style={{display:"flex",gap:8}}><button style={{...sbt("danger"),flex:1}} onClick={()=>{const t=modal.target;up(s=>{if(t.kind==="msg"){return{...s,forum:s.forum.filter(m=>m.id!==t.msgId)};}if(t.kind==="reply"){return{...s,forum:s.forum.map(m=>m.id===t.msgId?{...m,replies:(m.replies||[]).filter(r=>r.id!==t.replyId)}:m)};}return s;});setModal(null);flash("Mensaje borrado","success");}}>Borrar</button><button style={{...sbt("ghost"),flex:1}} onClick={()=>setModal(null)}>Cancelar</button></div></Mdl>)}
  {modal&&modal.type==="confirmReset"&&(<Mdl title="Confirmar reset total"><p style={{color:W.cream2,fontSize:14,marginBottom:16}}>¿Seguro que quieres borrar TODOS los datos? Se restaurarán los valores de demo. Esta acción no se puede deshacer.</p><div style={{display:"flex",gap:8}}><button style={{...sbt("danger"),flex:1}} onClick={()=>{up(()=>({...DEFAULT_STATE}));setModal(null);setAuth(null);flash("Datos reiniciados","success");}}>Borrar todo</button><button style={{...sbt("ghost"),flex:1}} onClick={()=>setModal(null)}>Cancelar</button></div></Mdl>)}
  {modal&&modal.type==="rules"&&(<Mdl title="Reglas"><RulesView/></Mdl>)}
  <div style={{marginTop:32,paddingTop:20,borderTop:"1px solid "+W.gold+"22",textAlign:"center"}}>
    <button style={{background:W.gold+"11",border:"1px solid "+W.gold+"55",color:W.gold,cursor:"pointer",fontSize:14,fontWeight:600,padding:"10px 24px",borderRadius:8,fontFamily:"inherit",letterSpacing:.5}} onClick={()=>setModal({type:"rules"})}>📖 Ver reglas de la liga</button>
    <div style={{fontSize:10,color:W.cream3,marginTop:10,opacity:.7,letterSpacing:1,textTransform:"uppercase"}}>ATP Atentado</div>
  </div>
</div>
);

// ============ UNIFIED TABS: Simulador/H2H + Trofeos ============

/**
 * SimH2HView: contenedor con sub-tabs "Simulador" y "H2H".
 */
// ============ HOME (dashboard de inicio) ============

/**
 * HomeView: resumen rápido de la liga.
 * Secciones:
 *   - Acciones pendientes (solo si hay)
 *   - Banner de temporada
 *   - Podio de temporada (top 3, balance neto)
 *   - Podio global (top 3, puntos del ranking)
 *   - Últimos 3 partidos jugados
 *   - Próximos partidos programados (solo si hay)
 */
function HomeView(){
  // --- Pending actions for this user ---
  const pendingActions=useMemo(()=>{
    if(!S||!myId)return [];
    const items=[];
    // Matches pending my confirmation (submitted by the rival)
    const mToConfirm=(S.matches||[]).filter(m=>!m.annulled&&m.status==="pending"&&m.submittedBy&&m.submittedBy!==myId&&(m.player1===myId||m.player2===myId));
    if(mToConfirm.length>0)items.push({kind:"matchConfirm",count:mToConfirm.length,label:mToConfirm.length===1?"Tienes 1 partido pendiente de confirmar":"Tienes "+String(mToConfirm.length)+" partidos pendientes de confirmar",view:"matches"});
    // Disputed matches involving me
    const disp=(S.matches||[]).filter(m=>!m.annulled&&m.status==="disputed"&&(m.player1===myId||m.player2===myId));
    if(disp.length>0)items.push({kind:"disputed",count:disp.length,label:"Tienes "+String(disp.length)+" partido"+(disp.length!==1?"s":"")+" en disputa",view:"matches"});
    // Challenges pending my response (I'm the target and status pending)
    const chPending=(S.challenges||[]).filter(c=>c.status==="pending"&&c.targetId===myId);
    if(chPending.length>0)items.push({kind:"challengePending",count:chPending.length,label:chPending.length===1?"Tienes 1 reto por responder":"Tienes "+String(chPending.length)+" retos por responder",view:"challenges"});
    // Accepted challenges waiting for match to be played/registered
    const chAccepted=(S.challenges||[]).filter(c=>c.status==="accepted"&&(c.challengerId===myId||c.targetId===myId));
    if(chAccepted.length>0)items.push({kind:"challengeAccepted",count:chAccepted.length,label:chAccepted.length===1?"Tienes 1 reto aceptado por jugar":"Tienes "+String(chAccepted.length)+" retos aceptados por jugar",view:"challenges"});
    // Scheduled matches involving me in the next 14 days
    const soonTs=Date.now()+14*86400000;
    const sched=(S.matches||[]).filter(m=>!m.annulled&&m.status==="scheduled"&&!m.winner&&(m.player1===myId||m.player2===myId)&&m.date<=soonTs&&!isScheduledExpired(m));
    if(sched.length>0)items.push({kind:"scheduled",count:sched.length,label:sched.length===1?"Tienes 1 partido programado":"Tienes "+String(sched.length)+" partidos programados",view:"matches"});
    // Inactivity warning
    if(!isA&&!amISuspended){
      const du=daysUntilInactivityPenalty(S,myId);
      if(du!==null&&du<=7){
        items.push({kind:"inactivity",count:1,label:du>0?("Penalización por inactividad en "+(du===1?"1 día":String(du)+" días")):("Inactividad ya en curso — juega cuanto antes"),view:"standings",urgent:du<=0});
      }
    }
    return items;
  },[S,myId,isA,amISuspended]);

  // --- Season top 3 ---
  const seasonInfo=useMemo(()=>getCurrentSeasonInfo(S),[S]);
  const seasonStandings=useMemo(()=>computeSeasonStandings(S,seasonInfo.startDate,seasonInfo.endDate),[S,seasonInfo.startDate,seasonInfo.endDate]);
  const seasonTop3=seasonStandings.slice(0,3).filter(r=>r.wins+r.losses>0||r.netPts!==0);

  // --- Global ranking top 5 (using current points map for "all-time / active") ---
  const globalTop=useMemo(()=>{
    if(!S)return [];
    const pts=_computePointsAtDate(S,Date.now(),"all");
    return S.players.filter(p=>p.approved&&!p.suspended).map(p=>({playerId:p.id,nickname:p.nickname,firstName:p.firstName,lastName:p.lastName,points:pts[p.id]||0})).sort((a,b)=>b.points-a.points).slice(0,5);
  },[S]);

  // --- Últimos 3 partidos ---
  const lastMatches=useMemo(()=>{
    if(!S)return [];
    return (S.matches||[]).filter(m=>!m.annulled&&m.status==="confirmed"&&m.winner).sort((a,b)=>b.date-a.date).slice(0,3);
  },[S]);

  // --- Próximos 3 programados ---
  const upcomingScheduled=useMemo(()=>{
    if(!S)return [];
    return (S.matches||[]).filter(m=>!m.annulled&&m.status==="scheduled"&&!m.winner&&!m.tournamentId&&!isScheduledExpired(m)).sort((a,b)=>a.date-b.date).slice(0,3);
  },[S]);

  return(<div>
    <h2 style={{fontSize:22,fontWeight:700,marginBottom:4,color:W.gold,fontFamily:"'Georgia',serif"}}>Inicio</h2>
    <p style={{fontSize:12,color:W.cream3,marginBottom:14,fontStyle:"italic"}}>Un vistazo rápido de lo que pasa en la liga.</p>

    {/* === Sección A: acciones pendientes === */}
    <div style={{background:pendingActions.length>0?W.warn+"18":W.card+"ee",border:"1px solid "+(pendingActions.length>0?W.warn+"88":W.lightGreen+"55"),borderRadius:10,padding:14,marginBottom:14}}>
      <div style={{fontSize:11,color:pendingActions.length>0?W.warn:W.lightGreen,textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:8}}>{pendingActions.length>0?"⚡ Necesita tu atención":"✓ Necesita tu atención"}</div>
      {pendingActions.length>0?(<div style={{display:"flex",flexDirection:"column",gap:6}}>
        {pendingActions.map((a,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:13,color:a.urgent?W.danger:W.cream,fontWeight:a.urgent?600:500}}>{a.label}</span>
          <button style={{...sbt("ghost"),padding:"5px 12px",fontSize:11}} onClick={()=>setView(a.view)}>Ir →</button>
        </div>))}
      </div>):(<div style={{fontSize:13,color:W.cream2,fontStyle:"italic",padding:"4px 0"}}>Estás al día. No tienes nada pendiente por ahora 🎾</div>)}
    </div>

    {/* === Sección B: banner de temporada === */}
    <SeasonBanner/>

    {/* === Sección C: podio de temporada === */}
    <div style={{background:W.card+"ee",borderRadius:10,padding:14,marginBottom:12,border:"1px solid "+W.gold+"22"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
        <div style={{fontSize:11,color:W.gold,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>🏆 Podio de temporada</div>
        <button style={{...sbt("ghost"),padding:"4px 10px",fontSize:11}} onClick={()=>{setView("trophies");setTrophiesSub("seasons");}}>Ver temporada completa →</button>
      </div>
      {seasonTop3.length===0?(<div style={{fontSize:12,color:W.cream3,fontStyle:"italic",textAlign:"center",padding:"12px 0"}}>Todavía nadie suma puntos netos en esta temporada.</div>):(<div style={{display:"flex",flexDirection:"column",gap:6}}>
        {seasonTop3.map((r,i)=>{const medal=i===0?"🥇":i===1?"🥈":"🥉";return(<div key={r.playerId} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 4px",borderRadius:6,cursor:"pointer"}} onClick={()=>{const pl=pO(r.playerId);if(pl)setModal({type:"profile",player:pl});}}>
          <span style={{fontSize:18,minWidth:24,textAlign:"center"}}>{medal}</span>
          <Av player={pO(r.playerId)} size={32}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:W.cream,display:"inline-flex",alignItems:"center",gap:4}}>{r.nickname}<ChampionBadge playerId={r.playerId} size={10}/></div>
            <div style={{fontSize:10,color:W.cream3}}>{"V "+String(r.wins)+" · D "+String(r.losses)}</div>
          </div>
          <div style={{fontWeight:700,fontSize:14,color:r.netPts>=0?W.gold:W.danger}}>{(r.netPts>0?"+":"")+String(r.netPts)}</div>
        </div>);})}
      </div>)}
    </div>

    {/* === Sección C': podio global (ranking top 5) === */}
    <div style={{background:W.card+"ee",borderRadius:10,padding:14,marginBottom:12,border:"1px solid "+W.gold+"22"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
        <div style={{fontSize:11,color:W.gold,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>👑 Clasificación global (top 5)</div>
        <button style={{...sbt("ghost"),padding:"4px 10px",fontSize:11}} onClick={()=>setView("standings")}>Ver completa →</button>
      </div>
      {globalTop.length===0?(<div style={{fontSize:12,color:W.cream3,fontStyle:"italic",textAlign:"center",padding:"12px 0"}}>Aún no hay datos.</div>):(<div style={{display:"flex",flexDirection:"column",gap:4}}>
        {globalTop.map((r,i)=>(<div key={r.playerId} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 4px",borderRadius:6,cursor:"pointer",background:i===0?W.gold+"14":"transparent"}} onClick={()=>{const pl=pO(r.playerId);if(pl)setModal({type:"profile",player:pl});}}>
          <span style={{fontWeight:700,minWidth:22,textAlign:"center",color:i===0?W.gold:W.cream3,fontSize:13}}>{"#"+String(i+1)}</span>
          <Av player={pO(r.playerId)} size={28}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:W.cream,display:"inline-flex",alignItems:"center",gap:4}}>{r.firstName+" "+r.lastName}<ChampionBadge playerId={r.playerId} size={10}/></div>
            <div style={{fontSize:10,color:W.cream3,fontStyle:"italic"}}>{'"'+r.nickname+'"'}</div>
          </div>
          <div style={{fontWeight:700,fontSize:14,color:W.gold}}>{String(r.points)+" pts"}</div>
        </div>))}
      </div>)}
    </div>

    {/* === Sección D: últimos partidos === */}
    <div style={{background:W.card+"ee",borderRadius:10,padding:14,marginBottom:12,border:"1px solid "+W.gold+"22"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
        <div style={{fontSize:11,color:W.gold,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>🎾 Últimos partidos</div>
        <button style={{...sbt("ghost"),padding:"4px 10px",fontSize:11}} onClick={()=>setView("matches")}>Ver todos →</button>
      </div>
      {lastMatches.length===0?(<div style={{fontSize:12,color:W.cream3,fontStyle:"italic",textAlign:"center",padding:"12px 0"}}>No hay partidos registrados todavía.</div>):(<div style={{display:"flex",flexDirection:"column",gap:6}}>
        {lastMatches.map(m=>{const loser=m.winner===m.player1?m.player2:m.player1;return(<div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 4px",borderRadius:6,cursor:"pointer",borderBottom:"1px solid "+W.gold+"11"}} onClick={()=>setModal({type:"detail",match:m})}>
          <Av player={pO(m.winner)} size={32}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,color:W.cream}}>
              <strong style={{color:W.gold}}>{pSh(m.winner)}</strong>
              <span style={{color:W.cream3}}>{" ganó a "}</span>
              <strong>{pSh(loser)}</strong>
            </div>
            {m.score&&<div style={{fontSize:11,color:W.cream2,marginTop:1}}>{m.score}</div>}
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
            <SfB s={m.surface}/>
            <span style={{fontSize:10,color:W.cream3}}>{fmtD(m.date)}</span>
          </div>
        </div>);})}
      </div>)}
    </div>

    {/* === Sección E: próximos partidos programados === */}
    {upcomingScheduled.length>0&&(<div style={{background:W.card+"ee",borderRadius:10,padding:14,marginBottom:12,border:"1px solid "+W.blue+"33"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
        <div style={{fontSize:11,color:W.blue,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>📅 Próximos partidos</div>
        <button style={{...sbt("ghost"),padding:"4px 10px",fontSize:11}} onClick={()=>{setView("matches");setMStatusF("scheduled");}}>Ver todos →</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {upcomingScheduled.map(m=>(<div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 4px",borderRadius:6}}>
          <Av player={pO(m.player1)} size={26}/>
          <span style={{fontSize:12,fontWeight:600,color:W.cream}}>{pSh(m.player1)}</span>
          <span style={{fontSize:11,color:W.cream3}}>vs</span>
          <Av player={pO(m.player2)} size={26}/>
          <span style={{fontSize:12,fontWeight:600,color:W.cream,flex:1,minWidth:0}}>{pSh(m.player2)}</span>
          <SfB s={m.surface}/>
          <span style={{fontSize:11,color:W.blue,fontWeight:600}}>{fmtD(m.date)}</span>
        </div>))}
      </div>
    </div>)}
  </div>);
}

function SimH2HView(){
  return(<div>
    <div style={{display:"flex",gap:6,marginBottom:14}}>
      <button style={{...snv(simH2HSub==="simulator"),flex:1,padding:"10px"}} onClick={()=>setSimH2HSub("simulator")}>🎯 Simulador</button>
      <button style={{...snv(simH2HSub==="h2h"),flex:1,padding:"10px"}} onClick={()=>setSimH2HSub("h2h")}>📊 H2H</button>
    </div>
    {simH2HSub==="simulator"&&<SimulatorView/>}
    {simH2HSub==="h2h"&&<H2HView/>}
  </div>);
}

/**
 * H2HView: selector de 2 jugadores + stats ricas del enfrentamiento.
 */
function H2HView(){
  const det=useMemo(()=>(h1&&h2&&h1!==h2)?computeH2HDetails(S,h1,h2):null,[S,h1,h2]);
  return(<div>
    <h2 style={{fontSize:18,fontWeight:700,marginBottom:16,color:W.gold}}>Head to Head</h2>
    <div style={scd}>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:90}}><Av player={pO(h1)} size={32}/><select style={{...ss,flex:1}} value={h1} onChange={e=>setH1(e.target.value)}><option value="">...</option>{appr.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select></div>
        <span style={{color:W.gold,fontWeight:700}}>vs</span>
        <div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:90}}><select style={{...ss,flex:1}} value={h2} onChange={e=>setH2(e.target.value)}><option value="">...</option>{appr.filter(p=>p.id!==h1).map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select><Av player={pO(h2)} size={32}/></div>
      </div>
      {!det&&(<div style={{textAlign:"center",padding:"28px 0",color:W.cream3,fontSize:13,fontStyle:"italic"}}>Selecciona dos jugadores para ver sus estadísticas de enfrentamiento.</div>)}
      {det&&det.totalMatches===0&&(<div style={{textAlign:"center",padding:"28px 0",color:W.cream3,fontSize:13,fontStyle:"italic"}}>Estos dos jugadores todavía no se han enfrentado. Será interesante cuando pase.</div>)}
      {det&&det.totalMatches>0&&(<div>
        {/* --- Marcador principal --- */}
        <div style={{display:"flex",justifyContent:"center",gap:28,padding:"16px 0"}}>
          <div style={{textAlign:"center"}}><Av player={pO(h1)} size={52}/><div style={{fontSize:36,fontWeight:700,color:det.w1>det.w2?W.gold:W.cream,marginTop:4}}>{String(det.w1)}</div><div style={{fontSize:13,color:W.cream3,display:"inline-flex",alignItems:"center",gap:4,justifyContent:"center"}}>{pSh(h1)}<ChampionBadge playerId={h1} size={11}/></div></div>
          <div style={{fontSize:18,color:W.cream3,alignSelf:"center"}}>—</div>
          <div style={{textAlign:"center"}}><Av player={pO(h2)} size={52}/><div style={{fontSize:36,fontWeight:700,color:det.w2>det.w1?W.gold:W.cream,marginTop:4}}>{String(det.w2)}</div><div style={{fontSize:13,color:W.cream3,display:"inline-flex",alignItems:"center",gap:4,justifyContent:"center"}}>{pSh(h2)}<ChampionBadge playerId={h2} size={11}/></div></div>
        </div>
        <div style={{textAlign:"center",fontSize:11,color:W.cream3,marginBottom:16,fontStyle:"italic"}}>{String(det.totalMatches)+" enfrentamiento"+(det.totalMatches!==1?"s":"")+" jugado"+(det.totalMatches!==1?"s":"")}</div>

        {/* --- Sub-sección: por superficie --- */}
        <div style={{background:W.darkGreen,borderRadius:8,padding:10,marginBottom:12,border:"1px solid "+W.gold+"22"}}>
          <div style={{fontSize:10,color:W.gold,textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:8}}>Por superficie</div>
          <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>{SURFS.map(sf=>{const d=det.bySurface[sf]||{w1:0,w2:0};return(<div key={sf} style={{background:W.card,borderRadius:8,padding:8,textAlign:"center",border:"1px solid "+W.gold+"22",minWidth:80}}><SfB s={sf}/><div style={{marginTop:3,fontSize:13,fontWeight:700}}><span style={{color:d.w1>d.w2?W.gold:W.cream}}>{String(d.w1)}</span>{" - "}<span style={{color:d.w2>d.w1?W.gold:W.cream}}>{String(d.w2)}</span></div></div>);})}</div>
        </div>

        {/* --- Racha actual y histórica --- */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8,marginBottom:12}}>
          <div style={{background:W.darkGreen,borderRadius:8,padding:10,border:"1px solid "+W.warn+"44"}}>
            <div style={{fontSize:10,color:W.warn,textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:4}}>🔥 Racha actual</div>
            {det.currentStreak?(<><div style={{fontSize:14,fontWeight:600,color:W.cream}}>{pSh(det.currentStreak.playerId)}</div><div style={{fontSize:22,fontWeight:700,color:W.warn,lineHeight:1}}>{String(det.currentStreak.count)+" seguido"+(det.currentStreak.count!==1?"s":"")}</div></>):(<div style={{fontSize:12,color:W.cream3,fontStyle:"italic"}}>Sin racha</div>)}
          </div>
          <div style={{background:W.darkGreen,borderRadius:8,padding:10,border:"1px solid "+W.gold+"22"}}>
            <div style={{fontSize:10,color:W.gold,textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:4}}>Mejor racha histórica</div>
            <div style={{fontSize:12,color:W.cream,lineHeight:1.6}}><span style={{fontWeight:600}}>{pSh(h1)}</span>{": "}<span style={{color:W.gold,fontWeight:700}}>{String(det.bestStreak1)}</span></div>
            <div style={{fontSize:12,color:W.cream,lineHeight:1.6}}><span style={{fontWeight:600}}>{pSh(h2)}</span>{": "}<span style={{color:W.gold,fontWeight:700}}>{String(det.bestStreak2)}</span></div>
          </div>
        </div>

        {/* --- Último partido + diferencia actual --- */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8,marginBottom:12}}>
          {det.lastMatch&&(<div style={{background:W.darkGreen,borderRadius:8,padding:10,border:"1px solid "+W.gold+"22",cursor:"pointer"}} onClick={()=>setModal({type:"detail",match:det.lastMatch})}>
            <div style={{fontSize:10,color:W.gold,textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:4}}>Último partido</div>
            <div style={{fontSize:13,color:W.cream}}>{"Ganó "+pSh(det.lastMatch.winner)}</div>
            {det.lastMatch.score&&<div style={{fontSize:11,color:W.cream2,marginTop:2}}>{det.lastMatch.score}</div>}
            <div style={{fontSize:11,color:W.cream3,marginTop:2}}>{fmtD(det.lastMatch.date)+" · hace "+String(det.lastMatchDaysAgo)+" día"+(det.lastMatchDaysAgo!==1?"s":"")}</div>
          </div>)}
          <div style={{background:W.darkGreen,borderRadius:8,padding:10,border:"1px solid "+W.gold+"22"}}>
            <div style={{fontSize:10,color:W.gold,textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:4}}>Diferencia actual en ranking</div>
            {det.pointDiffNow===0?(<div style={{fontSize:14,color:W.cream3,fontStyle:"italic"}}>Empatados</div>):(<><div style={{fontSize:13,color:W.cream}}>{pSh(det.pointDiffNow>0?h1:h2)+" va por delante"}</div><div style={{fontSize:22,fontWeight:700,color:W.gold,lineHeight:1}}>{"+"+String(Math.abs(det.pointDiffNow))+" pts"}</div></>)}
          </div>
        </div>

        {/* --- Tie-breaks y sets/juegos --- */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8,marginBottom:12}}>
          <div style={{background:W.darkGreen,borderRadius:8,padding:10,border:"1px solid "+W.gold+"22"}}>
            <div style={{fontSize:10,color:W.gold,textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:4}}>Tie-breaks entre ellos</div>
            {det.tieBreaks.w1+det.tieBreaks.w2===0?(<div style={{fontSize:12,color:W.cream3,fontStyle:"italic"}}>Ningún tie-break todavía</div>):(<><div style={{fontSize:13,color:W.cream,lineHeight:1.6}}><span style={{fontWeight:600}}>{pSh(h1)}</span>{": "}<span style={{color:W.gold,fontWeight:700}}>{String(det.tieBreaks.w1)}</span></div><div style={{fontSize:13,color:W.cream,lineHeight:1.6}}><span style={{fontWeight:600}}>{pSh(h2)}</span>{": "}<span style={{color:W.gold,fontWeight:700}}>{String(det.tieBreaks.w2)}</span></div></>)}
          </div>
          <div style={{background:W.darkGreen,borderRadius:8,padding:10,border:"1px solid "+W.gold+"22"}}>
            <div style={{fontSize:10,color:W.gold,textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:4}}>Sets y juegos</div>
            <div style={{fontSize:11,color:W.cream3,marginBottom:2}}>Sets totales</div>
            <div style={{fontSize:13,color:W.cream,lineHeight:1.4}}><span style={{fontWeight:600}}>{pSh(h1)}</span>{" "}<span style={{color:W.gold,fontWeight:700}}>{String(det.setsWon1)}</span>{" - "}<span style={{color:W.gold,fontWeight:700}}>{String(det.setsWon2)}</span>{" "}<span style={{fontWeight:600}}>{pSh(h2)}</span></div>
            <div style={{fontSize:11,color:W.cream3,marginTop:6,marginBottom:2}}>Juegos totales</div>
            <div style={{fontSize:13,color:W.cream,lineHeight:1.4}}><span style={{fontWeight:600}}>{pSh(h1)}</span>{" "}<span style={{color:W.gold,fontWeight:700}}>{String(det.gamesWon1)}</span>{" - "}<span style={{color:W.gold,fontWeight:700}}>{String(det.gamesWon2)}</span>{" "}<span style={{fontWeight:600}}>{pSh(h2)}</span></div>
            <div style={{fontSize:10,color:W.cream3,fontStyle:"italic",marginTop:6}}>{"Media: "+det.avgSetsPerMatch.toFixed(1)+" sets/partido"}</div>
          </div>
        </div>

        {/* --- Gráfico de evolución (SVG) --- */}
        {det.evolution.length>=2&&(<div style={{background:W.darkGreen,borderRadius:8,padding:10,marginBottom:12,border:"1px solid "+W.gold+"22"}}>
          <div style={{fontSize:10,color:W.gold,textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:8}}>📈 Evolución del H2H</div>
          {(()=>{
            const W_=320,H_=120,PAD=24;
            const n=det.evolution.length;
            const xs=det.evolution.map((_,i)=>PAD+(i/(n-1))*(W_-2*PAD));
            const maxWins=Math.max(1,...det.evolution.map(e=>Math.max(e.w1,e.w2)));
            const ysFor=(v)=>H_-PAD-(v/maxWins)*(H_-2*PAD);
            const path1=det.evolution.map((e,i)=>(i===0?"M":"L")+xs[i]+" "+ysFor(e.w1)).join(" ");
            const path2=det.evolution.map((e,i)=>(i===0?"M":"L")+xs[i]+" "+ysFor(e.w2)).join(" ");
            return(<svg viewBox={"0 0 "+W_+" "+H_} style={{width:"100%",height:120}}>
              <path d={path1} stroke={W.gold} strokeWidth={2.5} fill="none"/>
              <path d={path2} stroke={W.cream2} strokeWidth={2} fill="none" strokeDasharray="3,3"/>
              {det.evolution.map((e,i)=>(<g key={i}><circle cx={xs[i]} cy={ysFor(e.w1)} r={3} fill={W.gold}/><circle cx={xs[i]} cy={ysFor(e.w2)} r={3} fill={W.cream2}/></g>))}
              <text x={PAD} y={14} fontSize={10} fill={W.gold}>{pSh(h1)+" (línea llena)"}</text>
              <text x={PAD} y={26} fontSize={10} fill={W.cream2}>{pSh(h2)+" (línea discontinua)"}</text>
            </svg>);
          })()}
        </div>)}

        {/* --- Lista de partidos --- */}
        <h3 style={{fontSize:13,fontWeight:600,color:W.gold,marginTop:14,marginBottom:6}}>Todos los enfrentamientos</h3>
        {[...(S.matches||[])].filter(m=>!m.annulled&&m.status==="confirmed"&&((m.player1===h1&&m.player2===h2)||(m.player1===h2&&m.player2===h1))).sort((a,b)=>b.date-a.date).map(m=>(<div key={m.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid "+W.gold+"11",fontSize:13,cursor:"pointer"}} onClick={()=>setModal({type:"detail",match:m})}>
          <div><strong style={{color:m.winner===m.player1?W.gold:W.cream}}>{pSh(m.player1)}</strong><span style={{color:W.cream3}}>{" vs "}</span><strong style={{color:m.winner===m.player2?W.gold:W.cream}}>{pSh(m.player2)}</strong>{m.score&&<span style={{color:W.cream2,marginLeft:8,fontSize:12}}>{m.score}</span>}</div>
          <span style={{display:"flex",gap:4,alignItems:"center"}}><SfB s={m.surface}/><span style={{color:W.cream3,fontSize:11}}>{fmtD(m.date)}</span></span>
        </div>))}
      </div>)}
    </div>
  </div>);
}

/**
 * TrophiesView: contenedor con sub-tabs "Hall of Fame" y "Temporadas".
 */
function TrophiesView(){
  return(<div>
    <div style={{display:"flex",gap:6,marginBottom:14}}>
      <button style={{...snv(trophiesSub==="hof"),flex:1,padding:"10px"}} onClick={()=>setTrophiesSub("hof")}>🏛️ Hall of Fame</button>
      <button style={{...snv(trophiesSub==="seasons"),flex:1,padding:"10px"}} onClick={()=>setTrophiesSub("seasons")}>🏆 Temporadas</button>
    </div>
    {trophiesSub==="hof"&&<HallOfFameView/>}
    {trophiesSub==="seasons"&&<SeasonsView/>}
  </div>);
}

/**
 * RulesModal: muestra el contenido de Reglas en un modal (invocado desde el footer).
 */
function RulesView(){
  return(<div><h2 style={{fontSize:18,fontWeight:700,marginBottom:16,color:W.gold}}>Reglas</h2><h3 style={{fontSize:14,fontWeight:600,marginBottom:10,color:W.gold,fontStyle:"italic"}}>Reglas del sistema</h3><div style={scd}>{sysR.map((r,i)=>(<div key={r.key} style={{padding:"14px 0",borderBottom:i<sysR.length-1?"1px solid "+W.gold+"11":"none"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexWrap:"wrap",gap:8}}><span style={{fontSize:14,fontWeight:600,color:W.cream}}>{r.label}</span><div style={{display:"flex",alignItems:"center",gap:4}}>{isA?(<input style={{...si,width:70,textAlign:"center",padding:"6px",fontSize:14,fontWeight:700}} type="number" value={S.config[r.key]} onChange={e=>up(s=>({...s,config:{...s.config,[r.key]:+e.target.value}}))}/>):(<span style={{fontWeight:700,fontSize:16,color:W.gold}}>{String(S.config[r.key])}</span>)}<span style={{fontSize:12,color:W.cream3}}>{r.suf}</span></div></div><div style={{fontSize:13,color:W.cream3,lineHeight:1.6}}>{r.desc}</div></div>))}</div><h3 style={{fontSize:14,fontWeight:600,marginBottom:10,marginTop:20,color:W.warn,fontStyle:"italic"}}>Reglas adicionales</h3><div style={scd}>{S.rules.length===0&&<div style={{color:W.cream3,fontSize:13,fontStyle:"italic"}}>Sin reglas adicionales.</div>}{S.rules.map((r,i)=>(<div key={String(i)} style={{padding:"10px 0",borderBottom:i<S.rules.length-1?"1px solid "+W.gold+"11":"none",fontSize:14,display:"flex",gap:10,alignItems:"flex-start"}}><span style={{color:W.warn,fontWeight:700,minWidth:20}}>{String(i+1)+"."}</span>{isA?(<div style={{flex:1,display:"flex",gap:8,alignItems:"center"}}><input style={{...si,flex:1,padding:"6px 10px"}} value={r} onChange={e=>{const v=e.target.value;up(s=>({...s,rules:s.rules.map((x,j)=>j===i?v:x)}));}}/><button style={{...sbt("danger"),padding:"6px 10px",fontSize:12}} onClick={()=>up(s=>({...s,rules:s.rules.filter((_,j)=>j!==i)}))}>✕</button></div>):(<span style={{flex:1,color:W.cream2,lineHeight:1.6}}>{r}</span>)}</div>))}{isA&&<button style={{...sbt("ghost"),width:"100%",marginTop:10}} onClick={()=>up(s=>({...s,rules:[...s.rules,"Nueva regla..."]}))}>+ Regla</button>}</div></div>);
}

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

function ChallengeForm(){const[ci,sci]=useState(isA?"":myId);const[ti,sti]=useState("");const ok=ci&&ti?canCh(ci,ti):true;const availableChallengers=isA?apprActive:apprActive.filter(p=>p.id===myId);const availableTargets=apprActive.filter(p=>p.id!==ci);return(<div><p style={{color:W.cream3,fontSize:13,marginBottom:16,fontStyle:"italic"}}>{"El rival debe aceptar. Cooldown: "+String(S.config.chCoolDays)+" dias. Los jugadores suspendidos no pueden ser retados."}</p>{isA&&(<><label style={slb}>Retador</label><select style={{...ss,marginBottom:8}} value={ci} onChange={e=>sci(e.target.value)}><option value="">...</option>{availableChallengers.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select></>)}<label style={slb}>Retar a</label><select style={{...ss,marginBottom:8}} value={ti} onChange={e=>sti(e.target.value)}><option value="">...</option>{availableTargets.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select>{!ok&&ci&&ti&&<div style={{...bdg(W.danger),marginBottom:8}}>Cooldown o jugador suspendido</div>}<button style={{...sbt("primary"),width:"100%"}} onClick={()=>{if(!ci||!ti||ci===ti||!ok)return;up(s=>({...s,challenges:[...s.challenges,{id:uid(),challengerId:ci,targetId:ti,date:now(),status:"pending"}]}));setModal(null);flash("Reto lanzado — esperando respuesta del rival","success");}}>LANZAR</button></div>);}

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
      flash("Partido programado — avisa a tu rival","success");
    }}>PROGRAMAR</button>
  </div>);
}
function ResChallengeForm({challenge:ch}){const[w,sw]=useState("");const[scr,sscr]=useState("");const[dt,sdt]=useState(toI(now()));const[sf,ssf]=useState("Dura");const lid=w?(w===ch.challengerId?ch.targetId:ch.challengerId):"";const h2h=hasH2H(ch.challengerId,ch.targetId);const pp=w?calcPts(gP(w),gP(lid),S.config.eloBase,S.config.equityBonusPct,S.config.equityMatchesGap,h2h):S.config.eloBase;return(<div><p style={{color:W.cream3,fontSize:13,marginBottom:12}}>{pSh(ch.challengerId)+" vs "+pSh(ch.targetId)}</p><label style={slb}>Fecha</label><input style={{...si,marginBottom:8}} type="date" value={dt} onChange={e=>sdt(e.target.value)}/><label style={slb}>Superficie</label><select style={{...ss,marginBottom:8}} value={sf} onChange={e=>ssf(e.target.value)}>{SURFS.map(s=>(<option key={s} value={s}>{s}</option>))}</select><label style={slb}>Resultado</label><div style={{marginBottom:12}}><ScoreInput p1Name={pSh(ch.challengerId)} p2Name={pSh(ch.targetId)} bestOf={3} onBestOfChange={()=>{}} showBestOfToggle={true} onScoreChange={s=>sscr(s)} onWinnerChange={side=>{if(side==="p1")sw(ch.challengerId);else if(side==="p2")sw(ch.targetId);else sw("");}}/></div>{w&&<div style={{background:W.darkGreen,borderRadius:8,padding:10,marginBottom:8,border:"1px solid "+W.gold+"22",fontSize:13}}>+<span style={{color:W.gold,fontWeight:700}}>{String(pp)}</span>{" / -"}<span style={{color:W.danger,fontWeight:700}}>{String(S.config.eloBase)}</span></div>}<button style={{...sbt("primary"),width:"100%"}} onClick={()=>{if(!w)return;const mid=uid();const pts=calcPts(gP(w),gP(lid),S.config.eloBase,S.config.equityBonusPct,S.config.equityMatchesGap,h2h);up(s=>({...s,matches:[...s.matches,{id:mid,player1:ch.challengerId,player2:ch.targetId,winner:w,score:scr,date:frI(dt),points:pts,countsForStandings:true,isChallenge:true,annulled:false,surface:sf,status:isA?"confirmed":"pending",submittedBy:myId,reactions:{},comments:[]}],challenges:s.challenges.map(c=>c.id===ch.id?{...c,status:"resolved",matchId:mid}:c)}));setModal(null);}}>REGISTRAR</button></div>);}
function AnnouncementForm(){
  const current=S.announcement;
  const active=!!(current&&current.active&&current.text);
  const[text,setText]=useState(active?current.text:"");
  const[dirty,setDirty]=useState(false);
  // Re-sync if the stored announcement changes and the admin hasn't typed new content
  useEffect(()=>{
    if(!dirty){
      setText(active?current.text:"");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[current?active:false,current?current.text:""]);
  const MAX=500;
  const save=()=>{
    const t=text.trim();
    if(!t){flash("Escribe un texto antes de publicar","warn");return;}
    up(s=>({...s,announcement:{text:t,active:true,date:(s.announcement&&s.announcement.text===t)?(s.announcement.date||now()):now(),author:myId}}));
    setDirty(false);
    flash(active?"Anuncio actualizado":"Anuncio publicado","success");
  };
  const remove=()=>{
    if(!window.confirm("¿Quitar el anuncio global?"))return;
    up(s=>({...s,announcement:null}));
    setText("");
    setDirty(false);
    flash("Anuncio retirado","success");
  };
  return(<div style={{...scd}}>
    <div style={{fontSize:12,color:W.cream3,marginBottom:10,lineHeight:1.5}}>
      El mensaje aparecerá fijado arriba en TODAS las pestañas para todos los jugadores hasta que lo retires. Útil para recordatorios (fechas clave, cambios de reglas, avisos importantes).
    </div>
    <textarea style={{...si,width:"100%",minHeight:80,resize:"vertical",fontFamily:"inherit",padding:"10px 12px"}} placeholder="Escribe aquí el anuncio..." maxLength={MAX} value={text} onChange={e=>{setText(e.target.value);setDirty(true);}}/>
    <div style={{fontSize:10,color:W.cream3,textAlign:"right",marginTop:4}}>{String(text.length)+" / "+String(MAX)}</div>
    <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
      <button style={{...sbt("primary"),flex:1,minWidth:120}} onClick={save}>{active?"Actualizar anuncio":"Publicar anuncio"}</button>
      {active&&<button style={{...sbt("danger"),flex:1,minWidth:120}} onClick={remove}>Quitar anuncio</button>}
    </div>
    {active&&!dirty&&(<div style={{marginTop:10,fontSize:11,color:W.lightGreen,fontStyle:"italic"}}>{"✓ Activo desde "+fmtD(current.date)}</div>)}
  </div>);
}

function SanctionForm(){
  const[pid,spid]=useState("");
  const[amt,samt]=useState(50);
  const[rsn,srsn]=useState("");
  const[publish,setPublish]=useState(true);
  return(<div>
    <label style={slb}>Jugador</label>
    <select style={{...ss,marginBottom:8}} value={pid} onChange={e=>spid(e.target.value)}><option value="">...</option>{appr.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select>
    <label style={slb}>Puntos a descontar</label>
    <input style={{...si,marginBottom:8}} type="number" value={amt} onChange={e=>samt(+e.target.value)}/>
    <label style={slb}>Motivo</label>
    <input style={{...si,marginBottom:12}} placeholder="Motivo" value={rsn} onChange={e=>srsn(e.target.value)}/>
    <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,cursor:"pointer",fontSize:13,color:W.cream}}>
      <input type="checkbox" checked={publish} onChange={e=>setPublish(e.target.checked)} style={{width:16,height:16,cursor:"pointer",accentColor:W.gold}}/>
      <span>Publicar en el foro (visible para todos)</span>
    </label>
    <button style={{...sbt("danger"),width:"100%"}} onClick={()=>{
      if(!pid||!rsn)return;
      const sid=uid();
      const ts=now();
      up(s=>{
        const next={...s,players:s.players.map(p=>p.id===pid?{...p,sanctions:[...(p.sanctions||[]),{id:sid,amount:amt,reason:rsn,date:ts,type:"sanction"}]}:p)};
        if(publish){
          next.forum=[...(next.forum||[]),{id:uid(),userId:"__admin__",text:"⚠️ Sanción a @"+pSh(pid)+": -"+String(amt)+" pts. Motivo: "+rsn,mentionedIds:[pid],date:ts,editedAt:null,pinned:false,pinnedAt:null,reactions:{},replies:[],isAutoPost:true,autoKind:"sanction",sanctionRef:{playerId:pid,sanctionId:sid}}];
        }
        return next;
      });
      setModal(null);
      flash(publish?"Sanción aplicada y publicada":"Sanción aplicada","success");
    }}>Aplicar</button>
  </div>);
}
function BonusForm(){
  const[pid,spid]=useState("");
  const[amt,samt]=useState(50);
  const[rsn,srsn]=useState("");
  const[publish,setPublish]=useState(true);
  return(<div>
    <label style={slb}>Jugador</label>
    <select style={{...ss,marginBottom:8}} value={pid} onChange={e=>spid(e.target.value)}><option value="">...</option>{appr.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select>
    <label style={slb}>Puntos a otorgar</label>
    <input style={{...si,marginBottom:8}} type="number" value={amt} onChange={e=>samt(+e.target.value)}/>
    <label style={slb}>Motivo</label>
    <input style={{...si,marginBottom:12}} placeholder="Motivo del bonus" value={rsn} onChange={e=>srsn(e.target.value)}/>
    <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,cursor:"pointer",fontSize:13,color:W.cream}}>
      <input type="checkbox" checked={publish} onChange={e=>setPublish(e.target.checked)} style={{width:16,height:16,cursor:"pointer",accentColor:W.gold}}/>
      <span>Publicar en el foro (visible para todos)</span>
    </label>
    <button style={{...sbt("primary"),width:"100%"}} onClick={()=>{
      if(!pid||!rsn||amt<=0)return;
      const sid=uid();
      const ts=now();
      up(s=>{
        const next={...s,players:s.players.map(p=>p.id===pid?{...p,sanctions:[...(p.sanctions||[]),{id:sid,amount:amt,reason:rsn,date:ts,type:"bonus"}]}:p)};
        if(publish){
          next.forum=[...(next.forum||[]),{id:uid(),userId:"__admin__",text:"✨ Bonus a @"+pSh(pid)+": +"+String(amt)+" pts. Motivo: "+rsn,mentionedIds:[pid],date:ts,editedAt:null,pinned:false,pinnedAt:null,reactions:{},replies:[],isAutoPost:true,autoKind:"bonus",sanctionRef:{playerId:pid,sanctionId:sid}}];
        }
        return next;
      });
      setModal(null);
      flash("+"+String(amt)+" pts a "+pSh(pid)+(publish?" (publicado)":""),"success");
    }}>Otorgar</button>
  </div>);
}

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
      flash("Jugador suspendido","success");
    }}>SUSPENDER</button>
  </div>);
}

function TournamentForm(){const[nm,snm]=useState("");const[fm,sfm]=useState("league");const[pS2,sPS]=useState("qf");const[pw,spw]=useState(500);const[pf,spf]=useState(300);const[ps,sps]=useState(150);const[pq,spq]=useState(75);const[pr16,spr16]=useState(40);const[sel,ssel]=useState([]);const tog=id=>ssel(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
const elimRound=n=>{if(n<=2)return"final";if(n<=4)return"sf";if(n<=8)return"qf";return"r16";};
const elimSlots=n=>{if(n<=2)return 1;if(n<=4)return 2;if(n<=8)return 4;return 8;};
const elimPointFields=()=>{const r=elimRound(sel.length);const fields=[["C",pw,spw],["F",pf,spf]];if(r==="sf"||r==="qf"||r==="r16")fields.push(["SF",ps,sps]);if(r==="qf"||r==="r16")fields.push(["QF",pq,spq]);if(r==="r16")fields.push(["R16",pr16,spr16]);return fields;};
const leaguePointFields=()=>{const fields=[["C",pw,spw],["F",pf,spf]];if(pS2==="sf"||pS2==="qf"||pS2==="r16")fields.push(["SF",ps,sps]);if(pS2==="qf"||pS2==="r16")fields.push(["QF",pq,spq]);if(pS2==="r16")fields.push(["R16",pr16,spr16]);return fields;};
const ptFields=fm==="elimination"?elimPointFields():leaguePointFields();
return(<div><input style={{...si,marginBottom:8}} placeholder="Nombre" value={nm} onChange={e=>snm(e.target.value)}/><label style={slb}>Formato</label><select style={{...ss,marginBottom:8}} value={fm} onChange={e=>sfm(e.target.value)}><option value="elimination">Eliminacion directa</option><option value="league">Liguilla + Eliminacion</option></select>{fm==="league"&&(<><label style={slb}>Playoff desde...</label><select style={{...ss,marginBottom:8}} value={pS2} onChange={e=>sPS(e.target.value)}><option value="sf">Semifinales (4)</option><option value="qf">Cuartos (8)</option><option value="r16">Octavos (16)</option></select></>)}<label style={slb}>Puntos por ronda</label><div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>{ptFields.map(([l,v,fn])=>(<div key={l} style={{flex:1,minWidth:60}}><span style={{fontSize:11,color:W.cream3}}>{l}</span><input style={si} type="number" value={v} onChange={e=>fn(+e.target.value)}/></div>))}</div><label style={slb}>{"Jugadores ("+String(sel.length)+")"}{fm==="elimination"&&sel.length>=2&&<span style={{color:W.cream3,fontSize:11,marginLeft:6}}>{"→ Empieza en "+({final:"Final",sf:"Semis",qf:"Cuartos",r16:"Octavos"}[elimRound(sel.length)])}</span>}</label><div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>{apprActive.map(p=>(<button key={p.id} onClick={()=>tog(p.id)} style={{padding:"6px 12px",borderRadius:20,border:"1px solid "+(sel.includes(p.id)?W.gold:W.gold+"33"),background:sel.includes(p.id)?W.gold+"18":"transparent",color:sel.includes(p.id)?W.gold:W.cream3,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>{p.nickname}</button>))}</div>{fm==="elimination"&&sel.length>=2&&sel.length<=16&&(<div style={{background:W.darkGreen,borderRadius:8,padding:10,marginBottom:12,border:"1px solid "+W.gold+"22",fontSize:12,color:W.cream3}}>Se creará un cuadro de eliminación directa con {String(elimSlots(sel.length))} cruces. El admin asignará los jugadores a cada cruce manualmente.</div>)}<button style={{...sbt("primary"),width:"100%"}} onClick={()=>{if(!nm.trim()||sel.length<2)return;const ptsDist={w:pw,f:pf,sf:ps,qf:pq,r16:pr16};if(fm==="elimination"){const startRound=elimRound(sel.length);const slots=elimSlots(sel.length);const emptyMatches=[];for(let i=0;i<slots;i++)emptyMatches.push({p1:null,p2:null,winner:null,score:"",status:"pending_play"});const bk={r16:[],qf:[],sf:[],final:[]};bk[startRound]=emptyMatches;up(s=>({...s,tournaments:[...s.tournaments,{id:uid(),name:nm.trim(),format:"elimination",playoffStart:startRound,ptsDist,players:sel,matches:[],results:[],leagueStandings:null,leagueFinished:true,bracket:bk,status:"active",createdAt:now()}]}));}else{up(s=>({...s,tournaments:[...s.tournaments,{id:uid(),name:nm.trim(),format:"league",playoffStart:pS2,ptsDist,players:sel,matches:[],results:[],leagueStandings:sortLg(sel,[]),leagueFinished:false,bracket:null,status:"active",createdAt:now()}]}));}setModal(null);flash("Creado correctamente","success");}}>CREAR</button></div>);}
function TMatchForm({tournament:t}){const tp=S.players.filter(p=>t.players.includes(p.id));const[p1,sp1]=useState("");const[p2,sp2]=useState("");const[w,sw]=useState("");const[scr,sscr]=useState("");const[dt,sdt]=useState(toI(now()));const[sf,ssf]=useState("Dura");return(<div><label style={slb}>Fecha</label><input style={{...si,marginBottom:8}} type="date" value={dt} onChange={e=>sdt(e.target.value)}/><label style={slb}>Superficie</label><select style={{...ss,marginBottom:8}} value={sf} onChange={e=>ssf(e.target.value)}>{SURFS.map(s=>(<option key={s} value={s}>{s}</option>))}</select><select style={{...ss,marginBottom:8}} value={p1} onChange={e=>sp1(e.target.value)}><option value="">J1...</option>{tp.map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select><select style={{...ss,marginBottom:8}} value={p2} onChange={e=>sp2(e.target.value)}><option value="">J2...</option>{tp.filter(p=>p.id!==p1).map(p=>(<option key={p.id} value={p.id}>{p.nickname}</option>))}</select>{p1&&p2&&(<div style={{marginBottom:12}}><ScoreInput p1Name={pSh(p1)} p2Name={pSh(p2)} bestOf={3} onBestOfChange={()=>{}} showBestOfToggle={false} onScoreChange={s=>sscr(s)} onWinnerChange={side=>{if(side==="p1")sw(p1);else if(side==="p2")sw(p2);else sw("");}}/></div>)}<button style={{...sbt("primary"),width:"100%"}} onClick={()=>{if(!p1||!p2||!w||p1===p2)return;const mid=uid();const mObj={id:mid,player1:p1,player2:p2,winner:w,score:scr,date:frI(dt),phase:"league",status:isA?"confirmed":"pending",submittedBy:myId};up(s=>{const t2={...s.tournaments.find(x=>x.id===t.id)};t2.matches=[...t2.matches,mObj];t2.leagueStandings=sortLg(t2.players,t2.matches.filter(m=>m.phase==="league"&&m.status!=="disputed"));return{...s,tournaments:s.tournaments.map(x=>x.id===t.id?t2:x),matches:[...s.matches,{id:mid,player1:p1,player2:p2,winner:w,score:scr,date:frI(dt),points:0,countsForStandings:false,isChallenge:false,tournamentId:t.id,annulled:false,surface:sf,status:isA?"confirmed":"pending",submittedBy:myId,reactions:{},comments:[]}]};});setModal(null);}}>REGISTRAR</button></div>);}
function TResultsForm({tournament:t}){const live=computeTournamentPts(t);const[res,sres]=useState(live.length>0?live:t.players.map(pid=>({playerId:pid,position:"",points:0})));const upR=(i,f,v)=>sres(r=>r.map((x,j)=>j===i?{...x,[f]:v}:x));return(<div><p style={{fontSize:12,color:W.cream3,marginBottom:12,fontStyle:"italic"}}>Los puntos se han calculado automaticamente. Puedes ajustar si es necesario.</p>{res.map((r,i)=>(<div key={r.playerId} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}><span style={{flex:1,fontSize:14,color:W.cream}}>{pSh(r.playerId)}</span><input style={{...si,width:60}} value={r.position} onChange={e=>upR(i,"position",e.target.value)}/><input style={{...si,width:70}} type="number" value={r.points} onChange={e=>upR(i,"points",+e.target.value)}/></div>))}<button style={{...sbt("primary"),width:"100%",marginTop:12}} onClick={()=>{up(s=>({...s,tournaments:s.tournaments.map(x=>x.id===t.id?{...x,results:res,status:"finished"}:x)}));setModal(null);flash("Torneo finalizado","success");}}>FINALIZAR TORNEO</button></div>);}

function ProfileView({player:pl}){const canE=myId===pl.id||isA;const isMe=myId===pl.id;const[editing,setEditing]=useState(false);const[eNick,setENick]=useState(pl.nickname);const[eAge,setEAge]=useState(String(pl.age));const[eHand,setEHand]=useState(pl.hand);const[eBH,setEBH]=useState(pl.backhand);const[ePw,setEPw]=useState("");
const pm=S.matches.filter(m=>!m.annulled&&m.status==="confirmed"&&(m.player1===pl.id||m.player2===pl.id)).sort((a,b)=>b.date-a.date);const w=pm.filter(m=>m.winner===pl.id).length;const l=pm.filter(m=>m.winner&&m.winner!==pl.id).length;const bS={};SURFS.forEach(sf=>{const sm=pm.filter(m=>m.surface===sf);bS[sf]={w:sm.filter(m=>m.winner===pl.id).length,l:sm.filter(m=>m.winner&&m.winner!==pl.id).length};});
const saveProfile=()=>{if(!eNick.trim()||!eAge)return;up(s=>({...s,players:s.players.map(p=>p.id===pl.id?{...p,nickname:eNick.trim(),age:+eAge,hand:eHand,backhand:eBH,...(ePw.trim()?{password:ePw.trim()}:{})}:p)}));setEditing(false);setEPw("");flash("Perfil actualizado","success");};
const changePhoto=e=>{hPh(e,d=>{up(s=>({...s,players:s.players.map(p=>p.id===pl.id?{...p,photo:d}:p)}));flash("Foto de perfil actualizada","success");});};
return(<div><div style={{textAlign:"center",marginBottom:16}}><div style={{display:"flex",justifyContent:"center",marginBottom:8,position:"relative"}}><Av player={pl} size={80}/>{isMe&&(<label style={{position:"absolute",bottom:0,right:"calc(50% - 50px)",background:W.gold,color:"#1a0a0a",borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,fontWeight:700,border:"2px solid "+W.card,boxShadow:"0 2px 8px rgba(0,0,0,.4)"}} title="Cambiar foto">📷<input type="file" accept="image/*" style={{display:"none"}} onChange={changePhoto}/></label>)}</div>
{pl.suspended&&<div style={{margin:"0 auto 12px",display:"inline-block"}}><SuspB/>{pl.suspensionReason&&<div style={{fontSize:12,color:W.cream3,marginTop:4,fontStyle:"italic"}}>{"Motivo: "+pl.suspensionReason}</div>}</div>}
{!editing?(<><div style={{fontSize:20,fontWeight:700,color:W.gold,fontStyle:"italic",display:"inline-flex",alignItems:"center",gap:6}}>{'"'+pl.nickname+'"'}<ChampionBadge playerId={pl.id} size={16}/></div><div style={{color:W.cream3,fontSize:13,marginTop:4}}>{String(pl.age)+" años • "+(pl.hand==="right"?"Diestro":"Zurdo")+" • "+(pl.backhand==="two"?"Revés a dos manos":"Revés a una mano")}</div>{(()=>{const champs=(S.seasons||[]).filter(s=>s.closed&&s.championId===pl.id).sort((a,b)=>b.endDate-a.endDate);if(champs.length===0)return null;return(<div style={{marginTop:8,fontSize:12,color:W.warn,fontWeight:600}}>{"🏆 Campeón de "+String(champs.length)+" temporada"+(champs.length!==1?"s":"")+": "+champs.map(c=>c.name).join(", ")}</div>);})()}<div style={{color:W.cream3,fontSize:11,marginTop:2}}>{pl.email}</div>{isMe&&<button style={{...sbt("ghost"),padding:"6px 14px",fontSize:12,marginTop:8,marginRight:6}} onClick={()=>setEditing(true)}>Editar perfil</button>}{isMe&&<label style={{...sbt("ghost"),padding:"6px 14px",fontSize:12,marginTop:8,cursor:"pointer",display:"inline-block"}}>Cambiar foto<input type="file" accept="image/*" style={{display:"none"}} onChange={changePhoto}/></label>}</>):(
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
  {!pl.suspended?(<button style={{...sbt("danger"),width:"100%"}} onClick={()=>{up(s=>({...s,players:s.players.map(p=>p.id===pl.id?{...p,suspended:true,suspendedAt:now(),suspensionReason:"Suspendido desde perfil"}:p)}));setModal(null);flash("Jugador suspendido","success");}}>Suspender jugador</button>):(<button style={{...sbt("primary"),width:"100%"}} onClick={()=>{up(s=>({...s,players:s.players.map(p=>p.id===pl.id?{...p,suspended:false,suspendedAt:null,suspensionReason:""}:p)}));setModal(null);flash("Suspensión levantada","success");}}>Levantar suspensión</button>)}
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

// ==================== SEASONS ====================

/**
 * Small inline badge that renders next to a player's name if they have won
 * one or more past seasons. Tooltip on hover shows the season(s).
 */
function ChampionBadge({playerId,size}){
  const champs=getAllChampions(S)[playerId]||[];
  if(champs.length===0)return null;
  const sz=size||14;
  const title=champs.length===1
    ? "Campeón de "+champs[0].name
    : "Campeón en "+String(champs.length)+" temporadas: "+champs.map(c=>c.name).join(", ");
  return(<span title={title} style={{display:"inline-flex",alignItems:"center",gap:2,fontSize:sz,marginLeft:4,cursor:"help"}}>
    <span>🏆</span>
    {champs.length>1&&<span style={{fontSize:Math.floor(sz*0.7),color:W.gold,fontWeight:700}}>×{String(champs.length)}</span>}
  </span>);
}

/**
 * Small banner shown in the Standings view summarizing the current season.
 */
function SeasonBanner(){
  const info=useMemo(()=>getCurrentSeasonInfo(S),[S]);
  const standings=useMemo(()=>computeSeasonStandings(S,info.startDate,info.endDate),[S,info.startDate,info.endDate]);
  const leader=standings.length>0&&standings[0].netPts!==0?standings[0]:null;
  const pctDone=Math.max(0,Math.min(100,((Date.now()-info.startDate)/(info.endDate-info.startDate))*100));
  const daysLeft=Math.max(0,Math.ceil((info.endDate-Date.now())/86400000));
  return(<div style={{background:"linear-gradient(135deg, "+W.gold+"22, "+W.warn+"22)",border:"1px solid "+W.gold+"55",borderRadius:12,padding:14,marginBottom:12}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:180}}>
        <div style={{fontSize:11,color:W.gold,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>🏆 {info.name}</div>
        {leader?(<div style={{marginTop:4,display:"flex",alignItems:"center",gap:8}}>
          <Av player={pO(leader.playerId)} size={28}/>
          <div>
            <div style={{fontSize:13,color:W.cream,fontWeight:600}}>{"Líder: "+leader.nickname}</div>
            <div style={{fontSize:11,color:W.cream3}}>{(leader.netPts>0?"+":"")+String(leader.netPts)+" pts netos en la temporada"}</div>
          </div>
        </div>):(<div style={{fontSize:12,color:W.cream3,marginTop:4,fontStyle:"italic"}}>Todavía nadie suma puntos netos esta temporada</div>)}
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{fontSize:11,color:W.cream3}}>{"Quedan "+String(daysLeft)+" días"}</div>
        <div style={{fontSize:10,color:W.cream3,marginTop:2}}>{fmtD(info.startDate)+" → "+fmtD(info.endDate)}</div>
      </div>
    </div>
    <div style={{height:4,background:W.darkGreen,borderRadius:2,marginTop:10,overflow:"hidden"}}>
      <div style={{height:"100%",width:String(pctDone)+"%",background:W.gold,transition:"width .3s"}}/>
    </div>
  </div>);
}

/**
 * Seasons tab: current season leaderboard + archive of past closed seasons.
 */
function SeasonsView(){
  const info=useMemo(()=>getCurrentSeasonInfo(S),[S]);
  const currentStandings=useMemo(()=>computeSeasonStandings(S,info.startDate,info.endDate),[S,info.startDate,info.endDate]);
  const pastSeasons=useMemo(()=>(S.seasons||[]).filter(s=>s.closed).sort((a,b)=>b.endDate-a.endDate),[S]);
  const[expandedId,setExpandedId]=useState(null);
  return(<div>
    <h2 style={{fontSize:22,fontWeight:700,marginBottom:4,color:W.gold,fontFamily:"'Georgia',serif"}}>🏆 Temporadas</h2>
    <p style={{fontSize:12,color:W.cream3,marginBottom:14,fontStyle:"italic"}}>
      El ranking global es continuo y no se resetea. La temporada reconoce al jugador con mejor balance neto de puntos en cada semestre del calendario.
    </p>

    <h3 style={{fontSize:15,fontWeight:700,margin:"8px 0",color:W.gold}}>{info.name + " (en curso)"}</h3>
    <div style={{fontSize:11,color:W.cream3,marginBottom:10}}>{"Ventana: "+fmtD(info.startDate)+" → "+fmtD(info.endDate)}</div>
    {currentStandings.length===0?(<div style={{...scd,color:W.cream3,fontSize:13,fontStyle:"italic"}}>Aún no hay datos esta temporada.</div>):(
      <div style={{...scd,padding:0,overflow:"hidden"}}>
        {currentStandings.map((row,i)=>(<div key={row.playerId} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderTop:i>0?"1px solid "+W.gold+"11":"none",cursor:"pointer"}} onClick={()=>{const pl=pO(row.playerId);if(pl)setModal({type:"profile",player:pl});}}>
          <span style={{width:22,textAlign:"center",fontWeight:700,color:i===0?W.gold:W.cream3}}>{String(i+1)}</span>
          <Av player={pO(row.playerId)} size={28}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,color:W.cream,fontWeight:600,display:"flex",alignItems:"center"}}>{row.nickname}<ChampionBadge playerId={row.playerId} size={11}/></div>
            <div style={{fontSize:10,color:W.cream3}}>{"V "+String(row.wins)+" · D "+String(row.losses)+" · +"+String(row.gained)+" -"+String(row.lost)}</div>
          </div>
          <div style={{fontWeight:700,fontSize:15,color:row.netPts>=0?W.gold:W.danger}}>{(row.netPts>0?"+":"")+String(row.netPts)}</div>
        </div>))}
      </div>
    )}

    <h3 style={{fontSize:15,fontWeight:700,margin:"22px 0 8px",color:W.gold}}>Temporadas pasadas</h3>
    {pastSeasons.length===0?(<div style={{...scd,color:W.cream3,fontSize:13,fontStyle:"italic"}}>Todavía no se ha cerrado ninguna temporada.</div>):(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {pastSeasons.map(s=>{
          const open=expandedId===s.id;
          return(<div key={s.id} style={{...scd,padding:0,overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer"}} onClick={()=>setExpandedId(open?null:s.id)}>
              <div style={{fontSize:22}}>🏆</div>
              {s.championId?<Av player={pO(s.championId)} size={32}/>:<div style={{width:32,height:32,borderRadius:"50%",background:W.darkGreen}}/>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:W.cream}}>{s.name}</div>
                <div style={{fontSize:11,color:W.cream3}}>{s.championId?"Campeón: "+pSh(s.championId):"Sin campeón (sin datos)"}</div>
              </div>
              <span style={{color:W.cream3,fontSize:11}}>{open?"▲":"▼"}</span>
            </div>
            {open&&s.standings&&s.standings.length>0&&(<div style={{borderTop:"1px solid "+W.gold+"22",padding:"4px 0"}}>
              {s.standings.map((row,i)=>(<div key={row.playerId} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 12px"}}>
                <span style={{width:22,textAlign:"center",fontWeight:700,color:i===0?W.gold:W.cream3,fontSize:12}}>{String(i+1)}</span>
                <Av player={pO(row.playerId)} size={22}/>
                <span style={{flex:1,fontSize:12,color:W.cream,cursor:"pointer"}} onClick={()=>{const pl=pO(row.playerId);if(pl)setModal({type:"profile",player:pl});}}>{row.nickname}</span>
                <span style={{fontWeight:700,fontSize:12,color:row.netPts>=0?W.gold:W.danger}}>{(row.netPts>0?"+":"")+String(row.netPts)}</span>
              </div>))}
            </div>)}
          </div>);
        })}
      </div>
    )}
  </div>);
}

// ==================== HALL OF FAME ====================

/**
 * Big show card for a HoF entry. Handles:
 * - Single player, with large photo + highlighted value.
 * - Ties (array of 2+ playerIds) → multiple smaller faces + tie note.
 * - Placeholder if no playerIds.
 * - Optional per-card surface filter control.
 */
function HofCard({title,subtitle,playerIds,value,valueSuffix,placeholder,
  surface,onSurfaceChange,color,children,icon,condition,customBody,help}){
  const col=color||W.gold;
  const hasData=customBody?true:(playerIds&&playerIds.length>0&&(value!==null&&value!==undefined));
  const isTie=playerIds&&playerIds.length>1;
  const[showHelp,setShowHelp]=useState(false);
  return(<div style={{background:W.card+"ee",borderRadius:12,padding:16,border:"1px solid "+col+"33",position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",gap:8}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2,flexWrap:"wrap"}}>
          {icon&&<span style={{fontSize:16}}>{icon}</span>}
          <h3 style={{fontSize:13,fontWeight:700,margin:0,color:col,textTransform:"uppercase",letterSpacing:1}}>{title}</h3>
          {help&&(<button onClick={()=>setShowHelp(s=>!s)} style={{background:showHelp?col+"33":"transparent",border:"1px solid "+col+"55",color:col,width:18,height:18,borderRadius:"50%",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",display:"inline-flex",alignItems:"center",justifyContent:"center",padding:0,lineHeight:1}} title={showHelp?"Ocultar explicación":"Ver explicación"} aria-label="Ayuda">?</button>)}
        </div>
        {subtitle&&<div style={{fontSize:11,color:W.cream3,fontStyle:"italic"}}>{subtitle}</div>}
        {condition&&<div style={{fontSize:10,color:W.warn,marginTop:2}}>{condition}</div>}
      </div>
      {onSurfaceChange&&(<div style={{display:"flex",gap:2,flexWrap:"wrap",justifyContent:"flex-end"}}>
        {[["all","Todas"],...SURFS.map(s=>[s,s])].map(([k,l])=>(<button key={k} style={{...snv(surface===k),padding:"3px 8px",fontSize:10}} onClick={()=>onSurfaceChange(k)}>{l}</button>))}
      </div>)}
    </div>
    {help&&showHelp&&(<div style={{background:col+"11",border:"1px solid "+col+"44",borderRadius:8,padding:"10px 12px",fontSize:12,color:W.cream2,lineHeight:1.5}}>{help}</div>)}
    {customBody?customBody:(!hasData?(<div style={{textAlign:"center",padding:"12px 0",color:W.cream3,fontSize:12,fontStyle:"italic"}}>
      <div style={{fontSize:36,opacity:.3,marginBottom:4}}>—</div>
      {placeholder||"Por decidir"}
    </div>):(<div>
      {!isTie?(<div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{flexShrink:0}}><Av player={pO(playerIds[0])} size={64}/></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:W.cream,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}} onClick={()=>{const pl=pO(playerIds[0]);if(pl)setModal({type:"profile",player:pl});}}>{pSh(playerIds[0])}<ChampionBadge playerId={playerIds[0]} size={12}/></div>
          <div style={{fontSize:28,fontWeight:700,color:col,lineHeight:1.1,marginTop:2}}>{String(value)}{valueSuffix&&<span style={{fontSize:14,color:W.cream3,marginLeft:4}}>{valueSuffix}</span>}</div>
        </div>
      </div>):(<div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:6}}>
          {playerIds.slice(0,5).map(pid=>(<div key={pid} style={{textAlign:"center",cursor:"pointer"}} onClick={()=>{const pl=pO(pid);if(pl)setModal({type:"profile",player:pl});}}>
            <Av player={pO(pid)} size={40}/>
            <div style={{fontSize:10,color:W.cream,fontWeight:600,marginTop:2,maxWidth:60,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:2}}>{pSh(pid)}<ChampionBadge playerId={pid} size={9}/></div>
          </div>))}
          {playerIds.length>5&&<div style={{fontSize:11,color:W.cream3,alignSelf:"center"}}>+{String(playerIds.length-5)}</div>}
        </div>
        <div style={{fontSize:22,fontWeight:700,color:col,lineHeight:1.1}}>{String(value)}{valueSuffix&&<span style={{fontSize:13,color:W.cream3,marginLeft:4}}>{valueSuffix}</span>}</div>
        <div style={{fontSize:10,color:W.warn,marginTop:3,fontStyle:"italic"}}>Empate entre {String(playerIds.length)} jugadores</div>
      </div>)}
      {children}
    </div>))}
  </div>);
}

function HofSectionHeader({title,subtitle}){
  return(<div style={{marginTop:26,marginBottom:12}}>
    <h2 style={{fontSize:16,fontWeight:700,margin:0,color:W.gold,borderBottom:"2px solid "+W.gold+"44",paddingBottom:6,letterSpacing:.5}}>{title}</h2>
    {subtitle&&<div style={{fontSize:11,color:W.cream3,fontStyle:"italic",marginTop:4}}>{subtitle}</div>}
  </div>);
}

function HallOfFameView(){
  // Local surface filters per card (initial 'all')
  const[sfWins,setSfWins]=useState("all");
  const[sfPct,setSfPct]=useState("all");
  const[sfLosses,setSfLosses]=useState("all");
  const[sfPctWorst,setSfPctWorst]=useState("all");
  const[sfChPlayed,setSfChPlayed]=useState("all");
  const[sfChWon,setSfChWon]=useState("all");
  const[sfChLost,setSfChLost]=useState("all");

  const hof=useMemo(()=>computeHallOfFame(S),[S]);
  if(!hof)return null;

  // Precomputed top picks
  const MIN_MATCHES_PCT=10;
  const mostWinsByMap=hof.perSurface[sfWins].counts.wins;
  const mostLossesByMap=hof.perSurface[sfLosses].counts.losses;
  const mostMatchesByMap=hof.perSurface.all.counts.total;
  const totalsForPct=hof.perSurface.all.counts.total; // min 10 applies to total all-surfaces

  const pctBestMap=useMemo(()=>{
    const wins=hof.perSurface[sfPct].counts.wins;
    const losses=hof.perSurface[sfPct].counts.losses;
    const out={};
    for(const pid of Object.keys(totalsForPct)){
      const w=wins[pid]||0;
      const l=losses[pid]||0;
      const tot=w+l;
      if(tot===0){out[pid]=0;continue;}
      out[pid]=(w/tot)*100;
    }
    return out;
  },[hof,sfPct,totalsForPct]);

  const pctWorstMap=useMemo(()=>{
    const wins=hof.perSurface[sfPctWorst].counts.wins;
    const losses=hof.perSurface[sfPctWorst].counts.losses;
    const out={};
    for(const pid of Object.keys(totalsForPct)){
      const w=wins[pid]||0;
      const l=losses[pid]||0;
      const tot=w+l;
      if(tot===0){out[pid]=100;continue;}
      out[pid]=(w/tot)*100;
    }
    return out;
  },[hof,sfPctWorst,totalsForPct]);

  const mostWinsPick=pickTop(mostWinsByMap,"max");
  const mostLossesPick=pickTop(mostLossesByMap,"max");
  const mostMatchesPick=pickTop(mostMatchesByMap,"max");
  const pctBestPick=pickTop(pctBestMap,"max",totalsForPct,MIN_MATCHES_PCT);
  const pctWorstPick=pickTop(pctWorstMap,"min",totalsForPct,MIN_MATCHES_PCT);
  const tournWinsPick=pickTop(hof.tournamentWins,"max");

  const chPlayedPick=pickTop(hof.perSurface[sfChPlayed].chCounts.played,"max");
  const chWonPick=pickTop(hof.perSurface[sfChWon].chCounts.won,"max");
  const chLostPick=pickTop(hof.perSurface[sfChLost].chCounts.lost,"max");

  // Weeks at #1
  const weeksAt1Top=hof.weeksAt1.length>0?{
    playerIds:hof.weeksAt1.filter(x=>x.weeks===hof.weeksAt1[0].weeks).map(x=>x.playerId),
    value:hof.weeksAt1[0].weeks,
  }:{playerIds:[],value:null};

  // ===== Champions aggregation (closed seasons) =====
  // For each playerId that has won ≥1 closed season:
  //   { playerId, count (nº of titles), points (sum of netPts across champion seasons), seasons: [seasonObj,...] }
  // Sorted by count desc, then points desc.
  const championsList=useMemo(()=>{
    const closedSeasons=(S.seasons||[]).filter(s=>s.closed&&s.championId);
    const map={};
    for(const s of closedSeasons){
      const pid=s.championId;
      if(!map[pid])map[pid]={playerId:pid,count:0,points:0,seasons:[]};
      map[pid].count+=1;
      // netPts for this player in this season's standings
      const row=(s.standings||[]).find(r=>r.playerId===pid);
      const net=row?(row.netPts||0):0;
      map[pid].points+=net;
      map[pid].seasons.push(s);
    }
    return Object.values(map).sort((a,b)=>b.count-a.count||b.points-a.points);
  },[S]);

  // For the "Más temporadas ganadas" card
  const mostSeasonsPick=(()=>{
    if(championsList.length===0)return{playerIds:[],value:null};
    const max=championsList[0].count;
    const tied=championsList.filter(c=>c.count===max).map(c=>c.playerId);
    return{playerIds:tied,value:max};
  })();

  // Yearly podiums (2026 onwards, natural calendar years)
  const yearlyPodiums=useMemo(()=>getYearlyPodiums(S),[S]);

  return(<div>
    <h2 style={{fontSize:22,fontWeight:700,marginBottom:4,color:W.gold,fontFamily:"'Georgia',serif"}}>🏛️ Hall of Fame</h2>
    <p style={{fontSize:12,color:W.cream3,marginBottom:10,fontStyle:"italic"}}>
      Los récords y hazañas históricas de la liga. Las tarjetas con botones de superficie se filtran individualmente. En caso de empate se muestran todos los implicados.
    </p>

    {/* ============ SECCIÓN: MEJORES DEL AÑO NATURAL ============ */}
    <HofSectionHeader title="🗓️ Mejores del año natural" subtitle="Top 3 por año de calendario (ene–dic). Se calcula automáticamente, sin cierre manual, desde 2026."/>
    {yearlyPodiums.length===0?(<div style={{...scd,color:W.cream3,fontSize:13,fontStyle:"italic",textAlign:"center",padding:20}}>
      <div style={{fontSize:36,opacity:.3,marginBottom:6}}>🗓️</div>
      Aún no hay actividad registrada en ningún año natural desde 2026.
    </div>):(<div style={{display:"flex",flexDirection:"column",gap:16}}>
      {yearlyPodiums.map(yp=>{
        const p1=yp.podium[0];
        const p2=yp.podium[1];
        const p3=yp.podium[2];
        return(<div key={yp.year} style={{background:"linear-gradient(135deg, "+W.gold+"12, "+W.warn+"10)",border:"1px solid "+W.gold+"44",borderRadius:12,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:6}}>
            <div style={{fontSize:16,fontWeight:700,color:W.gold,fontFamily:"'Georgia',serif"}}>{String(yp.year)}{yp.isCurrent&&<span style={{fontSize:11,color:W.warn,fontStyle:"italic",marginLeft:8,fontWeight:400}}>(en curso)</span>}</div>
            <div style={{fontSize:11,color:W.cream3,fontStyle:"italic"}}>{String(yp.fullStandings.length)+" jugador"+(yp.fullStandings.length!==1?"es":"")+" con actividad"}</div>
          </div>
          {/* Podium: silver on left, gold in center (taller), bronze on right */}
          <div style={{display:"flex",justifyContent:"center",alignItems:"flex-end",gap:12,padding:"8px 0 0"}}>
            {/* Plata (izquierda) */}
            {p2?(<div style={{textAlign:"center",cursor:"pointer",flex:"0 0 auto"}} onClick={()=>{const pl=pO(p2.playerId);if(pl)setModal({type:"profile",player:pl});}}>
              <div style={{fontSize:22,marginBottom:4}}>🥈</div>
              <Av player={pO(p2.playerId)} size={56}/>
              <div style={{fontSize:12,color:W.cream,fontWeight:600,marginTop:4,display:"inline-flex",alignItems:"center",gap:3}}>{p2.nickname}<ChampionBadge playerId={p2.playerId} size={9}/></div>
              <div style={{fontSize:14,fontWeight:700,color:W.cream2}}>{"+"+String(p2.netPts)}</div>
              <div style={{fontSize:9,color:W.cream3}}>{"V "+String(p2.wins)+" · D "+String(p2.losses)}</div>
              <div style={{width:70,height:50,background:W.cream2+"44",border:"2px solid "+W.cream2,borderRadius:"6px 6px 0 0",marginTop:6,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:W.cream,fontSize:16}}>2º</div>
            </div>):<div style={{width:70,flex:"0 0 auto"}}/>}
            {/* Oro (centro, más alto) */}
            {p1?(<div style={{textAlign:"center",cursor:"pointer",flex:"0 0 auto"}} onClick={()=>{const pl=pO(p1.playerId);if(pl)setModal({type:"profile",player:pl});}}>
              <div style={{fontSize:28,marginBottom:4}}>🥇</div>
              <Av player={pO(p1.playerId)} size={72}/>
              <div style={{fontSize:13,color:W.gold,fontWeight:700,marginTop:4,display:"inline-flex",alignItems:"center",gap:3}}>{p1.nickname}<ChampionBadge playerId={p1.playerId} size={10}/></div>
              <div style={{fontSize:16,fontWeight:700,color:W.gold}}>{"+"+String(p1.netPts)}</div>
              <div style={{fontSize:10,color:W.cream3}}>{"V "+String(p1.wins)+" · D "+String(p1.losses)}</div>
              <div style={{width:80,height:72,background:W.gold+"44",border:"2px solid "+W.gold,borderRadius:"6px 6px 0 0",marginTop:6,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:W.gold,fontSize:22}}>1º</div>
            </div>):<div style={{width:80,flex:"0 0 auto"}}/>}
            {/* Bronce (derecha) */}
            {p3?(<div style={{textAlign:"center",cursor:"pointer",flex:"0 0 auto"}} onClick={()=>{const pl=pO(p3.playerId);if(pl)setModal({type:"profile",player:pl});}}>
              <div style={{fontSize:20,marginBottom:4}}>🥉</div>
              <Av player={pO(p3.playerId)} size={50}/>
              <div style={{fontSize:12,color:W.cream,fontWeight:600,marginTop:4,display:"inline-flex",alignItems:"center",gap:3}}>{p3.nickname}<ChampionBadge playerId={p3.playerId} size={9}/></div>
              <div style={{fontSize:13,fontWeight:700,color:W.warn}}>{"+"+String(p3.netPts)}</div>
              <div style={{fontSize:9,color:W.cream3}}>{"V "+String(p3.wins)+" · D "+String(p3.losses)}</div>
              <div style={{width:65,height:36,background:W.warn+"44",border:"2px solid "+W.warn,borderRadius:"6px 6px 0 0",marginTop:6,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:W.warn,fontSize:14}}>3º</div>
            </div>):<div style={{width:65,flex:"0 0 auto"}}/>}
          </div>
          {yp.isCurrent&&(<div style={{marginTop:10,fontSize:10,color:W.cream3,textAlign:"center",fontStyle:"italic"}}>El podio cambiará a medida que se jueguen más partidos en {String(yp.year)}.</div>)}
        </div>);
      })}
    </div>)}

    {/* ============ SECCIÓN: SALÓN DE CAMPEONES ============ */}
    <HofSectionHeader title="👑 Salón de Campeones" subtitle="Los jugadores que han conquistado al menos una temporada"/>
    {championsList.length===0?(<div style={{...scd,color:W.cream3,fontSize:13,fontStyle:"italic",textAlign:"center",padding:20}}>
      <div style={{fontSize:36,opacity:.3,marginBottom:6}}>🏆</div>
      Todavía no se ha cerrado ninguna temporada. Cuando se cierre la primera, su campeón entrará aquí para siempre.
    </div>):(<>
      {/* Muro de campeones: galería grande con todos los ganadores */}
      <div style={{background:"linear-gradient(135deg, "+W.gold+"18, "+W.warn+"10)",border:"1px solid "+W.gold+"44",borderRadius:12,padding:16,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:6}}>
          <div>
            <div style={{fontSize:11,color:W.gold,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Galería de campeones</div>
            <div style={{fontSize:11,color:W.cream3,fontStyle:"italic",marginTop:2}}>Ordenados por nº de temporadas ganadas (desempate: puntos netos acumulados)</div>
          </div>
          <div style={{fontSize:11,color:W.cream3}}>{String(championsList.length)+" jugador"+(championsList.length!==1?"es":"")}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12}}>
          {championsList.map((c,i)=>{
            const pl=pO(c.playerId);
            const medal=i===0?"🥇":i===1?"🥈":i===2?"🥉":"🏆";
            const borderCol=i===0?W.gold:i===1?W.cream2:i===2?W.warn:W.gold+"44";
            return(<div key={c.playerId} style={{background:W.darkGreen,borderRadius:10,padding:12,border:"2px solid "+borderCol,textAlign:"center",cursor:"pointer",position:"relative"}} onClick={()=>{if(pl)setModal({type:"profile",player:pl});}}>
              <div style={{position:"absolute",top:6,right:8,fontSize:18}}>{medal}</div>
              <div style={{display:"flex",justifyContent:"center",marginBottom:6}}><Av player={pl} size={54}/></div>
              <div style={{fontSize:13,fontWeight:700,color:W.cream,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pSh(c.playerId)}</div>
              <div style={{fontSize:22,fontWeight:700,color:W.gold,lineHeight:1.1,marginTop:4}}>{String(c.count)+"×"}</div>
              <div style={{fontSize:10,color:W.cream3,marginTop:2}}>{"temporada"+(c.count!==1?"s":"")+" ganada"+(c.count!==1?"s":"")}</div>
              <div style={{fontSize:10,color:W.warn,marginTop:4,fontWeight:600}}>{(c.points>=0?"+":"")+String(c.points)+" pts netos"}</div>
            </div>);
          })}
        </div>
      </div>
      {/* Tarjeta destacada: Más temporadas ganadas (estilo HoF estándar) */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:12}}>
        <HofCard icon="🏆" title="Más temporadas ganadas" subtitle="El dueño del trofeo"
          help="El jugador con mayor número de temporadas ganadas en toda la historia. En caso de empate se consideran todos los que compartan ese máximo. Las temporadas solo cuentan cuando el admin las ha cerrado oficialmente."
          playerIds={mostSeasonsPick.playerIds} value={mostSeasonsPick.value} valueSuffix={"temporada"+(mostSeasonsPick.value!==1?"s":"")}
          placeholder="Aún no hay campeones" color={W.gold}/>
      </div>
    </>)}

    {/* ============ SECCIÓN: PRESENTE ============ */}
    <HofSectionHeader title="🏆 Presente" subtitle="Estado actual y hitos vigentes de la liga"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:12}}>
      <HofCard icon="👑" title="Número 1 actual" subtitle="El que lleva la corona"
        help="El jugador con más puntos en el ranking en este momento. Se calcula con los puntos actuales, incluyendo partidos regulares, retos y torneos. Los jugadores suspendidos no cuentan. En caso de empate a puntos, se muestran todos los implicados."
        playerIds={hof.currentNumber1.playerIds} value={hof.currentNumber1.value} valueSuffix="pts"
        placeholder="Aún no hay jugadores con puntos" color={W.gold}/>

      <HofCard icon="🔥" title="Récord histórico de puntos" subtitle="Los puntos más altos jamás alcanzados"
        help="La mayor cantidad de puntos que cualquier jugador ha tenido en su ranking en cualquier momento del pasado. Este valor puede ser superior al del número 1 actual: por ejemplo, si alguien llegó a 800 puntos hace meses pero luego perdió partidos y cayó a 600, el récord sigue siendo 800. Se recalcula cada semana desde el inicio de la liga."
        playerIds={hof.peak.playerIds} value={hof.peak.peak} valueSuffix="pts"
        placeholder="Se irá llenando con el tiempo" color={W.warn}/>

      {/* Sorpassos: renderizo con customBody porque es estructura especial */}
      <HofCard icon="⚡" title="Sorpassos más probables"
        help={"Un \"sorpasso\" es un adelantamiento en el ranking. Esta tarjeta identifica a los jugadores que están tan cerca en la clasificación que un solo partido podría cambiar su orden. El umbral usa la fórmula dinámica: base de puntos ("+String(S.config.eloBase)+") × (1 + bonus de equidad / 100) = "+String(hof.closeRacers.threshold||0)+" puntos, que es lo máximo que se puede ganar en un partido regular (aplicando el bonus del peor rankeado). Los jugadores suspendidos no se incluyen."}
        subtitle={"Grupos consecutivos con diferencia ≤ "+String(hof.closeRacers.threshold||0)+" pts (máx ganable en un partido)"}
        customBody={(()=>{
          const groups=hof.closeRacers.groups;
          if(!groups||groups.length===0)return(<div style={{textAlign:"center",padding:"12px 0",color:W.cream3,fontSize:12,fontStyle:"italic"}}>
            <div style={{fontSize:36,opacity:.3,marginBottom:4}}>—</div>
            Ningún grupo en zona caliente ahora mismo
          </div>);
          return(<div style={{display:"flex",flexDirection:"column",gap:10}}>
            {groups.map((grp,gi)=>(<div key={gi} style={{background:W.darkGreen,borderRadius:8,padding:8,border:"1px solid "+W.warn+"33"}}>
              <div style={{fontSize:10,color:W.warn,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Zona caliente · {String(grp.length)} jugadores</div>
              {grp.map((p,pi)=>{
                const next=grp[pi+1];
                const diff=next?p.points-next.points:null;
                return(<div key={p.playerId}>
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0"}}>
                    <span style={{fontWeight:700,color:W.gold,minWidth:22}}>#{String(p.position)}</span>
                    <Av player={pO(p.playerId)} size={26}/>
                    <span style={{flex:1,fontWeight:600,color:W.cream,fontSize:13,cursor:"pointer"}} onClick={()=>{const pl=pO(p.playerId);if(pl)setModal({type:"profile",player:pl});}}>{pSh(p.playerId)}</span>
                    <span style={{fontWeight:700,color:W.gold,fontSize:13}}>{String(p.points)}pts</span>
                  </div>
                  {diff!==null&&<div style={{fontSize:10,color:W.warn,paddingLeft:30,marginBottom:2}}>↕ {String(diff)} pts</div>}
                </div>);
              })}
            </div>))}
          </div>);
        })()}
        color={W.warn}/>
    </div>

    {/* ============ SECCIÓN: DOMINADORES ============ */}
    <HofSectionHeader title="📊 Dominadores" subtitle="Estadísticas positivas de victorias y títulos"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:12}}>
      <HofCard icon="✅" title="Más victorias" subtitle="Partidos regulares y retos ganados"
        help="Número total de partidos ganados en la historia de la liga. Incluye partidos regulares (Liga y Amistoso), retos y partidos de torneo. Puedes filtrar por superficie para ver quién domina en cada tipo de pista."
        playerIds={mostWinsPick.playerIds} value={mostWinsPick.value} valueSuffix="victorias"
        placeholder="Nadie ha ganado aún" color={W.lightGreen}
        surface={sfWins} onSurfaceChange={setSfWins}/>

      <HofCard icon="🎯" title="Mejor ratio V/D" subtitle="Mayor porcentaje de victorias"
        help={"Porcentaje de partidos ganados sobre el total jugado. Solo aparecen jugadores con al menos "+String(MIN_MATCHES_PCT)+" partidos totales (sumando todas las superficies y tipos de partido) para evitar que alguien con 1 partido ganado tenga un 100% simbólico. Cuando filtras por superficie, el umbral de "+String(MIN_MATCHES_PCT)+" sigue siendo sobre el total global: por ejemplo, si tienes 12 partidos totales pero solo 2 en tierra, apareces con tu ratio de tierra aunque ese subconjunto sea pequeño. Incluye partidos de torneo."}
        condition={"Mínimo "+String(MIN_MATCHES_PCT)+" partidos totales"}
        playerIds={pctBestPick.playerIds} value={pctBestPick.value!==null?pctBestPick.value.toFixed(1):null} valueSuffix="%"
        placeholder={"Nadie alcanza los "+String(MIN_MATCHES_PCT)+" partidos"} color={W.lightGreen}
        surface={sfPct} onSurfaceChange={setSfPct}/>

      <HofCard icon="🏆" title="Más torneos ganados" subtitle="Campeón de torneos finalizados"
        help="Número de torneos donde el jugador ha ganado la final. Solo se cuentan torneos que hayan terminado (con una final confirmada). La superficie del torneo no filtra esta tarjeta porque los torneos suelen incluir partidos en diferentes superficies."
        playerIds={tournWinsPick.playerIds} value={tournWinsPick.value} valueSuffix="torneos"
        placeholder="Aún no hay campeones" color={W.gold}/>

      <HofCard icon="👑" title="Más tiempo como #1" subtitle="Semanas terminadas en el puesto 1"
        help="Número de semanas (de lunes a domingo) en las que un jugador ha terminado como número 1 del ranking al cierre del domingo. Emula el ranking ATP real de «weeks at #1». Solo cuentan semanas completas cerradas. Si nadie tiene puntos en una semana, esa semana no cuenta para nadie."
        playerIds={weeksAt1Top.playerIds} value={weeksAt1Top.value} valueSuffix="semanas"
        placeholder="Aún no hay un #1 establecido" color={W.gold}/>

      <HofCard icon="🔥" title="Mejor racha de victorias" subtitle="Partidos ganados consecutivamente"
        help="Mayor número de partidos ganados de forma consecutiva (sin ninguna derrota entre medias). Cuentan todos los partidos confirmados: regulares, retos y torneos. Se calcula mirando toda la historia del jugador, no solo su racha actual. En caso de empate se muestran todos los jugadores con la misma racha récord."
        playerIds={hof.bestStreak.playerIds} value={hof.bestStreak.streak>0?hof.bestStreak.streak:null} valueSuffix="seguidos"
        placeholder="Se hará historia pronto" color={W.warn}/>
    </div>

    {/* ============ SECCIÓN: GUERREROS ============ */}
    <HofSectionHeader title="🎾 Guerreros" subtitle="Jugadores y duelos con mayor volumen"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:12}}>
      <HofCard icon="🎯" title="Más partidos jugados" subtitle="Regulares y retos, todas las superficies"
        help="El jugador más activo de la liga. Suma partidos regulares, retos y torneos sobre todas las superficies. En caso de empate aparecen todos los que compartan el número máximo de partidos."
        playerIds={mostMatchesPick.playerIds} value={mostMatchesPick.value} valueSuffix="partidos"
        placeholder="La liga está empezando" color={W.blue}/>

      {/* Enfrentamiento más repetido: customBody con dos avatares grandes */}
      <HofCard icon="⚔️" title="Enfrentamiento más repetido" subtitle="La rivalidad por excelencia"
        help="El par de jugadores que más veces se han enfrentado. Cuenta partidos regulares, retos y partidos de torneo (si dos jugadores han coincidido en varios brackets, cada encuentro suma). Se muestra el head-to-head entre ambos: cuántas victorias tiene cada uno en esa rivalidad. En caso de empate entre varios pares con el mismo número de enfrentamientos, se indica al final de la tarjeta."
        customBody={(()=>{
          const mr=hof.mostRepeated;
          if(!mr||!mr.pairs||mr.pairs.length===0)return(<div style={{textAlign:"center",padding:"12px 0",color:W.cream3,fontSize:12,fontStyle:"italic"}}>
            <div style={{fontSize:36,opacity:.3,marginBottom:4}}>—</div>
            Se decidirá con los partidos
          </div>);
          // Show first pair big, others smaller if ties
          const primary=mr.pairs[0];
          const [a,b]=primary.pair;
          const h2h=primary.h2h;
          return(<div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,padding:"4px 0"}}>
              <div style={{textAlign:"center",cursor:"pointer"}} onClick={()=>{const pl=pO(a);if(pl)setModal({type:"profile",player:pl});}}>
                <Av player={pO(a)} size={56}/>
                <div style={{fontSize:11,fontWeight:600,color:W.cream,marginTop:4}}>{pSh(a)}</div>
                <div style={{fontSize:18,fontWeight:700,color:h2h.a>=h2h.b?W.gold:W.cream3}}>{String(h2h.a)}</div>
              </div>
              <div style={{fontSize:22,fontWeight:700,color:W.gold}}>{String(primary.count)}</div>
              <div style={{textAlign:"center",cursor:"pointer"}} onClick={()=>{const pl=pO(b);if(pl)setModal({type:"profile",player:pl});}}>
                <Av player={pO(b)} size={56}/>
                <div style={{fontSize:11,fontWeight:600,color:W.cream,marginTop:4}}>{pSh(b)}</div>
                <div style={{fontSize:18,fontWeight:700,color:h2h.b>=h2h.a?W.gold:W.cream3}}>{String(h2h.b)}</div>
              </div>
            </div>
            <div style={{textAlign:"center",fontSize:11,color:W.cream3,marginTop:2,fontStyle:"italic"}}>{String(primary.count)+" partidos · H2H "+String(h2h.a)+"-"+String(h2h.b)}</div>
            {mr.pairs.length>1&&<div style={{textAlign:"center",fontSize:10,color:W.warn,marginTop:4,fontStyle:"italic"}}>Empate con {String(mr.pairs.length-1)} rivalidad{mr.pairs.length-1!==1?"es":""} más</div>}
          </div>);
        })()}
        color={W.blue}/>

      <HofCard icon="💪" title="Más retos jugados" subtitle="El que más pelea busca"
        help="Un reto es un partido oficial lanzado explícitamente por un jugador a otro, que requiere aceptación del retado. Esta tarjeta cuenta todos los retos que un jugador ha disputado (sea retador o retado), tanto los ganados como los perdidos. Se puede filtrar por superficie del partido."
        playerIds={chPlayedPick.playerIds} value={chPlayedPick.value} valueSuffix="retos"
        placeholder="Aún no hay retos resueltos" color={W.warn}
        surface={sfChPlayed} onSurfaceChange={setSfChPlayed}/>

      <HofCard icon="🥊" title="Más retos ganados" subtitle="El que no falla cuando hay retos"
        help="Número total de retos que el jugador ha ganado (sin importar si los lanzó él o los recibió). Ten en cuenta que ganar un reto otorga puntos pero perder uno también te descuenta puntos equivalentes a la base."
        playerIds={chWonPick.playerIds} value={chWonPick.value} valueSuffix="ganados"
        placeholder="Aún no hay retos resueltos" color={W.lightGreen}
        surface={sfChWon} onSurfaceChange={setSfChWon}/>
    </div>

    {/* ============ SECCIÓN: MOMENTOS ÉPICOS ============ */}
    <HofSectionHeader title="⚡ Momentos épicos" subtitle="Las hazañas que merecen un lugar aparte"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:12}}>
      <HofCard icon="🎭" title="Mayor upset"
        help="Un «upset» es la victoria sorpresa de un jugador claramente peor rankeado sobre uno mejor posicionado (lo que en español podríamos llamar «dar la campanada»). Esta tarjeta muestra el partido en el que la diferencia de puntos entre ganador y perdedor EN EL MOMENTO EXACTO del partido fue mayor. Es importante: no se usa la diferencia de puntos actual, sino la que existía cuando se disputó el partido — así, una victoria contra alguien que luego bajó de puntos sigue contando como el upset que fue en su momento. Incluye partidos regulares, retos y torneos (un upset en la final de un torneo es especialmente épico). Haz click sobre la tarjeta para ver el partido en detalle."
        subtitle="La victoria más inesperada (mayor diferencia de puntos al momento del partido)"
        customBody={(()=>{
          const u=hof.biggestUpset;
          if(!u||!u.matches||u.matches.length===0)return(<div style={{textAlign:"center",padding:"12px 0",color:W.cream3,fontSize:12,fontStyle:"italic"}}>
            <div style={{fontSize:36,opacity:.3,marginBottom:4}}>—</div>
            Ningún underdog ha dado la sorpresa aún
          </div>);
          const entry=u.matches[0];
          const m=entry.match;
          const loser=m.winner===m.player1?m.player2:m.player1;
          return(<div>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"4px 0",cursor:"pointer"}} onClick={()=>setModal({type:"detail",match:m})}>
              <Av player={pO(m.winner)} size={56}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,color:W.cream3,textTransform:"uppercase",letterSpacing:.5,marginBottom:2}}>Ganó</div>
                <div style={{fontSize:14,fontWeight:700,color:W.gold}}>{pSh(m.winner)}</div>
                <div style={{fontSize:11,color:W.cream3}}>{"con "+String(entry.winnerPts)+" pts vs "+pSh(loser)+" ("+String(entry.loserPts)+" pts)"}</div>
                <div style={{fontSize:22,fontWeight:700,color:W.warn,marginTop:2}}>+{String(entry.gap)} pts de diferencia</div>
                {m.score&&<div style={{fontSize:11,color:W.cream2,marginTop:2}}>{m.score+" · "+fmtD(m.date)}</div>}
              </div>
            </div>
            {u.matches.length>1&&<div style={{textAlign:"center",fontSize:10,color:W.warn,marginTop:4,fontStyle:"italic"}}>Empate con {String(u.matches.length-1)} upset{u.matches.length-1!==1?"s":""} más</div>}
          </div>);
        })()}
        color={W.warn}/>
    </div>

    {/* ============ SECCIÓN: LADO OSCURO ============ */}
    <HofSectionHeader title="💀 Lado oscuro" subtitle="Las estadísticas negativas también cuentan historia"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:12}}>
      <HofCard icon="❌" title="Más derrotas" subtitle="El que más ha probado el polvo de la pista"
        help="Número total de partidos perdidos. Incluye partidos regulares, retos y partidos de torneo. Filtrable por superficie. El hecho de aparecer aquí no implica ser peor jugador — suele correlacionar simplemente con jugar mucho."
        playerIds={mostLossesPick.playerIds} value={mostLossesPick.value} valueSuffix="derrotas"
        placeholder="Nadie ha perdido aún" color={W.danger}
        surface={sfLosses} onSurfaceChange={setSfLosses}/>

      <HofCard icon="📉" title="Peor ratio V/D" subtitle="Menor porcentaje de victorias"
        help={"El simétrico de \"Mejor ratio V/D\": porcentaje de victorias más bajo sobre el total de partidos. Solo aparecen jugadores con al menos "+String(MIN_MATCHES_PCT)+" partidos totales (sumando todas las superficies) para evitar picos engañosos por pocos partidos. Si filtras por superficie, el umbral sigue siendo sobre el total global de partidos del jugador."}
        condition={"Mínimo "+String(MIN_MATCHES_PCT)+" partidos totales"}
        playerIds={pctWorstPick.playerIds} value={pctWorstPick.value!==null?pctWorstPick.value.toFixed(1):null} valueSuffix="%"
        placeholder={"Nadie alcanza los "+String(MIN_MATCHES_PCT)+" partidos"} color={W.danger}
        surface={sfPctWorst} onSurfaceChange={setSfPctWorst}/>

      <HofCard icon="🪦" title="Más retos perdidos" subtitle="Ha mordido el polvo en los retos"
        help="Número de retos que el jugador ha perdido. Recordatorio: perder un reto resta puntos equivalentes a la base (100 por defecto), así que aparecer muy arriba aquí suele venir acompañado de caídas en el ranking."
        playerIds={chLostPick.playerIds} value={chLostPick.value} valueSuffix="perdidos"
        placeholder="Aún no hay retos resueltos" color={W.danger}
        surface={sfChLost} onSurfaceChange={setSfChLost}/>

      <HofCard icon="🧊" title="Peor racha de derrotas" subtitle="Partidos perdidos consecutivamente"
        help="El mayor número de partidos perdidos de forma consecutiva (sin ninguna victoria de por medio) que ha tenido un jugador en toda su historia. Cuentan todos los partidos confirmados: regulares, retos y torneos. Ser «líder» en esta categoría no implica nada — todos pasamos por rachas malas."
        playerIds={hof.worstStreak.playerIds} value={hof.worstStreak.streak>0?hof.worstStreak.streak:null} valueSuffix="seguidos"
        placeholder="Nadie ha encadenado derrotas aún" color={W.danger}/>
    </div>

    <div style={{marginTop:24,padding:14,background:W.darkGreen,borderRadius:8,border:"1px solid "+W.gold+"22",fontSize:11,color:W.cream3,fontStyle:"italic",textAlign:"center"}}>
      Los datos se recalculan en tiempo real desde los partidos registrados. La mayoría de estadísticas incluyen todos los partidos confirmados (regulares, retos y torneos) a efectos de cuenta. Los puntos del ranking, sin embargo, se asignan según las reglas correspondientes a cada tipo de partido. Los valores de «Sorpassos» y «Upset» usan el umbral dinámico definido por la base de puntuación y el bonus de equidad configurados.
    </div>
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
    flash("Cambios guardados","success");
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
  const isAuto=!!msg.isAutoPost;
  const author=isAuto?null:pO(msg.userId);
  const isMine=!isAuto&&msg.userId===myId;
  const canEdit=isMine&&!isAuto;
  const canDelete=!isAuto&&(isMine||isA);
  const replies=msg.replies||[];
  const autoColor=msg.autoKind==="bonus"?W.lightGreen:msg.autoKind==="sanction"?W.danger:W.warn;
  const borderCol=isAuto?autoColor+"66":(msg.pinned?W.warn+"55":W.gold+"22");
  return(<div style={{...scd,padding:14,borderColor:borderCol,borderWidth:isAuto?2:1,position:"relative",background:isAuto?W.card+"cc":W.card+"ee"}}>
    {msg.pinned&&(<div style={{position:"absolute",top:-10,left:14,background:W.warn,color:"#1a0a0a",padding:"2px 10px",borderRadius:4,fontSize:10,fontWeight:700,letterSpacing:1}}>📌 FIJADO</div>)}
    {isAuto&&(<div style={{position:"absolute",top:-10,right:14,background:autoColor,color:"#1a0a0a",padding:"2px 10px",borderRadius:4,fontSize:10,fontWeight:700,letterSpacing:1}}>🏛️ ADMINISTRACIÓN</div>)}
    <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
      {isAuto?(<div style={{width:36,height:36,borderRadius:"50%",background:autoColor+"22",border:"2px solid "+autoColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🏛️</div>):(<Av player={author} size={36}/>)}
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2,flexWrap:"wrap"}}>
          {isAuto?(<span style={{fontWeight:700,color:autoColor,letterSpacing:.5}}>Administración</span>):(<span style={{fontWeight:600,color:W.cream,cursor:"pointer"}} onClick={()=>author&&setModal({type:"profile",player:author})}>{author?author.nickname:"?"}</span>)}
          <span style={{fontSize:11,color:W.cream3}}>{fmtD(msg.date)}</span>
          {msg.editedAt&&!isAuto&&<span style={{fontSize:10,color:W.cream3,fontStyle:"italic"}}>(editado)</span>}
        </div>
        <div style={{fontSize:14,color:W.cream,lineHeight:1.5}}><MentionText text={msg.text}/></div>
        {isAuto&&<div style={{fontSize:10,color:W.cream3,fontStyle:"italic",marginTop:4}}>Mensaje automático generado al aplicar el ajuste. Si el admin borra el ajuste, este mensaje desaparecerá.</div>}
      </div>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginTop:8}}>
      <ForumReactBar target={{kind:"msg",msgId:msg.id}}/>
      {!isAuto&&<button style={{...sbt("ghost"),padding:"4px 10px",fontSize:11}} onClick={()=>setReplying(!replying)}>{replying?"Cancelar":"Responder"}</button>}
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
    flash("Mensaje publicado","success");
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
