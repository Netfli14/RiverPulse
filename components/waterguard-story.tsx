"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll, useTransform,
} from "framer-motion";
import { ArrowDown, ArrowRight, Camera, Check, Gauge, MessagesSquare, RadioTower, Trash2 } from "lucide-react";
import { riverEase, useDesktopMotion } from "@/components/river-motion";
import { copy } from "@/components/portal";
import type { Language } from "@/lib/riverpulse-i18n";

/** Scroll values stay outside React; only crossing a story boundary changes state. */
export function RiverPassage({ language }: { language: Language }) {
  const ref = useRef<HTMLDivElement>(null);
  const desktop = useDesktopMotion();
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], [42, -42]);
  const line = useTransform(scrollYProgress, [0, .8], [0, 1]);
  const words = copy(language, "Наблюдать. Измерять. Действовать.", "Бақылау. Өлшеу. Әрекет ету.", "Observe. Measure. Act.");

  return <div ref={ref} className="wg-river-passage">
    <svg viewBox="0 0 1440 170" preserveAspectRatio="none" aria-hidden="true">
      {[0, 1, 2, 3, 4].map(i => <path key={i} d={`M-70 ${22 + i * 23} C300 ${160 + i * 14},470 ${-50 + i * 18},760 ${65 + i * 16} S1150 ${210 - i * 5},1510 ${48 + i * 19}`} />)}
      <motion.path className="wg-passage-current" d="M-70 68 C300 188,470 -14,760 97 S1150 200,1510 86" style={{ pathLength: reduce ? 1 : line }} />
    </svg>
    <div className="shell"><motion.p style={{ x: desktop ? x : 0 }}>{words}</motion.p></div>
  </div>;
}

export function MotionHeading({ children, id, className = "" }: { children: string; id: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const visible = useInView(ref, { once: true, amount: .3 });
  const reduce = useReducedMotion();
  return <h2 ref={ref} id={id} className={`wg-motion-heading ${className}`} aria-label={children.replace(/\n/g, " ")}>
    {children.split("\n").map((line, i) => <span className="wg-heading-mask" key={line}>
      <motion.span aria-hidden="true" initial={reduce ? false : { y: "105%", rotate: 2 }} animate={visible || reduce ? { y: "0%", rotate: 0 } : { y: "105%", rotate: 2 }} transition={{ duration: reduce ? 0 : .7, delay: reduce ? 0 : i * .09, ease: riverEase }}>{line}</motion.span>
    </span>)}
  </h2>;
}

export function MotionBlock({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return <motion.div className={className} initial={reduce ? false : { y: 32 }} whileInView={{ y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: reduce ? 0 : .65, delay: reduce ? 0 : delay, ease: riverEase }}>{children}</motion.div>;
}

function SignalDrawing({ active, reduce }: { active: number; reduce: boolean }) {
  const duration = reduce ? 0 : 1.1;
  return <svg className="wg-signal-drawing" viewBox="0 0 480 150" fill="none" aria-hidden="true">
    <path className="wg-signal-baseline" d="M18 75H462" />
    {active === 0 && <>
      <motion.path d="M74 112V38H152M328 38H406V112" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration, ease: riverEase }} />
      <motion.g initial={reduce ? false : { x: -70, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration, ease: riverEase }}><path d="M196 53H276V100H196Z M276 64L301 52V102L276 89" /></motion.g>
      <motion.path className="wg-signal-accent" d="M170 28V122M310 28V122" initial={reduce ? false : { opacity: 0, x: -28 }} animate={{ opacity: [0, 1, .5], x: 0 }} transition={{ duration }} />
    </>}
    {active === 1 && <>
      <motion.path d="M18 75H86L100 75L113 58L128 94L145 38L164 114L182 64L196 75H246L261 75L277 55L291 97L308 42L326 111L343 64L360 75H462" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration, ease: "easeInOut" }} />
      {[104, 240, 376].map((cx, i) => <motion.circle className="wg-signal-accent" key={cx} cx={cx} cy="75" r="7" initial={reduce ? false : { scale: .7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: reduce ? 0 : .35, delay: reduce ? 0 : .2 + i * .2 }} />)}
    </>}
    {active === 2 && <>
      <path d="M98 110L156 42H340L398 110Z M119 105H377 M156 42L179 110 M340 42L317 110" />
      {[0, 1, 2, 3].map(i => <motion.path key={i} className="wg-signal-accent" d={`M${184 + i * 32} 82l12 -15l11 15l-11 15Z`} initial={reduce ? false : { y: 25, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: reduce ? 0 : .6, delay: reduce ? 0 : i * .1, ease: riverEase }} />)}
      <motion.path d="M126 127H368" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration }} />
    </>}
    {active === 3 && <>
      <motion.path d="M95 75H385" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration, ease: riverEase }} />
      {[95, 240, 385].map((cx, i) => <motion.g key={cx} initial={reduce ? false : { opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : .4, delay: reduce ? 0 : i * .2 }}><circle cx={cx} cy="75" r="27" className="wg-signal-node" /><path className="wg-signal-accent" d={`M${cx - 10} 75l7 7l14 -15`} /></motion.g>)}
    </>}
  </svg>;
}

function StoryVisual({ active, language }: { active: number; language: Language }) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = useInView(ref, { once: true, amount: .2 });
  const reduce = !!useReducedMotion();
  const alt = active === 1
    ? copy(language, "Прототип станции Water Guard с солнечной панелью", "Күн панелі бар Water Guard станциясының прототипі", "Water Guard station prototype with its solar panel")
    : copy(language, "Прототип робота RiverCleaner RC-01", "RiverCleaner RC-01 робот прототипі", "RiverCleaner RC-01 robot prototype");
  const labels = [
    copy(language, "Камера замечает мусор", "Камера қоқысты байқайды", "Camera spots floating litter"),
    copy(language, "Датчики измеряют воду", "Датчиктер суды өлшейді", "Sensors measure the water"),
    copy(language, "Конвейер собирает отходы", "Конвейер қалдықтарды жинайды", "Conveyor collects the waste"),
    copy(language, "Наблюдения становятся действием", "Бақылау әрекетке айналады", "Observations lead to action"),
  ];
  return <div ref={ref} className="wg-story-visual" data-phase={active}>
    <div className="wg-story-river" aria-hidden="true"><img src="/assets/ishim-field-test.jpg" width={520} height={368} loading="lazy" alt="" /></div>
    <div className="wg-story-photo-caption">{copy(language, "Ишим, Астана", "Есіл, Астана", "Ishim, Astana")}</div>
    <AnimatePresence initial={false} mode="sync">
      <motion.div key={active === 1 ? "station" : "robot"} className={`wg-story-hardware ${active === 1 ? "is-station" : "is-robot"}`}
        initial={reduce ? false : { opacity: 0, y: 36, rotate: -5, scale: .94 }}
        animate={{ opacity: 1, y: 0, rotate: active === 2 ? -4 : 0, scale: 1 }}
        exit={{ opacity: 0, y: reduce ? 0 : -18, transition: { duration: reduce ? 0 : .2 } }}
        transition={{ duration: reduce ? 0 : .65, ease: riverEase }}>
        <img src={active === 1 ? "/assets/station-prototype.webp" : "/assets/rivercleaner-prototype.webp"} width={active === 1 ? 780 : 960} height={active === 1 ? 855 : 720} loading="lazy" alt={alt} />
      </motion.div>
    </AnimatePresence>
    <div className="wg-story-signal">
      <span className="wg-story-schematic">{copy(language, "Схема работы", "Жұмыс сызбасы", "How it works")}</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={active} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : .16 }}>
          <div className="wg-story-graphic">{(ready || reduce) && <SignalDrawing active={active} reduce={reduce} />}</div>
          <p>{labels[active]}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  </div>;
}

export function SystemStory({ language }: { language: Language }) {
  const ref = useRef<HTMLDivElement>(null);
  const steps = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const desktop = useDesktopMotion();
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start center", "end center"] });
  const progress = useTransform(scrollYProgress, [0, 1], [0, 1]);
  useMotionValueEvent(scrollYProgress, "change", value => {
    if (desktop) {
      const next = Math.min(3, Math.max(0, Math.floor(value * 4)));
      if (activeRef.current !== next) {
        activeRef.current = next;
        setActive(next);
      }
    }
  });

  const content = [
    { icon: Camera, title: copy(language, "Заметить то, что пропускает взгляд.", "Көзге түспегенді байқау.", "See what a glance can miss."), label: copy(language, "Наблюдение", "Бақылау", "Observe"), text: copy(language, "Камера помогает команде обнаруживать плавающий мусор. Наблюдение за рекой становится первым шагом к её очистке.", "Камера командаға қалқымалы қоқысты анықтауға көмектеседі. Өзенді бақылау оны тазалаудың алғашқы қадамына айналады.", "The camera helps the team spot floating litter. Watching the river is the first step towards cleaning it.") },
    { icon: Gauge, title: copy(language, "Понять, что происходит с водой.", "Суда не болып жатқанын түсіну.", "Understand what is in the water."), label: copy(language, "Измерение", "Өлшеу", "Measure"), text: copy(language, "Датчики передают температуру, pH и другие параметры на платформу. Полученные измерения помогают оценить состояние воды.", "Датчиктер температураны, pH және басқа параметрлерді платформаға жібереді. Өлшемдер судың жағдайын бағалауға көмектеседі.", "Sensors send temperature, pH and other parameters to the platform. Received measurements help the team assess the water.") },
    { icon: Trash2, title: copy(language, "Убрать мусор с поверхности.", "Су бетіндегі қоқысты жинау.", "Take litter out of the river."), label: copy(language, "Сбор мусора", "Қоқыс жинау", "Collect"), text: copy(language, "RiverCleaner RC-01 собирает плавающие отходы с помощью транспортёра. Оператор следит за роботом и управляет его работой.", "RiverCleaner RC-01 конвейермен қалқымалы қалдықтарды жинайды. Оператор роботты бақылап, оның жұмысын басқарады.", "RiverCleaner RC-01 uses its conveyor to collect floating waste. An operator follows the robot and controls its work.") },
    { icon: MessagesSquare, title: copy(language, "Дать наблюдениям продолжение.", "Бақылауды әрекетке айналдыру.", "Turn observations into action."), label: copy(language, "Действие", "Әрекет", "Act"), text: copy(language, "Платформа объединяет измерения, камеру и обращения жителей. Команда получает контекст, чтобы заметить проблему и отреагировать.", "Платформа өлшемдерді, камераны және тұрғындардың өтініштерін біріктіреді. Команда мәселені байқап, әрекет етуге қажетті ақпарат алады.", "The platform brings measurements, camera views and community reports together, giving the team context to notice a problem and respond.") },
  ];
  function select(index: number) {
    activeRef.current = index;
    setActive(index);
    if (desktop) steps.current[index]?.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "center" });
  }

  return <div ref={ref} className="wg-story" data-scroll={desktop}>
    <div className="wg-story-stage">
      <div className="wg-story-controls" role="group" aria-label={copy(language, "Этапы работы Water Guard", "Water Guard жұмыс кезеңдері", "Water Guard stages")}>
        {content.map((step, i) => <button key={step.label} type="button" aria-pressed={active === i} aria-controls={`wg-story-step-${i}`} onClick={() => select(i)}><step.icon size={18} aria-hidden="true" /><span>{step.label}</span></button>)}
      </div>
      <StoryVisual active={active} language={language} />
      <div className="wg-story-stage-foot"><RadioTower size={16} aria-hidden="true" /><span>{copy(language, "Одна система, от воды до решения", "Судан шешімге дейінгі бір жүйе", "One system, from water to action")}</span><ArrowDown size={16} aria-hidden="true" /></div>
    </div>
    <div className="wg-story-steps">
      <div className="wg-story-rail" aria-hidden="true"><motion.span style={{ scaleY: desktop ? progress : (active + 1) / 4 }} /></div>
      {content.map((step, i) => <article key={step.label} id={`wg-story-step-${i}`} ref={node => { steps.current[i] = node; }} className="wg-story-step" data-active={active === i}>
        <span className="wg-story-step-mark" aria-hidden="true"><AnimatePresence mode="wait" initial={false}><motion.span key={active > i ? "complete" : "stage"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : .16 }}>{active > i ? <Check size={15} /> : <step.icon size={18} />}</motion.span></AnimatePresence></span>
        <div><span className="wg-story-step-label">{step.label}</span><h3>{step.title}</h3><p>{step.text}</p><span className="wg-story-step-arrow" aria-hidden="true"><ArrowRight size={24} /></span></div>
      </article>)}
    </div>
  </div>;
}
