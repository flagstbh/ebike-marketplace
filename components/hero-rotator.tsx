"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const SCENES = [
  {
    video: "/hero-loop-a.mp4",
    poster: "/hero-a.jpg",
    alt: "Mud-covered electric dirt bike on a stand in a home garage at night",
    caption: "Week one on a scene bike: everything comes off",
  },
  {
    video: "/hero-loop-b.mp4",
    poster: "/hero-b.jpg",
    alt: "Takeoff brake set, controller, and saddle tagged with part numbers on a workbench",
    caption: "Tagged, weighed, quoted",
  },
  {
    video: "/hero-loop-c.mp4",
    poster: "/hero-c.jpg",
    alt: "Warehouse aisle of graded used e-bike parts in labeled bins",
    caption: "The used board, before it hits the site",
  },
];

const HOLD_MS = 12000;
const FADE_MS = 1200;

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

export default function HeroRotator() {
  const [idx, setIdx] = useState(0);
  const reduced = useReducedMotion();
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % SCENES.length);
    }, HOLD_MS);
    return () => clearInterval(timer);
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === idx) {
        v.play().catch(() => {});
      } else {
        // Let the outgoing clip keep playing through the crossfade.
        setTimeout(() => {
          if (i !== idx) v.pause();
        }, FADE_MS);
      }
    });
  }, [idx, reduced]);

  if (reduced) {
    const s = SCENES[0];
    return (
      <>
        <Image
          src={s.poster}
          alt={s.alt}
          fill
          priority
          sizes="42vw"
          className="object-cover opacity-90"
        />
        <div className="label-mono absolute bottom-0 left-0 bg-paper px-3 py-2 text-ink">
          {s.caption}
        </div>
      </>
    );
  }

  return (
    <>
      <Image
        src={SCENES[0].poster}
        alt={SCENES[0].alt}
        fill
        priority
        sizes="42vw"
        className="object-cover opacity-90"
      />
      {SCENES.map((s, i) => (
        <video
          key={s.video}
          ref={(el) => {
            videoRefs.current[i] = el;
          }}
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity ease-in-out"
          style={{
            transitionDuration: `${FADE_MS}ms`,
            opacity: i === idx ? 0.9 : 0,
          }}
          autoPlay={i === 0}
          muted
          loop
          playsInline
          poster={s.poster}
          preload={i === 0 ? "auto" : "metadata"}
          aria-hidden="true"
        >
          <source src={s.video} type="video/mp4" />
        </video>
      ))}
      <div className="label-mono absolute bottom-0 left-0 z-10 bg-paper px-3 py-2 text-ink">
        {SCENES[idx].caption}
      </div>
    </>
  );
}
