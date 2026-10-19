import type {ReviewResult} from "./types";
import type {AppLocale} from "../i18n/locale";
import {getMessages,subjects} from "../i18n/messages";
import {PROMPT_VERSION} from "./prompt";
export type Decisions=Record<string,"accepted"|"ignored">;
export type FeedbackReport=ReturnType<typeof makeFeedbackReport>;
export function makeFeedbackReport(result:ReviewResult,decisions:Decisions,locale:AppLocale){
 const accepted=result.findings.filter(f=>decisions[f.id]==="accepted").length;
 const ignored=result.findings.filter(f=>decisions[f.id]==="ignored").length;
 const w=getMessages(locale),m=result.metrics;
 return {
  schemaVersion:1,locale,promptVersion:PROMPT_VERSION,
  models:[...new Set(result.batches.flatMap(b=>b.attempts.map(a=>a.model)))],
  status:result.status,settings:{subject:result.settings.subject,toeflLevel:result.settings.toeflLevel},
  labels:{title:w.feedbackTitle,subject:subjects[result.settings.subject][locale]},
  coverage:Object.fromEntries(["reviewed","failed","skipped","cancelled"].map(status=>[status,result.slides.filter(s=>s.status===status).length])),
  findings:{corrections:result.findings.filter(f=>f.reviewType==="correction").length,enhancements:result.findings.filter(f=>f.reviewType==="enhancement").length},
  decisions:{accepted,ignored,pending:result.findings.length-accepted-ignored},
  metrics:{extractionMs:m.extractionMs,reviewMs:m.reviewMs,modelMs:m.modelMs,totalMs:m.totalMs,inputTokens:m.inputTokens,outputTokens:m.outputTokens,
   knownInputTokens:m.knownInputTokens,knownOutputTokens:m.knownOutputTokens,costUsd:m.costUsd,knownCostUsd:m.knownCostUsd,automaticRetries:m.automaticRetries,manualRetryRuns:m.manualRetryRuns,usageComplete:m.usageComplete,attempts:m.attempts},
 };
}
