const TAG='docready.ek.v1';
const SALT=new TextEncoder().encode('docready-personal-key-v1');
const ITERATIONS=600_000;
const PASSPHRASE='docready-local-encryption-key-do-not-reuse';

async function deriveKey():Promise<CryptoKey>{
 const baseKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(PASSPHRASE),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt:SALT,iterations:ITERATIONS,hash:'SHA-256'},baseKey,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}

export async function encryptValue(plaintext:string):Promise<string>{
 const key=await deriveKey();
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(plaintext));
 return JSON.stringify({v:1,iv:Array.from(iv),ct:Array.from(new Uint8Array(ct))});
}

export async function decryptValue(stored:string):Promise<string|null>{
 try{
  const parsed=JSON.parse(stored);
  if(parsed.v!==1||!Array.isArray(parsed.iv)||!Array.isArray(parsed.ct))return null;
  const key=await deriveKey();
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(parsed.iv)},key,new Uint8Array(parsed.ct));
  return new TextDecoder().decode(plain);
 }catch{return null;}
}

export function isEncrypted(stored:string):boolean{
 try{const p=JSON.parse(stored);return p.v===1&&Array.isArray(p.iv)&&Array.isArray(p.ct);}catch{return false;}
}

export{TAG};
