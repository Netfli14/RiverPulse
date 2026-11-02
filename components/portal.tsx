"use client";
import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Check, FileText, LogOut, RefreshCw, ShieldCheck, UserRound, Users } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { AppLink as Link } from "@/components/app-link";
import type { PortalRole } from "@/lib/portal-auth";
import type { WaterReport } from "@/lib/demo-reports";
import type { Language } from "@/lib/riverpulse-i18n";
export const copy = (l: Language, ru: string, kz: string, en: string) => l === "RU" ? ru : l === "KZ" ? kz : en;
type Session = { role: PortalRole; email?: string };
const PortalContext = createContext<{session: Session | null; loading: boolean}>({session: null, loading: true});
export const usePortal = () => useContext(PortalContext);
let bootstrap: Promise<Session | null> | undefined;
function bootstrapPortal() {
  return bootstrap ||= Promise.all([
    fetch("/api/portal/session", {cache: "no-store"}).then(r => r.json() as Promise<{session:Session|null}>).then(r => r.session),
    fetch("/api/portal/visit", {method: "POST"}).catch(() => null),
  ]).then(([session]) => session).catch(() => null);
}
export function PortalProvider({children}: {children: ReactNode}) {
  const [state, setState] = useState<{session: Session | null; loading: boolean}>({session: null, loading: true});
  useEffect(() => {
    let alive = true; bootstrapPortal().then(session => {if (alive) setState({session, loading: false});});
    return () => {alive = false;};
  }, []);
  return <PortalContext.Provider value={state}>{children}</PortalContext.Provider>;
}
export const roleLabel = (l: Language, role: PortalRole) => role === "admin" ? copy(l,"Администратор","Әкімші","Administrator") : role === "jury" ? copy(l,"Гость жюри","Қазылар алқасы","Jury guest") : copy(l,"Пользователь","Пайдаланушы","User");
export function LogoutButton({language}: {language: Language}) {
  return <button className="rp-icon-button" aria-label={copy(language,"Выйти","Шығу","Sign out")} onClick={async () => {await fetch("/api/portal/session", {method: "DELETE"}); window.location.assign("/");}}><LogOut size={17}/></button>;
}
export function RoleLogin({language, register}: {language: Language; register: boolean}) {
  const [role, setRole] = useState<PortalRole>("user"), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [code, setCode] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const reduce = useReducedMotion();
  const autoEntered = useRef(false);
  useEffect(() => {const requested = new URLSearchParams(window.location.search).get("role");if(requested === "admin" || requested === "jury" || requested === "user") setRole(requested); if(requested === "jury" && !autoEntered.current){autoEntered.current=true;void enter("jury");}}, []);
  async function enter(chosen: PortalRole) {
    setBusy(true); setError("");
    try {
      // Establish the visitor cookie before automatic jury entry, so a first
      // visit and its role entry count the same browser.
      await bootstrapPortal();
      const response = await fetch("/api/portal/session", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({role: chosen, action: register ? "register" : "login", email, password, code})});
      const result = await response.json() as {ok?:boolean; redirect:string; error:string; code?:string};
      if (response.ok && result.ok) {window.location.assign(result.redirect); return;}
      if (response.status >= 500) console.error("Water Guard sign-in unavailable", {code: result.code || result.error});
      const messages: Record<string, string> = {
        invalid_code: copy(language,"Неверный код администратора.","Әкімші коды қате.","Incorrect administrator code."),
        exists: copy(language,"Этот email уже зарегистрирован. Войди в аккаунт.","Бұл email тіркелген. Аккаунтқа кіріңіз.","This email is already registered. Sign in instead."),
        invalid_credentials: copy(language,"Проверь email и пароль.","Email мен құпиясөзді тексеріңіз.","Check your email and password."),
        invalid_input: copy(language,"Укажи email и пароль от 8 символов.","Email және кемінде 8 таңбалы құпиясөз енгізіңіз.","Enter an email and a password of at least 8 characters."),
        rate_limited: copy(language,"Слишком много попыток. Попробуй через 5 минут.","Әрекет тым көп. 5 минуттан кейін қайталаңыз.","Too many attempts. Try again in 5 minutes."),
      };
      setError(messages[result.error] || copy(language,"Сервис входа временно недоступен. Попробуй ещё раз.","Кіру қызметі уақытша қолжетімсіз. Қайталаңыз.","Sign-in is temporarily unavailable. Please retry."));
    } catch { setError(copy(language,"Не удалось подключиться. Проверь интернет.","Қосылу мүмкін болмады. Интернетті тексеріңіз.","Could not connect. Check your connection.")); }
    finally {setBusy(false);}
  }
  return <main className="wg-auth shell"><div className="wg-auth-intro"><span className="rp-kicker">WATER GUARD STATION</span><h1>{copy(language,"У каждой роли\nсвой маршрут.","Әр рөлдің\nөз бағыты бар.","Your role.\nYour way in.")}</h1><p>{copy(language,"Выбери, как ты хочешь участвовать. Данные реки, обращения и материалы проекта собраны в одном месте.","Қатысу жолын таңдаңыз. Өзен деректері, өтініштер және жоба материалдары бір жерде.","Choose how you want to take part. River data, community reports and project materials, together.")}</p><div className="wg-access-note"><ShieldCheck size={20}/><span>{copy(language,"Выбери роль, чтобы открыть платформу.","Платформаны ашу үшін рөлді таңдаңыз.","Choose your role to open the platform.")}</span></div></div><section className="rp-card wg-auth-card"><div className="wg-role-tabs" role="tablist" aria-label={copy(language,"Выбрать роль","Рөлді таңдау","Choose role")}>{(["user","admin","jury"] as const).map((item,i) => {const Icon = [UserRound,ShieldCheck,Users][i]; return <button type="button" key={item} role="tab" id={`role-${item}`} aria-controls="role-panel" aria-selected={role === item} disabled={busy} onClick={() => {setRole(item);setError("");}} className={role === item ? "active" : ""}><Icon size={19}/><span>{roleLabel(language,item)}</span></button>;})}</div><motion.div key={role} id="role-panel" role="tabpanel" aria-labelledby={`role-${role}`} initial={reduce ? false : {opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.22}}><h2>{role === "jury" ? copy(language,"Добро пожаловать, жюри.","Қош келдіңіз, қазылар алқасы.","Welcome, jury.") : role === "admin" ? copy(language,"Рабочее пространство команды","Команданың жұмыс кеңістігі","Team workspace") : copy(language,register ? "Создай свой аккаунт" : "С возвращением",register ? "Аккаунт жасаңыз" : "Қайта қош келдіңіз",register ? "Create your account" : "Welcome back")}</h2><p className="wg-role-description">{role === "jury" ? copy(language,"Вход без регистрации и пароля. Карта, данные, робот, презентация и постер доступны сразу.","Тіркеусіз және құпиясөзсіз кіру. Карта, деректер, робот, таныстырылым және постер бірден қолжетімді.","No account or password needed. Go straight to the map, data, robot, presentation and poster.") : role === "admin" ? copy(language,"Введи код доступа. Данные станции и все обращения будут в твоём кабинете.","Кіру кодын енгізіңіз. Станция деректері мен барлық өтініштер кабинетіңізде болады.","Enter the access code to view station data and manage reports.") : copy(language,"Смотри показания воды и сообщай о загрязнении.","Су көрсеткіштерін қарап, ластану туралы хабарлаңыз.","Follow the water readings and report pollution.")}</p><form className="wg-login-form" onSubmit={(event:FormEvent) => {event.preventDefault();void enter(role);}}>{role === "user" && <><label>Email<input type="email" required value={email} maxLength={254} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="name@example.com"/></label><label>{copy(language,"Пароль","Құпиясөз","Password")}<input type="password" required minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={register?"new-password":"current-password"}/><small>{copy(language,"Не менее 8 символов","Кемінде 8 таңба","At least 8 characters")}</small></label></>}{role === "admin" && <label>{copy(language,"Код администратора","Әкімші коды","Administrator code")}<input type="password" inputMode="numeric" required value={code} maxLength={128} onChange={e=>setCode(e.target.value)} autoComplete="off" autoFocus/></label>}{error && <p className="rp-error" role="alert">{error}</p>}<button disabled={busy} className="rp-button primary full">{busy ? <RefreshCw size={18} className="spin"/> : null}{role === "jury" ? copy(language,"Войти как гость жюри","Қазылар алқасы ретінде кіру","Enter as a jury guest") : role === "admin" ? copy(language,"Открыть кабинет","Кабинетті ашу","Open workspace") : copy(language,register?"Зарегистрироваться":"Войти",register?"Тіркелу":"Кіру",register?"Create account":"Sign in")}<ArrowRight size={18}/></button></form>{role === "user" && <Link className="rp-auth-link" href={register?"/login":"/register"}>{copy(language,register?"Уже есть аккаунт? Войти":"Нет аккаунта? Зарегистрироваться",register?"Аккаунт бар ма? Кіру":"Аккаунт жоқ па? Тіркелу",register?"Already have an account? Sign in":"New here? Create an account")}</Link>}</motion.div></section></main>;
}
const categories = ["floating_litter","discharge","water_color","smell","other"];
const categoryName = (l: Language, c: string) => [copy(l,"Плавающий мусор","Қалқымалы қоқыс","Floating litter"),copy(l,"Возможный сброс","Ықтимал төгінді","Possible discharge"),copy(l,"Изменение цвета воды","Су түсінің өзгеруі","Water colour change"),copy(l,"Необычный запах","Ерекше иіс","Unusual smell"),copy(l,"Другое","Басқа","Other")][Math.max(0,categories.indexOf(c))];
const statusName = (l:Language,s:string) => s === "reviewing" ? copy(l,"В работе","Қаралуда","In review") : s === "resolved" ? copy(l,"Решено","Шешілді","Resolved") : copy(l,"Получено","Алынды","Received");
export function ReportBoard({language, compact = false}: {language: Language; compact?: boolean}) {
  const {session} = usePortal();
  const [rows,setRows] = useState<WaterReport[]>([]), [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [error,setError] = useState(""), [success,setSuccess] = useState(""), [filter,setFilter] = useState("all");
  const admin = session?.role === "admin", user = session?.role === "user";
  async function load() { const response = await fetch("/api/portal/reports", {cache:"no-store"}); if (!response.ok) throw new Error("unavailable"); setRows((await response.json() as {reports:WaterReport[]}).reports); }
  useEffect(() => {load().catch(()=>setError(copy(language,"Не удалось загрузить обращения. Обнови страницу.","Өтініштер жүктелмеді. Бетті жаңартыңыз.","Could not load reports. Refresh the page."))).finally(()=>setLoading(false));}, [language]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");setSuccess("");
    const form=event.currentTarget, data=new FormData(form);
    try {
      const response=await fetch("/api/portal/reports",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({category:data.get("category"),description:data.get("description"),location:data.get("location"),observedAt:new Date(String(data.get("date"))).toISOString()})});
      if (!response.ok) throw new Error("unavailable");
      form.reset(); setSuccess(copy(language,"Обращение отправлено команде и сохранено.","Өтініш командаға жіберіліп, сақталды.","Your report was sent to the team and saved.")); await load();
    } catch {setError(copy(language,"Отправка не удалась. Текст остался в форме, попробуй ещё раз.","Жіберілмеді. Мәтін формада қалды, қайталаңыз.","Could not send your report. Your text is still in the form; please retry."));}
    finally {setBusy(false);}
  }
  async function update(row:WaterReport,status:string) {
    setBusy(true);setError("");
    try {const response=await fetch("/api/portal/reports",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id:row.id,status})}); if (!response.ok) throw new Error(); await load();}
    catch {setError(copy(language,"Не удалось изменить статус.","Мәртебе өзгермеді.","Could not update status."));} finally {setBusy(false);}
  }
  const visible=rows.filter(row=>filter==="all"||filter==="real"&&!row.demo||filter==="demo"&&row.demo||filter===row.status);
  return <section className={compact ? "wg-report-board" : "rp-content wg-report-board"}><div className="rp-page-title"><div><span className="rp-kicker">COMMUNITY / WATER GUARD</span><h1>{copy(language,admin?"Обращения под контролем.":user?"Помоги заметить проблему.":"Обращения жителей.",admin?"Өтініштер бақылауда.":user?"Мәселені анықтауға көмектес.":"Тұрғындардың өтініштері.",admin?"Every report, in view.":user?"Help spot a problem.":"Community reports.")}</h1><p>{copy(language,user?"Отправь сообщение о загрязнении. Команда увидит его в кабинете администратора.":"30 демонстрационных примеров показывают работу системы. Реальные обращения отмечены отдельно.",user?"Ластану туралы хабар жіберіңіз. Команда оны әкімші кабинетінде көреді.":"30 демонстрациялық мысал жүйенің жұмысын көрсетеді. Нақты өтініштер бөлек белгіленген.",user?"Send a pollution report. The team can review it in the administrator workspace.":"30 labelled examples demonstrate the workflow. Real submissions are marked separately.")}</p></div></div>{error&&<p role="alert" className="rp-error">{error}</p>}{success&&<p role="status" className="wg-success"><Check size={18}/>{success}</p>}<div className={user?"rp-two-grid":""}>{user&&<form className="rp-card rp-panel rp-form" onSubmit={submit}><label>{copy(language,"Категория","Санат","Category")}<select name="category">{categories.map(c=><option key={c} value={c}>{categoryName(language,c)}</option>)}</select></label><label>{copy(language,"Когда заметил","Қашан байқадыңыз","Observed at")}<input type="datetime-local" name="date" required/></label><label className="wide">{copy(language,"Что произошло","Не болды","What happened")}<textarea name="description" required minLength={15} maxLength={4000} rows={5}/></label><label className="wide">{copy(language,"Место","Орын","Location")}<input name="location" required maxLength={200} placeholder={copy(language,"Река, набережная, ориентир","Өзен, жағалау, бағдар","River, embankment, landmark")}/></label><button disabled={busy} className="rp-button primary wide">{copy(language,busy?"Отправляем…":"Отправить обращение",busy?"Жіберілуде…":"Өтініш жіберу",busy?"Sending…":"Send report")}<ArrowRight size={18}/></button></form>}<div>{!user&&<div className="wg-report-filters"><label>{copy(language,"Показать","Көрсету","Show")}<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{copy(language,"Все обращения","Барлық өтініштер","All reports")} ({rows.length})</option><option value="real">{copy(language,"Реальные","Нақты","Real")} ({rows.filter(r=>!r.demo).length})</option><option value="demo">{copy(language,"Демонстрационные","Демонстрациялық","Demonstration")} (30)</option>{["received","reviewing","resolved"].map(s=><option key={s} value={s}>{statusName(language,s)}</option>)}</select></label><span>{visible.length} {copy(language,"обращений","өтініш","reports")}</span></div>}{loading?<p role="status">{copy(language,"Загружаем обращения…","Өтініштер жүктелуде…","Loading reports…")}</p>:!visible.length?<div className="rp-card rp-panel"><FileText size={26}/><p>{copy(language,user?"Твои отправленные обращения появятся здесь.":"По этому фильтру обращений нет.",user?"Жіберген өтініштеріңіз осында пайда болады.":"Бұл сүзгіде өтініштер жоқ.",user?"Your submitted reports will appear here.":"No reports match this filter.")}</p></div>:<div className="wg-report-list">{visible.map(row=><article className="rp-card wg-report" key={row.id}><div className="wg-report-top"><span className={"wg-report-kind "+(row.demo?"demo":"real")}>{copy(language,row.demo?"Демо":"Реальное обращение",row.demo?"Демо":"Нақты өтініш",row.demo?"Demo":"Real submission")}</span><small>#{row.id.slice(0,8)}</small><span className={"wg-status "+row.status}>{statusName(language,row.status)}</span></div><h3>{categoryName(language,row.category)}</h3><p>{row.description}</p><div className="wg-report-meta"><span>{row.location}</span><time dateTime={row.observedAt}>{new Date(row.observedAt).toLocaleString(language==="EN"?"en-GB":language==="KZ"?"kk-KZ":"ru-RU",{timeZone:"Asia/Almaty",dateStyle:"short",timeStyle:"short"})}</time></div>{admin&&<label className="wg-status-control">{copy(language,"Статус","Мәртебе","Status")}<select disabled={busy} value={row.status} onChange={e=>void update(row,e.target.value)}>{["received","reviewing","resolved"].map(s=><option key={s} value={s}>{statusName(language,s)}</option>)}</select></label>}</article>)}</div>}</div></div></section>;
}
