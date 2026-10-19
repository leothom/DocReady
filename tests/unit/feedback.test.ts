import {it,expect} from "vitest";
import {makeFeedbackReport} from "../../src/lib/review/feedback";
import {analyzeDeck} from "../../src/lib/review/analyze";
import {goodResult,reviewDeck,reviewSlide} from "../fixtures/review-deck";
it("exports only aggregate feedback with stable keys and no lesson content",async()=>{
 const result=await analyzeDeck(reviewDeck([reviewSlide(1,"PRIVATE LESSON SENTENCE")]),{subject:"Business",toeflLevel:3},{check:async b=>goodResult(b,true)},()=>{},new AbortController().signal);
 const f=result.findings[0];
 const report=makeFeedbackReport(result,{[f.id]:"accepted",unknown:"ignored"},"zh-Hans");
 expect(report).toMatchObject({schemaVersion:1,locale:"zh-Hans",promptVersion:"slideready-review-0.6",models:["deepseek-flash"],status:"complete",settings:{subject:"Business",toeflLevel:3},decisions:{accepted:1,ignored:0,pending:0}});
 const json=JSON.stringify(report);
 for(const secret of ["PRIVATE LESSON SENTENCE",f.suggestedText,f.explanation.en,f.id,result.sourceKey,"originalText","suggestedText","explanation","filename","apiKey"])expect(json).not.toContain(secret);
 expect(report).toHaveProperty("coverage.reviewed",1);expect(report).toHaveProperty("metrics.inputTokens",100);
});
it("keeps unknown metrics unknown in feedback",async()=>{
 const result=await analyzeDeck(reviewDeck([reviewSlide(1)]),{subject:"Business",toeflLevel:3},{check:async()=>{throw Error("private provider data");}},()=>{},new AbortController().signal,{retryDelayMs:0});
 expect(makeFeedbackReport(result,{},"en")).toMatchObject({status:"failed",metrics:{inputTokens:null,costUsd:null}});
});
