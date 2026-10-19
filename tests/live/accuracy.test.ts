import {it,expect} from "vitest";
import {mkdirSync,readFileSync,writeFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {analyzeDeck} from "../../src/lib/review/analyze";
import {PROMPT_VERSION} from "../../src/lib/review/prompt";
import {createPilotChecker} from "../support/pilot-checker";
import {runSavedTrial} from "../support/fixed-trial";
import {evaluateCorpusCase,sumKnownAmounts,type CorpusCase} from "../support/corpus-quality";
import type {ReviewSettings,Slide} from "../../src/lib/contracts";
const corpus=JSON.parse(readFileSync(new URL("../fixtures/review-corpus.json",import.meta.url),"utf8")) as {version:string;toeflLevel:number;cases:CorpusCase[]};
function slideFor(c:CorpusCase):Slide{
 return {slideNumber:1,hidden:false,warnings:[],extractionStatus:"read",elements:c.text.map((text,i)=>({elementId:"el-"+i,shapeId:String(i+2),shapeName:"",text}))};
}
async function mapLimit<T,R>(items:T[],limit:number,fn:(t:T)=>Promise<R>):Promise<R[]>{
 const out:R[]=new Array(items.length);let cursor=0;
 async function worker(){while(true){const i=cursor++;if(i>=items.length)return;out[i]=await fn(items[i]);}}
 await Promise.all(Array.from({length:limit},()=>worker()));return out;
}
it("enforces corpus quality and saves each run before starting the next",async()=>{
 const began=Date.now(),trial=randomUUID();
 expect(corpus.cases.length,"the full corpus must be present").toBeGreaterThanOrEqual(17);
 expect(new Set(corpus.cases.map(c=>c.id)).size).toBe(corpus.cases.length);
 async function runOne(run:number){
  const started=Date.now();
  const checker=await createPilotChecker({origin:process.env.APP_ORIGIN??"http://localhost:3100",invite:process.env.PILOT_INVITE_SECRET??""});
  const cases=await mapLimit(corpus.cases,2,async c=>{
   const slide=slideFor(c),deck={slides:[slide],warnings:[],extractedCharacters:c.text.join("").length};
   const settings:ReviewSettings={subject:c.subject as ReviewSettings["subject"],toeflLevel:corpus.toeflLevel};
   const result=await analyzeDeck(deck,settings,checker,()=>{},new AbortController().signal);
   const quality=evaluateCorpusCase(c,result.findings,result.status);
   // Invented fixture text is saved for human review. No school source is saved.
   return {...quality,status:result.status,intent:c.intent,source:c.text,findings:result.findings,
    errors:result.slides.filter(s=>s.errorCode).map(s=>s.errorCode),models:[...new Set(result.batches.flatMap(b=>b.attempts.map(a=>a.model)))],metrics:result.metrics,
    attempts:result.batches.flatMap(b=>b.attempts.map(a=>({model:a.model,errorCode:a.errorCode,validationReasons:a.validationReasons??[],usage:a.usage,elapsedMs:a.elapsedMs,costUsd:a.costUsd})))};
  });
  return {run,elapsedMs:Date.now()-started,cases};
 }
 const savedRuns:Awaited<ReturnType<typeof runOne>>[]=[];
 const runs=await runSavedTrial(3,runOne,(run,value)=>{
  savedRuns.push(value);
  const rows=savedRuns.flatMap(r=>r.cases),issueCount=(code:string)=>rows.filter(row=>(row.issues as string[]).includes(code)).length;
  const total={cases:rows.length,passed:rows.filter(row=>row.passed).length,failed:rows.filter(row=>!row.passed).length,
   falseCorrections:issueCount("FALSE_CORRECTION"),missedCorrections:issueCount("MISSED_CORRECTION"),wrongCorrections:issueCount("WRONG_CORRECTION"),
   unexpectedFindings:issueCount("UNEXPECTED_FINDING"),incompleteReviews:issueCount("REVIEW_INCOMPLETE"),
   inputTokens:sumKnownAmounts(rows.map(row=>row.metrics.inputTokens)),outputTokens:sumKnownAmounts(rows.map(row=>row.metrics.outputTokens)),
   costUsd:sumKnownAmounts(rows.map(row=>row.metrics.costUsd)),elapsedMs:Date.now()-began};
  const report={generatedAt:new Date().toISOString(),trial,run,path:"private-app-route",promptVersion:PROMPT_VERSION,corpusVersion:corpus.version,
   models:[...new Set(rows.flatMap(row=>row.models))],automaticPass:total.failed===0,
   humanReview:{status:"pending",checks:["Correction meaning","Protected content","Optional enhancement benefit","English and Chinese meaning","Equal caution","Simplified Chinese and academic terms"]},runs:savedRuns,total};
  const path="evidence/corpus-app-"+trial+"-run-"+run+".json";
  mkdirSync("evidence",{recursive:true});writeFileSync(path,JSON.stringify(report,null,2));
  console.log(JSON.stringify({test:"corpus-app-path",run,report:path,automaticPass:report.automaticPass,humanReview:"pending",total}));
 },run=>run.cases.every(row=>row.passed));
 expect(runs).toHaveLength(3);
},300000);
