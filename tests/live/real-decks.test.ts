import {it,expect} from "vitest";
import {mkdirSync,readFileSync,readdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {extractDocx} from "../../src/lib/docx/extract";
import {analyzeDeck} from "../../src/lib/review/analyze";
import {PROMPT_VERSION} from "../../src/lib/review/prompt";
import {createPilotChecker} from "../support/pilot-checker";
import {buildDeckEvidence} from "../support/live-evidence";
const settings={subject:"Business",toeflLevel:3} as const;
it("reviews all five permitted decks in three consecutive private app runs",async()=>{
 const dir=process.env.SLIDEREADY_TEST_DECK_DIR;
 if(!dir)throw new Error("SLIDEREADY_TEST_DECK_DIR_NOT_SET");
 const files=readdirSync(dir).filter(f=>f.toLowerCase().endsWith(".pptx")).sort();
 expect(files).toHaveLength(5);
 const trial=randomUUID();
 for(let run=1;run<=3;run++){
  // Use the normal pilot limits. Let the previous request-rate window expire.
  if(run>1)await new Promise(resolve=>setTimeout(resolve,65000));
  const decks=[];
  for(let index=0;index<files.length;index++){
   const bytes=readFileSync(join(dir,files[index]));
   const data=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;
   const began=Date.now();let deck;
   try{deck=extractDocx(data);}catch{decks.push({deck:index+1,status:"extraction_failed",extractionMs:Date.now()-began});continue;}
   const extractionMs=Date.now()-began;
   const checker=await createPilotChecker({origin:process.env.APP_ORIGIN??"http://localhost:3100",invite:process.env.PILOT_INVITE_SECRET??""});
   const result=await analyzeDeck(deck,settings,checker,()=>{},new AbortController().signal,{extractionMs});
   decks.push(buildDeckEvidence(index+1,bytes.length,deck,result));
  }
  const report={generatedAt:new Date().toISOString(),trial,run,promptVersion:PROMPT_VERSION,path:"private-app-route",settings,decks};
  const path="evidence/decks-app-"+trial+"-run-"+run+".json";
  mkdirSync("evidence",{recursive:true});writeFileSync(path,JSON.stringify(report,null,2));
  console.log(JSON.stringify({test:"real-decks-app-path",run,report:path,decks:decks.map(d=>({deck:d.deck,status:d.status,slides:"slides" in d?d.slides:0}))}));
  // Save every run before asserting. A failed run stops this fixed trial.
  expect(decks.reduce((n,d)=>n+("slides" in d?d.slides:0),0)).toBe(205);
  for(const deck of decks){
   expect(deck.status,"run "+run+" deck "+deck.deck+" failed; see "+path).toBe("complete");
   if(!("coverage" in deck))expect.fail("EXTRACTION_FAILED");
   expect(deck.coverage.failed).toBe(0);expect(deck.coverage.cancelled).toBe(0);expect(deck.coverage.skipped).toBe(0);
   expect(deck.coverage.reviewed).toBe(deck.slides);
   expect(deck.qualityScreens.changedNumbersOrSymbols,"protected number/symbol changed").toBe(0);
   expect(deck.qualityScreens.changedNegation,"protected negation changed").toBe(0);
  }
 }
},600000);
