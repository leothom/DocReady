import {it,expect} from "vitest";
import {buildDeckEvidence} from "../support/live-evidence";
import {reviewDeck,reviewSlide,goodResult} from "../fixtures/review-deck";
import {analyzeDeck} from "../../src/lib/review/analyze";
import {ReviewError} from "../../src/lib/review/types";
it("keeps recovered failure reasons and flags protected edits without saving lesson content",async()=>{
 const deck=reviewDeck([reviewSlide(1,"PRIVATE LESSON: Output was 2020.")]);let calls=0;
 const result=await analyzeDeck(deck,{subject:"Business",toeflLevel:3},{check:async b=>{
  if(!calls++)throw new ReviewError("INVALID_MODEL_OUTPUT",true,0,null,["UNCHANGED"]);
  const r=goodResult(b,true);r.findings[0].suggestedText="PRIVATE LESSON: Output was 2021.";return r;
 }},()=>{},new AbortController().signal,{retryDelayMs:0});
 const report=buildDeckEvidence(1,123,deck,result);
 const text=JSON.stringify(report);
 for(const privateValue of ["PRIVATE LESSON","originalText","suggestedText","explanation","shapeName"])expect(text).not.toContain(privateValue);
 expect(report).toMatchObject({humanQualityReview:"pending",coverage:{reviewed:1},qualityScreens:{changedNumbersOrSymbols:1}});
 expect(report.batches[0].attempts[0]).toMatchObject({errorCode:"INVALID_MODEL_OUTPUT",validationReasons:["UNCHANGED"]});
});
it("does not save unknown error strings",async()=>{
 const deck=reviewDeck([reviewSlide(1)]);
 const result=await analyzeDeck(deck,{subject:"Business",toeflLevel:3},{check:async()=>{throw new ReviewError("PRIVATE MODEL MESSAGE");}},()=>{},new AbortController().signal);
 expect(JSON.stringify(buildDeckEvidence(1,1,deck,result))).not.toContain("PRIVATE MODEL MESSAGE");
});
