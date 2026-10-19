import {adminService} from '@/lib/server/runtime';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function handle(request:Request,context:{params:Promise<{path:string[]}>}){return adminService(request,(await context.params).path);}
export const GET=handle;
export const POST=handle;
