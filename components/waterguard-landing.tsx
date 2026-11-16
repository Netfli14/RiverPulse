"use client";

import { type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, RadioTower, ShieldCheck, UserRound, Users } from "lucide-react";
import { AppLink as Link } from "@/components/app-link";
import { PrototypeScene } from "@/components/river-motion";
import { MotionBlock, MotionHeading, RiverPassage, SystemStory } from "@/components/waterguard-story";
import type { Language } from "@/lib/riverpulse-i18n";
import { copy, usePortal } from "@/components/portal";

export function WaterGuardLanding({ language, footer }: { language: Language; footer: ReactNode }) {
  const { session } = usePortal();
  const destination = session
    ? session.role === "admin" ? "/operator" : session.role === "jury" ? "/map" : "/dashboard"
    : "/register";

  return (
    <main className="wg-landing">
      <section className="wg-hero shell" aria-labelledby="wg-title">
        <div className="wg-hero-main">
          <h1 id="wg-title"><span className="wg-title-line"><span>Water Guard</span></span><span className="wg-title-line wg-hero-title-accent"><span>Station<span className="wg-title-period">.</span></span></span></h1>
          <p className="wg-hero-summary">{copy(language,
            "Река под наблюдением.\nЕё будущее в наших руках.",
            "Өзен бақылауда.\nОның болашағы өз қолымызда.",
            "A closer eye on our rivers.\nA better future in our hands.")}</p>
          <p className="wg-hero-description">{copy(language,
            "Станция, датчики и робот для сбора плавающего мусора. Наблюдай за водой и помогай команде замечать загрязнение.",
            "Қалқымалы қоқысты жинайтын станция, датчиктер және робот. Суды бақылап, командаға ластануды байқауға көмектес.",
            "A station, sensors and a robot for floating litter. Follow the water and help the team spot pollution.")}</p>
          <div className="rp-actions">
            <Link className="rp-button primary wg-start" href={destination}>
              {copy(language, session ? "Открыть платформу" : "Присоединиться", session ? "Платформаны ашу" : "Қосылу", session ? "Open platform" : "Get started")}
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
            <Link className="rp-text-link" href="/register?role=jury">
              {copy(language, "Я из жюри", "Мен қазылар алқасынанмын", "I'm a jury guest")}<ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className="wg-hero-footnote"><RadioTower size={18} aria-hidden="true" /><span>{copy(language,
            "Ишим, Астана · полевой прототип", "Есіл, Астана · далалық прототип", "Ishim, Astana · field prototype")}</span></div>
        </div>
        <PrototypeScene language={language} />
      </section>

      <RiverPassage language={language} />
      <section className="wg-mission wg-motion-mission" id="system" aria-labelledby="wg-system-title">
        <div className="shell">
          <MotionHeading id="wg-system-title">{copy(language, "От первого сигнала\nдо чистой воды.", "Алғашқы сигналдан\nтаза суға дейін.", "From the first signal\nto a cleaner river.")}</MotionHeading>
          <SystemStory language={language} />
        </div>
      </section>

      <section className="wg-join shell" id="join" aria-labelledby="wg-join-title">
        <div className="wg-join-intro">
          <MotionHeading id="wg-join-title">{copy(language, "Одна река.\nРазные возможности.", "Бір өзен.\nӘртүрлі мүмкіндіктер.", "One river.\nDifferent ways to help.")}</MotionHeading>
          <p>{copy(language, "Заметить. Собрать. Сохранить.", "Байқау. Жинау. Сақтау.", "Detect. Collect. Protect.")}</p>
        </div>
        <div className="wg-role-list">
          {(["user", "admin", "jury"] as const).map((role, i) => {
            const Icon = [UserRound, ShieldCheck, Users][i];
            return (
              <MotionBlock key={role} delay={i * .07}><Link href={`/register?role=${role}`} className="wg-role-row">
                <span className="wg-role-icon"><Icon size={24} aria-hidden="true" /></span>
                <div>
                  <h3>{role === "user" ? copy(language, "Я пользователь", "Мен пайдаланушымын", "I'm a user") : role === "admin" ? copy(language, "Я администратор", "Мен әкімшімін", "I'm an administrator") : copy(language, "Я из жюри", "Мен қазылар алқасынанмын", "I'm a jury guest")}</h3>
                  <p>{role === "user" ? copy(language, "Данные воды и отправка обращений.", "Су деректері және өтініш жіберу.", "Water readings and pollution reports.") : role === "admin" ? copy(language, "Данные, управление и 30 примеров обращений. Вход по коду.", "Деректер, басқару және 30 өтініш мысалы. Кодпен кіру.", "Data, controls and 30 example reports. Access by code.") : copy(language, "Весь проект, презентация и постер. Без регистрации.", "Толық жоба, таныстырылым және постер. Тіркеусіз.", "The project, presentation and poster. No account required.")}</p>
                </div>
                <ArrowUpRight size={23} aria-hidden="true" />
              </Link></MotionBlock>
            );
          })}
        </div>
      </section>
      {footer}
    </main>
  );
}
