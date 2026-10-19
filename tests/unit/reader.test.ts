import {it,expect,vi} from "vitest";
import {createLocalReader,type ReadState,type WorkerPort} from "../../src/lib/docx/reader";
function setup(){const states:ReadState[]=[];const workers:WorkerPort[]=[];const reader=createLocalReader(()=>{const w={postMessage:vi.fn(),terminate:vi.fn(),onmessage:null,onerror:null} as WorkerPort;workers.push(w);return w;},s=>states.push(s));return {reader,states,workers};}
const file=(name="demo.pptx")=>({name,size:100,arrayBuffer:async()=>new ArrayBuffer(100)});
it("rejects file type and input size before creating a worker",async()=>{
 const t=setup();await t.reader.read(file("demo.ppt"));expect(t.states.at(-1)).toEqual({status:"error",code:"PPTX_ONLY"});expect(t.workers).toHaveLength(0);
 await t.reader.read({...file(),size:26*1024*1024});expect(t.states.at(-1)).toEqual({status:"error",code:"FILE_TOO_LARGE"});
});
it("transfers the file buffer and terminates after a result",async()=>{
 const t=setup();await t.reader.read(file());expect(t.states.at(-1)).toEqual({status:"reading"});
 const send=vi.mocked(t.workers[0].postMessage).mock.calls[0];expect(send[1]).toEqual([(send[0] as {data:ArrayBuffer}).data]);
 const id=(send[0] as {requestId:number}).requestId;const deck={slides:[],warnings:[],extractedCharacters:0};
 t.workers[0].onmessage!({data:{type:"result",requestId:id,deck}} as MessageEvent);
 expect(t.states.at(-1)).toEqual({status:"done",deck});expect(t.workers[0].terminate).toHaveBeenCalledOnce();
});
it("cancel terminates the worker and ignores late results",async()=>{
 const t=setup();await t.reader.read(file());const callback=t.workers[0].onmessage!;
 t.reader.cancel();callback({data:{type:"result",requestId:1,deck:{}}} as MessageEvent);
 expect(t.states.at(-1)).toEqual({status:"cancelled"});expect(t.workers[0].terminate).toHaveBeenCalledOnce();
});
it("a new file blocks an old asynchronous read and old worker results",async()=>{
 const t=setup();let release:(data:ArrayBuffer)=>void=()=>{};
 const old=t.reader.read({...file(),arrayBuffer:()=>new Promise<ArrayBuffer>(resolve=>release=resolve)});
 await t.reader.read(file());release(new ArrayBuffer(100));await old;
 expect(t.workers).toHaveLength(1);expect(t.states.at(-1)).toEqual({status:"reading"});
 await t.reader.read(file());const previous=t.workers[0].onmessage!;
 previous({data:{type:"error",requestId:2,code:"INVALID_FILE"}} as MessageEvent);
 expect(t.states.at(-1)).toEqual({status:"reading"});
});
it("worker crashes and file read failure end in a clear error",async()=>{
 const t=setup();await t.reader.read(file());t.workers[0].onerror!(new Event("error") as ErrorEvent);
 expect(t.states.at(-1)).toEqual({status:"error",code:"READ_FAILED"});
 await t.reader.read({...file(),arrayBuffer:async()=>{throw new Error("private detail");}});
 expect(t.states.at(-1)).toEqual({status:"error",code:"READ_FAILED"});
});
