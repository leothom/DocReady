import {extractDocx} from "./extract";
self.onmessage=(event:MessageEvent<{type:string;requestId:number;data:ArrayBuffer}>)=>{
 const {type,requestId,data}=event.data;if(type!=="extract")return;
 try {self.postMessage({type:"result",requestId,deck:extractDocx(data)});}
 catch(error){self.postMessage({type:"error",requestId,code:error instanceof Error?error.message:"READ_FAILED"});}
};
