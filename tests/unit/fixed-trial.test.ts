import {it,expect,vi} from "vitest";
import {runSavedTrial} from "../support/fixed-trial";
it("saves a failed first run and makes no later paid run",async()=>{
 const run=vi.fn(async()=>({passed:false})),save=vi.fn();
 await expect(runSavedTrial(3,run,save,r=>r.passed)).rejects.toThrow("LIVE_TRIAL_FAILED");
 expect(run).toHaveBeenCalledOnce();expect(save).toHaveBeenCalledWith(1,{passed:false});
});
it("keeps first-run evidence if the second sign-in fails",async()=>{
 const run=vi.fn(async(n:number)=>{if(n===2)throw new Error("LOCAL_INVITE_FAILED");return {passed:true};}),save=vi.fn();
 await expect(runSavedTrial(3,run,save,r=>r.passed)).rejects.toThrow("LOCAL_INVITE_FAILED");
 expect(save).toHaveBeenCalledOnce();expect(save).toHaveBeenCalledWith(1,{passed:true});expect(run).toHaveBeenCalledTimes(2);
});
it("saves each of three successful runs before starting the next",async()=>{
 const events:string[]=[];
 const result=await runSavedTrial(3,async n=>{events.push("run"+n);return n;},n=>{events.push("save"+n);},()=>true);
 expect(result).toEqual([1,2,3]);expect(events).toEqual(["run1","save1","run2","save2","run3","save3"]);
});
