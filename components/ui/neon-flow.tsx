"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type TubesApp = {
  tubes?: { setColors?: (colors: string[]) => void; setLightsColors?: (colors: string[]) => void };
  destroy?: () => void;
};

interface TubesBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  enableClickInteraction?: boolean;
}

const randomColors = (count: number) => Array.from({ length: count }, () =>
  `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`,
);

export function TubesBackground({ children, className, enableClickInteraction = true }: TubesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tubesRef = useRef<TubesApp | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)");
    const update = () => setEnabled(!media.matches && window.innerWidth >= 821);
    update();
    media.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => { media.removeEventListener("change", update); window.removeEventListener("resize", update); };
  }, []);

  useEffect(() => {
    if (!enabled || !canvasRef.current) return;
    let mounted = true;
    const importer = new Function("url", "return import(url)") as (url: string) => Promise<{ default: (canvas: HTMLCanvasElement, options: unknown) => TubesApp }>;
    void importer("https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js")
      .then(({ default: TubesCursor }) => {
        if (!mounted || !canvasRef.current) return;
        tubesRef.current = TubesCursor(canvasRef.current, {
          tubes: {
            colors: ["#34d399", "#38bdf8", "#22c55e"],
            lights: { intensity: 72, colors: ["#34d399", "#0ea5e9", "#22c55e", "#67e8f9"] },
          },
        });
        setIsLoaded(true);
      })
      .catch(() => setIsLoaded(false));
    return () => { mounted = false; tubesRef.current?.destroy?.(); tubesRef.current = null; };
  }, [enabled]);

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!enableClickInteraction || !tubesRef.current || (event.target as HTMLElement).closest("a,button,input")) return;
    tubesRef.current.tubes?.setColors?.(randomColors(3));
    tubesRef.current.tubes?.setLightsColors?.(randomColors(4));
  }

  return <div className={cn("rp-neon-flow", className)} onClick={handleClick}>
    {enabled && <canvas ref={canvasRef} className="rp-neon-canvas" aria-hidden="true"/>}
    <AnimatePresence>{isLoaded && <motion.div className="rp-neon-shade" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.25}}/>}</AnimatePresence>
    <div className="rp-neon-content">{children}</div>
  </div>;
}

export default TubesBackground;
