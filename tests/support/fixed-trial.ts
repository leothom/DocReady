export async function runSavedTrial<T>(count:number,run:(index:number)=>Promise<T>,save:(index:number,result:T)=>void,passes:(result:T)=>boolean):Promise<T[]>{
 const results:T[]=[];
 for(let index=1;index<=count;index++){
  const result=await run(index);
  save(index,result);
  results.push(result);
  if(!passes(result))throw new Error("LIVE_TRIAL_FAILED");
 }
 return results;
}
