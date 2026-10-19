"use client";
import {useEffect,useRef,useState} from "react";
import type {ExtractedDeck} from "../lib/contracts";
import type {ReviewResult} from "../lib/review/types";
import {categories,errorMessage,format,getMessages} from "../lib/i18n/messages";
import {textLanguage} from "../lib/i18n/locale";
import {useLocale} from "../lib/i18n/provider";
export default function ReviewResults({result,deck,busy,retry,restart}:{result:ReviewResult;deck:ExtractedDeck;busy:boolean;retry:()=>void;restart:()=>void}){
 const {locale}=useLocale(),w=getMessages(locale);
 const [selected,setSelected]=useState<number|null>(null),[action,setAction]=useState<{id:string;status:"copied"|"copyFailed"}|null>(null);
 const heading=useRef<HTMLHeadingElement>(null),pills=useRef<HTMLDivElement>(null),currentPill=useRef<HTMLButtonElement>(null);
 const counts={reviewed:0,failed:0,skipped:0,cancelled:0};for(const slide of result.slides)counts[slide.status]++;
 const title={complete:w.reviewComplete,partial:w.reviewPartial,failed:w.reviewFailed,cancelled:w.reviewCancelled}[result.status];
 const pages=result.slides.map(coverage=>({coverage,source:deck.slides.find(s=>s.slideNumber===coverage.slideNumber),findings:result.findings.filter(f=>f.slideNumber===coverage.slideNumber)})).filter(p=>p.findings.length||p.coverage.status==="failed"||p.coverage.status==="cancelled");
 const index=Math.max(0,pages.findIndex(p=>p.coverage.slideNumber===selected)),page=pages[index],number=page?.coverage.slideNumber;
 useEffect(()=>{
  const row=pills.current,pill=currentPill.current;
  if(row&&pill){const bounds=row.getBoundingClientRect(),active=pill.getBoundingClientRect();const left=active.left<bounds.left?Math.floor(active.left-bounds.left)-4:active.right>bounds.right?Math.ceil(active.right-bounds.right)+4:0;if(left)row.scrollBy({left,behavior:"instant"});}
  heading.current?.focus({preventScroll:true});window.scrollTo({top:0,behavior:"instant"});
 },[number]);
 async function copy(id:string,text:string){try{await navigator.clipboard.writeText(text);setAction({id,status:"copied"});}catch{setAction({id,status:"copyFailed"});}}
 function move(next:number){setSelected(pages[next].coverage.slideNumber);setAction(null);}
 return <section className="review-pages" data-testid="review-summary" aria-label={title}>
  {result.status!=="complete"&&<div role="status" className="review-overview"><p>{title}</p><p className="error-text">{format(counts.reviewed===1?w.coverageOne:w.coverage,counts)} {w.incompleteHelp}</p></div>}
  {page&&<>
   <nav className="page-navigation" aria-label={w.slidePosition.replace("{current}",String(index+1)).replace("{total}",String(pages.length))}>
    <button className="secondary" data-testid="previous-page" disabled={busy||index===0} onClick={()=>move(index-1)}>{w.previousSlide}</button>
    <div ref={pills} className="page-pills" role="group" aria-label={format(w.slidePosition,{current:index+1,total:pages.length})}>{pages.map((p,i)=><button key={p.coverage.slideNumber} ref={i===index?currentPill:undefined} data-testid="page-pill" type="button" className="page-pill" aria-label={format(w.slide,{number:p.coverage.slideNumber})} aria-current={i===index?"step":undefined} disabled={busy} onClick={()=>move(i)}>{p.coverage.slideNumber}</button>)}</div>
    <button className="secondary" data-testid="next-page" disabled={busy||index===pages.length-1} onClick={()=>move(index+1)}>{w.nextSlide}</button>
   </nav>
   <article className="page-section" aria-labelledby="current-page">
    <h2 id="current-page" data-testid="current-page" ref={heading} tabIndex={-1}>{format(w.slide,{number:page.coverage.slideNumber})}{page.source?.hidden&&<span className="small"> · {w.hidden}</span>}</h2>
    {page.coverage.status!=="reviewed"&&<p className="status error-text" data-testid="slide-coverage">{w[page.coverage.status]}{page.coverage.errorCode?" · "+errorMessage(page.coverage.errorCode,locale):""}</p>}
    {page.findings.length>0&&<p className="small">{w.manualCopy}</p>}
    {page.findings.map(f=><div className="finding" key={f.id} data-testid="finding" data-finding-id={f.id}>
     <p className="finding-type">{f.reviewType==="correction"?w.correction:w.enhancement} · {categories[f.category][locale]}</p>
     <div className="text-comparison"><div><h3 className="text-label">{w.original}</h3><p className="quote" lang={textLanguage(f.originalText)}>{f.originalText}</p></div><div><h3 className="text-label">{w.suggestion}</h3><p className="quote suggested" lang={textLanguage(f.suggestedText)}>{f.suggestedText}</p></div></div>
     <p className="explanation"><strong>{w.explanation}: </strong>{f.explanation[locale]}</p>
     <button className="secondary" data-testid="copy" onClick={()=>void copy(f.id,f.suggestedText)}>{w.copy}</button>
     <p data-testid="action-message" role="status" aria-live="polite">{action?.id===f.id?w[action.status]:""}</p>
    </div>)}
   </article>
  </>}
  {!pages.length&&<p data-testid="no-findings">{w.noFindings}</p>}
  <div className="actions">{result.batches.some(b=>b.status==="failed")&&<button data-testid="retry-failed" onClick={retry} disabled={busy}>{w.retry}</button>}{result.slides.some(s=>s.status==="cancelled"||s.errorCode==="PERSONAL_KEY_FAILED"||s.errorCode==="PERSONAL_KEY_INVALID")&&<button data-testid="restart-review" onClick={restart} disabled={busy}>{w.restart}</button>}</div>
 </section>;
}
