"use client";
import {useEffect,useRef,useState} from 'react';
import {accountHeaders,PERSONAL_KEY_STORAGE,validPersonalKey} from '../lib/personal-key';
import type {usePersonalKey} from '../lib/use-personal-key';
import {useLocale} from '../lib/i18n/provider';
import {errorMessage} from '../lib/i18n/messages';
const copy={
 en:{title:'Use my own DeepSeek account',school:'Using the school account.',personal:'Using your DeepSeek account.',invalid:'Saved key needs attention.',label:'API key',show:'Show',hide:'Hide',save:'Save on this device',checking:'Checking key…',change:'Change key',remove:'Remove key',cancel:'Cancel change',note:'Your DeepSeek account pays for reviews. Save only on your own computer.',detail:'The key is saved in this browser and sent securely through DocReady to DeepSeek. Anyone using this browser profile can use it. No school daily limit. Server protection limits still apply.',test:'Saving runs a small connection test charged to your DeepSeek account.'},
 'zh-Hans':{title:'使用我自己的 DeepSeek 账户',school:'正在使用学校账户。',personal:'正在使用您的 DeepSeek 账户。',invalid:'已保存的密钥需要检查。',label:'API 密钥',show:'显示',hide:'隐藏',save:'保存在此设备',checking:'正在检查密钥…',change:'更换密钥',remove:'移除密钥',cancel:'取消更换',note:'审核费用由您的 DeepSeek 账户支付。请仅在自己的电脑上保存。',detail:'密钥保存在此浏览器中，并通过 DocReady 安全传送至 DeepSeek。使用此浏览器配置的其他人也可使用该密钥。不受学校每日限额限制。服务器保护限制仍然适用。',test:'保存时将进行一次小型连接测试，费用由您的 DeepSeek 账户支付。'}
};
export default function PersonalKeySettings({account,disabled,onBusy}:{account:ReturnType<typeof usePersonalKey>;disabled:boolean;onBusy:(busy:boolean)=>void}){
 const {locale}=useLocale(),w=copy[locale];
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(''),[shown,setShown]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 const controller=useRef<AbortController|null>(null),generation=useRef(0),notify=useRef(onBusy);useEffect(()=>{notify.current=onBusy;},[onBusy]);
 useEffect(()=>{
  function stop(){generation.current++;controller.current?.abort();controller.current=null;notify.current(false);}
  const changed=(event:StorageEvent)=>{if(event.key===PERSONAL_KEY_STORAGE||event.key===null){stop();setBusy(false);setDraft('');setShown(false);setEditing(false);setError('ACCOUNT_CHANGED');}};
  window.addEventListener('storage',changed);return ()=>{stop();window.removeEventListener('storage',changed);};
 },[]);
 async function save(){
  if(disabled||busy)return;
  const value=draft.trim();if(!validPersonalKey(value)){setError('PERSONAL_KEY_INVALID');return;}
  const id=++generation.current,c=new AbortController();controller.current=c;setBusy(true);onBusy(true);setError(null);
  const timer=setTimeout(()=>c.abort(),20000);
  try{
   const response=await fetch('/api/probe',{method:'POST',cache:'no-store',redirect:'error',credentials:'same-origin',headers:{'Content-Type':'application/json',...accountHeaders(value)},body:'{}',signal:c.signal});
   const data=await response.json();if(id!==generation.current||c.signal.aborted)return;
   if(!response.ok||data.ok!==true){setError(typeof data.error==='string'?data.error:'MODEL_UNAVAILABLE');return;}
   if(await account.save(value)){setDraft('');setShown(false);setEditing(false);}
  }catch{if(id===generation.current)setError(c.signal.aborted?'MODEL_TIMEOUT':'MODEL_UNAVAILABLE');}
  finally{clearTimeout(timer);if(id===generation.current){controller.current=null;setBusy(false);onBusy(false);}}
 }
 const status=account.key===null?w.school:account.key?w.personal:w.invalid;
 return <div className="personal-account">
  <details data-testid="personal-account"><summary>{w.title}</summary>
   <p className="small">{w.note}</p><p className="small">{w.detail}</p>
   {(account.key===null||editing||account.key==='')&&<div className="key-editor" onKeyDown={event=>{if(event.key==='Enter'&&event.target instanceof HTMLInputElement){event.preventDefault();void save();}}}>
    <label htmlFor="personal-deepseek-key">{w.label}</label><div className="key-entry"><input id="personal-deepseek-key" type={shown?'text':'password'} value={draft} onChange={e=>{setDraft(e.target.value);setError(null);}} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={512} disabled={disabled||busy} aria-describedby="personal-key-test"/><button className="secondary" type="button" disabled={disabled||busy} aria-pressed={shown} onClick={()=>setShown(!shown)}>{shown?w.hide:w.show}</button></div>
    <p className="small" id="personal-key-test">{w.test}</p><div className="actions"><button className="secondary" type="button" disabled={disabled||busy||!draft.trim()} onClick={()=>void save()}>{busy?w.checking:w.save}</button>{editing&&<button className="secondary" type="button" disabled={disabled||busy} onClick={()=>{setEditing(false);setDraft('');setShown(false);setError(null);}}>{w.cancel}</button>}</div>
   </div>}
   {account.key!==null&&<div className="actions">{!editing&&account.key!==''&&<button className="secondary" type="button" disabled={disabled||busy} onClick={()=>{setEditing(true);setError(null);}}>{w.change}</button>}<button className="secondary" type="button" disabled={disabled||busy} onClick={()=>{if(account.remove()){setEditing(false);setDraft('');setShown(false);setError(null);}}}>{w.remove}</button></div>}
   {(error||account.error)&&<p role="alert" className="error-text">{errorMessage(error??account.error!,locale)}</p>}
  </details><p className="small account-status" role="status">{status}</p>
 </div>;
}
