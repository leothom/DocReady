import {readFileSync} from 'node:fs';
import {createAccessService} from './access';
import {createDeepSeekChecker,type PriceTier} from './deepseek';
import {createReviewService} from './review';
import {InviteStore} from './store';
import {createAdminService} from './admin';
const config={apiKey:process.env.DEEPSEEK_API_KEY??'',model:process.env.DEEPSEEK_MODEL??'deepseek-flash',origin:process.env.APP_ORIGIN??'',inviteSecret:'',sessionSecret:process.env.SESSION_SECRET??'',inviteVersion:process.env.PILOT_VERSION??'2',enabled:process.env.PILOT_ENABLED==='true'};
if(config.enabled&&!config.apiKey)throw new Error('DEEPSEEK_API_KEY is required when PILOT_ENABLED is true');
let instance:InviteStore|undefined;
export function getStore(){
 const path=process.env.DOCREADY_DB_PATH;
 const limit=Number(process.env.PILOT_DAILY_LIMIT);
 if(!path||!Number.isInteger(limit)||limit<1||limit>10000)throw new Error('NOT_CONFIGURED');
 return instance??=new InviteStore(path,limit);
}
const priceTier:PriceTier=process.env.DEEPSEEK_PRICE_TIER==='peak'?'peak':process.env.DEEPSEEK_PRICE_TIER==='off_peak'?'off_peak':null;
export const accessService=createAccessService({config,store:getStore});
export const reviewService=createReviewService({access:accessService,checker:createDeepSeekChecker({apiKey:config.apiKey,model:config.model,priceTier}),personalChecker:apiKey=>createDeepSeekChecker({apiKey,model:config.model,priceTier}),store:getStore});
export const adminService=createAdminService(getStore,config.origin,()=>{
 const path=process.env.DOCREADY_ADMIN_HASH_PATH;
 return path?readFileSync(path,'utf8').trim():'';
});
