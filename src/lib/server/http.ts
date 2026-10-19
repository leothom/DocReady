export function safeJson(body:unknown,status=200,headers:Record<string,string>={}){
 return Response.json(body,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...headers}});
}
export async function limitedText(body:ReadableStream<Uint8Array>|null,max:number,signal:AbortSignal):Promise<string>{
 if(!body)return "";const reader=body.getReader();const chunks:Uint8Array[]=[];let size=0;
 const stop=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener("abort",stop,{once:true});
 try{
  while(true){if(signal.aborted)throw new Error("ABORTED");const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new Error("SIZE_LIMIT");}chunks.push(value);}
  if(signal.aborted)throw new Error("ABORTED");
  return Buffer.concat(chunks).toString("utf8");
 }finally{signal.removeEventListener("abort",stop);reader.releaseLock();}
}
