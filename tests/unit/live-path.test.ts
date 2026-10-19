import {it,expect} from "vitest";
import {createPilotChecker} from "../support/pilot-checker";
import {createAccessService} from "../../src/lib/server/access";
import {createReviewService} from "../../src/lib/server/review";
import {createDeepSeekChecker} from "../../src/lib/server/deepseek";
import {reviewSlide,goodResult} from "../fixtures/review-deck";
const config={apiKey:"invented-test-key",model:"deepseek-flash",origin:"http://localhost:3100",inviteSecret:"a".repeat(64),sessionSecret:"b".repeat(64),inviteVersion:"1",enabled:true};
const settings={subject:"Business",toeflLevel:3} as const;
const batch=[reviewSlide(1)];
function localServer(invalid=false){
 const access=createAccessService({config}),service=createReviewService({access,checker:createDeepSeekChecker({apiKey:config.apiKey,model:config.model,fetcher:async()=>Response.json({status:"completed",output:[{type:"message",role:"assistant",content:[{type:"output_text",text:JSON.stringify({findings:[{...goodResult(batch,true).findings[0],...(invalid?{category:"simplify"}:{})}]})}]}]})})});
 return (async(input,init)=>{
  const request=new Request(String(input),init);
  if(new URL(request.url).pathname==="/api/invite")return access.invite(request);
  if(new URL(request.url).pathname==="/api/review")return service.review(request);
  throw new Error("UNEXPECTED_PATH");
 }) as typeof fetch;
}
it("authenticates and reviews through the real server and browser client contracts",async()=>{
 const checker=await createPilotChecker({origin:config.origin,invite:config.inviteSecret,fetcher:localServer()});
 const result=await checker.check(batch,settings,new AbortController().signal);
 expect(result.findings[0].suggestedText).toBe("The company sells goods.");
 expect(result.findings[0].category).toBe("grammar");
});
it("a wrong model category fails the app path instead of passing a direct checker",async()=>{
 const checker=await createPilotChecker({origin:config.origin,invite:config.inviteSecret,fetcher:localServer(true)});
 await expect(checker.check(batch,settings,new AbortController().signal)).rejects.toMatchObject({code:"INVALID_MODEL_OUTPUT"});
});
it("an invalid private invite stops the test before review",async()=>{
 await expect(createPilotChecker({origin:config.origin,invite:"wrong",fetcher:localServer()})).rejects.toThrow("LOCAL_INVITE_FAILED");
});
it.each(["https://outside.example","http://localhost:3100/wrong","http://localhost:3100/?token=bad","http://user:pass@localhost:3100"])("rejects unsafe test origin %s before network access",async origin=>{
 let called=false;
 await expect(createPilotChecker({origin,invite:config.inviteSecret,fetcher:async()=>{called=true;throw new Error("UNEXPECTED_NETWORK");}})).rejects.toThrow("LIVE_TEST_REQUIRES_LOCAL_SERVER");
 expect(called).toBe(false);
});
