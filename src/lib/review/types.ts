import type {Finding,ModelFinding,ReviewSettings,Slide} from "../contracts";
export const VALIDATION_REASONS=["ENVELOPE","INCOMPLETE","JSON","SCHEMA","SOURCE_ID","SOURCE_TEXT","UNCHANGED","EMPTY_SUGGESTION","EMPTY_EXPLANATION","DUPLICATE","SIZE_LIMIT"] as const;
export type ValidationReason=typeof VALIDATION_REASONS[number];
export type ReviewRetryContext={validationReasons:ValidationReason[]};
export type ReviewAttempt=AttemptMetrics&{errorCode?:string;validationReasons?:ValidationReason[]};
export type Usage={inputTokens:number|null;outputTokens:number|null;cachedInputTokens:number|null};
export type AttemptMetrics={usage:Usage;elapsedMs:number;costUsd:number|null;model:string};
export type BatchResult=AttemptMetrics&{findings:ModelFinding[]};
export interface EnglishChecker {check(batch:Slide[],settings:ReviewSettings,signal:AbortSignal,context?:ReviewRetryContext):Promise<BatchResult>;}
export class ReviewError extends Error {
 constructor(public code:string,public retryable=false,public retryAfterMs=0,public metrics:AttemptMetrics|null=null,public validationReasons:ValidationReason[]=[]){super(code);this.name="ReviewError";}
}
export type ReviewBatch={id:string;slides:Slide[];characters:number};
export type BatchOutcome={id:string;slideNumbers:number[];status:"reviewed"|"failed"|"cancelled";findings:Finding[];attempts:ReviewAttempt[];automaticRetries:number;errorCode?:string};
export type Progress={stage:"reviewing"|"preparing"|"complete";completedBatches:number;totalBatches:number;failedBatches:number;activeBatches:number};
export type ReviewResult={
 status:"complete"|"partial"|"failed"|"cancelled";findings:Finding[];
 slides:{slideNumber:number;status:"reviewed"|"failed"|"skipped"|"cancelled";errorCode?:string}[];
 batches:BatchOutcome[];warnings:string[];sourceKey:string;settings:ReviewSettings;
 metrics:{extractionMs:number|null;reviewMs:number;modelMs:number;totalMs:number|null;inputTokens:number|null;outputTokens:number|null;knownInputTokens:number;knownOutputTokens:number;costUsd:number|null;knownCostUsd:number;automaticRetries:number;manualRetryRuns:number;usageComplete:boolean;attempts:number};
};
