"use client";

import { type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, RadioTower, ShieldCheck, UserRound, Users } from "lucide-react";
import { AppLink as Link } from "@/components/app-link";
import { PrototypeScene } from "@/components/river-motion";
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
          <h1 id="wg-title">Water Guard<span className="wg-hero-title-accent">Station<span className="wg-title-period">.</span></span></h1>
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

      <section className="wg-mission" id="system" aria-labelledby="wg-system-title">
        <div className="shell wg-system-layout">
          <div className="wg-field-images">
            <figure className="wg-river-photo">
              <img src="/assets/ishim-field-test.jpg" width={520} height={368} loading="lazy" alt={copy(language, "Река Ишим в Астане", "Астанадағы Есіл өзені", "The Ishim River in Astana")} />
              <figcaption>{copy(language, "Ишим · Астана", "Есіл · Астана", "Ishim · Astana")}</figcaption>
            </figure>
            <figure className="wg-station-photo">
              <img src="/assets/station-prototype.webp" width={780} height={855} loading="lazy" alt={copy(language,
                "Прототип станции Water Guard с солнечной панелью и ESP32", "Күн панелі мен ESP32 бар Water Guard станциясының прототипі", "The Water Guard station prototype with its solar panel and ESP32")} />
              <figcaption>{copy(language, "Станция Water Guard", "Water Guard станциясы", "Water Guard station")}</figcaption>
            </figure>
          </div>
          <div className="wg-mission-content">
            <h2 id="wg-system-title">{copy(language, "От первого сигнала\nдо чистой воды.", "Алғашқы сигналдан\nтаза суға дейін.", "From the first signal\nto a cleaner river.")}</h2>
            <p>{copy(language,
              "Камера помогает заметить плавающий мусор. Датчики передают измерения. Робот собирает отходы. Платформа объединяет наблюдения и обращения жителей.",
              "Камера қалқымалы қоқысты байқауға көмектеседі. Датчиктер өлшемдерді жібереді. Робот қалдықтарды жинайды. Платформа бақылаулар мен тұрғындардың өтініштерін біріктіреді.",
              "The camera helps spot floating litter. Sensors report measurements. The robot collects waste. The platform brings observations and community reports together.")}</p>
            <ul className="wg-process">
              {[copy(language, "Наблюдение", "Бақылау", "Observe"), copy(language, "Измерение", "Өлшеу", "Measure"), copy(language, "Сбор мусора", "Қоқыс жинау", "Collect"), copy(language, "Действие", "Әрекет", "Act")].map(step => (
                <li key={step}><ArrowUpRight size={18} aria-hidden="true" /><span>{step}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="wg-join shell" id="join" aria-labelledby="wg-join-title">
        <div className="wg-join-intro">
          <h2 id="wg-join-title">{copy(language, "Одна река.\nРазные возможности.", "Бір өзен.\nӘртүрлі мүмкіндіктер.", "One river.\nDifferent ways to help.")}</h2>
          <p>{copy(language, "Заметить. Собрать. Сохранить.", "Байқау. Жинау. Сақтау.", "Detect. Collect. Protect.")}</p>
        </div>
        <div className="wg-role-list">
          {(["user", "admin", "jury"] as const).map((role, i) => {
            const Icon = [UserRound, ShieldCheck, Users][i];
            return (
              <Link key={role} href={`/register?role=${role}`} className="wg-role-row">
                <span className="wg-role-icon"><Icon size={24} aria-hidden="true" /></span>
                <div>
                  <h3>{role === "user" ? copy(language, "Я пользователь", "Мен пайдаланушымын", "I'm a user") : role === "admin" ? copy(language, "Я администратор", "Мен әкімшімін", "I'm an administrator") : copy(language, "Я из жюри", "Мен қазылар алқасынанмын", "I'm a jury guest")}</h3>
                  <p>{role === "user" ? copy(language, "Данные воды и отправка обращений.", "Су деректері және өтініш жіберу.", "Water readings and pollution reports.") : role === "admin" ? copy(language, "Данные, управление и 30 примеров обращений. Вход по коду.", "Деректер, басқару және 30 өтініш мысалы. Кодпен кіру.", "Data, controls and 30 example reports. Access by code.") : copy(language, "Весь проект, презентация и постер. Без регистрации.", "Толық жоба, таныстырылым және постер. Тіркеусіз.", "The project, presentation and poster. No account required.")}</p>
                </div>
                <ArrowUpRight size={23} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>
      {footer}
    </main>
  );
}
