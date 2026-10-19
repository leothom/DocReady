import {it,expect,vi} from "vitest";
import {createLocalReader,type WorkerPort} from "../../src/lib/docx/reader";
it("cleanup stops work without reporting a user cancellation",async()=>{
 const notify=vi.fn();const worker={postMessage:vi.fn(),terminate:vi.fn(),onmessage:null,onerror:null} as WorkerPort;
 const reader=createLocalReader(()=>worker,notify);
 await reader.read({name:"x.pptx",size:1,arrayBuffer:async()=>new ArrayBuffer(1)});
 notify.mockClear();
 (reader as ReturnType<typeof createLocalReader>&{dispose:()=>void}).dispose();
 expect(notify).not.toHaveBeenCalled();expect(worker.terminate).toHaveBeenCalledOnce();
});
