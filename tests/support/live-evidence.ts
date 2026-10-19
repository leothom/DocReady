import type {ExtractedDeck} from "../../src/lib/contracts";
import type {ReviewResult} from "../../src/lib/review/types";
import {VALIDATION_REASONS} from "../../src/lib/review/types";
import {reviewErrorCodes} from "../../src/lib/review/transport";
const safeCode=(code:string|undefined)=>code===undefined?undefined:code==="EXTRACTION_FAILED"||(reviewErrorCodes as readonly string[]).includes(code)?code:"UNKNOWN";
export function buildDeckEvidence(index:number,bytes:number,deck:ExtractedDeck,result:ReviewResult){
 const coverage={reviewed:0,failed:0,skipped:0,cancelled:0};
 for(const slide of result.slides)coverage[slide.status]++;
 const numbers=(s:string)=>s.match(/[+-]?\d+(?:[.,]\d+)*|[±²³°=−]/g)??[];
 const negation=(s:string)=>s.toLowerCase().match(/\b(?:no|not|never)\b/g)??[];
 return {deck:index,bytes,slides:deck.slides.length,elements:deck.slides.reduce((n,s)=>n+s.elements.length,0),characters:deck.extractedCharacters,
  warnings:[...new Set([...deck.warnings,...deck.slides.flatMap(s=>s.warnings)])],status:result.status,coverage,
  failedSlides:result.slides.filter(s=>s.status==="failed").map(s=>({slideNumber:s.slideNumber,errorCode:safeCode(s.errorCode)})),
  findings:result.findings.length,corrections:result.findings.filter(f=>f.reviewType==="correction").length,enhancements:result.findings.filter(f=>f.reviewType==="enhancement").length,
  qualityScreens:{changedNumbersOrSymbols:result.findings.filter(f=>JSON.stringify(numbers(f.originalText))!==JSON.stringify(numbers(f.suggestedText))).length,
   changedNegation:result.findings.filter(f=>JSON.stringify(negation(f.originalText))!==JSON.stringify(negation(f.suggestedText))).length},
  batches:result.batches.map(b=>({slides:b.slideNumbers,status:b.status,automaticRetries:b.automaticRetries,
   attempts:b.attempts.map(a=>({usage:a.usage,elapsedMs:a.elapsedMs,costUsd:a.costUsd,model:["deepseek-flash","deepseek-v4-pro"].includes(a.model)?a.model:"unknown",errorCode:safeCode(a.errorCode),
    validationReasons:(a.validationReasons??[]).filter(r=>VALIDATION_REASONS.includes(r))}))})),
  metrics:result.metrics,humanQualityReview:"pending" as const};
}
