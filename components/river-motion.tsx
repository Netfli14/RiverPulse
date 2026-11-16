"use client";

import {useRef,useState,useSyncExternalStore,type ReactNode,type PointerEvent,type KeyboardEvent} from "react";
import {motion,useMotionValue,useReducedMotion,useScroll,useSpring,useTransform} from "framer-motion";
import {Camera,Gauge,MessagesSquare,RotateCcw,Trash2} from "lucide-react";
import type {Language} from "@/lib/riverpulse-i18n";
import {copy} from "@/components/portal";

export const riverEase = [.16,1,.3,1] as const;

const desktopQuery="(min-width: 761px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
function subscribeDesktop(notify:()=>void) {
  const query=window.matchMedia(desktopQuery);
  query.addEventListener("change",notify);
  return ()=>query.removeEventListener("change",notify);
}
const readDesktop=()=>window.matchMedia(desktopQuery).matches;
const serverDesktop=()=>false;
export function useDesktopMotion() {
  return useSyncExternalStore(subscribeDesktop,readDesktop,serverDesktop);
}

export function PrototypeScene({language}:{language:Language}) {
  const reduce=useReducedMotion();
  const desktop=useDesktopMotion();
  const ref=useRef<HTMLElement>(null);
  const [iteration,setIteration]=useState(0);
  const x=useMotionValue(0),y=useMotionValue(0);
  const rotateX=useSpring(x,{stiffness:180,damping:28});
  const rotateY=useSpring(y,{stiffness:180,damping:28});
  const {scrollYProgress}=useScroll({target:ref,offset:["start start","end start"]});
  const foregroundY=useTransform(scrollYProgress,[0,1],[0,92]);
  const foregroundRotate=useTransform(scrollYProgress,[0,1],[0,-7]);
  const backgroundY=useTransform(scrollYProgress,[0,1],[0,-54]);
  const waterScale=useTransform(scrollYProgress,[0,1],[1,1.22]);
  const move=(event:PointerEvent<HTMLElement>)=>{
    if(!desktop||event.pointerType!=="mouse")return;
    const rect=event.currentTarget.getBoundingClientRect();
    x.set(-(event.clientY-rect.top-rect.height/2)/rect.height*5);
    y.set((event.clientX-rect.left-rect.width/2)/rect.width*5);
  };
  const reset=()=>{x.set(0);y.set(0)};
  return <figure ref={ref} className="wg-prototype-scene" onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>
    <div className="wg-prototype-backdrop" aria-hidden="true">
      <motion.svg viewBox="0 0 600 620" preserveAspectRatio="xMidYMid slice" style={{y:desktop?backgroundY:0}}>
        {Array.from({length:9},(_,i)=><path key={i} d={`M ${-190+i*26} 720 C ${530+i*14} 615,${-160+i*19} 338,${370+i*23} 215 S ${410+i*22} 30,${740+i*26} -90`} />)}
        <g key={iteration} className="wg-current-traces">
          {[0,1].map(i=><path key={i} d={`M ${-112+i*76} 720 C ${572+i*28} 615,${-103+i*38} 338,${439+i*40} 215 S ${476+i*44} 30,${818+i*52} -90`} />)}
        </g>
      </motion.svg>
      <motion.span className="wg-water-surface" style={{scale:desktop?waterScale:1}}>
        <svg viewBox="0 0 500 180" preserveAspectRatio="none">
          {[0,1,2,3].map(i=><ellipse key={i} cx="250" cy="90" rx={100+i*44} ry={28+i*14} />)}
        </svg>
      </motion.span>
    </div>
    <motion.div className="wg-prototype-object" style={{rotateX:desktop?rotateX:0,rotateY:desktop?rotateY:0,y:desktop?foregroundY:0}}>
      <motion.div style={{rotate:desktop?foregroundRotate:0}} className="wg-prototype-scroll-pose"><div key={iteration} className="wg-prototype-arrival">
      <img className="wg-prototype-robot" src="/assets/rivercleaner-prototype.webp" width={960} height={720} fetchPriority="high" alt={copy(language,"Реальный прототип RiverCleaner RC-01 с транспортёром для сбора мусора","Қоқыс жинайтын конвейері бар RiverCleaner RC-01 нақты прототипі","The RiverCleaner RC-01 prototype with its litter collection conveyor")}/>
      </div></motion.div>
    </motion.div>
    {!reduce&&<button className="wg-scene-replay" type="button" onClick={()=>{reset();setIteration(i=>i+1)}} aria-label={copy(language,"Повторить анимацию робота","Робот анимациясын қайталау","Replay the robot animation")} title={copy(language,"Повторить анимацию","Анимацияны қайталау","Replay animation")}><RotateCcw size={17} aria-hidden="true"/></button>}
    <figcaption className="wg-prototype-caption">
      <span><b>RiverCleaner</b><span>RC-01</span></span>
      <p>{copy(language,"Разработано и испытано командой","Команда әзірлеп, сынаған","Built and field-tested by the team")}</p>
    </figcaption>
  </figure>;
}

export function FieldPhotos({language}:{language:Language}) {
  const ref=useRef<HTMLDivElement>(null);
  const desktop=useDesktopMotion();
  const {scrollYProgress}=useScroll({target:ref,offset:["start end","end start"]});
  const riverY=useTransform(scrollYProgress,[0,1],[14,-14]);
  const stationY=useTransform(scrollYProgress,[0,1],[28,-28]);
  return <div ref={ref} className="wg-field-images">
    <motion.figure className="wg-river-photo" style={{y:desktop?riverY:0,rotate:-4}}>
      <img src="/assets/ishim-field-test.jpg" width={520} height={368} loading="lazy" alt={copy(language,"Река Ишим в Астане","Астанадағы Есіл өзені","The Ishim River in Astana")}/>
      <figcaption>{copy(language,"Ишим · Астана","Есіл · Астана","Ishim · Astana")}</figcaption>
    </motion.figure>
    <motion.figure className="wg-station-photo" style={{y:desktop?stationY:0,rotate:5}}>
      <img src="/assets/station-prototype.webp" width={780} height={855} loading="lazy" alt={copy(language,"Прототип станции Water Guard с солнечной панелью и ESP32","Күн панелі мен ESP32 бар Water Guard станциясының прототипі","The Water Guard station prototype with its solar panel and ESP32")}/>
      <figcaption>{copy(language,"Станция Water Guard","Water Guard станциясы","Water Guard station")}</figcaption>
    </motion.figure>
  </div>;
}

export function SystemFlow({language}:{language:Language}) {
  const [active,setActive]=useState(0);
  const reduce=useReducedMotion();
  const buttons=useRef<(HTMLButtonElement|null)[]>([]);
  const icons=[Camera,Gauge,Trash2,MessagesSquare];
  const labels=[copy(language,"Наблюдение","Бақылау","Observe"),copy(language,"Измерение","Өлшеу","Measure"),copy(language,"Сбор мусора","Қоқыс жинау","Collect"),copy(language,"Действие","Әрекет","Act")];
  const details=[
    copy(language,"Камера помогает заметить плавающий мусор.","Камера қалқымалы қоқысты байқауға көмектеседі.","The camera helps spot floating litter."),
    copy(language,"Датчики передают измерения.","Датчиктер өлшемдерді жібереді.","Sensors report measurements."),
    copy(language,"Робот собирает отходы.","Робот қалдықтарды жинайды.","The robot collects waste."),
    copy(language,"Платформа объединяет наблюдения и обращения жителей.","Платформа бақылаулар мен тұрғындардың өтініштерін біріктіреді.","The platform brings observations and community reports together."),
  ];
  function navigate(event:KeyboardEvent<HTMLButtonElement>,index:number) {
    let next=index;
    if(event.key==="ArrowRight")next=(index+1)%4;
    else if(event.key==="ArrowLeft")next=(index+3)%4;
    else if(event.key==="Home")next=0;
    else if(event.key==="End")next=3;
    else return;
    event.preventDefault();setActive(next);buttons.current[next]?.focus();
  }
  return <div className="wg-flow">
    <div className="wg-process" role="tablist" aria-label={copy(language,"Как работает Water Guard","Water Guard қалай жұмыс істейді","How Water Guard works")}>
      <div className="wg-process-track" aria-hidden="true"><motion.span initial={false} animate={{scaleX:active/3}} transition={{duration:reduce?0:.42,ease:riverEase}}/></div>
      {labels.map((label,i)=>{
        const Icon=icons[i];
        return <button key={i} ref={node=>{buttons.current[i]=node}} id={`wg-process-tab-${i}`} type="button" role="tab" aria-selected={active===i} aria-controls="wg-process-panel" tabIndex={active===i?0:-1} onClick={()=>setActive(i)} onKeyDown={event=>navigate(event,i)}>
          <span className="wg-process-icon"><Icon size={21} aria-hidden="true"/></span><span>{label}</span>
        </button>;
      })}
    </div>
    <div className="wg-flow-detail" role="tabpanel" id="wg-process-panel" aria-labelledby={`wg-process-tab-${active}`} aria-live="polite" tabIndex={0}>
      <motion.p key={`${active}-${language}`} initial={reduce?false:{opacity:.4,y:6}} animate={{opacity:1,y:0}} transition={{duration:reduce?0:.26,ease:riverEase}}>{details[active]}</motion.p>
    </div>
  </div>;
}

// Motion patterns adapted from AThevon/genjutsu: motion-principles and framer-motion.
export function Reveal({children,className="",delay=0}:{children:ReactNode;className?:string;delay?:number}) {
  const reduce=useReducedMotion();
  return <motion.div className={className} initial={reduce?false:{opacity:0,y:22}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.12}} transition={{duration:reduce?0:.48,delay:reduce?0:delay,ease:[.2,0,0,1]}}>{children}</motion.div>;
}

export function RiverScene({label,replayLabel}:{label:string;replayLabel:string}) {
  const reduce=useReducedMotion();
  const ref=useRef<HTMLDivElement>(null);
  const [iteration,setIteration]=useState(0);
  const {scrollYProgress}=useScroll({target:ref,offset:["start start","end start"]});
  const y=useTransform(scrollYProgress,[0,1],[0,48]);
  const river="M -74 643 C 151 622 41 455 220 426 C 421 393 121 268 322 206 C 497 152 422 37 675 -42";
  return <div ref={ref} className="rp-river-art">
    <motion.svg viewBox="0 0 620 640" aria-hidden="true" className="rp-river-landscape" style={{y:reduce?0:y}}>
      <rect width="620" height="640" fill="var(--sand)"/>
      <g fill="none" stroke="var(--forest)" strokeWidth=".8" opacity=".23">
        {Array.from({length:11},(_,i)=><path key={"a"+i} d={`M ${-180+i*15} -70 C ${-80+i*23} ${130+i*9},${190+i*8} ${-45+i*16},${110+i*12} ${125+i*16} S ${-100+i*18} ${200+i*12},${-60+i*12} ${315+i*9}`}/>)}
        {Array.from({length:10},(_,i)=><path key={"b"+i} d={`M ${640+i*17} ${259+i*9} C ${353+i*15} ${153+i*12},${317+i*11} ${505+i*9},${443+i*15} ${520+i*13} S ${523+i*17} ${609+i*9},${352+i*15} 730`}/>)}
      </g>
      <path d={river} fill="none" stroke="var(--milk)" strokeWidth="154"/>
      <path d={river} fill="none" stroke="var(--teal)" strokeWidth="133"/>
      <path d={river} fill="none" stroke="var(--milk)" strokeWidth="124" opacity=".1"/>
      <g key={iteration} fill="none" stroke="var(--milk)" strokeLinecap="round">
        {[-37,-18,0,18,37].map((offset,i)=><motion.path key={offset} d={river} transform={`translate(${offset} ${offset*.4})`} strokeWidth={i===2?1.8:.8} opacity={i===2?.8:.4} initial={reduce?false:{pathLength:0}} animate={{pathLength:1}} transition={{duration:reduce?0:2.2,delay:reduce?0:i*.1,ease:"easeInOut"}}/>)}
      </g>
      <g transform="translate(258 342)">
        <circle r="49" fill="var(--milk)" opacity=".25"/>
        <circle r="34" fill="var(--milk)"/>
        <path d="M-17 -7c8-11 14 11 22 0s14 11 22 0M-17 4c8-11 14 11 22 0s14 11 22 0" fill="none" stroke="var(--teal)" strokeWidth="3" transform="translate(-5 0)"/>
      </g>
    </motion.svg>
    <div className="rp-art-heading"><span>WATER GUARD</span><span>{label}</span></div>
    <div className="rp-art-footer"><span>WATER. LIFE. CONNECTION.</span><button type="button" className="rp-art-replay" aria-label={replayLabel} onClick={()=>setIteration(i=>i+1)}><RotateCcw size={17}/></button></div>
  </div>;
}
