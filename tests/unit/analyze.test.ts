import {it,expect,vi} from "vitest";
import {analyzeDeck,retryFailedBatches} from "../../src/lib/review/analyze";
import {ReviewError,type EnglishChecker} from "../../src/lib/review/types";
import {reviewDeck,reviewSlide,goodResult} from "../fixtures/review-deck";
const settings={subject:"Business",toeflLevel:3} as const;
const options={retryDelayMs:0};
const signal=()=>new AbortController().signal;
it("runs at most two calls and keeps findings in slide order",async()=>{
 let active=0,max=0;
 const checker:EnglishChecker={check:async(batch)=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,batch[0].slideNumber===1?15:1));active--;return goodResult(batch,true);}};
 const result=await analyzeDeck(reviewDeck(Array.from({length:16},(_,i)=>reviewSlide(i+1))),settings,checker,()=>{},signal(),options);
 expect(max).toBe(2);expect(result.status).toBe("complete");expect(result.findings.map(f=>f.slideNumber)).toEqual([1,6,11,16]);expect(result.slides.every(s=>s.status==="reviewed")).toBe(true);
});
it("retries once on a recoverable failure and counts unknown failed-call usage",async()=>{
 const checker={check:vi.fn<EnglishChecker["check"]>().mockRejectedValueOnce(new ReviewError("MODEL_UNAVAILABLE",true)).mockImplementation(async b=>goodResult(b))};
 const result=await analyzeDeck(reviewDeck([reviewSlide(1)]),settings,checker,()=>{},signal(),options);
 expect(checker.check).toHaveBeenCalledTimes(2);expect(result.status).toBe("complete");expect(result.metrics.automaticRetries).toBe(1);expect(result.metrics.inputTokens).toBeNull();expect(result.metrics.knownInputTokens).toBe(100);expect(result.metrics.costUsd).toBeNull();
});
it("keeps zero-finding success separate from failed batches and unreadable slides",async()=>{
 const deck=reviewDeck([...Array.from({length:6},(_,i)=>reviewSlide(i+1)),{...reviewSlide(7),extractionStatus:"failed"}]);
 const checker:EnglishChecker={check:async batch=>{if(batch[0].slideNumber===6)throw new ReviewError("INVALID_MODEL_OUTPUT",true);return goodResult(batch);}};
 const result=await analyzeDeck(deck,settings,checker,()=>{},signal(),options);
 expect(result.status).toBe("partial");expect(result.findings).toEqual([]);expect(result.slides.map(x=>x.status)).toEqual(["reviewed","reviewed","reviewed","reviewed","reviewed","failed","failed"]);
});
it("does not retry expired access, permissions or billing errors",async()=>{
 const checker={check:vi.fn<EnglishChecker["check"]>().mockRejectedValue(new ReviewError("INVITE_REQUIRED"))};
 const result=await analyzeDeck(reviewDeck([reviewSlide(1)]),settings,checker,()=>{},signal(),options);
 expect(result.status).toBe("failed");expect(checker.check).toHaveBeenCalledOnce();
});
it("times out a non-cooperative checker and retries at most once",async()=>{
 const checker={check:vi.fn<EnglishChecker["check"]>(()=>new Promise(()=>{}))};
 const result=await analyzeDeck(reviewDeck([reviewSlide(1)]),settings,checker,()=>{},signal(),{...options,timeoutMs:5});
 expect(result.status).toBe("failed");expect(checker.check).toHaveBeenCalledTimes(2);expect(result.slides[0].errorCode).toBe("MODEL_TIMEOUT");
});
it("cancel aborts active calls and stops unsent batches",async()=>{
 const controller=new AbortController();let calls=0;
 const checker:EnglishChecker={check:async()=>{calls++;return new Promise(()=>{});}};
 const pending=analyzeDeck(reviewDeck(Array.from({length:20},(_,i)=>reviewSlide(i+1))),settings,checker,()=>{},controller.signal,options);
 await new Promise(r=>setTimeout(r,5));controller.abort();const result=await pending;
 expect(result.status).toBe("cancelled");expect(calls).toBe(2);expect(result.slides.every(s=>s.status==="cancelled")).toBe(true);
});
it("retains completed findings when cancellation stops another batch",async()=>{
 const controller=new AbortController();
 const checker:EnglishChecker={check:async batch=>{if(batch[0].slideNumber===1)return goodResult(batch,true);setTimeout(()=>controller.abort(),5);return new Promise(()=>{});}};
 const result=await analyzeDeck(reviewDeck(Array.from({length:6},(_,i)=>reviewSlide(i+1))),settings,checker,()=>{},controller.signal,options);
 expect(result.status).toBe("cancelled");expect(result.findings).toHaveLength(1);expect(result.slides[0].status).toBe("reviewed");expect(result.slides[5].status).toBe("cancelled");
});
it("retries only failed batches on request, with no duplicate findings",async()=>{
 const deck=reviewDeck(Array.from({length:6},(_,i)=>reviewSlide(i+1)));
 const first=await analyzeDeck(deck,settings,{check:async batch=>{if(batch[0].slideNumber===6)throw new ReviewError("MODEL_UNAVAILABLE");return goodResult(batch,true);}},()=>{},signal(),options);
 const checker={check:vi.fn<EnglishChecker["check"]>(async b=>goodResult(b,true))};
 const result=await retryFailedBatches(deck,settings,first,checker,()=>{},signal(),options);
 expect(checker.check).toHaveBeenCalledOnce();expect(checker.check.mock.calls[0][0][0].slideNumber).toBe(6);
 expect(result.findings.map(f=>f.slideNumber)).toEqual([1,6]);expect(result.status).toBe("complete");expect(result.metrics.manualRetryRuns).toBe(1);
});
it("rejects retry with a changed deck or settings",async()=>{
 const deck=reviewDeck([reviewSlide(1)]);
 const previous=await analyzeDeck(deck,settings,{check:async b=>goodResult(b)},()=>{},signal(),options);
 await expect(retryFailedBatches(reviewDeck([reviewSlide(1,"changed")]),settings,previous,{check:async b=>goodResult(b)},()=>{},signal())).rejects.toThrow("INVALID_RETRY");
 await expect(retryFailedBatches(deck,{subject:"English",toeflLevel:3},previous,{check:async b=>goodResult(b)},()=>{},signal())).rejects.toThrow("INVALID_RETRY");
});
it("reports real counts, skipped content, and supplied extraction time",async()=>{
 const progress=vi.fn();const deck=reviewDeck([reviewSlide(1),{...reviewSlide(2),elements:[],extractionStatus:"empty"}]);
 const result=await analyzeDeck(deck,settings,{check:async b=>goodResult(b)},progress,signal(),{...options,extractionMs:25});
 expect(result.slides[1].status).toBe("skipped");expect(progress.mock.calls.at(-1)?.[0]).toMatchObject({stage:"complete",completedBatches:1,totalBatches:1,activeBatches:0});
 expect(result.metrics.totalMs).toBeGreaterThanOrEqual(25);expect(result.metrics.inputTokens).toBe(100);expect(result.metrics.costUsd).toBe(.001);
});

it("a successful retry clears the old error code",async()=>{
 const checker={check:vi.fn<EnglishChecker["check"]>().mockRejectedValueOnce(new ReviewError("MODEL_UNAVAILABLE",true)).mockImplementation(async b=>goodResult(b))};
 const result=await analyzeDeck(reviewDeck([reviewSlide(1)]),settings,checker,()=>{},signal(),options);
 expect(result.slides[0].status).toBe("reviewed");expect(result.slides[0].errorCode).toBeUndefined();expect(result.batches[0].errorCode).toBeUndefined();
});
it("retrying failed batches cannot label previously cancelled slides complete",async()=>{
 const deck=reviewDeck(Array.from({length:6},(_,i)=>reviewSlide(i+1)));const c=new AbortController();
 const previous=await analyzeDeck(deck,settings,{check:async b=>{if(b[0].slideNumber===1)return goodResult(b);setTimeout(()=>c.abort(),1);return new Promise(()=>{});}},()=>{},c.signal,options);
 const checker={check:vi.fn<EnglishChecker["check"]>(async b=>goodResult(b))};
 const result=await retryFailedBatches(deck,settings,previous,checker,()=>{},signal(),options);
 expect(result.status).toBe("cancelled");expect(result.slides[5].status).toBe("cancelled");expect(checker.check).not.toHaveBeenCalled();
});
