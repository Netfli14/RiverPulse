"use client";

import {useRef,useState,type ReactNode} from "react";
import {motion,useReducedMotion,useScroll,useTransform} from "framer-motion";
import {RotateCcw} from "lucide-react";

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
    <div className="rp-art-heading"><span>RIVERPULSE</span><span>{label}</span></div>
    <div className="rp-art-footer"><span>WATER. LIFE. CONNECTION.</span><button type="button" className="rp-art-replay" aria-label={replayLabel} onClick={()=>setIteration(i=>i+1)}><RotateCcw size={17}/></button></div>
  </div>;
}
