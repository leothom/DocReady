import {reviewOutputSchema,type Finding,type Slide} from "../contracts";
import type {ValidationReason} from "./types";
export class FindingValidationError extends Error {
 readonly validationReasons:ValidationReason[];
 constructor(reason:ValidationReason){super("INVALID_FINDINGS");this.name="FindingValidationError";this.validationReasons=[reason];}
}
// Quote shape alone does not change English correctness. Preserve every other character.
function quoteStyle(text:string){return text.replace(/[‘’]/g,"'").replace(/[“”]/g,'"');}
export function validateFindings(raw:unknown,batch:Slide[]):Finding[] {
 const parsed=reviewOutputSchema.safeParse(raw);
 if(!parsed.success)throw new FindingValidationError("SCHEMA");
 const elements=new Map(batch.filter(s=>s.extractionStatus==="read").flatMap(slide=>slide.elements.map(element=>[slide.slideNumber+"/"+element.elementId,{slide,element}] as const)));
 const used=new Set<string>();
 return parsed.data.findings.map(finding=>{
  const source=elements.get(finding.slideNumber+"/"+finding.elementId);
  const id="finding/"+finding.slideNumber+"/"+encodeURIComponent(finding.elementId)+"/"+finding.reviewType;
  if(!source||source.element.shapeId!==finding.shapeId)throw new FindingValidationError("SOURCE_ID");
  if(source.element.text!==finding.originalText)throw new FindingValidationError("SOURCE_TEXT");
  if(finding.suggestedText===finding.originalText)throw new FindingValidationError("UNCHANGED");
  if(!finding.suggestedText.trim())throw new FindingValidationError("EMPTY_SUGGESTION");
  if(!finding.explanation.en.trim()||!finding.explanation["zh-Hans"].trim())throw new FindingValidationError("EMPTY_EXPLANATION");
  if(used.has(id))throw new FindingValidationError("DUPLICATE");
  used.add(id);
  return {...finding,id};
 }).filter(finding=>quoteStyle(finding.originalText)!==quoteStyle(finding.suggestedText));
}
