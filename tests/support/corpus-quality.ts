import type {ModelFinding} from "../../src/lib/contracts";
export type CorpusCase={id:string;subject:string;text:string[];intent:string;category?:string;requiredEdits?:{from:string;to:string}[];protectedTerms?:string[];requiredDemand?:string[];expectedCorrections?:{elementIndex:number;category:string;requiredEdits:{from:string;to:string}[]}[];noFindingElements?:number[]};
export type QualityIssue="REVIEW_INCOMPLETE"|"SOURCE_MISMATCH"|"MISSED_CORRECTION"|"WRONG_CORRECTION"|"FALSE_CORRECTION"|"UNEXPECTED_FINDING"|"PROTECTED_CONTENT_CHANGED"|"ACADEMIC_DEMAND_CHANGED"|"EXPLANATION_LANGUAGE_MISSING"|"INVALID_EXPECTATION";
export type QualityResult={id:string;passed:boolean;issues:QualityIssue[];corrections:number;enhancements:number;humanReview:"pending"};
const words=(text:string):string[]=>text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];
function correctChange(c:CorpusCase,f:ModelFinding){
 const expectation=c.expectedCorrections?.find(e=>f.elementId==="el-"+e.elementIndex);
 const category=c.expectedCorrections?expectation?.category:c.category,edits=c.expectedCorrections?expectation?.requiredEdits:c.requiredEdits;
 if(f.category!==category||!edits?.length)return false;
 const expected=words(f.originalText).map(word=>edits.find(edit=>edit.from.toLowerCase()===word)?.to.toLowerCase()??word);
 return expected.join(" ")===words(f.suggestedText).join(" ")&&f.suggestedText!==f.originalText;
}
function preserved(c:CorpusCase,f:ModelFinding){
 const numbers=(text:string)=>text.match(/[+-]?\d+(?:[.,]\d+)*|[±²³°=−]/g)??[];
 const negation=(text:string)=>words(text).filter(w=>["no","not","never"].includes(w));
 return JSON.stringify(numbers(f.originalText))===JSON.stringify(numbers(f.suggestedText))&&JSON.stringify(negation(f.originalText))===JSON.stringify(negation(f.suggestedText))&&
  (c.protectedTerms??[]).every(term=>f.suggestedText.toLowerCase().includes(term.toLowerCase()));
}
function keepsDemand(text:string,demand:string){
 const lower=text.toLowerCase();
 if(demand==="compare")return /\b(?:compare|comparing|comparison)\b/.test(lower);
 if(demand==="justify")return /\b(?:justify|justifying|justification)\b|\b(?:give|provide)\s+(?:a\s+|the\s+|your\s+)?reasons?\b|\bexplain\s+why\b/.test(lower);
 return words(text).includes(demand);
}
export function evaluateCorpusCase(c:CorpusCase,findings:ModelFinding[],status="complete"):QualityResult{
 const issues=new Set<QualityIssue>(),corrections=findings.filter(f=>f.reviewType==="correction"),enhancements=findings.filter(f=>f.reviewType==="enhancement");
 if(!["correction","optional enhancement","no correction","no finding","no obedience"].includes(c.intent))issues.add("INVALID_EXPECTATION");
 if(status!=="complete")issues.add("REVIEW_INCOMPLETE");
 for(const f of findings){
  if((c.noFindingElements??[]).some(i=>f.elementId==="el-"+i))issues.add("UNEXPECTED_FINDING");
  if(!c.text.includes(f.originalText))issues.add("SOURCE_MISMATCH");
  if(!preserved(c,f))issues.add("PROTECTED_CONTENT_CHANGED");
  if(!/[A-Za-z]{2,}/.test(f.explanation.en)||!/[\u3400-\u9fff]/.test(f.explanation["zh-Hans"]))issues.add("EXPLANATION_LANGUAGE_MISSING");
  if(f.reviewType==="enhancement"&&(c.requiredDemand??[]).some(word=>!keepsDemand(f.suggestedText,word)))issues.add("ACADEMIC_DEMAND_CHANGED");
 }
 if(c.intent==="correction"){
  if(c.expectedCorrections){
   if(!c.expectedCorrections.length)issues.add("INVALID_EXPECTATION");
   for(const e of c.expectedCorrections)if(!corrections.some(f=>f.elementId==="el-"+e.elementIndex&&correctChange(c,f)))issues.add("MISSED_CORRECTION");
  }else if(!corrections.some(f=>correctChange(c,f)))issues.add("MISSED_CORRECTION");
  if(corrections.some(f=>!correctChange(c,f)))issues.add("WRONG_CORRECTION");
 }else if(corrections.length)issues.add("FALSE_CORRECTION");
 if(["no finding","no obedience"].includes(c.intent)&&findings.length)issues.add("UNEXPECTED_FINDING");
 return {id:c.id,passed:issues.size===0,issues:[...issues],corrections:corrections.length,enhancements:enhancements.length,humanReview:"pending"};
}
export function sumKnownAmounts(values:(number|null)[]):{total:number|null;known:number;complete:boolean}{
 const complete=values.length>0&&values.every(v=>v!==null);
 const known=values.reduce<number>((sum,v)=>sum+(v??0),0);
 return {total:complete?known:null,known,complete};
}
