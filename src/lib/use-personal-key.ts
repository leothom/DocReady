"use client";
import {useEffect,useState} from 'react';
import {PERSONAL_KEY_STORAGE,validPersonalKey} from './personal-key';
import {decryptValue,encryptValue,isEncrypted} from './encrypted-storage';
export function usePersonalKey(){
 const [key,setKey]=useState<string|null>(null),[ready,setReady]=useState(false),[error,setError]=useState<string|null>(null);
 useEffect(()=>{
  let active=true;
  async function load(){
   if(!active)return;
   try{
    const saved=localStorage.getItem(PERSONAL_KEY_STORAGE);
    if(saved===null){setKey(null);setError(null);}
    else if(isEncrypted(saved)){
     const decrypted=await decryptValue(saved);
     if(decrypted!==null&&validPersonalKey(decrypted)){setKey(decrypted);setError(null);}
     else{setKey('');setError('PERSONAL_KEY_INVALID');}
    }else if(validPersonalKey(saved)){
     const encrypted=await encryptValue(saved);
     localStorage.setItem(PERSONAL_KEY_STORAGE,encrypted);
     setKey(saved);setError(null);
    }else{setKey('');setError('PERSONAL_KEY_INVALID');}
   }catch{setKey('');setError('KEY_STORAGE_UNAVAILABLE');}
   if(active)setReady(true);
  }
  const changed=(event:StorageEvent)=>{if(event.storageArea===localStorage&&(event.key===PERSONAL_KEY_STORAGE||event.key===null))void load();};
  void load();window.addEventListener('storage',changed);
  return ()=>{active=false;window.removeEventListener('storage',changed);};
 },[]);
 async function save(value:string):Promise<boolean>{
  if(!validPersonalKey(value)){setError('PERSONAL_KEY_INVALID');return false;}
  try{
   const encrypted=await encryptValue(value);
   localStorage.setItem(PERSONAL_KEY_STORAGE,encrypted);
   setKey(value);setError(null);return true;
  }catch{setError('KEY_SAVE_FAILED');return false;}
 }
 function remove(){
  try{localStorage.removeItem(PERSONAL_KEY_STORAGE);setKey(null);setError(null);return true;}
  catch{setError('KEY_REMOVE_FAILED');return false;}
 }
 return {key,ready,error,save,remove};
}
