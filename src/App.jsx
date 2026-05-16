import { loginWithGoogle, logoutAdmin, onAuth, getContent, getContentById, createContent, updateContent, deleteContent, getUsers, subscribeContent, saveQuestionBank, getQuestionBankMeta, getRandomQuestions, getAllBankQuestions } from './firebase.js';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getApp } from 'firebase/app';
const db = getFirestore(getApp());
import { useState, useEffect, useCallback, useRef } from "react";

const G = {
  bg:"#f7f7f5",white:"#ffffff",border:"#e8e8e4",text:"#111",muted:"#888",light:"#f2f2f0",lighter:"#fafaf8",
  accent:"#f05a1a",accentLight:"#fff4f0",accentDark:"#c94810",
  green:"#16a34a",greenLight:"#f0fdf4",blue:"#2563eb",blueLight:"#eff6ff",
  purple:"#7c3aed",purpleLight:"#f5f3ff",amber:"#d97706",amberLight:"#fffbeb",
  danger:"#dc2626",dangerLight:"#fef2f2",
  font:"'DM Sans',system-ui,sans-serif",mono:"'DM Mono','Fira Code',monospace",
};

const css=`
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:${G.font};background:${G.bg};color:${G.text};font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;}
  button,input,textarea,select{font-family:inherit;}
  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  .fu{animation:fadeUp 0.25s ease both;}
  .fi{animation:fadeIn 0.2s ease both;}
`;

const CONTENT_TYPES={
  worksheet:{id:"worksheet",label:"Worksheet",icon:"📋",color:G.accent,colorLight:G.accentLight,desc:"Questions kids complete at their own pace"},
  quiz:     {id:"quiz",     label:"Quiz",      icon:"⏱️",color:G.blue,  colorLight:G.blueLight,  desc:"Timed scored quiz — 30 to 60 seconds"},
  reading:  {id:"reading",  label:"Reading",   icon:"📖",color:G.green, colorLight:G.greenLight, desc:"Story passage + comprehension questions"},
  game:     {id:"game",     label:"Mini Game", icon:"🎮",color:G.purple,colorLight:G.purpleLight,desc:"Interactive game — Quick Fire, Memory, Match, Sort"},
};

const QUESTION_TYPES=[
  {id:"multiple_choice",label:"Multiple Choice",icon:"◉",desc:"4 options, one correct"},
  {id:"fill_blank",     label:"Fill in Blank",  icon:"✏️",desc:"Type the answer"},
  {id:"true_false",     label:"True or False",  icon:"⊤⊥",desc:"Binary choice"},
  {id:"drag_drop",      label:"Drag & Drop",    icon:"↕", desc:"Drag items to correct positions"},
  {id:"sorting",        label:"Sorting",        icon:"⇄", desc:"Sort into 2 categories"},
];

const GAME_TYPES=[
  {id:"quick_fire",label:"Quick Fire!",  icon:"⚡",desc:"Answer questions as fast as possible",color:G.amber},
  {id:"memory",    label:"Memory Match", icon:"🧠",desc:"Flip cards to find matching pairs",   color:G.blue},
  {id:"pair_up",   label:"Pair Up!",     icon:"🎯",desc:"Match words to their meanings",       color:G.green},
  {id:"sort_it",   label:"Sort It Out",  icon:"🗂️",desc:"Drag items into the correct category",color:G.purple},
];

const SUBJECTS=["Math","Reading","Grammar","Science","Social Studies"];
const GRADES=[1,2,3,4,5];
const SUBJECT_ICONS={
  Math:   ["🔢","➕","✖️","🍕","🔷","⏰","📐","🧮","📊"],
  Reading:["📖","📚","✏️","🪄","🐔","🌧️","🤖","🎃","🦊"],
  Grammar:["✏️","📝","🔤","💬","📜","🖊️","🔡"],
  Science:["🔬","🧪","🌿","🌍","⚗️","🦋","🌊","🔭"],
  "Social Studies":["🗺️","🏛️","🌎","🤝","📜","🏠"],
};

const MOCK_CONTENT=[
  {id:"ws-g1-math-1", type:"worksheet",grade:1,subject:"Math",   title:"Counting Fun",         icon:"🔢",xpReward:50, published:true, items:5},
  {id:"ws-g1-read-1", type:"reading",  grade:1,subject:"Reading",title:"The Little Red Hen",   icon:"📖",xpReward:50, published:true, items:5},
  {id:"qz-g2-math-1", type:"quiz",     grade:2,subject:"Math",   title:"Addition Blitz",       icon:"⏱️",xpReward:75, published:true, items:8},
  {id:"gm-g1-quick-1",type:"game",     grade:1,subject:"Math",   title:"Number Quick Fire",    icon:"⚡",xpReward:40, published:true, items:10},
  {id:"ws-g2-math-1", type:"worksheet",grade:2,subject:"Math",   title:"Addition Heroes",      icon:"➕",xpReward:75, published:true, items:5},
  {id:"ws-g2-read-1", type:"reading",  grade:2,subject:"Reading",title:"The Rainy Day",        icon:"🌧️",xpReward:75, published:false,items:5},
  {id:"gm-g2-mem-1",  type:"game",     grade:2,subject:"Reading",title:"Vocabulary Memory",    icon:"🧠",xpReward:40, published:true, items:8},
  {id:"ws-g3-math-1", type:"worksheet",grade:3,subject:"Math",   title:"Multiplication Magic", icon:"✖️",xpReward:100,published:false,items:5},
];

const MOCK_USERS=[
  {id:"u1",name:"Alex K.",  email:"alex@email.com",  grade:2,xp:450,streak:7, lastActive:"Today",     badges:4},
  {id:"u2",name:"Maya S.",  email:"maya@email.com",  grade:1,xp:200,streak:3, lastActive:"Yesterday", badges:2},
  {id:"u3",name:"Sam T.",   email:"sam@email.com",   grade:3,xp:890,streak:14,lastActive:"Today",     badges:6},
  {id:"u4",name:"Jordan L.",email:"jordan@email.com",grade:2,xp:320,streak:5, lastActive:"2 days ago",badges:3},
  {id:"u5",name:"Riley P.", email:"riley@email.com", grade:1,xp:150,streak:1, lastActive:"3 days ago",badges:1},
];

// ── UI PRIMITIVES ─────────────────────────────────────────
const Bdg=({children,color="grey"})=>{
  const m={grey:{bg:G.light,c:G.muted},orange:{bg:G.accentLight,c:G.accent},green:{bg:G.greenLight,c:G.green},blue:{bg:G.blueLight,c:G.blue},purple:{bg:G.purpleLight,c:G.purple},amber:{bg:G.amberLight,c:G.amber},red:{bg:G.dangerLight,c:G.danger}};
  const s=m[color]||m.grey;
  return <span style={{background:s.bg,color:s.c,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{children}</span>;
};

const Btn=({children,onClick,variant="primary",size="md",disabled,fullWidth,style={}})=>{
  const [h,sh]=useState(false);
  const v={primary:{bg:G.accent,c:"#fff",b:G.accent,hbg:G.accentDark},secondary:{bg:G.white,c:G.text,b:G.border,hbg:G.light},ghost:{bg:"transparent",c:G.muted,b:"transparent",hbg:G.light},danger:{bg:G.dangerLight,c:G.danger,b:"#fca5a5",hbg:"#fee2e2"}}[variant];
  const s={sm:{p:"5px 11px",fs:12},md:{p:"8px 16px",fs:13},lg:{p:"11px 22px",fs:14}}[size];
  return <button onClick={onClick} disabled={disabled} onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)}
    style={{background:h?v.hbg:v.bg,color:v.c,border:`1px solid ${v.b}`,borderRadius:8,padding:s.p,fontSize:s.fs,fontWeight:500,opacity:disabled?.5:1,cursor:disabled?"not-allowed":"pointer",transition:"all 0.15s",display:"inline-flex",alignItems:"center",gap:6,width:fullWidth?"100%":"auto",justifyContent:fullWidth?"center":"flex-start",...style}}>{children}</button>;
};

const Inp=({label,value,onChange,placeholder,type="text",required,error,disabled,style={}})=>{
  const [focused,setFocused]=useState(false);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {label&&<label style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5}}>{label}{required&&" *"}</label>}
      <input type={type} value={value||""} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{border:`1px solid ${error?G.danger:focused?G.accent:G.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,background:disabled?G.light:G.white,outline:"none",width:"100%",color:G.text,transition:"border-color 0.15s",...style}}/>
      {error&&<span style={{fontSize:11,color:G.danger}}>{error}</span>}
    </div>
  );
};

const Txtarea=({label,value,onChange,placeholder,rows=5,required})=>{
  const [focused,setFocused]=useState(false);
  const handlePaste=(e)=>{
    e.stopPropagation();
    const text=e.clipboardData.getData('text');
    const el=e.target;
    const start=el.selectionStart;
    const end=el.selectionEnd;
    const newVal=(value||"").slice(0,start)+text+(value||"").slice(end);
    onChange(newVal);
    e.preventDefault();
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {label&&<label style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5}}>{label}{required&&" *"}</label>}
      <textarea value={value||""} onChange={e=>onChange(e.target.value)}
        onPaste={handlePaste} placeholder={placeholder} rows={rows}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{border:`1px solid ${focused?G.accent:G.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,background:G.white,outline:"none",width:"100%",resize:"vertical",lineHeight:1.6,color:G.text,transition:"border-color 0.15s"}}/>
    </div>
  );
};

const Sel=({label,value,onChange,options,required})=>(
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    {label&&<label style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5}}>{label}{required&&" *"}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)} style={{border:`1px solid ${G.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,background:G.white,outline:"none",width:"100%",color:G.text}}>
      {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
    </select>
  </div>
);

const Tgl=({value,onChange,label,desc})=>(
  <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:G.light,borderRadius:10}}>
    <button onClick={()=>onChange(!value)} style={{width:44,height:24,borderRadius:99,border:"none",background:value?G.green:"#d1d5db",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
      <span style={{position:"absolute",width:18,height:18,background:"#fff",borderRadius:"50%",top:3,left:value?23:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
    </button>
    <div><div style={{fontWeight:500,fontSize:13}}>{label}</div>{desc&&<div style={{fontSize:11,color:G.muted}}>{desc}</div>}</div>
  </div>
);

const Card=({children,style={}})=><div style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:20,...style}}>{children}</div>;

const Mdl=({open,onClose,title,children,width=760,disableBackdropClose=false})=>{
  if(!open)return null;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}
      onClick={disableBackdropClose ? undefined : onClose}>
      <div onClick={e=>e.stopPropagation()} className="fu" style={{background:G.white,borderRadius:16,width:"100%",maxWidth:width,maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,.2)"}}>
        <div style={{padding:"18px 24px",borderBottom:`1px solid ${G.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <span style={{fontWeight:600,fontSize:16}}>{title}</span>
          <button onClick={onClose} style={{background:G.light,border:"none",borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",color:G.muted}}>✕</button>
        </div>
        <div style={{overflowY:"auto",flex:1}}>{children}</div>
      </div>
    </div>
  );
};

const Tst=({message,type,onClose})=>{
  useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[]);
  return<div className="fu" style={{position:"fixed",bottom:24,right:24,background:type==="error"?G.danger:G.green,color:"#fff",borderRadius:10,padding:"12px 18px",fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:8,zIndex:2000,boxShadow:"0 8px 24px rgba(0,0,0,.18)"}}><span>{type==="error"?"✕":"✓"}</span>{message}</div>;
};

// ── QUESTION EDITOR ────────────────────────────────────────
const QEditor=({question:q,index:i,onChange,onRemove,onDuplicate})=>{
  const [open,setOpen]=useState(true);
  const tcol={multiple_choice:G.blue,fill_blank:G.accent,true_false:G.green,drag_drop:G.purple,sorting:G.amber};
  const col=tcol[q.type]||G.blue;
  const tlabel={multiple_choice:"Multiple Choice",fill_blank:"Fill in Blank",true_false:"True/False",drag_drop:"Drag & Drop",sorting:"Sorting"};

  return(
    <div style={{border:`1px solid ${G.border}`,borderRadius:10,overflow:"hidden",marginBottom:10}}>
      <div style={{padding:"11px 16px",background:G.lighter,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setOpen(!open)}>
        <span style={{width:24,height:24,borderRadius:"50%",background:col,color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
        <span style={{flex:1,fontSize:13,fontWeight:q.question?500:400,color:q.question?G.text:G.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.question||"Untitled question"}</span>
        <Bdg color={q.type==="multiple_choice"?"blue":q.type==="fill_blank"?"orange":q.type==="true_false"?"green":q.type==="drag_drop"?"purple":"amber"}>{tlabel[q.type]}</Bdg>
        <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
          <button onClick={onDuplicate} style={{background:"none",border:"none",color:G.muted,cursor:"pointer",fontSize:13,padding:"2px 6px"}} title="Duplicate">⧉</button>
          <button onClick={onRemove}    style={{background:"none",border:"none",color:G.danger,cursor:"pointer",fontSize:13,padding:"2px 6px"}} title="Remove">✕</button>
        </div>
        <span style={{color:G.muted,fontSize:11}}>{open?"▲":"▼"}</span>
      </div>

      {open&&(
        <div style={{padding:16,display:"flex",flexDirection:"column",gap:14}}>
          {/* Type selector */}
          <div>
            <div style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Question Type</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {QUESTION_TYPES.map(t=>(
                <button key={t.id} onClick={()=>onChange({...q,type:t.id,options:t.id==="multiple_choice"||t.id==="word_bank"?["","","",""]:t.id==="true_false"?["True","False"]:[],correctAnswer:"",cat1:"",cat2:"",items1:"",items2:""})}
                  title={t.desc}
                  style={{padding:"5px 12px",borderRadius:7,border:`1px solid ${q.type===t.id?col:G.border}`,background:q.type===t.id?col+"18":G.white,color:q.type===t.id?col:G.muted,fontSize:12,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          <Inp label="Question Text" value={q.question} onChange={v=>onChange({...q,question:v})} placeholder="Type the question here..." required/>

          {/* MULTIPLE CHOICE */}
          {q.type==="multiple_choice"&&(
            <div>
              <div style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>
                Type options below, then click a letter to mark the correct answer
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {(q.options||["","","",""]).map((opt,j)=>{
                  const hasText  = opt.trim() !== "";
                  const isCorrect = hasText && q.correctAnswer !== "" && q.correctAnswer === opt;
                  return (
                    <div key={j} style={{display:"flex",alignItems:"center",gap:8}}>
                      <button
                        onClick={()=>{ if(hasText) onChange({...q,correctAnswer:opt}); }}
                        disabled={!hasText}
                        title={hasText ? "Click to set as correct answer" : "Type an option first"}
                        style={{width:30,height:30,borderRadius:"50%",
                          border:`2px solid ${isCorrect?G.green:hasText?G.border:"#eee"}`,
                          background:isCorrect?G.green:G.white,
                          color:isCorrect?"#fff":hasText?G.muted:"#ddd",
                          fontSize:11,fontWeight:700,
                          cursor:hasText?"pointer":"not-allowed",
                          flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
                          opacity:hasText?1:0.4}}>
                        {"ABCD"[j]}
                      </button>
                      <input value={opt}
                        onChange={e=>{
                          const o=[...(q.options||[])];
                          const oldVal = o[j];
                          o[j] = e.target.value;
                          // Only follow correctAnswer if it was a real non-empty match
                          const correctWasThisOption = oldVal !== "" && q.correctAnswer !== "" && q.correctAnswer === oldVal;
                          const newCorrect = correctWasThisOption
                            ? (e.target.value.trim() ? e.target.value : "")  // clear if deleted
                            : q.correctAnswer; // keep unchanged
                          onChange({...q, options:o, correctAnswer: newCorrect});
                        }}
                        placeholder={`Option ${"ABCD"[j]} — type here`}
                        style={{flex:1,border:`1px solid ${isCorrect?G.green:G.border}`,borderRadius:8,
                          padding:"8px 12px",fontSize:13,outline:"none",
                          background:isCorrect?G.greenLight:G.white,
                          transition:"border-color 0.15s"}}
                        onFocus={e=>e.target.style.borderColor=isCorrect?G.green:G.accent}
                        onBlur={e=>e.target.style.borderColor=isCorrect?G.green:G.border}/>
                      {isCorrect && <Bdg color="green">✓ Correct</Bdg>}
                    </div>
                  );
                })}
                {!q.correctAnswer && <p style={{fontSize:11,color:G.muted,marginTop:4}}>⚠️ No correct answer selected yet — type options then click a letter</p>}
              </div>
            </div>
          )}

          {/* FILL IN BLANK */}
          {q.type==="fill_blank"&&<Inp label="Correct Answer" value={q.correctAnswer} onChange={v=>onChange({...q,correctAnswer:v})} placeholder="Exact word or phrase kids should type..." required/>}

          {/* TRUE / FALSE */}
          {q.type==="true_false"&&(
            <div>
              <div style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Correct Answer</div>
              <div style={{display:"flex",gap:10}}>
                {["True","False"].map(tf=>(
                  <button key={tf} onClick={()=>onChange({...q,correctAnswer:tf})}
                    style={{flex:1,padding:"10px",borderRadius:8,border:`2px solid ${q.correctAnswer===tf?G.green:G.border}`,background:q.correctAnswer===tf?G.greenLight:G.white,color:q.correctAnswer===tf?G.green:G.muted,fontWeight:600,fontSize:14,cursor:"pointer"}}>
                    {tf==="True"?"✓ True":"✗ False"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DRAG & DROP */}
          {q.type==="drag_drop"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{background:G.blueLight,borderRadius:8,padding:12,fontSize:12,color:G.blue}}>💡 Kids drag items to their correct drop zones. Define zones and the items to sort.</div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Drop Zones</div>
                {((q.options)||[""]).map((zone,j)=>(
                  <div key={j} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                    <span style={{width:24,height:24,borderRadius:6,background:G.blue,color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{j+1}</span>
                    <input value={zone} onChange={e=>{const o=[...(q.options||[])];o[j]=e.target.value;onChange({...q,options:o});}}
                      placeholder={`Zone ${j+1} (e.g. "Animals")`}
                      style={{flex:1,border:`1px solid ${G.border}`,borderRadius:8,padding:"7px 11px",fontSize:13,outline:"none"}}
                      onFocus={e=>e.target.style.borderColor=G.blue} onBlur={e=>e.target.style.borderColor=G.border}/>
                    {(q.options||[]).length>1&&<button onClick={()=>{const o=[...(q.options||[])];o.splice(j,1);onChange({...q,options:o});}} style={{background:"none",border:"none",color:G.danger,cursor:"pointer",fontSize:16}}>✕</button>}
                  </div>
                ))}
                <Btn variant="secondary" size="sm" onClick={()=>onChange({...q,options:[...(q.options||[]),""]})}>+ Add Zone</Btn>
              </div>
              <Inp label="Draggable Items (comma separated)" value={q.correctAnswer} onChange={v=>onChange({...q,correctAnswer:v})} placeholder="Dog, Cat, Apple, Bread, ..."/>
            </div>
          )}

          {/* WORD BANK */}
          {q.type==="word_bank"&&(
            <div>
              <div style={{background:G.blueLight,borderRadius:8,padding:12,fontSize:12,color:G.blue,marginBottom:12}}>
                💡 Kids see a sentence with a blank and tap the correct word from the bank below.
                Use ___ in your question to show where the blank goes.
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>
                  Word Bank Options — click a letter to mark correct
                </div>
                {(q.options||["","","",""]).map((opt,j)=>{
                  const hasText   = opt.trim() !== "";
                  const isCorrect = hasText && q.correctAnswer !== "" && q.correctAnswer === opt;
                  return (
                    <div key={j} style={{display:"flex",alignItems:"center",gap:8}}>
                      <button
                        onClick={()=>{ if(hasText) onChange({...q,correctAnswer:opt}); }}
                        disabled={!hasText}
                        title={hasText?"Click to set as correct":"Type a word first"}
                        style={{width:30,height:30,borderRadius:"50%",
                          border:`2px solid ${isCorrect?G.green:hasText?G.border:"#eee"}`,
                          background:isCorrect?G.green:G.white,
                          color:isCorrect?"#fff":hasText?G.muted:"#ddd",
                          fontSize:11,fontWeight:700,cursor:hasText?"pointer":"not-allowed",
                          flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
                          opacity:hasText?1:0.4}}>
                        {"ABCD"[j]}
                      </button>
                      <input value={opt}
                        onChange={e=>{
                          const o=[...(q.options||[])];
                          const oldVal=o[j]; o[j]=e.target.value;
                          const wasCorrect=oldVal!==""&&q.correctAnswer!==""&&q.correctAnswer===oldVal;
                          const newCorrect=wasCorrect?(e.target.value.trim()?e.target.value:""):q.correctAnswer;
                          onChange({...q,options:o,correctAnswer:newCorrect});
                        }}
                        placeholder={`Word ${j+1} — type here`}
                        style={{flex:1,border:`1px solid ${isCorrect?G.green:G.border}`,borderRadius:8,
                          padding:"8px 12px",fontSize:13,outline:"none",
                          background:isCorrect?G.greenLight:G.white}}
                        onFocus={e=>e.target.style.borderColor=isCorrect?G.green:G.accent}
                        onBlur={e=>e.target.style.borderColor=isCorrect?G.green:G.border}/>
                      {isCorrect&&<Bdg color="green">✓ Correct</Bdg>}
                    </div>
                  );
                })}
                {!q.correctAnswer&&<p style={{fontSize:11,color:G.muted,marginTop:4}}>⚠️ Type words above then click a letter to mark the correct one</p>}
              </div>
            </div>
          )}

          {/* SORTING */}
          {q.type==="sorting"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{background:G.purpleLight,borderRadius:8,padding:12,fontSize:12,color:G.purple}}>💡 Kids sort items into 2 categories. Define category names and which items go where.</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{display:"flex",gap:6}}>
                    <div style={{flex:"0 0 60px"}}><Inp label="Emoji" value={q.emoji1||""} onChange={v=>onChange({...q,emoji1:v})} placeholder="🐾"/></div>
                    <div style={{flex:1}}><Inp label="Category 1" value={q.cat1||""} onChange={v=>onChange({...q,cat1:v})} placeholder='e.g. "Animals"'/></div>
                  </div>
                  <Inp label="Items in Category 1" value={q.items1||""} onChange={v=>onChange({...q,items1:v})} placeholder="Dog, Cat, Bird (comma separated)"/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{display:"flex",gap:6}}>
                    <div style={{flex:"0 0 60px"}}><Inp label="Emoji" value={q.emoji2||""} onChange={v=>onChange({...q,emoji2:v})} placeholder="🍽️"/></div>
                    <div style={{flex:1}}><Inp label="Category 2" value={q.cat2||""} onChange={v=>onChange({...q,cat2:v})} placeholder='e.g. "Foods"'/></div>
                  </div>
                  <Inp label="Items in Category 2" value={q.items2||""} onChange={v=>onChange({...q,items2:v})} placeholder="Apple, Bread, Rice (comma separated)"/>
                </div>
              </div>
            </div>
          )}

          <Inp label="Explanation (shown after answering)" value={q.explanation||""} onChange={v=>onChange({...q,explanation:v})} placeholder="Why is this the correct answer? Keep it encouraging!"/>
        </div>
      )}
    </div>
  );
};







// ── BANK BUILDER ──────────────────────────────────────────
// Lets you stage multiple CSVs/sheets before uploading all at once
const BankBuilder = ({ parseCSV, uploading, progress, error, success, onUpload, sheetsUrl, setSheetsUrl, sheetsLoading, sheetsError, onSheetsAdd }) => {
  const [staged,    setStaged]    = useState([]); // [{name, count, questions, type}]
  const [sheetLinks,setSheetLinks]= useState([""]);  // list of sheet URLs
  const [sheetErr,  setSheetErr]  = useState("");
  const [sheetErrIdx,setSheetErrIdx]=useState(-1);
  const [sheetLoad, setSheetLoad] = useState(false);
  const fileRef = useRef();

  const CSV_TYPES = [
    { id:"mcq",      label:"MCQ / T-F / Fill / Word Bank", emoji:"📋", color:G.accent  },
    { id:"sorting",  label:"Sorting",                      emoji:"⇄",  color:G.purple  },
    { id:"dragdrop", label:"Drag & Drop",                  emoji:"↕",  color:G.blue    },
    { id:"sheets",   label:"Google Sheets",                emoji:"🟢", color:"#16a34a" },
  ];

  const totalQ = staged.reduce((s,f)=>s+f.count, 0);

  const addFiles = (files) => {
    const fileArray = Array.from(files).filter(f=>f.name.endsWith(".csv"));
    fileArray.forEach(f=>{
      const reader = new FileReader();
      reader.onload = (e) => {
        const questions = parseCSV(e.target.result);
        setStaged(prev=>[...prev, {
          name: f.name,
          count: questions.length,
          questions,
          type: f.name.includes("sort")?"sorting":f.name.includes("drag")?"dragdrop":"mcq",
          id: Date.now()+"_"+f.name,
        }]);
      };
      reader.readAsText(f);
    });
  };

  const addAllSheets = async () => {
    const urls = sheetLinks.filter(l=>l.trim());
    if(!urls.length){setSheetErr("Please enter at least one Google Sheets URL.");setSheetErrIdx(0);return;}
    setSheetLoad(true); setSheetErr(""); setSheetErrIdx(-1);
    let added = 0;
    for(let i=0;i<sheetLinks.length;i++){
      const url = sheetLinks[i].trim();
      if(!url) continue;
      try {
        const questions = await onSheetsAdd(url);
        const name = url.includes("spreadsheets/d/")
          ? "Sheet "+(i+1)+": ..."+url.split("/d/")[1].split("/")[0].slice(0,12)+"..."
          : `Sheet ${i+1}`;
        setStaged(prev=>[...prev,{name,count:questions.length,questions,type:"sheets",id:Date.now()+"_sheet_"+i}]);
        added++;
      } catch(e){
        setSheetErr(`Sheet ${i+1}: ${e.message}`);
        setSheetErrIdx(i);
        setSheetLoad(false);
        return;
      }
    }
    // Clear loaded links
    setSheetLinks([""]);
    setSheetLoad(false);
  };

  const removeStaged = (id) => setStaged(prev=>prev.filter(f=>f.id!==id));

  const handleUpload = (mode="replace") => {
    const all = staged.flatMap(f=>f.questions);
    onUpload(all, mode);
  };

  const TYPE_COLOR = {mcq:G.accent, sorting:G.purple, dragdrop:G.blue, sheets:"#16a34a"};
  const TYPE_LABEL = {mcq:"📋 MCQ / T-F / Fill / Word Bank", sorting:"⇄ Sorting", dragdrop:"↕ Drag & Drop", sheets:"🟢 Google Sheet"};

  return (
    <div>
      {/* Warning */}
      <div style={{marginBottom:16,padding:12,background:G.amberLight,borderRadius:10,fontSize:12,color:G.amber,fontWeight:600}}>
        ⚠️ Uploading replaces the entire question bank. Stage all your CSVs below before clicking Upload.
      </div>

      {/* Add CSV files */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>
          Step 1 — Add your CSV files
        </div>
        <div
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();addFiles(e.dataTransfer.files);}}
          onClick={()=>fileRef.current.click()}
          style={{border:`2px dashed ${G.border}`,borderRadius:14,padding:"20px",
            textAlign:"center",cursor:"pointer",background:G.lighter,
            transition:"border-color 0.2s"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor=G.accent}
          onMouseLeave={e=>e.currentTarget.style.borderColor=G.border}>
          <div style={{fontSize:32,marginBottom:6}}>📂</div>
          <div style={{fontWeight:700,fontSize:14,color:G.text,marginBottom:3}}>Drop CSV files here or click to browse</div>
          <div style={{fontSize:11,color:G.muted}}>Add one or more at a time — they stack up below</div>
          <input ref={fileRef} type="file" accept=".csv" multiple style={{display:"none"}}
            onChange={e=>addFiles(e.target.files)}/>
        </div>
      </div>

      {/* Add Google Sheets — multiple links */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>
          Or add from Google Sheets
        </div>

        {/* Sheet links list */}
        {sheetLinks.map((link,i)=>(
          <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
            <div style={{width:22,height:22,borderRadius:6,background:"#16a34a",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{color:"#fff",fontSize:11,fontWeight:700}}>{i+1}</span>
            </div>
            <input value={link} onChange={e=>{const l=[...sheetLinks];l[i]=e.target.value;setSheetLinks(l);}}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              onKeyDown={e=>e.key==="Enter"&&addAllSheets()}
              style={{flex:1,border:`1.5px solid ${sheetErr&&i===sheetErrIdx?"#ef4444":"#86efac"}`,
                borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none"}}/>
            <button onClick={()=>setSheetLinks(prev=>prev.filter((_,j)=>j!==i))}
              style={{background:"none",border:"none",color:G.danger,cursor:"pointer",fontSize:18,padding:"0 4px",flexShrink:0}}>
              ✕
            </button>
          </div>
        ))}

        {/* Add link + Add sheets button */}
        <div style={{display:"flex",gap:8,marginBottom:sheetErr?8:0}}>
          <button onClick={()=>setSheetLinks(prev=>[...prev,""])}
            style={{flex:1,padding:"8px",borderRadius:8,border:`1.5px dashed #86efac`,
              background:"#f0fdf4",color:"#16a34a",fontWeight:600,fontSize:13,cursor:"pointer"}}>
            + Add Another Sheet Link
          </button>
          <button onClick={addAllSheets}
            disabled={sheetLoad||sheetLinks.every(l=>!l.trim())}
            style={{padding:"8px 16px",borderRadius:8,border:"none",
              background:sheetLoad||sheetLinks.every(l=>!l.trim())?"#ccc":"#16a34a",
              color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0,
              display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
            {sheetLoad
              ? <><span style={{display:"inline-block",width:12,height:12,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>Loading...</>
              : `⬇️ Load ${sheetLinks.filter(l=>l.trim()).length} Sheet${sheetLinks.filter(l=>l.trim()).length!==1?"s":""}`}
          </button>
        </div>
        {sheetErr&&<div style={{fontSize:12,color:"#dc2626",background:"#fef2f2",borderRadius:8,padding:"6px 10px"}}>{sheetErr}</div>}
      </div>

      {/* Staged files */}
      {staged.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>
            Step 2 — Staged files ({staged.length} file{staged.length!==1?"s":""} · {totalQ.toLocaleString()} total questions)
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {staged.map(f=>(
              <div key={f.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",
                borderRadius:12,border:`1.5px solid ${TYPE_COLOR[f.type]||G.border}`,
                background:(TYPE_COLOR[f.type]||G.accent)+"0d"}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:G.text,marginBottom:2}}>{f.name}</div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{fontSize:11,fontWeight:700,color:TYPE_COLOR[f.type]||G.accent,
                      background:(TYPE_COLOR[f.type]||G.accent)+"20",borderRadius:99,padding:"1px 8px"}}>
                      {TYPE_LABEL[f.type]||f.type}
                    </span>
                    <span style={{fontSize:11,color:G.muted}}>{f.count.toLocaleString()} questions</span>
                  </div>
                </div>
                <button onClick={()=>removeStaged(f.id)}
                  style={{background:"none",border:"none",color:G.danger,cursor:"pointer",fontSize:18,lineHeight:1,padding:"0 4px"}}>
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Total summary */}
          <div style={{marginTop:10,padding:"10px 14px",background:G.accentLight,borderRadius:10,
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <span style={{fontWeight:800,color:G.accent,fontSize:14}}>Total: {totalQ.toLocaleString()} questions</span>
              <span style={{fontSize:11,color:G.muted,marginLeft:8}}>from {staged.length} source{staged.length!==1?"s":""}</span>
            </div>
            <button onClick={()=>setStaged([])}
              style={{fontSize:11,color:G.muted,background:"none",border:"none",cursor:"pointer"}}>
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Upload buttons */}
      <div style={{fontSize:12,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>
        Step 3 — Save to Question Bank
      </div>
      {uploading ? (
        <div style={{padding:"13px",borderRadius:12,background:G.lighter,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:14,color:G.muted}}>
          <span style={{display:"inline-block",width:14,height:14,border:`2px solid ${G.accent}40`,borderTopColor:G.accent,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          {progress||"Uploading..."}
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {/* Add to existing */}
          <button onClick={()=>handleUpload("add")}
            disabled={staged.length===0}
            style={{padding:"12px",borderRadius:12,border:`2px solid ${staged.length===0?"#ddd":G.green}`,
              background:staged.length===0?"#f5f5f5":G.greenLight,
              color:staged.length===0?"#bbb":G.green,
              fontWeight:800,fontSize:13,cursor:staged.length===0?"not-allowed":"pointer",
              fontFamily:"inherit",textAlign:"center",lineHeight:1.4}}>
            ➕ Add to Bank
            {staged.length>0&&<div style={{fontSize:11,fontWeight:500,marginTop:3}}>Keeps existing questions</div>}
          </button>
          {/* Replace */}
          <button onClick={()=>handleUpload("replace")}
            disabled={staged.length===0}
            style={{padding:"12px",borderRadius:12,border:`2px solid ${staged.length===0?"#ddd":G.danger}`,
              background:staged.length===0?"#f5f5f5":G.dangerLight,
              color:staged.length===0?"#bbb":G.danger,
              fontWeight:800,fontSize:13,cursor:staged.length===0?"not-allowed":"pointer",
              fontFamily:"inherit",textAlign:"center",lineHeight:1.4}}>
            🔄 Replace Bank
            {staged.length>0&&<div style={{fontSize:11,fontWeight:500,marginTop:3}}>Deletes existing questions</div>}
          </button>
        </div>
      )}
      {staged.length===0&&<div style={{marginTop:8,fontSize:12,color:G.muted,textAlign:"center"}}>Add files above first</div>}

      {error  &&<div style={{marginTop:12,padding:"10px 14px",background:G.dangerLight,borderRadius:10,fontSize:13,color:G.danger}}>{error}</div>}
      {success&&<div style={{marginTop:12,padding:"10px 14px",background:G.greenLight,borderRadius:10,fontSize:13,color:G.green,fontWeight:600}}>{success}</div>}
    </div>
  );
};

// ── QUESTION BANK MANAGER ─────────────────────────────────
const QuestionBankManager = ({ onClose }) => {
  const [tab,       setTab]       = useState("browse"); // browse | upload | pick
  const [meta,      setMeta]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState("");
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsError,   setSheetsError]   = useState("");
  const [filters,   setFilters]   = useState({ subject:"", grade:"", type:"", count:10 });
  const [picked,    setPicked]    = useState([]);
  const [pickLoading,setPickLoading]=useState(false);
  const [selected,  setSelected]  = useState(new Set());
  const fileRef = useRef();

  useEffect(()=>{ loadMeta(); },[]);

  const loadMeta = async () => {
    setLoading(true);
    try { setMeta(await getQuestionBankMeta()); }
    catch(e) { console.warn(e); }
    setLoading(false);
  };

  const parseCSV = (text) => {
    const lines  = text.trim().split("\n");
    const header = lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/\s+/g,"_").replace(/[^a-z_]/g,""));
    const rows   = lines.slice(1);
    const questions = [];
    rows.forEach((row,i)=>{
      if(!row.trim()) return;
      const cols=[];let cur="",inQ=false;
      for(let c of row){
        if(c==="\"" &&!inQ){inQ=true;continue;}
        if(c==="\"" && inQ){inQ=false;continue;}
        if(c==="," &&!inQ){cols.push(cur.trim());cur="";continue;}
        cur+=c;
      }
      cols.push(cur.trim());
      const get=(k)=>{ const idx=header.indexOf(k); return idx>=0?(cols[idx]||"").trim():""; };
      const type=get("type")||"multiple_choice";
      const question=get("question");
      const correct=get("correct")||get("correctanswer")||get("answer");
      const grade=parseInt(get("grade"))||1;
      const subject=get("subject")||"Math";
      const xp=parseInt(get("xp"))||50;
      if(!question) return;
      if(!correct && type!=="sorting" && type!=="drag_drop") return;
      const opts=["optiona","optionb","optionc","optiond"].map(k=>get(k)).filter(Boolean);
      let qOptions = type==="true_false"?["True","False"]:opts;
      let qCorrect = opts.includes(correct)?correct:(opts.find(o=>o.toLowerCase()===correct.toLowerCase())||correct);
      let qCat1="",qCat2="",qItems1="",qItems2="";

      if(type==="fill_blank"){
        // Fill blank: 2 hint options only
        qOptions = [get("optiona"),get("optionb")].filter(Boolean);
      }

      const q={
        id:`qb_${i}_${Math.random().toString(36).slice(2,7)}`, type, question,
        correctAnswer: qCorrect,
        explanation:get("explanation")||"", grade, subject, xpReward:xp,
        options: qOptions,
        cat1:qCat1, cat2:qCat2, items1:qItems1, items2:qItems2,
        emoji1:get("emoji1")||"", emoji2:get("emoji2")||"",
        icon: get("emoji1")||"📝",
      };
      questions.push(q);
    });
    return questions;
  };

  const uploadQuestions = async (questions, mode="replace") => {
    setUploading(true);
    setError(""); setSuccess("");
    try {
      let finalQuestions = questions;

      if (mode === "add") {
        // Load ALL existing bank questions and append
        setProgress("Loading existing bank...");
        try {
          const existing = await getAllBankQuestions();
          finalQuestions = [...existing, ...questions];
          setProgress(`Merging ${existing.length} existing + ${questions.length} new questions...`);
        } catch(e) {
          console.warn("Could not load existing bank:", e);
          finalQuestions = questions;
        }
      }

      setProgress(`Saving ${finalQuestions.length} questions...`);
      await saveQuestionBank(finalQuestions);
      setProgress("");
      const msg = mode==="add"
        ? `✅ Added ${questions.length} questions! Bank now has ${finalQuestions.length} total.`
        : `✅ ${finalQuestions.length} questions saved to bank!`;
      setSuccess(msg);
      await loadMeta();
      setTab("browse");
    } catch(e) {
      setError("Upload failed: "+e.message);
    }
    setUploading(false);
  };

  const handleFiles = (files) => {
    const fileArray = Array.from(files).filter(f=>f.name.endsWith(".csv"));
    if(!fileArray.length) return;
    let allQuestions = [];
    let loaded = 0;
    fileArray.forEach(f=>{
      const reader=new FileReader();
      reader.onload=(e)=>{
        allQuestions = [...allQuestions, ...parseCSV(e.target.result)];
        loaded++;
        if(loaded===fileArray.length){
          setProgress(`Parsed ${allQuestions.length} questions from ${fileArray.length} file${fileArray.length>1?"s":""}...`);
          uploadQuestions(allQuestions);
        }
      };
      reader.readAsText(f);
    });
  };
  const handleFile = (f) => handleFiles([f]);

  const extractSheetId=(url)=>{ const m=url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/); return m?m[1]:null; };

  const handleSheetsUpload = async () => {
    const id=extractSheetId(sheetsUrl);
    if(!id){setSheetsError("Invalid Google Sheets URL.");return;}
    setSheetsLoading(true); setSheetsError("");
    try {
      const res=await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv&id=${id}`);
      if(!res.ok) throw new Error("Could not fetch. Make sure sheet is shared publicly.");
      const text=await res.text();
      if(text.includes("<!DOCTYPE")||text.includes("<html")) throw new Error("Sheet is not public. Share → Anyone with link → Viewer.");
      await uploadQuestions(parseCSV(text));
    } catch(e){ setSheetsError(e.message); }
    setSheetsLoading(false);
  };

  // For BankBuilder — returns parsed questions from a sheet URL
  const handleSheetsAdd = async (url) => {
    const id=extractSheetId(url);
    if(!id) throw new Error("Invalid Google Sheets URL.");
    setSheetsLoading(true);
    try {
      const res=await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv&id=${id}`);
      if(!res.ok) throw new Error("Could not fetch sheet.");
      const text=await res.text();
      if(text.includes("<!DOCTYPE")||text.includes("<html")) throw new Error("Sheet is not public. Share → Anyone with link → Viewer.");
      const questions = parseCSV(text);
      setSheetsLoading(false);
      return questions;
    } catch(e){ setSheetsLoading(false); throw e; }
  };

  const handlePick = async () => {
    setPickLoading(true); setPicked([]); setSelected(new Set());
    try {
      const qs=await getRandomQuestions({
        count:filters.count,
        subject:filters.subject||undefined,
        grade:filters.grade?parseInt(filters.grade):undefined,
        type:filters.type||undefined,
      });
      setPicked(qs);
      setSelected(new Set(qs.map((_,i)=>i)));
    } catch(e){ setError("Pick failed: "+e.message); }
    setPickLoading(false);
  };

  const TABS = [
    {id:"browse", label:"📊 Bank Status"},
    {id:"upload", label:"⬆️ Upload to Bank"},
    {id:"pick",   label:"🎲 Pick Random"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${G.border}`,flexShrink:0}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"12px",border:"none",background:tab===t.id?G.accentLight:G.white,
              color:tab===t.id?G.accent:G.muted,fontWeight:tab===t.id?700:500,
              fontSize:13,cursor:"pointer",borderBottom:tab===t.id?`2px solid ${G.accent}`:"2px solid transparent",
              fontFamily:"inherit"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* PICK TAB — needs special layout with sticky footer */}
      {tab==="pick" ? (
        <div style={{display:"flex",flexDirection:"column",flex:1,minHeight:0}}>

          {/* INSERT BAR — outside scroll, always visible */}
          {picked.length>0&&(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"12px 16px",background:G.accentLight,
              borderBottom:`2px solid ${G.accent}`,flexShrink:0}}>
              <span style={{fontSize:13,fontWeight:700,color:G.accent}}>
                ✅ {selected.size} of {picked.length} selected
              </span>
              <div style={{display:"flex",gap:8}}>
                <button onClick={handlePick}
                  style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${G.border}`,
                    background:G.white,color:G.text,fontWeight:600,fontSize:12,cursor:"pointer"}}>
                  🎲 Re-pick
                </button>
                <button onClick={()=>onClose(picked.filter((_,i)=>selected.has(i)))}
                  disabled={selected.size===0}
                  style={{padding:"8px 20px",borderRadius:8,border:"none",
                    background:selected.size===0?"#ccc":G.accent,color:"#fff",
                    fontWeight:800,fontSize:14,cursor:selected.size===0?"not-allowed":"pointer"}}>
                  ✓ Insert {selected.size} Questions
                </button>
              </div>
            </div>
          )}

          <div style={{flex:1,overflowY:"auto",padding:24}}>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",display:"block",marginBottom:4}}>Subject</label>
                <select value={filters.subject} onChange={e=>setFilters(f=>({...f,subject:e.target.value}))}
                  style={{width:"100%",border:`1px solid ${G.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,background:G.white,outline:"none"}}>
                  <option value="">All Subjects</option>
                  {["Math","Reading","Grammar","Science","Social Studies"].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",display:"block",marginBottom:4}}>Grade</label>
                <select value={filters.grade} onChange={e=>setFilters(f=>({...f,grade:e.target.value}))}
                  style={{width:"100%",border:`1px solid ${G.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,background:G.white,outline:"none"}}>
                  <option value="">All Grades</option>
                  {[1,2,3,4,5].map(g=><option key={g} value={g}>Grade {g}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",display:"block",marginBottom:4}}>Type</label>
                <select value={filters.type} onChange={e=>setFilters(f=>({...f,type:e.target.value}))}
                  style={{width:"100%",border:`1px solid ${G.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,background:G.white,outline:"none"}}>
                  <option value="">All Types</option>
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                  <option value="fill_blank">Fill in Blank</option>
                  <option value="word_bank">Word Bank</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",display:"block",marginBottom:4}}>How many?</label>
                <select value={filters.count} onChange={e=>setFilters(f=>({...f,count:parseInt(e.target.value)}))}
                  style={{width:"100%",border:`1px solid ${G.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,background:G.white,outline:"none"}}>
                  {[5,10,15,20,25,30].map(n=><option key={n} value={n}>{n} questions</option>)}
                </select>
              </div>
            </div>

            <button onClick={handlePick} disabled={pickLoading||!meta}
              style={{width:"100%",padding:"11px",borderRadius:10,border:"none",
                background:pickLoading||!meta?"#ccc":G.accent,color:"#fff",
                fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:12,fontFamily:"inherit",
                display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {pickLoading?(
                <><span style={{display:"inline-block",width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>Picking randomly...</>
              ):"🎲 Pick Random Questions"}
            </button>

            {!meta&&<div style={{textAlign:"center",fontSize:13,color:G.muted}}>Upload a question bank first</div>}

            {picked.length>0&&(
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:13,fontWeight:600}}>{selected.size} of {picked.length} selected</span>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setSelected(new Set(picked.map((_,i)=>i)))}
                      style={{fontSize:12,color:G.accent,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>All</button>
                    <button onClick={()=>setSelected(new Set())}
                      style={{fontSize:12,color:G.muted,background:"none",border:"none",cursor:"pointer"}}>None</button>
                  </div>
                </div>
                {picked.map((q,i)=>(
                  <div key={i} onClick={()=>{const n=new Set(selected);n.has(i)?n.delete(i):n.add(i);setSelected(n);}}
                    style={{display:"flex",gap:10,padding:"10px 12px",borderRadius:10,marginBottom:6,cursor:"pointer",
                      background:selected.has(i)?G.accentLight:G.lighter,border:`1.5px solid ${selected.has(i)?G.accent:G.border}`,transition:"all 0.1s"}}>
                    <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${selected.has(i)?G.accent:G.border}`,
                      background:selected.has(i)?G.accent:"#fff",flexShrink:0,marginTop:2,
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {selected.has(i)&&<span style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</span>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                        <span style={{fontSize:10,fontWeight:700,color:G.accent,background:G.accentLight,borderRadius:99,padding:"1px 7px"}}>{q.type?.replace("_"," ")}</span>
                        <span style={{fontSize:10,color:G.muted,background:G.light,borderRadius:99,padding:"1px 7px"}}>Grade {q.grade}</span>
                        <span style={{fontSize:10,color:G.muted,background:G.light,borderRadius:99,padding:"1px 7px"}}>{q.subject}</span>
                      </div>
                      <div style={{fontSize:13,fontWeight:600,color:G.text}}>{q.question}</div>
                      <div style={{fontSize:11,color:G.green,marginTop:3}}>✓ {q.correctAnswer}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

        </div>
      ) : (
      <div style={{flex:1,overflowY:"auto",padding:24}}>
        {tab==="browse"&&(
          <div>
            {loading?(
              <div style={{textAlign:"center",padding:40,color:G.muted}}>Loading bank status...</div>
            ):meta?(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
                  <div style={{background:G.accentLight,borderRadius:14,padding:20,textAlign:"center"}}>
                    <div style={{fontSize:40,fontWeight:900,color:G.accent}}>{meta.totalQuestions?.toLocaleString()}</div>
                    <div style={{fontSize:13,color:G.muted,fontWeight:600}}>Total Questions</div>
                  </div>
                  <div style={{background:G.greenLight,borderRadius:14,padding:20,textAlign:"center"}}>
                    <div style={{fontSize:40,fontWeight:900,color:G.green}}>{meta.totalChunks}</div>
                    <div style={{fontSize:13,color:G.muted,fontWeight:600}}>Storage Chunks</div>
                  </div>
                </div>
                <div style={{background:G.lighter,borderRadius:12,padding:16,marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:600,color:G.text,marginBottom:8}}>Last updated</div>
                  <div style={{fontSize:12,color:G.muted}}>{meta.updatedAt?.toDate?.()?.toLocaleString()||"Unknown"}</div>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>setTab("upload")}
                    style={{flex:1,padding:"10px",borderRadius:10,border:`1.5px solid ${G.accent}`,background:G.accentLight,color:G.accent,fontWeight:700,fontSize:13,cursor:"pointer"}}>
                    ⬆️ Upload More
                  </button>
                  <button onClick={()=>setTab("pick")}
                    style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:G.accent,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                    🎲 Pick Questions
                  </button>
                </div>
              </div>
            ):(
              <div style={{textAlign:"center",padding:40}}>
                <div style={{fontSize:52,marginBottom:12}}>📭</div>
                <div style={{fontWeight:700,fontSize:16,color:G.text,marginBottom:8}}>No question bank yet</div>
                <div style={{fontSize:13,color:G.muted,marginBottom:20}}>Upload a CSV or Google Sheet with up to 1000+ questions</div>
                <button onClick={()=>setTab("upload")}
                  style={{padding:"10px 24px",borderRadius:10,border:"none",background:G.accent,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                  ⬆️ Upload Question Bank
                </button>
              </div>
            )}
            {success&&<div style={{marginTop:12,padding:"10px 14px",background:G.greenLight,borderRadius:10,fontSize:13,color:G.green,fontWeight:600}}>{success}</div>}
          </div>
        )}

        {/* UPLOAD TAB */}
        {tab==="upload"&&(
          <div style={{padding:"0 4px"}}>
            <BankBuilder
              parseCSV={parseCSV}
              uploading={uploading}
              progress={progress}
              error={error}
              success={success}
              onUpload={uploadQuestions}
              onSheetsAdd={handleSheetsAdd}
            />
          </div>
        )}

      </div>
      )} {/* end ternary — non-pick tabs */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

// ── CSV UPLOADER ──────────────────────────────────────────
const CSVUploader = ({ onInsert, onClose }) => {
  const [file,         setFile]         = useState(null);
  const [preview,      setPreview]      = useState([]);
  const [errors,       setErrors]       = useState([]);
  const [selected,     setSelected]     = useState(new Set());
  const [step,         setStep]         = useState("upload"); // upload | preview
  const [sheetsUrl,    setSheetsUrl]    = useState("");
  const [sheetsLoading,setSheetsLoading]= useState(false);
  const [sheetsError,  setSheetsError]  = useState("");
  const fileRef = useRef();

  const extractSheetId = (url) => {
    const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return m ? m[1] : null;
  };

  const handleSheetsImport = async () => {
    const id = extractSheetId(sheetsUrl);
    if (!id) { setSheetsError("Invalid Google Sheets URL. Make sure you copy the full link from your browser."); return; }
    setSheetsLoading(true);
    setSheetsError("");
    try {
      // Use Google Sheets CSV export URL
      const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&id=${id}`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error("Could not fetch sheet. Make sure it is shared as \"Anyone with the link can view\".");
      const text = await res.text();
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        throw new Error("Sheet is not publicly accessible. Go to Share → Anyone with the link → Viewer.");
      }
      const { questions, errors } = parseCSV(text);
      if (questions.length === 0 && errors.length === 0) throw new Error("No questions found. Check your sheet has the correct column headers.");
      setPreview(questions);
      setErrors(errors);
      setSelected(new Set(questions.map((_,i)=>i)));
      setFile({ name: "Google Sheet" });
      setStep("preview");
    } catch(e) {
      setSheetsError(e.message || "Failed to import. Please try again.");
    }
    setSheetsLoading(false);
  };

  const parseCSV = (text) => {
    const lines  = text.trim().split("\n");
    const header = lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/\s+/g,"_"));
    const rows   = lines.slice(1);
    const questions = [];
    const errs   = [];

    rows.forEach((row, i) => {
      if (!row.trim()) return;
      // Handle quoted fields with commas inside
      const cols = [];
      let cur = "", inQ = false;
      for (let c of row) {
        if (c==="\"" && !inQ) { inQ=true; continue; }
        if (c==="\"" && inQ)  { inQ=false; continue; }
        if (c==="," && !inQ)   { cols.push(cur.trim()); cur=""; continue; }
        cur += c;
      }
      cols.push(cur.trim());

      const get = (key) => {
        const idx = header.indexOf(key);
        return idx>=0 ? (cols[idx]||"").trim() : "";
      };

      const type    = get("type") || "multiple_choice";
      const question= get("question");
      const correct = get("correct") || get("correctanswer") || get("answer");
      const grade   = parseInt(get("grade"))||1;
      const subject = get("subject")||"Math";
      const xp      = parseInt(get("xp"))||50;
      const explanation = get("explanation")||get("explain")||"";

      if (!question) { errs.push(`Row ${i+2}: Missing question`); return; }
      if (!correct)  { errs.push(`Row ${i+2}: Missing correct answer`); return; }

      let q = {
        id: `csv_${Date.now()}_${i}`,
        type, question, correctAnswer:correct,
        explanation, grade, subject, xpReward:xp,
        options:[], icon:"📝",
      };

      if (type==="multiple_choice" || type==="word_bank") {
        const opts = ["optiona","optionb","optionc","optiond"]
          .map(k=>get(k)||get(k.replace("option","")))
          .filter(Boolean);
        if (opts.length < 2) { errs.push(`Row ${i+2}: Need at least 2 options for ${type}`); return; }
        q.options = opts;
        // Validate correct matches an option
        if (!opts.includes(correct)) {
          // Try case-insensitive match
          const match = opts.find(o=>o.toLowerCase()===correct.toLowerCase());
          if (match) q.correctAnswer = match;
          else { errs.push(`Row ${i+2}: Correct answer "${correct}" doesn't match any option`); return; }
        }
      } else if (type==="true_false") {
        q.options = ["True","False"];
        const normalised = correct.charAt(0).toUpperCase()+correct.slice(1).toLowerCase();
        if (!["True","False"].includes(normalised)) { errs.push(`Row ${i+2}: True/False answer must be "True" or "False"`); return; }
        q.correctAnswer = normalised;
      } else if (type==="fill_blank") {
        // Fill blank: 2 hint options only (optionA and optionB)
        const opts = [get("optiona"),get("optionb")].filter(Boolean);
        q.options = opts;
      }

      questions.push(q);
    });

    return { questions, errors:errs };
  };

  const handleFile = (f) => { if(f) handleFiles([f]); };

  const handleFiles = (files) => {
    const fileArray = Array.from(files).filter(f=>f.name.endsWith(".csv"));
    if(!fileArray.length) return;
    let allQuestions = [], allErrors = [];
    let loaded = 0;
    const names = fileArray.map(f=>f.name).join(", ");
    fileArray.forEach(f=>{
      const reader = new FileReader();
      reader.onload = (e) => {
        const { questions, errors } = parseCSV(e.target.result);
        allQuestions = [...allQuestions, ...questions];
        allErrors    = [...allErrors, ...errors.map(e=>`[${f.name}] ${e}`)];
        loaded++;
        if(loaded===fileArray.length){
          setFile({ name: fileArray.length===1 ? fileArray[0].name : `${fileArray.length} files merged` });
          setPreview(allQuestions);
          setErrors(allErrors);
          setSelected(new Set(allQuestions.map((_,i)=>i)));
          setStep("preview");
        }
      };
      reader.readAsText(f);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if(e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const toggleSelect = (i) => {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  };

  const TYPE_COLOR = {
    multiple_choice:"#3b82f6", true_false:"#16a34a",
    fill_blank:"#f05a1a", matching:"#7c3aed",
    sorting:"#d97706", word_bank:"#0891b2",
  };
  const TYPE_LABEL = {
    multiple_choice:"MCQ", true_false:"T/F",
    fill_blank:"Fill", matching:"Match",
    sorting:"Sort", word_bank:"Word Bank",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>

      {step==="upload" && (
        <div style={{ flex:1, overflowY:"auto", padding:32 }}>
          <div style={{ maxWidth:500, margin:"0 auto" }}>

            {/* Google Sheets option */}
            <div style={{ background:"#f0fdf4", border:"2px solid #86efac", borderRadius:20, padding:24, marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <div style={{ fontSize:28 }}>🟢</div>
                <div>
                  <div style={{ fontWeight:800, fontSize:15, color:G.text }}>Import from Google Sheets</div>
                  <div style={{ fontSize:12, color:G.muted }}>Paste your sheet URL — imports instantly, no download needed</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                <input
                  value={sheetsUrl} onChange={e=>setSheetsUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  style={{ flex:1, border:`1.5px solid ${sheetsError?"#ef4444":"#86efac"}`, borderRadius:10,
                    padding:"9px 12px", fontSize:13, outline:"none", background:"#fff" }}
                  onKeyDown={e=>e.key==="Enter"&&handleSheetsImport()}/>
                <button onClick={handleSheetsImport} disabled={sheetsLoading||!sheetsUrl.trim()}
                  style={{ padding:"9px 18px", borderRadius:10, border:"none",
                    background:sheetsLoading||!sheetsUrl.trim()?"#ccc":"#16a34a",
                    color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer",
                    display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                  {sheetsLoading?(
                    <><span style={{ display:"inline-block", width:13, height:13, border:"2px solid rgba(255,255,255,0.4)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/> Loading...</>
                  ):"Import →"}
                </button>
              </div>
              {sheetsError&&<div style={{ fontSize:12, color:"#dc2626", background:"#fef2f2", borderRadius:8, padding:"7px 10px" }}>{sheetsError}</div>}
              <div style={{ fontSize:11, color:G.muted, lineHeight:1.7 }}>
                <strong>How to share:</strong> In Google Sheets → File → Share → <strong>Anyone with the link can view</strong>
              </div>
            </div>

            {/* Divider */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ flex:1, height:1, background:G.border }}/>
              <span style={{ fontSize:12, color:G.muted, fontWeight:600 }}>or upload a CSV file</span>
              <div style={{ flex:1, height:1, background:G.border }}/>
            </div>

            {/* CSV Drop zone */}
            <div
              onDragOver={e=>e.preventDefault()}
              onDrop={handleDrop}
              onClick={()=>fileRef.current.click()}
              style={{ border:`2px dashed ${G.border}`, borderRadius:16,
                padding:"28px 24px", textAlign:"center", cursor:"pointer", background:G.lighter,
                transition:"all 0.2s", marginBottom:20 }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=G.accent}
              onMouseLeave={e=>e.currentTarget.style.borderColor=G.border}>
              <div style={{ fontSize:40, marginBottom:8 }}>📂</div>
              <div style={{ fontWeight:700, fontSize:14, color:G.text, marginBottom:4 }}>Drop one or more CSV files here</div>
              <div style={{ fontSize:12, color:G.muted }}>Select multiple CSV files at once — they will be merged</div>
              <input ref={fileRef} type="file" accept=".csv" multiple style={{ display:"none" }}
                onChange={e=>handleFiles(e.target.files)} />
            </div>

            {/* Template + format guide */}
            <div style={{ display:"flex", gap:10, marginBottom:20 }}>
              <button onClick={()=>{
                const csv = ["type,question,optionA,optionB,optionC,optionD,correct,explanation,grade,subject,xp",
                  "multiple_choice,What is 6×7?,42,48,36,56,42,6 times 7 equals 42,3,Math,50",
                  "true_false,A noun names a person place or thing.,True,False,,,True,Nouns name people places and things,2,Grammar,30",
                  "fill_blank,The ___ is the largest planet.,Jupiter,Saturn,Mars,Venus,Jupiter,Jupiter is biggest,4,Science,50",
                  "word_bank,The ___ ran quickly home.,cat,dog,bird,fish,dog,Dogs run quickly,2,Reading,40",
                  "multiple_choice,What is 15-8?,5,6,7,8,7,15 minus 8 equals 7,2,Math,40",
                ].join("\n");
                const blob = new Blob([csv],{type:"text/csv"});
                const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
                a.download="foxling-questions-template.csv"; a.click();
              }} style={{ flex:1, padding:"9px", borderRadius:10, border:`1.5px solid ${G.border}`,
                background:G.white, color:G.text, fontWeight:600, fontSize:12, cursor:"pointer" }}>
                ⬇️ Download CSV Template
              </button>
              <a href="https://docs.google.com/spreadsheets/d/1BXp4GqRJbzrEGP9kLHk_q3e_mElNFjFGVpz8Ql4P6o/copy"
                target="_blank" rel="noopener noreferrer"
                style={{ flex:1, padding:"9px", borderRadius:10, border:"1.5px solid #86efac",
                  background:"#f0fdf4", color:"#16a34a", fontWeight:600, fontSize:12, cursor:"pointer",
                  textAlign:"center", textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center" }}>
                📋 Copy Google Sheet Template
              </a>
            </div>

            {/* Format guide */}
            <div style={{ background:G.lighter, borderRadius:12, padding:14 }}>
              <div style={{ fontWeight:700, fontSize:12, color:G.text, marginBottom:8 }}>📋 Column Format</div>
              <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:"4px 12px", fontSize:11 }}>
                {[
                  ["type","multiple_choice · true_false · fill_blank · word_bank"],
                  ["question","The question text"],
                  ["optionA-D","Answer choices (MCQ & word_bank)"],
                  ["correct","Must match an option exactly"],
                  ["explanation","Optional — one sentence hint"],
                  ["grade","1 to 5"],
                  ["subject","Math · Reading · Grammar"],
                  ["xp","Optional — default 50"],
                ].map(([col,desc],i)=>(
                  <>
                    <span key={"k"+i} style={{ fontWeight:700, color:G.accent, whiteSpace:"nowrap" }}>{col}</span>
                    <span key={"v"+i} style={{ color:G.muted }}>{desc}</span>
                  </>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {step==="preview" && (
        <>
          {/* Stats bar */}
          <div style={{ padding:"12px 20px", borderBottom:`1px solid ${G.border}`, background:G.lighter, display:"flex", alignItems:"center", gap:16, flexShrink:0, flexWrap:"wrap" }}>
            <div style={{ fontSize:13, fontWeight:700, color:G.text }}>
              📄 {file?.name}
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {Object.entries(
                preview.reduce((acc,q)=>{ acc[q.type]=(acc[q.type]||0)+1; return acc; },{})
              ).map(([type,count])=>(
                <span key={type} style={{ fontSize:11, fontWeight:700, color:TYPE_COLOR[type]||G.muted,
                  background:(TYPE_COLOR[type]||G.muted)+"15", borderRadius:99, padding:"2px 8px" }}>
                  {TYPE_LABEL[type]||type}: {count}
                </span>
              ))}
            </div>
            {errors.length>0&&(
              <span style={{ fontSize:11, color:G.danger, background:G.dangerLight, borderRadius:99, padding:"2px 10px", fontWeight:700 }}>
                ⚠️ {errors.length} error{errors.length!==1?"s":""}
              </span>
            )}
            <button onClick={()=>{setStep("upload");setPreview([]);setErrors([]);setFile(null);}}
              style={{ marginLeft:"auto", fontSize:12, color:G.muted, background:"none", border:"none", cursor:"pointer" }}>
              ← Upload different file
            </button>
          </div>

          {/* Errors */}
          {errors.length>0&&(
            <div style={{ padding:"10px 20px", background:G.dangerLight, borderBottom:`1px solid #fca5a5`, flexShrink:0 }}>
              <div style={{ fontWeight:700, fontSize:12, color:G.danger, marginBottom:4 }}>⚠️ Rows with errors (skipped):</div>
              {errors.map((e,i)=><div key={i} style={{ fontSize:11, color:G.danger }}>{e}</div>)}
            </div>
          )}

          {/* Select all */}
          <div style={{ padding:"10px 20px", borderBottom:`1px solid ${G.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
            <span style={{ fontSize:13, fontWeight:600, color:G.text }}>{selected.size} of {preview.length} selected</span>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setSelected(new Set(preview.map((_,i)=>i)))}
                style={{ fontSize:12, color:G.accent, background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Select all</button>
              <button onClick={()=>setSelected(new Set())}
                style={{ fontSize:12, color:G.muted, background:"none", border:"none", cursor:"pointer" }}>Clear</button>
            </div>
          </div>

          {/* Question list */}
          <div style={{ flex:1, overflowY:"auto" }}>
            {preview.map((q, i) => (
              <div key={i} onClick={()=>toggleSelect(i)}
                style={{ padding:"12px 20px", borderBottom:`1px solid ${G.border}`, cursor:"pointer",
                  background:selected.has(i)?G.accentLight:G.white, transition:"background 0.1s",
                  display:"flex", gap:12, alignItems:"flex-start" }}>
                {/* Checkbox */}
                <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${selected.has(i)?G.accent:G.border}`,
                  background:selected.has(i)?G.accent:"#fff", flexShrink:0, marginTop:2,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {selected.has(i)&&<span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>✓</span>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, marginBottom:6, flexWrap:"wrap", alignItems:"center" }}>
                    <span style={{ fontSize:10, fontWeight:700, color:TYPE_COLOR[q.type]||G.muted,
                      background:(TYPE_COLOR[q.type]||G.muted)+"15", borderRadius:99, padding:"2px 8px" }}>
                      {TYPE_LABEL[q.type]||q.type}
                    </span>
                    <span style={{ fontSize:10, fontWeight:700, color:G.muted,
                      background:G.light, borderRadius:99, padding:"2px 8px" }}>
                      Grade {q.grade}
                    </span>
                    <span style={{ fontSize:10, fontWeight:700, color:G.muted,
                      background:G.light, borderRadius:99, padding:"2px 8px" }}>
                      {q.subject}
                    </span>
                    <span style={{ fontSize:10, color:G.muted, marginLeft:"auto" }}>⚡ +{q.xpReward} XP</span>
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, color:G.text, marginBottom:6 }}>
                    <span style={{ color:G.muted, marginRight:4 }}>Q{i+1}.</span>{q.question}
                  </div>
                  {q.options.length>0&&(
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:4 }}>
                      {q.options.map((opt,j)=>(
                        <span key={j} style={{ fontSize:11, padding:"3px 8px", borderRadius:6,
                          background:opt===q.correctAnswer?G.greenLight:G.light,
                          color:opt===q.correctAnswer?G.green:G.muted,
                          border:`1px solid ${opt===q.correctAnswer?"#86efac":G.border}`,
                          fontWeight:opt===q.correctAnswer?700:400 }}>
                          {opt===q.correctAnswer?"✓ ":""}{opt}
                        </span>
                      ))}
                    </div>
                  )}
                  {q.type==="fill_blank"&&(
                    <span style={{ fontSize:11, padding:"3px 8px", borderRadius:6,
                      background:G.greenLight, color:G.green, border:"1px solid #86efac", fontWeight:700 }}>
                      ✓ {q.correctAnswer}
                    </span>
                  )}
                  {(q.type==="sorting"||q.type==="drag_drop")&&(
                    <div style={{ display:"flex", gap:8, marginTop:4, flexWrap:"wrap" }}>
                      <span style={{ fontSize:11, padding:"3px 8px", borderRadius:6, background:G.blueLight, color:G.blue, fontWeight:700 }}>
                        {q.emoji1} {q.cat1||q.options?.[0]}
                      </span>
                      <span style={{ fontSize:11, padding:"3px 8px", borderRadius:6, background:G.purpleLight, color:G.purple, fontWeight:700 }}>
                        {q.emoji2} {q.cat2||q.options?.[1]}
                      </span>
                    </div>
                  )}
                  {q.explanation&&(
                    <div style={{ fontSize:11, color:G.muted, marginTop:4 }}>💡 {q.explanation}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding:"14px 20px", borderTop:`1px solid ${G.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:G.white, flexShrink:0 }}>
            <div style={{ fontSize:13, color:G.muted }}>
              {selected.size} question{selected.size!==1?"s":""} will be imported
            </div>
            <button onClick={()=>{ onInsert(preview.filter((_,i)=>selected.has(i))); onClose(); }}
              disabled={selected.size===0}
              style={{ padding:"9px 24px", borderRadius:8, border:"none",
                background:selected.size===0?"#ccc":G.accent, color:"#fff",
                fontWeight:700, fontSize:13, cursor:selected.size===0?"not-allowed":"pointer",
                fontFamily:"inherit" }}>
              ✓ Import {selected.size} Questions
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ── AI QUESTION GENERATOR ─────────────────────────────────
const AIGenerator = ({ onInsert, onClose, defaultSubject, defaultGrade, defaultType }) => {
  const [subject,  setSubject]  = useState(defaultSubject||"Math");
  const [grade,    setGrade]    = useState(defaultGrade||2);
  const [type,     setType]     = useState(defaultType||"quiz");
  const [count,    setCount]    = useState(10);
  const [topic,    setTopic]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [preview,  setPreview]  = useState([]);
  const [error,    setError]    = useState("");
  const [selected, setSelected] = useState(new Set());

  const generate = async () => {
    setLoading(true);
    setError("");
    setPreview([]);
    setSelected(new Set());
    try {
      const prompt = `Generate exactly ${count} multiple choice questions for Grade ${grade} ${subject}${topic ? ` about "${topic}"` : ""}.

Return ONLY a valid JSON array. No markdown, no explanation, no backticks. Just the raw JSON array.

Each question must have:
- question: string (the question text)
- options: array of exactly 4 strings (the answer choices)
- correctAnswer: string (must exactly match one of the options)
- explanation: string (brief explanation of the correct answer, 1 sentence)

Requirements:
- Age-appropriate for Grade ${grade} students
- Curriculum-aligned for Ontario elementary school
- Clear, unambiguous questions
- Distractors should be plausible but clearly wrong
- correctAnswer must be word-for-word identical to one of the options

Example format:
[{"question":"What is 2+2?","options":["3","4","5","6"],"correctAnswer":"4","explanation":"2 plus 2 equals 4."}]`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      const raw  = data.content?.[0]?.text || "";
      
      // Clean and parse JSON
      const cleaned = raw.replace(/```json/g,"").replace(/```/g,"").trim();
      const start   = cleaned.indexOf("[");
      const end     = cleaned.lastIndexOf("]") + 1;
      const jsonStr = cleaned.slice(start, end);
      const questions = JSON.parse(jsonStr);

      // Add IDs and type
      const withIds = questions.map((q, i) => ({
        id: `q${Date.now()}_${i}`,
        type: "multiple_choice",
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
      }));

      setPreview(withIds);
      setSelected(new Set(withIds.map((_,i)=>i)));
    } catch(e) {
      setError("Generation failed: " + e.message + ". Try again.");
    }
    setLoading(false);
  };

  const toggleSelect = (i) => {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  };

  const handleInsert = () => {
    const chosen = preview.filter((_,i) => selected.has(i));
    onInsert(chosen);
    onClose();
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Config panel */}
      <div style={{ padding:"16px 20px", borderBottom:`1px solid ${G.border}`, background:G.lighter }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 80px", gap:10, marginBottom:12 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:G.muted, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4 }}>Subject</label>
            <select value={subject} onChange={e=>setSubject(e.target.value)}
              style={{ width:"100%", border:`1px solid ${G.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, background:G.white, outline:"none" }}>
              {["Math","Reading","Grammar","Science","Social Studies"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:G.muted, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4 }}>Grade</label>
            <select value={grade} onChange={e=>setGrade(Number(e.target.value))}
              style={{ width:"100%", border:`1px solid ${G.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, background:G.white, outline:"none" }}>
              {[1,2,3,4,5].map(g=><option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:G.muted, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4 }}>Type</label>
            <select value={type} onChange={e=>setType(e.target.value)}
              style={{ width:"100%", border:`1px solid ${G.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, background:G.white, outline:"none" }}>
              <option value="quiz">Quiz</option>
              <option value="worksheet">Worksheet</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:G.muted, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4 }}>Count</label>
            <select value={count} onChange={e=>setCount(Number(e.target.value))}
              style={{ width:"100%", border:`1px solid ${G.border}`, borderRadius:8, padding:"8px 10px", fontSize:13, background:G.white, outline:"none" }}>
              {[5,10,15,20,25,30].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11, fontWeight:600, color:G.muted, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4 }}>Topic (optional)</label>
            <input value={topic} onChange={e=>setTopic(e.target.value)}
              placeholder={`e.g. "multiplication tables", "past tense verbs", "fractions"`}
              style={{ width:"100%", border:`1px solid ${G.border}`, borderRadius:8, padding:"8px 12px", fontSize:13, background:G.white, outline:"none" }}
              onKeyDown={e=>e.key==="Enter"&&generate()}/>
          </div>
          <button onClick={generate} disabled={loading}
            style={{ padding:"9px 20px", borderRadius:8, border:"none", background:loading?"#ccc":G.accent, color:"#fff", fontWeight:600, fontSize:13, cursor:loading?"not-allowed":"pointer", flexShrink:0, display:"flex", alignItems:"center", gap:8 }}>
            {loading ? (
              <><span style={{ display:"inline-block", width:14, height:14, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/> Generating...</>
            ) : "✨ Generate"}
          </button>
        </div>
        {error && <div style={{ marginTop:10, fontSize:12, color:G.danger, background:G.dangerLight, borderRadius:8, padding:"8px 12px" }}>{error}</div>}
      </div>

      {/* Preview */}
      <div style={{ flex:1, overflowY:"auto", padding:"0 20px" }}>
        {loading && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:200, gap:12 }}>
            <div style={{ fontSize:40 }}>✨</div>
            <div style={{ fontWeight:600, color:G.muted }}>Claude is generating {count} questions...</div>
            <div style={{ fontSize:12, color:G.muted }}>This takes about 10-20 seconds</div>
          </div>
        )}

        {!loading && preview.length === 0 && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:200, gap:8, color:G.muted }}>
            <div style={{ fontSize:40 }}>🤖</div>
            <div style={{ fontWeight:600 }}>Configure above and click Generate</div>
            <div style={{ fontSize:12 }}>Claude will create {count} ready-to-use questions instantly</div>
          </div>
        )}

        {!loading && preview.length > 0 && (
          <div>
            {/* Select all bar */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:`1px solid ${G.border}`, marginBottom:4 }}>
              <div style={{ fontSize:13, fontWeight:600, color:G.text }}>
                {selected.size} of {preview.length} selected
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>setSelected(new Set(preview.map((_,i)=>i)))}
                  style={{ fontSize:12, color:G.accent, background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Select all</button>
                <button onClick={()=>setSelected(new Set())}
                  style={{ fontSize:12, color:G.muted, background:"none", border:"none", cursor:"pointer" }}>Clear</button>
              </div>
            </div>

            {preview.map((q, i) => (
              <div key={i} onClick={()=>toggleSelect(i)}
                style={{ padding:"14px 12px", borderBottom:`1px solid ${G.border}`, cursor:"pointer",
                  background:selected.has(i)?G.accentLight:G.white, transition:"background 0.1s",
                  display:"flex", gap:12, alignItems:"flex-start" }}>
                {/* Checkbox */}
                <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${selected.has(i)?G.accent:G.border}`,
                  background:selected.has(i)?G.accent:"#fff", flexShrink:0, marginTop:2,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {selected.has(i) && <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>✓</span>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:G.text, marginBottom:8 }}>
                    <span style={{ color:G.muted, marginRight:6 }}>Q{i+1}.</span>{q.question}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginBottom:6 }}>
                    {q.options.map((opt, j) => (
                      <div key={j} style={{ fontSize:12, padding:"4px 8px", borderRadius:6,
                        background: opt===q.correctAnswer?G.greenLight:G.light,
                        color: opt===q.correctAnswer?G.green:G.muted,
                        border: `1px solid ${opt===q.correctAnswer?"#86efac":G.border}`,
                        fontWeight: opt===q.correctAnswer?700:400,
                        display:"flex", alignItems:"center", gap:4 }}>
                        <span style={{ fontWeight:700 }}>{"ABCD"[j]}.</span> {opt}
                        {opt===q.correctAnswer && <span style={{ marginLeft:"auto" }}>✓</span>}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <div style={{ fontSize:11, color:G.muted, background:G.lighter, borderRadius:6, padding:"4px 8px" }}>
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {preview.length > 0 && (
        <div style={{ padding:"14px 20px", borderTop:`1px solid ${G.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:G.white, flexShrink:0 }}>
          <div style={{ fontSize:13, color:G.muted }}>
            {selected.size} question{selected.size!==1?"s":""} will be inserted
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={generate} disabled={loading}
              style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${G.border}`, background:G.white, color:G.text, fontWeight:600, fontSize:13, cursor:"pointer" }}>
              ↺ Regenerate
            </button>
            <button onClick={handleInsert} disabled={selected.size===0}
              style={{ padding:"8px 20px", borderRadius:8, border:"none",
                background:selected.size===0?"#ccc":G.accent, color:"#fff",
                fontWeight:600, fontSize:13, cursor:selected.size===0?"not-allowed":"pointer" }}>
              ✓ Insert {selected.size} Questions
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

// ── WORKSHEET QUESTION EDITOR (one at a time) ─────────────
const WorksheetQuestionEditor = ({ questions, contentType, onAdd, onUpdate, onRemove, onDuplicate, onAIGenerate, onQBPick }) => {
  const [current, setCurrent] = useState(0);

  const idx   = Math.min(current, Math.max(0, questions.length - 1));
  const q     = questions[idx];
  const total = questions.length;

  const goTo = (i) => setCurrent(Math.max(0, Math.min(i, total - 1)));

  const handleAdd = (type = "multiple_choice") => {
    onAdd(type);
    setTimeout(() => setCurrent(total), 50);
  };

  const handleRemove = () => {
    onRemove(idx);
    setCurrent(Math.max(0, idx - 1));
  };

  const typeColors = {
    worksheet: { bg: G.accentLight, border: G.accent+"30", header: G.accent, label: "📋 Worksheet" },
    reading:   { bg: G.greenLight,  border: G.green+"30",  header: G.green,  label: "📖 Reading"   },
    game:      { bg: G.purpleLight, border: G.purple+"30", header: G.purple, label: "🎮 Game"      },
  };
  const tc = typeColors[contentType] || typeColors.worksheet;

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,
        padding:"12px 16px",background:tc.bg,borderRadius:12,border:`1px solid ${tc.border}`}}>
        <div>
          <span style={{fontSize:13,fontWeight:700,color:tc.header}}>{tc.label}</span>
          <span style={{fontSize:12,color:G.muted,marginLeft:8}}>{total} question{total!==1?"s":""}</span>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <Btn variant="secondary" size="sm" onClick={onQBPick} style={{background:G.amberLight,borderColor:G.amber+"40",color:G.amber}}>🎲 Question Bank</Btn>
          <Btn variant="secondary" size="sm" onClick={onAIGenerate} style={{background:G.purpleLight,borderColor:G.purple+"40",color:G.purple}}>✨ AI Generate</Btn>
          {QUESTION_TYPES.map(t=>(
            <Btn key={t.id} variant="secondary" size="sm" onClick={()=>handleAdd(t.id)} title={t.desc}>
              {t.icon} {t.label}
            </Btn>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div style={{textAlign:"center",padding:48,color:G.muted,border:`2px dashed ${G.border}`,borderRadius:12}}>
          <div style={{fontSize:40,marginBottom:8}}>❓</div>
          <div style={{fontWeight:500}}>No questions yet</div>
          <div style={{fontSize:12,marginTop:4}}>Use the buttons above to add your first question</div>
        </div>
      ) : (
        <div>
          {/* Progress dots */}
          <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:16,flexWrap:"wrap"}}>
            {questions.map((_,i) => {
              const qt = questions[i]?.type;
              const dotColor = {
                multiple_choice: G.blue,
                fill_blank:      G.accent,
                true_false:      G.green,
                drag_drop:       G.purple,
                sorting:         G.amber,
              }[qt] || G.muted;
              return (
                <button key={i} onClick={()=>goTo(i)}
                  style={{width:i===idx?32:10,height:10,borderRadius:99,border:"none",
                    background:i===idx?dotColor:G.border,cursor:"pointer",
                    transition:"all 0.2s",padding:0,fontSize:9,color:"#fff",fontWeight:700}}>
                  {i===idx?i+1:""}
                </button>
              );
            })}
          </div>

          {/* Question type legend */}
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:14,flexWrap:"wrap"}}>
            {[
              {type:"multiple_choice",label:"MCQ",     color:G.blue},
              {type:"fill_blank",     label:"Fill",    color:G.accent},
              {type:"true_false",     label:"T/F",     color:G.green},
              {type:"drag_drop",      label:"Drag",    color:G.purple},
              {type:"sorting",        label:"Sort",    color:G.amber},
            ].map(({type,label,color})=>(
              <span key={type} style={{fontSize:10,fontWeight:600,color,background:color+"15",
                borderRadius:6,padding:"2px 8px"}}>
                ● {label}
              </span>
            ))}
          </div>

          {/* Question card */}
          <div style={{border:`2px solid ${tc.border}`,borderRadius:16,overflow:"hidden",marginBottom:12}}>
            {/* Card header */}
            <div style={{padding:"12px 16px",background:tc.header,display:"flex",
              justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{color:"#fff",fontWeight:700,fontSize:14}}>
                  Question {idx+1} of {total}
                </span>
                <span style={{background:"rgba(255,255,255,0.2)",color:"#fff",borderRadius:6,
                  padding:"2px 8px",fontSize:11,fontWeight:600}}>
                  {({multiple_choice:"Multiple Choice",fill_blank:"Fill in Blank",
                     true_false:"True/False",drag_drop:"Drag & Drop",sorting:"Sorting"})[q?.type]||q?.type}
                </span>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>onDuplicate(idx)}
                  style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:6,
                    padding:"4px 10px",color:"#fff",fontSize:12,cursor:"pointer"}}>
                  ⧉ Duplicate
                </button>
                <button onClick={handleRemove}
                  style={{background:"rgba(255,100,100,0.3)",border:"none",borderRadius:6,
                    padding:"4px 10px",color:"#fff",fontSize:12,cursor:"pointer"}}>
                  ✕ Remove
                </button>
              </div>
            </div>
            {/* Question editor */}
            <div style={{padding:16}}>
              <QEditor key={q?.id||idx} question={q} index={idx}
                onChange={updated=>onUpdate(idx,updated)}
                onRemove={handleRemove}
                onDuplicate={()=>onDuplicate(idx)} />
            </div>
          </div>

          {/* Navigation */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <Btn variant="secondary" onClick={()=>goTo(idx-1)} disabled={idx===0}>← Previous</Btn>
            <span style={{fontSize:13,color:G.muted,fontWeight:500}}>{idx+1} / {total}</span>
            {idx < total-1 ? (
              <Btn variant="secondary" onClick={()=>goTo(idx+1)}>Next →</Btn>
            ) : (
              <Btn variant="secondary" onClick={()=>handleAdd("multiple_choice")}>+ Add Question</Btn>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── QUIZ QUESTION EDITOR (one at a time) ──────────────────
const QuizQuestionEditor = ({ questions, timeLimit, onAdd, onUpdate, onRemove, onDuplicate, onAIGenerate, onQBPick }) => {
  const [current, setCurrent] = useState(0);

  // Keep current in bounds
  const idx = Math.min(current, Math.max(0, questions.length - 1));
  const q   = questions[idx];
  const total = questions.length;

  const goTo = (i) => setCurrent(Math.max(0, Math.min(i, total - 1)));

  const handleAdd = (type = "multiple_choice") => {
    onAdd(type);
    setCurrent(total); // go to new question
  };

  const handleRemove = () => {
    onRemove(idx);
    setCurrent(Math.max(0, idx - 1));
  };

  return (
    <div>
      {/* Header bar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,
        padding:"12px 16px",background:G.blueLight,borderRadius:12,border:`1px solid ${G.blue}22`}}>
        <div>
          <span style={{fontSize:13,fontWeight:700,color:G.blue}}>⏱️ Quiz</span>
          <span style={{fontSize:12,color:G.muted,marginLeft:8}}>{timeLimit}s time limit · {total} question{total!==1?"s":""}</span>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <Btn variant="secondary" size="sm" onClick={onQBPick} style={{background:G.amberLight,borderColor:G.amber+"40",color:G.amber}}>🎲 Question Bank</Btn>
          <Btn variant="secondary" size="sm" onClick={onAIGenerate} style={{background:G.purpleLight,borderColor:G.purple+"40",color:G.purple}}>✨ AI Generate</Btn>
          {["multiple_choice","fill_blank","true_false"].map(t=>{
            const icon={multiple_choice:"◉",fill_blank:"✏️",true_false:"⊤⊥"}[t];
            const label={multiple_choice:"MCQ",fill_blank:"Fill",true_false:"T/F"}[t];
            return <Btn key={t} variant="secondary" size="sm" onClick={()=>handleAdd(t)}>{icon} {label}</Btn>;
          })}
        </div>
      </div>

      {total === 0 ? (
        <div style={{textAlign:"center",padding:48,color:G.muted,border:`2px dashed ${G.border}`,borderRadius:12}}>
          <div style={{fontSize:40,marginBottom:8}}>❓</div>
          <div style={{fontWeight:500}}>No questions yet</div>
          <div style={{fontSize:12,marginTop:4}}>Add your first question above</div>
        </div>
      ) : (
        <div>
          {/* Progress dots */}
          <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:16,flexWrap:"wrap"}}>
            {questions.map((_,i) => (
              <button key={i} onClick={()=>goTo(i)}
                style={{width:i===idx?32:10,height:10,borderRadius:99,border:"none",
                  background:i===idx?G.blue:G.border,cursor:"pointer",
                  transition:"all 0.2s",padding:0,fontSize:9,color:"#fff",fontWeight:700}}>
                {i===idx?i+1:""}
              </button>
            ))}
          </div>

          {/* Question card */}
          <div style={{border:`2px solid ${G.blue}30`,borderRadius:16,overflow:"hidden",marginBottom:12}}>
            {/* Card header */}
            <div style={{padding:"12px 16px",background:G.blue,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:14}}>
                Question {idx+1} of {total}
              </span>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>onDuplicate(idx)}
                  style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:6,
                    padding:"4px 10px",color:"#fff",fontSize:12,cursor:"pointer"}}>
                  ⧉ Duplicate
                </button>
                <button onClick={handleRemove}
                  style={{background:"rgba(255,100,100,0.3)",border:"none",borderRadius:6,
                    padding:"4px 10px",color:"#fff",fontSize:12,cursor:"pointer"}}>
                  ✕ Remove
                </button>
              </div>
            </div>
            {/* Question editor */}
            <div style={{padding:16}}>
              <QEditor question={q} index={idx}
                onChange={updated=>onUpdate(idx,updated)}
                onRemove={handleRemove}
                onDuplicate={()=>onDuplicate(idx)} />
            </div>
          </div>

          {/* Navigation */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <Btn variant="secondary" onClick={()=>goTo(idx-1)} disabled={idx===0}>← Previous</Btn>
            <span style={{fontSize:13,color:G.muted,fontWeight:500}}>
              {idx+1} / {total}
            </span>
            {idx < total-1 ? (
              <Btn variant="secondary" onClick={()=>goTo(idx+1)}>Next →</Btn>
            ) : (
              <Btn variant="secondary" onClick={()=>handleAdd("multiple_choice")}>+ Add Question</Btn>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── CONTENT BUILDER ────────────────────────────────────────
const Builder=({contentType,initial,onSave,onCancel})=>{
  const ct=CONTENT_TYPES[contentType];
  const [tab,setTab]=useState("details");
  const [saving,setSaving]=useState(false);
  const [aiOpen,setAiOpen]=useState(false);
  const [qbOpen,setQbOpen]=useState(false);

  const empty=()=>({
    id:`${contentType.slice(0,2)}-g1-${Date.now()}`,type:contentType,
    title:"",subject:"Math",grade:1,icon:"🔢",xpReward:50,published:false,
    timeLimit:60,passingScore:70,showTimer:true,randomOrder:false,
    hasPassage:contentType==="reading",
    passage:{title:"",emoji:"📖",text:"",readingTime:"2 min",wordCount:0},
    gameType:"quick_fire",difficulty:"medium",itemCount:10,
    cat1:"",cat2:"",
    gameItems:[{question:"",answer:""}],
    questions:contentType==="game"?[]:[
      {id:"q1",type:"multiple_choice",question:"",options:["","","",""],correctAnswer:"",explanation:""},
      {id:"q2",type:"multiple_choice",question:"",options:["","","",""],correctAnswer:"",explanation:""},
      {id:"q3",type:"fill_blank",     question:"",options:[],          correctAnswer:"",explanation:""},
    ],
  });

  // Merge initial with defaults so missing fields don't cause crashes
  const buildState = (src) => src ? {
    ...empty(),
    ...src,
    id: src.id,  // always preserve original ID
    questions: (src.questions && src.questions.length > 0) ? src.questions : (contentType==="game"?[]:empty().questions),
    passage: src.passage ? { ...empty().passage, ...src.passage } : empty().passage,
    gameItems: (src.gameItems && src.gameItems.length > 0) ? src.gameItems : [{question:"",answer:""}],
  } : empty();

  const [c,setC]=useState(()=>buildState(initial));

  // Re-initialize when initial prop updates (after full doc fetch)
  const prevInitialId = useRef(initial?.id);
  useEffect(()=>{
    if(initial && initial.id !== prevInitialId.current) {
      prevInitialId.current = initial.id;
    }
    if(initial && initial.questions && initial.questions.length > 0) {
      setC(buildState(initial));
    }
  },[initial]);
  const u=(k,v)=>setC(p=>({...p,[k]:v}));
  const up=(k,v)=>setC(p=>({...p,passage:{...p.passage,[k]:v}}));
  const uq=(i,q)=>setC(p=>{const qs=[...p.questions];qs[i]=q;return{...p,questions:qs};});
  const addQ=(type="multiple_choice")=>setC(p=>({...p,questions:[...p.questions,{id:`q${Date.now()}`,type,question:"",options:type==="multiple_choice"||type==="word_bank"?["","","",""]:type==="true_false"?["True","False"]:[],correctAnswer:"",explanation:""}]}));
  const rmQ=(i)=>setC(p=>({...p,questions:p.questions.filter((_,x)=>x!==i)}));
  const dupQ=(i)=>setC(p=>({...p,questions:[...p.questions.slice(0,i+1),{...p.questions[i],id:`q${Date.now()}`},...p.questions.slice(i+1)]}));

  const [saveError,setSaveError]=useState("");
  const save=async(publish=false)=>{
    if(!c.title.trim()){setSaveError("Please add a title before saving.");return;}
    setSaving(true);
    setSaveError("");
    const data={
      ...c,
      id: initial?.id || c.id,  // always keep original ID when editing
      published:publish,
      items:c.questions?.length||c.itemCount||0,
      questions: c.questions||[],
      gameItems: c.gameItems||[],
      passage: c.passage||{title:"",emoji:"📖",text:"",readingTime:"2 min",wordCount:0},
    };
    try{
      if(initial&&initial.id){
        await updateContent(initial.id, data);
      } else {
        await createContent(data);
      }
      onSave(data);
    } catch(e){
      console.warn("Firestore save failed",e);
      setSaveError("Save failed: "+e.code+" — "+e.message);
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  const gameInfo=GAME_TYPES.find(g=>g.id===c.gameType)||GAME_TYPES[0];

  const tabs=[
    {id:"details",label:"Details"},
    ...(contentType==="reading"?[{id:"passage",label:"Passage"}]:[]),
    ...(contentType==="game"?[{id:"game",label:"Game Setup"}]:[]),
    ...(contentType!=="game"?[{id:"questions",label:`Questions (${c.questions.length})`}]:[]),
    {id:"preview",label:"Preview"},
  ];

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"8px 24px 0",display:"flex",alignItems:"center",gap:8}}>
        <span style={{background:ct.colorLight,color:ct.color,borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:600}}>{ct.icon} {ct.label}</span>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${G.border}`,padding:"0 24px",marginTop:8}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"12px 16px",border:"none",borderBottom:`2px solid ${tab===t.id?ct.color:"transparent"}`,background:"none",color:tab===t.id?ct.color:G.muted,fontSize:13,fontWeight:tab===t.id?600:400,cursor:"pointer",marginBottom:-1}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:24}}>

        {/* DETAILS */}
        {tab==="details"&&(
          <div style={{display:"flex",flexDirection:"column",gap:18}} className="fu">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Inp label="Title" value={c.title} onChange={v=>u("title",v)} placeholder="e.g. Counting Fun" required/>
              <Inp label="Content ID" value={c.id} onChange={v=>u("id",v)} placeholder="auto-generated"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
              <Sel label="Subject" value={c.subject} onChange={v=>u("subject",v)} required options={SUBJECTS.map(s=>({value:s,label:s}))}/>
              <Sel label="Grade"   value={c.grade}   onChange={v=>u("grade",Number(v))} required options={GRADES.map(g=>({value:g,label:`Grade ${g}`}))}/>
              <Sel label="XP Reward" value={c.xpReward} onChange={v=>u("xpReward",Number(v))} options={[25,50,75,100,125,150].map(x=>({value:x,label:`${x} XP`}))}/>
            </div>
            {contentType==="quiz"&&(
              <div style={{border:`1px solid ${G.border}`,borderRadius:10,padding:16,display:"flex",flexDirection:"column",gap:14}}>
                <div style={{fontSize:13,fontWeight:600,color:G.blue}}>⏱️ Quiz Settings</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <Sel label="Time Limit" value={c.timeLimit} onChange={v=>u("timeLimit",Number(v))} options={[30,45,60,90,120].map(t=>({value:t,label:`${t} seconds`}))}/>
                  <Sel label="Passing Score" value={c.passingScore} onChange={v=>u("passingScore",Number(v))} options={[50,60,70,75,80,90].map(s=>({value:s,label:`${s}%`}))}/>
                </div>
                <Tgl value={c.showTimer} onChange={v=>u("showTimer",v)} label="Show countdown timer" desc="Kids see the timer ticking down"/>
                <Tgl value={c.randomOrder} onChange={v=>u("randomOrder",v)} label="Randomize question order" desc="Questions appear in random order each time"/>
              </div>
            )}
            <div>
              <div style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Icon</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {(SUBJECT_ICONS[c.subject]||SUBJECT_ICONS.Math).map(icon=>(
                  <button key={icon} onClick={()=>u("icon",icon)}
                    style={{width:44,height:44,borderRadius:8,border:`2px solid ${c.icon===icon?ct.color:G.border}`,background:c.icon===icon?ct.colorLight:G.white,fontSize:22,cursor:"pointer"}}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <Tgl value={c.published} onChange={v=>u("published",v)} label="Published" desc="Make visible in the Foxling app immediately"/>
          </div>
        )}

        {/* PASSAGE */}
        {tab==="passage"&&(
          <div style={{display:"flex",flexDirection:"column",gap:18}} className="fu">
            <div style={{background:G.greenLight,borderRadius:10,padding:14,fontSize:13,color:G.green,lineHeight:1.6}}>
              📖 Write the story kids read before answering. Separate paragraphs with a blank line. Dialogue in "quotes" will be italicised automatically.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:12}}>
              <Inp label="Passage Title" value={c.passage.title} onChange={v=>up("title",v)} placeholder="e.g. The Little Red Hen" required/>
              <Inp label="Emoji" value={c.passage.emoji} onChange={v=>up("emoji",v)} placeholder="🐔"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Inp label="Reading Time" value={c.passage.readingTime} onChange={v=>up("readingTime",v)} placeholder="e.g. 2 min"/>
              <Inp label="Word Count" value={c.passage.wordCount} onChange={v=>up("wordCount",Number(v))} type="number" placeholder="110"/>
            </div>
            <Txtarea label="Passage Text" value={c.passage.text} onChange={v=>up("text",v)} rows={14} required
              placeholder={"Once upon a time...\n\n\"Who will help me?\" she asked.\n\n\"Not I,\" said the dog.\n\nSeparate paragraphs with blank lines."}/>
            {c.passage.text&&(
              <div>
                <div style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Live Preview</div>
                <div style={{border:`1px solid ${G.border}`,borderRadius:10,padding:16,background:G.white,maxHeight:200,overflowY:"auto"}}>
                  {c.passage.text.split("\n\n").filter(Boolean).map((p,i)=>{
                    const isD=p.startsWith('"')||p.includes('" said')||p.includes('" asked');
                    return<p key={i} style={{fontSize:14,lineHeight:1.8,marginBottom:10,fontStyle:isD?"italic":"normal",color:G.text,paddingLeft:isD?12:0,borderLeft:isD?`3px solid #26de8155`:"none"}}>{p}</p>;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* GAME SETUP */}
        {tab==="game"&&(
          <div style={{display:"flex",flexDirection:"column",gap:18}} className="fu">
            <div>
              <div style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Game Type *</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {GAME_TYPES.map(g=>(
                  <button key={g.id} onClick={()=>u("gameType",g.id)}
                    style={{padding:"14px 16px",borderRadius:10,border:`2px solid ${c.gameType===g.id?g.color:G.border}`,background:c.gameType===g.id?g.color+"12":G.white,cursor:"pointer",textAlign:"left",display:"flex",gap:12,alignItems:"flex-start"}}>
                    <span style={{fontSize:28}}>{g.icon}</span>
                    <div>
                      <div style={{fontWeight:600,fontSize:13,color:c.gameType===g.id?g.color:G.text}}>{g.label}</div>
                      <div style={{fontSize:11,color:G.muted,marginTop:2}}>{g.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{border:`1px solid ${G.border}`,borderRadius:10,padding:16,display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontSize:13,fontWeight:600,color:gameInfo.color}}>{gameInfo.icon} {gameInfo.label} Settings</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Sel label="Difficulty" value={c.difficulty||"medium"} onChange={v=>u("difficulty",v)} options={["easy","medium","hard"].map(d=>({value:d,label:d.charAt(0).toUpperCase()+d.slice(1)}))}/>
                {(c.gameType==="quick_fire"||c.gameType==="memory")&&<Sel label="Time Limit" value={c.timeLimit||60} onChange={v=>u("timeLimit",Number(v))} options={[30,45,60,90].map(t=>({value:t,label:`${t} seconds`}))}/>}
                <Sel label="Number of Items" value={c.itemCount||10} onChange={v=>u("itemCount",Number(v))} options={[4,6,8,10,12].map(n=>({value:n,label:`${n} items`}))}/>
              </div>
            </div>

            {/* Game items editor */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5}}>Game Content</div>
                <Btn variant="secondary" size="sm" onClick={()=>u("gameItems",[...(c.gameItems||[]),{question:"",answer:""}])}>+ Add Item</Btn>
              </div>

              {/* Quick Fire */}
              {c.gameType==="quick_fire"&&(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {(c.gameItems||[]).map((item,j)=>(
                    <div key={j} style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{width:22,height:22,borderRadius:"50%",background:G.amber,color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{j+1}</span>
                      <input value={item.question} onChange={e=>{const it=[...(c.gameItems||[])];it[j]={...it[j],question:e.target.value};u("gameItems",it);}} placeholder="Question (e.g. 5 + 3)"
                        style={{flex:1,border:`1px solid ${G.border}`,borderRadius:7,padding:"7px 10px",fontSize:13,outline:"none"}} onFocus={e=>e.target.style.borderColor=G.accent} onBlur={e=>e.target.style.borderColor=G.border}/>
                      <span style={{color:G.muted,fontSize:16}}>→</span>
                      <input value={item.answer} onChange={e=>{const it=[...(c.gameItems||[])];it[j]={...it[j],answer:e.target.value};u("gameItems",it);}} placeholder="Answer (e.g. 8)"
                        style={{flex:1,border:`1px solid ${G.border}`,borderRadius:7,padding:"7px 10px",fontSize:13,outline:"none"}} onFocus={e=>e.target.style.borderColor=G.accent} onBlur={e=>e.target.style.borderColor=G.border}/>
                      <button onClick={()=>u("gameItems",(c.gameItems||[]).filter((_,x)=>x!==j))} style={{background:"none",border:"none",color:G.danger,cursor:"pointer",fontSize:16}}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Memory / Pair Up */}
              {(c.gameType==="memory"||c.gameType==="pair_up")&&(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{fontSize:12,color:G.muted}}>{c.gameType==="memory"?"Enter matching pairs (e.g. 🍎 ↔ 🍎 or word ↔ word)":"Enter word and its match (e.g. Dog ↔ Animal)"}</div>
                  {(c.gameItems||[]).map((item,j)=>(
                    <div key={j} style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{width:22,height:22,borderRadius:"50%",background:c.gameType==="memory"?G.blue:G.green,color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{j+1}</span>
                      <input value={item.question} onChange={e=>{const it=[...(c.gameItems||[])];it[j]={...it[j],question:e.target.value};u("gameItems",it);}} placeholder={c.gameType==="memory"?"Item A":"Word"}
                        style={{flex:1,border:`1px solid ${G.border}`,borderRadius:7,padding:"7px 10px",fontSize:13,outline:"none"}} onFocus={e=>e.target.style.borderColor=G.accent} onBlur={e=>e.target.style.borderColor=G.border}/>
                      <span style={{color:G.muted}}>↔</span>
                      <input value={item.answer} onChange={e=>{const it=[...(c.gameItems||[])];it[j]={...it[j],answer:e.target.value};u("gameItems",it);}} placeholder={c.gameType==="memory"?"Item B":"Match"}
                        style={{flex:1,border:`1px solid ${G.border}`,borderRadius:7,padding:"7px 10px",fontSize:13,outline:"none"}} onFocus={e=>e.target.style.borderColor=G.accent} onBlur={e=>e.target.style.borderColor=G.border}/>
                      <button onClick={()=>u("gameItems",(c.gameItems||[]).filter((_,x)=>x!==j))} style={{background:"none",border:"none",color:G.danger,cursor:"pointer",fontSize:16}}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sort It Out */}
              {c.gameType==="sort_it"&&(
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <input value={c.cat1||""} onChange={e=>u("cat1",e.target.value)} placeholder="Category 1 name (e.g. Animals)"
                        style={{border:`1px solid ${G.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,outline:"none",background:G.blueLight}}
                        onFocus={e=>e.target.style.borderColor=G.blue} onBlur={e=>e.target.style.borderColor=G.border}/>
                      <Inp label="Items (comma separated)" value={c.items1||""} onChange={v=>u("items1",v)} placeholder="Dog, Cat, Bird"/>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <input value={c.cat2||""} onChange={e=>u("cat2",e.target.value)} placeholder="Category 2 name (e.g. Foods)"
                        style={{border:`1px solid ${G.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,outline:"none",background:G.purpleLight}}
                        onFocus={e=>e.target.style.borderColor=G.purple} onBlur={e=>e.target.style.borderColor=G.border}/>
                      <Inp label="Items (comma separated)" value={c.items2||""} onChange={v=>u("items2",v)} placeholder="Apple, Bread, Rice"/>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* QUESTIONS */}
        {tab==="questions"&&(
          <div className="fu">
            {contentType==="quiz" ? (
              // ── QUIZ: One question at a time ──────────────────
              <QuizQuestionEditor
                onAIGenerate={()=>setAiOpen(true)}
                onQBPick={()=>setQbOpen(true)}
                questions={c.questions}
                timeLimit={c.timeLimit}
                onAdd={addQ}
                onUpdate={uq}
                onRemove={rmQ}
                onDuplicate={dupQ} />
            ) : (
              // ── WORKSHEET/READING: One question at a time ─────
              <WorksheetQuestionEditor
                onAIGenerate={()=>setAiOpen(true)}
                onQBPick={()=>setQbOpen(true)}
                questions={c.questions}
                contentType={contentType}
                onAdd={addQ}
                onUpdate={uq}
                onRemove={rmQ}
                onDuplicate={dupQ} />
            )}
          </div>
        )}

        {/* PREVIEW */}
        {tab==="preview"&&(
          <div className="fu" style={{maxWidth:420,margin:"0 auto"}}>
            <div style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>App Card Preview</div>
            <div style={{border:`1px solid ${G.border}`,borderRadius:16,padding:18,marginBottom:20,background:G.white}}>
              <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                <span style={{fontSize:44}}>{c.icon||"📝"}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{c.title||"Untitled"}</div>
                  <div style={{fontSize:12,color:G.muted,marginBottom:8}}>
                    {c.subject} · Grade {c.grade}
                    {contentType==="quiz"&&` · ⏱️ ${c.timeLimit}s`}
                    {contentType==="reading"&&" · 📖 Passage"}
                    {contentType==="game"&&` · ${gameInfo.label}`}
                    {contentType!=="game"&&` · ${c.questions.length} questions`}
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <span style={{background:"#f7b731",color:"#fff",borderRadius:99,padding:"3px 10px",fontSize:11,fontWeight:700}}>⚡ +{c.xpReward} XP</span>
                    <span style={{background:ct.colorLight,color:ct.color,borderRadius:99,padding:"3px 10px",fontSize:11,fontWeight:700}}>{ct.icon} {ct.label}</span>
                  </div>
                </div>
              </div>
            </div>
            {c.questions.length>0&&(
              <>
                <div style={{fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Questions Preview</div>
                {c.questions.map((q,i)=>(
                  <div key={i} style={{border:`1px solid ${G.border}`,borderRadius:12,padding:14,marginBottom:10,background:G.white}}>
                    <div style={{fontSize:11,color:G.muted,marginBottom:6}}>Q{i+1} · {QUESTION_TYPES.find(t=>t.id===q.type)?.label}</div>
                    <div style={{fontWeight:500,fontSize:14,marginBottom:10}}>{q.question||<span style={{color:G.muted,fontStyle:"italic"}}>No question text</span>}</div>
                    {q.type==="multiple_choice"&&(q.options||[]).map((opt,j)=>{
                      const isC = opt!==""&&q.correctAnswer!==""&&opt===q.correctAnswer;
                      return(
                      <div key={j} style={{padding:"7px 10px",borderRadius:7,border:`1.5px solid ${isC?G.green:G.border}`,background:isC?G.greenLight:G.white,marginBottom:5,fontSize:13,display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{width:20,height:20,borderRadius:"50%",background:isC?G.green:G.border,color:"#fff",fontSize:10,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{"ABCD"[j]}</span>
                        {opt||<span style={{color:G.muted,fontStyle:"italic"}}>Empty</span>}
                        {isC&&<span style={{marginLeft:"auto",fontSize:11,color:G.green}}>✓</span>}
                      </div>
                    );})}
                    {q.type==="fill_blank"&&<div style={{padding:"8px 12px",borderRadius:8,border:`1.5px solid ${G.green}`,background:G.greenLight,fontSize:13}}>Answer: <strong>{q.correctAnswer||<span style={{color:G.muted,fontStyle:"italic"}}>Not set</span>}</strong></div>}
                    {q.type==="true_false"&&<div style={{display:"flex",gap:8}}>{["True","False"].map(tf=><div key={tf} style={{flex:1,padding:"8px",borderRadius:8,border:`1.5px solid ${q.correctAnswer===tf?G.green:G.border}`,background:q.correctAnswer===tf?G.greenLight:G.white,fontSize:13,textAlign:"center"}}>{tf}</div>)}</div>}
                    {q.type==="sorting"&&<div style={{background:G.purpleLight,borderRadius:8,padding:10,fontSize:12,color:G.purple}}>Cat 1: {q.cat1||"?"} → {q.items1||"..."} | Cat 2: {q.cat2||"?"} → {q.items2||"..."}</div>}
                    {q.explanation&&<div style={{fontSize:11,color:G.muted,marginTop:8,paddingTop:8,borderTop:`1px solid ${G.border}`}}>💡 {q.explanation}</div>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div style={{padding:"14px 24px",borderTop:`1px solid ${G.border}`,flexShrink:0}}>
        {saveError&&<div style={{background:"#fef2f2",color:"#dc2626",borderRadius:8,padding:"8px 12px",fontSize:12,marginBottom:10,fontWeight:500}}>{saveError}</div>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="secondary" onClick={()=>save(false)} disabled={saving}>{saving?"Saving...":"Save as Draft"}</Btn>
            <Btn onClick={()=>save(true)} disabled={saving} style={{background:ct.color,borderColor:ct.color,color:"#fff"}}>{saving?"Publishing...":"✓ Publish"}</Btn>
          </div>
        </div>
      </div>

      {/* Question Bank Modal */}
      {qbOpen&&(
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:G.white,borderRadius:16,width:"100%",maxWidth:760,height:"88vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 60px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"16px 20px",borderBottom:`1px solid ${G.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <div>
                <span style={{fontWeight:700,fontSize:16}}>🎲 Question Bank</span>
                <span style={{fontSize:12,color:G.muted,marginLeft:8}}>Pick randomly from your master question bank</span>
              </div>
              <button onClick={()=>setQbOpen(false)} style={{background:G.light,border:"none",borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:14,color:G.muted}}>✕</button>
            </div>
            <div style={{flex:1,minHeight:0,display:"flex",flexDirection:"column"}}>
              <QuestionBankManager
                onClose={(questions)=>{
                  if(questions) setC(prev=>({...prev,questions:[...prev.questions,...questions]}));
                  setQbOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* AI Generator Modal */}
      {aiOpen&&(
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:G.white,borderRadius:16,width:"100%",maxWidth:760,maxHeight:"88vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 60px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"16px 20px",borderBottom:`1px solid ${G.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <div>
                <span style={{fontWeight:700,fontSize:16}}>✨ AI Question Generator</span>
                <span style={{fontSize:12,color:G.muted,marginLeft:8}}>Powered by Claude</span>
              </div>
              <button onClick={()=>setAiOpen(false)} style={{background:G.light,border:"none",borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:14,color:G.muted}}>✕</button>
            </div>
            <AIGenerator
              defaultSubject={c.subject}
              defaultGrade={c.grade}
              defaultType={contentType}
              onInsert={(questions)=>{
                setC(prev=>({...prev, questions:[...prev.questions, ...questions]}));
                setAiOpen(false);
              }}
              onClose={()=>setAiOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ── CONTENT LIST ───────────────────────────────────────────
const ContentList=({onNew,onEdit})=>{  // no refreshKey needed - uses real-time listener
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [fType,setFType]=useState("all");
  const [fSub,setFSub]=useState("All");
  const [fGrade,setFGrade]=useState("All");
  const [delTarget,setDelTarget]=useState(null);

  // Real-time listener — Firestore pushes updates automatically
  useEffect(()=>{
    const unsub = subscribeContent((data)=>{
      setItems(data);
      setLoading(false);
    });
    return ()=>{ if(unsub) unsub(); };
  },[]);

  const filtered=items.filter(w=>{
    const ms=w.title.toLowerCase().includes(search.toLowerCase());
    const mt=fType==="all"||w.type===fType;
    const msub=fSub==="All"||w.subject===fSub;
    const mg=fGrade==="All"||w.grade===Number(fGrade);
    return ms&&mt&&msub&&mg;
  });

  const tbadge={worksheet:"orange",quiz:"blue",reading:"green",game:"purple"};

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,marginBottom:4}}>Content Library</h1>
          <p style={{color:G.muted,fontSize:13}}>{items.length} items · {items.filter(w=>w.published).length} published</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>window.location.reload()} style={{background:G.light,border:`1px solid ${G.border}`,borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",color:G.muted}}>↻ Refresh</button>
          {Object.values(CONTENT_TYPES).map(ct=>(
            <Btn key={ct.id} variant="secondary" size="sm" onClick={()=>onNew(ct.id)}
              style={{borderColor:ct.color+"40",color:ct.color,background:ct.colorLight}}>
              {ct.icon} New {ct.label}
            </Btn>
          ))}
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search..."
          style={{border:`1px solid ${G.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none",width:180}}/>
        <div style={{display:"flex",gap:3,background:G.white,border:`1px solid ${G.border}`,borderRadius:8,padding:3}}>
          {[{id:"all",label:"All"},...Object.values(CONTENT_TYPES).map(ct=>({id:ct.id,label:ct.icon+" "+ct.label}))].map(t=>(
            <button key={t.id} onClick={()=>setFType(t.id)}
              style={{padding:"5px 10px",borderRadius:6,border:"none",background:fType===t.id?G.text:"transparent",color:fType===t.id?"#fff":G.muted,fontSize:12,fontWeight:fType===t.id?600:400,cursor:"pointer",whiteSpace:"nowrap"}}>
              {t.label}
            </button>
          ))}
        </div>
        <select value={fSub} onChange={e=>setFSub(e.target.value)} style={{border:`1px solid ${G.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none"}}>
          <option value="All">All Subjects</option>
          {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fGrade} onChange={e=>setFGrade(e.target.value)} style={{border:`1px solid ${G.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none"}}>
          <option value="All">All Grades</option>
          {GRADES.map(g=><option key={g} value={g}>Grade {g}</option>)}
        </select>
      </div>

      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{borderBottom:`1px solid ${G.border}`,background:G.bg}}>
              {["Content","Type","Subject","Grade","Items","XP","Status",""].map((h,i)=>(
                <th key={i} style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item,i)=>{
              const ct=CONTENT_TYPES[item.type];
              return(
                <tr key={item.id} style={{borderBottom:i<filtered.length-1?`1px solid ${G.border}`:"none"}}
                  onMouseEnter={e=>e.currentTarget.style.background=G.bg}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"13px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:24}}>{item.icon}</span>
                      <div>
                        <div style={{fontWeight:500,fontSize:13}}>{item.title}</div>
                        <div style={{fontSize:11,color:G.muted,fontFamily:G.mono}}>{item.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:"13px 16px"}}><Bdg color={tbadge[item.type]||"grey"}>{ct?.icon} {ct?.label}</Bdg></td>
                  <td style={{padding:"13px 16px",color:G.muted,fontSize:13}}>{item.subject}</td>
                  <td style={{padding:"13px 16px",color:G.muted,fontSize:13}}>G{item.grade}</td>
                  <td style={{padding:"13px 16px",color:G.muted,fontSize:13}}>{item.items}</td>
                  <td style={{padding:"13px 16px",color:G.muted,fontSize:13}}>+{item.xpReward}</td>
                  <td style={{padding:"13px 16px"}}>
                    <button onClick={async()=>{
                      const updated={...item,published:!item.published};
                      setItems(prev=>prev.map(w=>w.id===item.id?updated:w));
                      // Fire and forget - don't reload after toggle
                      updateContent(item.id,{published:!item.published}).catch(e=>console.warn("Toggle failed:",e));
                    }}
                      style={{padding:"4px 10px",borderRadius:6,border:"none",background:item.published?G.greenLight:G.light,color:item.published?G.green:G.muted,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                      {item.published?"● Live":"○ Draft"}
                    </button>
                  </td>
                  <td style={{padding:"13px 16px"}}>
                    <div style={{display:"flex",gap:6}}>
                      <Btn variant="secondary" size="sm" onClick={()=>onEdit(item)}>Edit</Btn>
                      <Btn variant="danger"    size="sm" onClick={()=>setDelTarget(item)}>Delete</Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading&&(
          <div style={{textAlign:"center",padding:48,color:G.muted}}>
            <div style={{fontSize:13}}>Loading content from Firestore...</div>
          </div>
        )}
        {!loading&&filtered.length===0&&(
          <div style={{textAlign:"center",padding:48,color:G.muted}}>
            <div style={{fontSize:40,marginBottom:8}}>🔭</div>
            <div style={{fontWeight:500}}>No content found</div>
            <div style={{fontSize:12,marginTop:4}}>Try different filters or create new content above</div>
          </div>
        )}
      </Card>

      <Mdl open={!!delTarget} onClose={()=>setDelTarget(null)} title="Delete Content" width={420}>
        <div style={{padding:24}}>
          <p style={{color:G.muted,fontSize:13,marginBottom:20}}>Delete <strong>"{delTarget?.title}"</strong>? This cannot be undone.</p>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn variant="secondary" onClick={()=>setDelTarget(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={async()=>{
              const id = delTarget.id;
              // Remove from local state immediately - no reload
              setItems(prev=>prev.filter(w=>w.id!==id));
              setDelTarget(null);
              // Fire and forget - don't reload after
              deleteContent(id).catch(e=>console.warn("Delete failed:",e));
            }}>Delete</Btn>
          </div>
        </div>
      </Mdl>
    </div>
  );
};

// ── DASHBOARD ──────────────────────────────────────────────
// ── QUESTION BANK PAGE (full page) ────────────────────────
const QuestionBankPage = () => {
  const [meta,        setMeta]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [uploading,   setUploading]   = useState(false);
  const [progress,    setProgress]    = useState("");
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");
  const [sheetsLoading,setSheetsLoading] = useState(false);
  const [activeTab,   setActiveTab]   = useState("status"); // status | upload | pick

  useEffect(()=>{ loadMeta(); },[]);

  const loadMeta = async () => {
    setLoading(true);
    try { setMeta(await getQuestionBankMeta()); }
    catch(e){ console.warn(e); }
    setLoading(false);
  };

  const extractSheetId = (url) => {
    const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return m ? m[1] : null;
  };

  const handleSheetsAdd = async (url) => {
    const id = extractSheetId(url);
    if(!id) throw new Error("Invalid Google Sheets URL.");
    setSheetsLoading(true);
    try {
      const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv&id=${id}`);
      if(!res.ok) throw new Error("Could not fetch sheet.");
      const text = await res.text();
      if(text.includes("<!DOCTYPE")||text.includes("<html")) throw new Error("Sheet is not public. Share → Anyone with link → Viewer.");
      const questions = parseCSVForBank(text);
      setSheetsLoading(false);
      return questions;
    } catch(e){ setSheetsLoading(false); throw e; }
  };

  const parseCSVForBank = (text) => {
    const lines  = text.trim().split("\n");
    const header = lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/\s+/g,"_").replace(/[^a-z_]/g,""));
    const rows   = lines.slice(1);
    const questions = [];
    rows.forEach((row, i) => {
      if(!row.trim()) return;
      // Parse CSV row respecting quoted fields
      const cols=[];let cur="",inQ=false;
      for(let c of row){
        if(c==="\""&&!inQ){inQ=true;continue;}
        if(c==="\""&&inQ){inQ=false;continue;}
        if(c===","&&!inQ){cols.push(cur.trim());cur="";continue;}
        cur+=c;
      }
      cols.push(cur.trim());
      const get=(k)=>{ const idx=header.indexOf(k); return idx>=0?(cols[idx]||"").trim():""; };

      const type    = get("type")||"multiple_choice";
      const question= get("question");
      const correct = get("correct")||get("correctanswer")||get("answer");
      const grade   = parseInt(get("grade"))||1;
      const subject = get("subject")||"Math";
      const xp      = parseInt(get("xp"))||50;
      const expl    = get("explanation")||"";

      // Skip unsupported types and missing required fields
      if(!question) return;
      if(!correct && type!=="sorting" && type!=="drag_drop") return;
      if(!["multiple_choice","true_false","fill_blank","word_bank","sorting","drag_drop"].includes(type)) return;

      let qOptions = [];
      let qCorrect = correct;

      if(type==="multiple_choice"||type==="word_bank"){
        qOptions = ["optiona","optionb","optionc","optiond"].map(k=>get(k)).filter(Boolean);
        if(qOptions.length < 2) return;
        // Ensure correct matches an option
        if(!qOptions.includes(correct)){
          const m = qOptions.find(o=>o.toLowerCase()===correct.toLowerCase());
          if(m) qCorrect = m; else return;
        }
      } else if(type==="true_false"){
        qOptions = ["True","False"];
        const norm = correct.charAt(0).toUpperCase()+correct.slice(1).toLowerCase();
        if(!["True","False"].includes(norm)) return;
        qCorrect = norm;
      } else if(type==="fill_blank"){
        // 2 options only
        qOptions = [get("optiona"),get("optionb")].filter(Boolean);
      }

      // Use index for unique ID to avoid timestamp collisions
      questions.push({
        id: `qb_${i}_${Math.random().toString(36).slice(2,7)}`,
        type, question, correctAnswer:qCorrect,
        explanation:expl, grade, subject, xpReward:xp,
        options:qOptions, icon:"📝",
      });
    });
    return questions;
  };

  const uploadQuestions = async (questions, mode="replace") => {
    setUploading(true); setError(""); setSuccess("");
    try {
      let final = questions;
      if(mode==="add"){
        setProgress("Loading existing bank...");
        try {
          const existing = await getAllBankQuestions();
          final = [...existing, ...questions];
          setProgress(`Merging ${existing.length} existing + ${questions.length} new...`);
        } catch(e) {
          console.warn("Could not load existing:", e);
          final = questions;
        }
      }
      setProgress(`Saving ${final.length} questions...`);
      await saveQuestionBank(final);
      setProgress("");
      setSuccess(mode==="add"
        ? `✅ Added ${questions.length} questions! Bank now has ${final.length} total.`
        : `✅ ${final.length} questions saved to bank!`);
      await loadMeta();
      setActiveTab("status");
    } catch(e){ setError("Upload failed: "+e.message); }
    setUploading(false);
  };

  const TABS = [
    {id:"status", label:"📊 Bank Status"},
    {id:"upload", label:"⬆️ Upload to Bank"},
  ];

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,marginBottom:4}}>🎲 Question Bank</h1>
        <p style={{color:G.muted,fontSize:13}}>Manage your master question bank — upload CSV files or Google Sheets, then pick randomly when building content.</p>
      </div>

      {/* Tab bar */}
      <div style={{display:"flex",gap:2,borderBottom:`1px solid ${G.border}`,marginBottom:24}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{padding:"10px 18px",border:"none",background:"transparent",
              color:activeTab===t.id?G.accent:G.muted,
              fontWeight:activeTab===t.id?700:500,fontSize:13,cursor:"pointer",
              borderBottom:activeTab===t.id?`2px solid ${G.accent}`:"2px solid transparent",
              fontFamily:G.font}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Status tab */}
      {activeTab==="status"&&(
        <div>
          {loading?(
            <div style={{textAlign:"center",padding:60,color:G.muted}}>Loading bank status...</div>
          ):meta?(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:24}}>
                <div style={{background:G.white,borderRadius:14,padding:20,textAlign:"center",borderTop:`4px solid ${G.accent}`,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                  <div style={{fontSize:36,fontWeight:900,color:G.accent}}>{meta.totalQuestions?.toLocaleString()}</div>
                  <div style={{fontSize:13,color:G.muted,fontWeight:600}}>Total Questions</div>
                </div>
                <div style={{background:G.white,borderRadius:14,padding:20,textAlign:"center",borderTop:`4px solid ${G.green}`,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                  <div style={{fontSize:36,fontWeight:900,color:G.green}}>{meta.totalChunks}</div>
                  <div style={{fontSize:13,color:G.muted,fontWeight:600}}>Storage Chunks</div>
                </div>
                <div style={{background:G.white,borderRadius:14,padding:20,textAlign:"center",borderTop:`4px solid ${G.blue}`,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                  <div style={{fontSize:36,fontWeight:900,color:G.blue}}>{meta.updatedAt?.toDate?.()?.toLocaleDateString()||"—"}</div>
                  <div style={{fontSize:13,color:G.muted,fontWeight:600}}>Last Updated</div>
                </div>
              </div>
              <div style={{display:"flex",gap:12}}>
                <button onClick={()=>setActiveTab("upload")}
                  style={{padding:"10px 24px",borderRadius:10,border:`1.5px solid ${G.accent}`,background:G.accentLight,color:G.accent,fontWeight:700,fontSize:13,cursor:"pointer"}}>
                  ⬆️ Upload More Questions
                </button>
              </div>
            </div>
          ):(
            <div style={{textAlign:"center",padding:60}}>
              <div style={{fontSize:52,marginBottom:12}}>📭</div>
              <div style={{fontWeight:700,fontSize:16,color:G.text,marginBottom:8}}>No question bank yet</div>
              <div style={{fontSize:13,color:G.muted,marginBottom:20}}>Upload CSV files or Google Sheets to build your question bank.</div>
              <button onClick={()=>setActiveTab("upload")}
                style={{padding:"10px 24px",borderRadius:10,border:"none",background:G.accent,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                ⬆️ Upload Question Bank
              </button>
            </div>
          )}
          {success&&<div style={{marginTop:16,padding:"10px 14px",background:G.greenLight,borderRadius:10,fontSize:13,color:G.green,fontWeight:600}}>{success}</div>}
        </div>
      )}

      {/* Upload tab */}
      {activeTab==="upload"&&(
        <div style={{maxWidth:680}}>
          <BankBuilder
            parseCSV={parseCSVForBank}
            uploading={uploading}
            progress={progress}
            error={error}
            success={success}
            onUpload={uploadQuestions}
            onSheetsAdd={handleSheetsAdd}
          />
        </div>
      )}
    </div>
  );
};

const Dashboard=({onNavigate})=>{
  const [stats,setStats]=useState([
    {label:"Total Content", value:"...", sub:"loading",    icon:"📦",color:G.accent},
    {label:"Total Users",   value:"...", sub:"loading",    icon:"👥",color:G.blue},
    {label:"Total XP",      value:"...", sub:"all users",  icon:"⚡",color:G.amber},
    {label:"Worksheets Done",value:"...",sub:"all time",   icon:"📊",color:G.green},
  ]);
  const [typeStats,setTypeStats]=useState(Object.values(CONTENT_TYPES).map(ct=>({...ct,count:0,pub:0})));
  const [recentContent,setRecentContent]=useState(MOCK_CONTENT.slice(0,5));
  const [topUsers,setTopUsers]=useState(MOCK_USERS.slice(0,5));
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    loadDashboard();
  },[]);

  const loadDashboard = async () => {
    try {
      // Load content
      const content = await getContent();
      const typeCounts = Object.values(CONTENT_TYPES).map(ct=>({
        ...ct,
        count: content.filter(c=>c.type===ct.id).length,
        pub:   content.filter(c=>c.type===ct.id&&c.published).length,
      }));
      setTypeStats(typeCounts);
      setRecentContent(content.slice(0,5));

      // Load users
      const users = await getUsers();
      const totalXP = users.reduce((sum,u)=>sum+(u.xp||0),0);
      setTopUsers([...users].sort((a,b)=>(b.xp||0)-(a.xp||0)).slice(0,5));

      // Load progress
      const progSnap = await getDocs(collection(db,"progress"));
      const progCount = progSnap.size;

      setStats([
        {label:"Total Content",  value:String(content.length), sub:`${content.filter(c=>c.published).length} published`, icon:"📦",color:G.accent},
        {label:"Total Users",    value:String(users.length),   sub:`${users.filter(u=>u.lastActive&&new Date(u.lastActive?.seconds?u.lastActive.seconds*1000:u.lastActive)>new Date(Date.now()-86400000)).length} active today`, icon:"👥",color:G.blue},
        {label:"Total XP Earned",value:String(totalXP),        sub:"by all users",   icon:"⚡",color:G.amber},
        {label:"Worksheets Done",value:String(progCount),      sub:"all time",       icon:"📊",color:G.green},
      ]);
    } catch(e){
      console.warn("Dashboard load error:",e);
    }
    setLoading(false);
  };

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,marginBottom:4}}>Dashboard</h1>
          <p style={{color:G.muted,fontSize:13}}>Welcome back — here's your Foxling overview</p>
        </div>
        {loading&&<span style={{fontSize:12,color:G.muted}}>Loading live data...</span>}
        {!loading&&<button onClick={loadDashboard} style={{background:G.light,border:`1px solid ${G.border}`,borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",color:G.muted}}>↻ Refresh</button>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {stats.map((s,i)=>(
          <Card key={i} style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:10,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5}}>{s.label}</span>
              <span style={{fontSize:18}}>{s.icon}</span>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:s.color,marginBottom:2}}>{s.value}</div>
            <div style={{fontSize:11,color:G.muted}}>{s.sub}</div>
          </Card>
        ))}
      </div>
      <div style={{marginBottom:20}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:12}}>Content by Type</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          {typeStats.map(ct=>(
            <button key={ct.id} onClick={()=>onNavigate("content")}
              style={{background:G.white,border:`1px solid ${G.border}`,borderRadius:12,padding:16,cursor:"pointer",textAlign:"left",transition:"border-color 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=ct.color}
              onMouseLeave={e=>e.currentTarget.style.borderColor=G.border}>
              <div style={{fontSize:32,marginBottom:8}}>{ct.icon}</div>
              <div style={{fontWeight:600,fontSize:14,marginBottom:2}}>{ct.label}</div>
              <div style={{fontSize:13,color:ct.color,fontWeight:600,marginBottom:2}}>{ct.count} total</div>
              <div style={{fontSize:11,color:G.muted}}>{ct.pub} published</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>
        <Card>
          <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>Recent Content</div>
          {recentContent.map((item,i)=>{
            const ct=CONTENT_TYPES[item.type];
            return(
              <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,paddingBottom:i<4?12:0,marginBottom:i<4?12:0,borderBottom:i<4?`1px solid ${G.border}`:"none"}}>
                <span style={{fontSize:26}}>{item.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:500,fontSize:13}}>{item.title}</div>
                  <div style={{fontSize:11,color:G.muted}}>{item.subject} · G{item.grade} · {ct?.icon} {ct?.label}</div>
                </div>
                <Bdg color={item.published?"green":"grey"}>{item.published?"Live":"Draft"}</Bdg>
              </div>
            );
          })}
        </Card>
        <Card>
          <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>Top Learners</div>
          {topUsers.map((u,i)=>(
            <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,paddingBottom:i<4?10:0,marginBottom:i<4?10:0,borderBottom:i<4?`1px solid ${G.border}`:"none"}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:G.accentLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:G.accent,flexShrink:0}}>{u.name.charAt(0)}</div>
              <div style={{flex:1}}><div style={{fontWeight:500,fontSize:12}}>{u.name}</div><div style={{fontSize:11,color:G.muted}}>G{u.grade} · 🔥{u.streak}</div></div>
              <span style={{fontSize:12,fontWeight:600,color:G.accent}}>⚡{u.xp}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

// ── USERS ─────────────────────────────────────────────────
const Users=()=>{
  const [search,  setSearch]  = useState("");
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    getUsers()
      .then(data=>{ setUsers(data); setLoading(false); })
      .catch(()=>setLoading(false));
  },[]);

  const filtered = users.filter(u=>
    (u.name||"").toLowerCase().includes(search.toLowerCase()) ||
    (u.email||"").toLowerCase().includes(search.toLowerCase())
  );
  return(
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,marginBottom:4}}>Users</h1>
        <p style={{color:G.muted,fontSize:13}}>{loading?"Loading...":users.length+" registered learners"}</p>
      </div>
      {loading&&<div style={{textAlign:"center",padding:24,color:G.muted,fontSize:13}}>Loading users from Firestore...</div>}
      {!loading&&<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search users..."
        style={{border:`1px solid ${G.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none",width:240,marginBottom:14}}/>}
      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{borderBottom:`1px solid ${G.border}`,background:G.bg}}>
              {["User","Grade","XP","Streak","Badges","Last Active"].map(h=>(
                <th key={h} style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u,i)=>(
              <tr key={u.id} style={{borderBottom:i<filtered.length-1?`1px solid ${G.border}`:"none"}}
                onMouseEnter={e=>e.currentTarget.style.background=G.bg}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{padding:"13px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:34,height:34,borderRadius:"50%",background:G.accentLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:G.accent}}>{u.name.charAt(0)}</div>
                    <div><div style={{fontWeight:500,fontSize:13}}>{u.name}</div><div style={{fontSize:11,color:G.muted}}>{u.email}</div></div>
                  </div>
                </td>
                <td style={{padding:"13px 16px",color:G.muted,fontSize:13}}>Grade {u.grade||"?"}</td>
                <td style={{padding:"13px 16px"}}><span style={{fontWeight:600,fontSize:13,color:G.accent}}>⚡ {u.xp||0}</span></td>
                <td style={{padding:"13px 16px",color:G.muted,fontSize:13}}>🔥 {u.streak||0} days</td>
                <td style={{padding:"13px 16px",color:G.muted,fontSize:13}}>🏅 {(u.badges||[]).length}</td>
                <td style={{padding:"13px 16px"}}><Bdg color="grey">{u.lastActive?"Active":"Never"}</Bdg></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ── ROOT ───────────────────────────────────────────────────
export default function FoxlingAdmin(){
  const [page,setPage]=useState("dashboard");
  const [builderOpen,setBuilderOpen]=useState(false);
  const [builderType,setBuilderType]=useState("worksheet");
  const [editItem,setEditItem]=useState(null);
  const [toast,setToast]=useState(null);
  const [refreshKey,setRefreshKey]=useState(0);
  const [loggedIn,    setLoggedIn]    = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginErr,    setLoginErr]    = useState("");

  // Listen for Firebase Auth state — persists across page reloads
  useEffect(()=>{
    const unsub = onAuth((user)=>{
      setLoggedIn(!!user);
      setAuthLoading(false);
    });
    return unsub;
  },[]);

  const login=async()=>{
    setLoginErr("");
    try {
      await loginWithGoogle();
      // onAuth listener will set loggedIn automatically
    } catch(e) {
      setLoginErr("Google sign-in failed: "+e.message);
    }
  };

  // Show loading while checking auth state
  if(authLoading) return (
    <div style={{minHeight:"100vh",background:G.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:G.font}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:12}}>🦊</div>
        <div style={{color:G.muted,fontSize:13}}>Loading...</div>
      </div>
    </div>
  );

  if(!loggedIn)return(
    <div style={{minHeight:"100vh",background:G.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:G.font}}>
      <style>{css}</style>
      <div className="fu" style={{width:380}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:52,marginBottom:8}}>🦊</div>
          <div style={{fontSize:24,fontWeight:700,marginBottom:4}}>Foxling Admin</div>
          <div style={{color:G.muted,fontSize:13}}>Content management panel</div>
        </div>
        <Card>
          <div style={{display:"flex",flexDirection:"column",gap:14,alignItems:"center"}}>
            <div style={{fontSize:13,color:G.muted,textAlign:"center",lineHeight:1.6}}>
              Sign in with your Google account to access the admin panel.
            </div>
            {loginErr&&<div style={{fontSize:12,color:G.danger,background:G.dangerLight,borderRadius:8,padding:"8px 12px",width:"100%"}}>{loginErr}</div>}
            <button onClick={login}
              style={{display:"flex",alignItems:"center",gap:12,padding:"12px 24px",borderRadius:10,border:`1px solid ${G.border}`,background:G.white,cursor:"pointer",fontSize:15,fontWeight:500,width:"100%",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",transition:"all 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.12)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.08)"}>
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.7 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
                <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.7 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8L6 33.3C9.5 39.7 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.2 5.2C41.1 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-3.9z"/>
              </svg>
              Sign in with Google
            </button>
            <div style={{fontSize:11,color:G.muted,textAlign:"center"}}>
              Only authorized Google accounts can access this panel
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const nav=[
    {id:"dashboard",   label:"Dashboard",       icon:"▦"},
    {id:"content",     label:"Content Library",  icon:"📦"},
    {id:"questionbank",label:"Question Bank",     icon:"🎲"},
    {id:"users",       label:"Users",             icon:"👥"},
  ];

  return(
    <div style={{display:"flex",minHeight:"100vh",fontFamily:G.font}}>
      <style>{css}</style>
      <div style={{width:216,background:G.white,borderRight:`1px solid ${G.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"18px 16px",borderBottom:`1px solid ${G.border}`,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:28}}>🦊</span>
          <div><div style={{fontWeight:700,fontSize:14}}>Foxling</div><div style={{fontSize:11,color:G.muted}}>Admin Panel</div></div>
        </div>
        <nav style={{padding:"10px 8px",flex:1}}>
          {nav.map(item=>(
            <button key={item.id} onClick={()=>setPage(item.id)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:8,border:"none",background:page===item.id?G.accentLight:"transparent",color:page===item.id?G.accent:G.text,fontSize:13,fontWeight:page===item.id?600:400,cursor:"pointer",marginBottom:2,textAlign:"left"}}>
              <span style={{fontSize:16}}>{item.icon}</span>{item.label}
            </button>
          ))}
          <div style={{marginTop:20,padding:"0 4px"}}>
            <div style={{fontSize:10,fontWeight:600,color:G.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:8,padding:"0 6px"}}>Quick Create</div>
            {Object.values(CONTENT_TYPES).map(ct=>(
              <button key={ct.id} onClick={()=>{setBuilderType(ct.id);setEditItem(null);setBuilderOpen(true);setPage("content");}}
                style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,border:"none",background:"transparent",color:G.muted,fontSize:12,cursor:"pointer",marginBottom:2,textAlign:"left"}}
                onMouseEnter={e=>{e.currentTarget.style.background=ct.colorLight;e.currentTarget.style.color=ct.color;}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=G.muted;}}>
                <span>{ct.icon}</span>{ct.label}
              </button>
            ))}
          </div>
        </nav>
        <div style={{padding:"12px 16px",borderTop:`1px solid ${G.border}`}}>
          <button onClick={async()=>{await logoutAdmin();}} style={{fontSize:12,color:G.muted,background:"none",border:"none",cursor:"pointer"}}>← Sign out</button>
        </div>
      </div>

      <div style={{flex:1,overflow:"auto"}}>
        <div style={{padding:28,maxWidth:1100,margin:"0 auto"}}>
          {page==="dashboard"   &&<Dashboard onNavigate={setPage}/>}
          {page==="content"     &&<ContentList onNew={type=>{setBuilderType(type);setEditItem(null);setBuilderOpen(true);}} onEdit={async(item)=>{
              setBuilderType(item.type);
              setEditItem(item);
              setBuilderOpen(true);
              try {
                const full = await getContentById(item.id);
                if(full) setEditItem(full);
              } catch(e){ console.warn("Could not fetch full item",e); }
            }}/>}
          {page==="questionbank"&&<QuestionBankPage/>}
          {page==="users"       &&<Users/>}
        </div>
      </div>

      <Mdl open={builderOpen} onClose={()=>setBuilderOpen(false)} title={editItem?`Edit: ${editItem.title}`:`New ${CONTENT_TYPES[builderType]?.label}`} width={820} disableBackdropClose={true}>
        <Builder contentType={builderType} initial={editItem}
          onSave={item=>{setBuilderOpen(false);setRefreshKey(k=>k+1);setToast({message:item.published?"Published successfully!":"Saved as draft",type:"success"});}}
          onCancel={()=>setBuilderOpen(false)}/>
      </Mdl>

      {toast&&<Tst message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}
