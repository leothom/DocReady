"use client";
import {type ReactNode,useRef,useState} from "react";
import {SUBJECTS} from "../lib/contracts";
import {getMessages,subjects} from "../lib/i18n/messages";
import {useLocale} from "../lib/i18n/provider";
export default function ReviewForm({fileName,subject,toefl,setSubject,setToefl,onFile,onReview,onClear,disabled,hasDeck,error,accountSettings}:{accountSettings?:ReactNode;fileName:string;subject:string;toefl:string;setSubject:(v:string)=>void;setToefl:(v:string)=>void;onFile:(f:File)=>void;onReview:()=>void;onClear:()=>void;disabled:boolean;hasDeck:boolean;error:"subject"|"toefl"|null}){
 const {locale}=useLocale(),w=getMessages(locale),fileInput=useRef<HTMLInputElement>(null);
 const [dragging,setDragging]=useState(false),[fileError,setFileError]=useState(false);
 const level=Number(toefl),range=Number.isFinite(level)&&level>=1&&level<=6?String(Math.round(level*2)/2):"3";
 function select(files:FileList|null){if(disabled)return;if(!files||files.length!==1){setFileError(true);return;}setFileError(false);onFile(files[0]);}
 return <form noValidate onSubmit={e=>{e.preventDefault();onReview();}}>
  <div data-testid="file-drop" className={"file-drop"+(dragging&&!disabled?" dragging":"")} aria-disabled={disabled}
   onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect=disabled?"none":"copy";if(!disabled)setDragging(true);}}
   onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setDragging(false);}}
   onDrop={e=>{e.preventDefault();setDragging(false);if(!disabled)select(e.dataTransfer.files);}}>
   {fileName?<p className="file-name" data-testid="file-name">{fileName}</p>:<p className="drop-title">{w.dropFile}</p>}
   <input ref={fileInput} hidden aria-label={w.choose} type="file" accept=".pptx" disabled={disabled} onChange={e=>{const files=e.currentTarget.files;if(files?.length)select(files);e.currentTarget.value="";}}/>
   <button className="secondary" type="button" disabled={disabled} onClick={()=>fileInput.current?.click()}>{fileName?w.changeFile:w.choose}</button>
   <p className="small file-limit">{w.fileLimit}</p>
  </div>
  {fileError&&<p role="alert" className="error-text">{w.oneFile}</p>}
  {accountSettings}
  <details data-testid="review-settings" className="review-settings"><summary>{w.settingsTitle}</summary>
   <div className="settings-row">
    <label>{w.subject}<select data-testid="subject" value={subject} onChange={e=>setSubject(e.target.value)} disabled={disabled}>
     <option value="">{w.subjectPlaceholder}</option>{SUBJECTS.map(id=><option key={id} value={id}>{subjects[id][locale]}</option>)}
    </select></label>
    <div><label htmlFor="toefl-number">{w.toefl}</label><div className="level-controls">
     <input id="toefl-number" data-testid="toefl-number" type="number" min="1" max="6" step="0.5" value={toefl} onChange={e=>setToefl(e.target.value)} disabled={disabled} aria-invalid={error==="toefl"} aria-describedby={error==="toefl"?"toefl-help form-error":"toefl-help"}/>
     <input data-testid="toefl-range" aria-label={w.toefl} type="range" min="1" max="6" step="0.5" value={range} onChange={e=>setToefl(e.target.value)} disabled={disabled} aria-describedby="toefl-help"/>
    </div><p className="small" id="toefl-help">{w.toeflHelp}</p></div>
   </div>
  </details>
  {error&&<p id="form-error" role="alert" className="error-text">{error==="subject"?w.invalidSubject:w.invalidToefl}</p>}
  <div className="actions"><button className={hasDeck&&!disabled?"review-ready":undefined} data-testid="start-review" type="submit" disabled={disabled||!hasDeck}>{w.start}</button>{fileName&&<button type="button" className="secondary" data-testid="reset" onClick={onClear}>{w.reset}</button>}</div>
 </form>;
}
