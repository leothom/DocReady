import {it,expect} from "vitest";
import {analyzeDeck} from "../../src/lib/review/analyze";
import {ReviewError} from "../../src/lib/review/types";
import {reviewDeck,reviewSlide} from "../fixtures/review-deck";
it("does not count a retry cancelled during its wait",async()=>{
 const controller=new AbortController();let calls=0;
 const result=await analyzeDeck(reviewDeck([reviewSlide(1)]),{subject:"Business",toeflLevel:3},{check:async()=>{
  calls++;setTimeout(()=>controller.abort(),10);throw new ReviewError("MODEL_UNAVAILABLE",true);
 }},()=>{},controller.signal,{retryDelayMs:100});
 expect(calls).toBe(1);expect(result.metrics.automaticRetries).toBe(0);expect(result.status).toBe("cancelled");
});
