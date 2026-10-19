"use client";
import {useEffect,useRef,useState} from "react";
import {reviewSettingsSchema} from "../lib/contracts";
import {useLocale} from "../lib/i18n/provider";
import {textLanguage} from "../lib/i18n/locale";
import {errorMessage,format,getMessages,warningMessage} from "../lib/i18n/messages";
import {useReview} from "../lib/review/use-review";
import SiteFooter from "./site-footer";
import LanguageSwitch from "./language-switch";
import ReviewForm from "./review-form";
import ReviewResults from "./review-results";
import PersonalKeySettings from "./personal-key-settings";
import {usePersonalKey} from "../lib/use-personal-key";
import EmailAccessForm from "./email-access-form";
export default function TeacherReview(){
 const {locale}=useLocale(),w=getMessages(locale),account=usePersonalKey(),review=useReview(account.key);
 const [keyBusy,setKeyBusy]=useState(false);
 const [subject,setSubject]=useState(""),[toefl,setToefl]=useState("3"),[formError,setFormError]=useState<"subject"|"toefl"|null>(null);
 const [access,setAccess]=useState<"ready"|"checking"|"invite">("checking");
 const [pending,setPending]=useState<{action:()=>void;label:string}|null>(null),dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{let active=true;Promise.resolve().then(()=>{
  if(!active)return;
  const token=new URLSearchParams(location.hash.slice(1)).get("invite");if(!token){void fetch('/api/session',{cache:'no-store'}).then(r=>{if(active)setAccess(r.ok?'ready':'invite');}).catch(()=>{if(active)setAccess('invite');});return;}
  history.replaceState(null,"",location.pathname+location.search);setAccess("checking");
  void fetch("/api/invite",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})}).then(r=>{if(active)setAccess(r.ok?"ready":"invite");}).catch(()=>{if(active)setAccess("invite");});
 });return ()=>{active=false;};},[]);
 useEffect(()=>{if(pending)dialog.current?.showModal();else dialog.current?.close();},[pending]);
 function guard(action:()=>void,label=w.replace){if(review.result)setPending({action,label});else action();}
 function start(){
  const parsed=reviewSettingsSchema.safeParse({subject:subject||"Other",toeflLevel:toefl.trim()?Number(toefl):NaN});
  if(!parsed.success){setFormError("toefl");return;}
  setFormError(null);guard(()=>void review.review(parsed.data));
 }
 const reading=review.readState.status==="reading",locked=reading||review.busy||keyBusy||!account.ready||access!=="ready";
 const noText=review.deck&&review.deck.extractedCharacters===0&&review.deck.slides.every(s=>s.extractionStatus!=="failed");
 const feedback=!!review.result&&!review.busy;
 return <main>
  <header><span className="brand">DocReady</span><LanguageSwitch/></header>
  {!feedback&&!review.busy&&<><h1>{w.title}</h1><p className="intro">{w.intro}</p></>}
  {access==="checking"&&<p role="status" className="status">{w.access}</p>}
  {access==="invite"&&<EmailAccessForm onReady={()=>setAccess("ready")}/>}
  {access==='ready'&&!feedback&&!review.busy&&<p className="small">{locale==='zh-Hans'?'此访问资料的使用总量会被记录。DocReady 不保存段落文本或建议。':'Usage totals are recorded for this access profile. DocReady does not save paragraph text or suggestions.'}</p>}
  {access==='ready'&&!feedback&&!review.busy&&<ReviewForm accountSettings={<PersonalKeySettings account={account} disabled={reading||review.busy||!account.ready} onBusy={setKeyBusy}/>} fileName={review.fileName} subject={subject} toefl={toefl} setSubject={v=>{setSubject(v);setFormError(null);}} setToefl={v=>{setToefl(v);setFormError(null);}} onFile={file=>guard(()=>{setFormError(null);review.read(file);})} onReview={start} onClear={()=>guard(()=>{review.clear();setFormError(null);})} disabled={locked} hasDeck={!!review.deck&&!noText} error={formError}/>}
  <div role="status" aria-live="polite" className={reading||review.busy?"status loading-status":""}>
   {(reading||review.busy)&&<span className="loading-dots" aria-hidden="true"><span/><span/><span/></span>}
   {reading?w.reading:review.readState.status==="cancelled"?w.stoppedReading:review.deck&&!review.result&&!review.busy?format(review.deck.slides.length===1?w.fileReadyOne:w.fileReady,{count:review.deck.slides.length}):""}
   {review.progress&&<div data-testid="progress"><p>{review.progress.stage==="preparing"?w.preparing:w.reviewing}</p><p>{format(w.progress,{done:review.progress.completedBatches,total:review.progress.totalBatches,failed:review.progress.failedBatches})}</p></div>}
  </div>
  {review.error&&<p role="alert" className="status error-text">{errorMessage(review.error,locale)}</p>}
  {noText&&<p className="status" data-testid="no-text">{w.noText}</p>}
  <div className="actions">{(reading||review.busy)&&<button className="secondary" data-testid="cancel" onClick={review.cancel}>{w.cancel}</button>}
   {!feedback&&review.busy&&(review.fileName||review.result)&&<button className="secondary" data-testid="reset" onClick={()=>guard(()=>{review.clear();setFormError(null);})}>{w.reset}</button>}</div>
  {feedback&&review.result&&review.deck&&<ReviewResults result={review.result} deck={review.deck} busy={review.busy||keyBusy} retry={()=>void review.review(review.result!.settings,true)} restart={()=>guard(()=>void review.review(review.result!.settings),w.restart)}/>}
  {feedback&&review.result?.slides.some(s=>s.errorCode==="PERSONAL_KEY_FAILED"||s.errorCode==="PERSONAL_KEY_INVALID")&&<PersonalKeySettings account={account} disabled={review.busy} onBusy={setKeyBusy}/>}
  {review.deck&&!review.busy&&!feedback&&<details><summary>{w.preview}</summary>{review.deck.slides.map(slide=><div className="preview-section" key={slide.slideNumber}><h3>{format(w.slide,{number:slide.slideNumber})}</h3>{slide.warnings.length>0&&<p className="small">{w.warnings}: {slide.warnings.map(code=>warningMessage(code,locale)).join(" · ")}</p>}{slide.elements.map(e=><p className="quote" key={e.elementId} lang={textLanguage(e.text)}>{e.text}</p>)}</div>)}</details>}
  {feedback&&<section className="another-review" aria-label={w.anotherPrompt}><h2>{w.anotherPrompt}</h2><div className="actions"><button className="new-file" data-testid="reset" onClick={()=>guard(()=>{review.clear();setFormError(null);})}>{w.anotherFile}</button></div></section>}
  <SiteFooter/>
  <dialog ref={dialog} onCancel={()=>setPending(null)} aria-labelledby="replace-title" aria-describedby="replace-help">
   <h2 id="replace-title">{w.replaceTitle}</h2><p id="replace-help">{w.replaceHelp}</p><div className="actions"><button data-testid="replace-review" onClick={()=>{const action=pending?.action;setPending(null);action?.();}}>{pending?.label??w.replace}</button><button data-testid="keep-review" autoFocus className="secondary" onClick={()=>setPending(null)}>{w.keep}</button></div>
  </dialog>
 </main>;
}
