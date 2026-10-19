import {accessService} from '@/lib/server/runtime';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(request:Request){return accessService.status(request);}
