import {z} from "zod";
import {VALIDATION_REASONS} from "./types";
import {reviewOutputSchema,reviewSettingsSchema} from "../contracts";
export const validationReasonsSchema=z.array(z.enum(VALIDATION_REASONS)).max(10);
export const retryContextSchema=z.object({validationReasons:validationReasonsSchema}).strict();
export const requestSchema=z.object({
 reviewId:z.string().uuid().optional(),requestId:z.string().uuid().optional(),
 settings:reviewSettingsSchema,retryContext:retryContextSchema.optional(),
 slides:z.array(z.object({slideNumber:z.number().int().min(1).max(150),elements:z.array(z.object({
  shapeId:z.string().min(1).max(200),elementId:z.string().min(1).max(500),text:z.string().min(1).max(150000),
 }).strict()).min(1).max(5000)}).strict()).min(1).max(5),
}).strict();
const token=z.number().int().nonnegative().max(10000000).nullable();
export const attemptMetricsSchema=z.object({
 usage:z.object({inputTokens:token,outputTokens:token,cachedInputTokens:token}).strict(),
 elapsedMs:z.number().nonnegative().max(86400000),costUsd:z.number().nonnegative().nullable(),model:z.string().min(1).max(200),
}).strict();
export const batchResultSchema=attemptMetricsSchema.extend({findings:reviewOutputSchema.shape.findings}).strict();
export const reviewErrorCodes=["PERSONAL_KEY_INVALID","PERSONAL_KEY_FAILED","RESULT_UNAVAILABLE","DAILY_LIMIT","MODEL_UNAVAILABLE","MODEL_ACCESS_FAILED","MODEL_REQUEST_REJECTED","MODEL_TIMEOUT","INVALID_MODEL_OUTPUT","TOO_MANY_REQUESTS","INVITE_REQUIRED","NOT_CONFIGURED","ACCESS_DENIED","INVALID_REQUEST","REQUEST_TOO_LARGE","CANCELLED"] as const;
export const errorTransportSchema=z.object({error:z.enum(reviewErrorCodes),retryable:z.boolean().optional(),retryAfterMs:z.number().nonnegative().max(60000).optional(),metrics:attemptMetricsSchema.nullable().optional(),validationReasons:validationReasonsSchema.optional()}).strict();
