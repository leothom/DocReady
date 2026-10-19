import {reviewService} from "../../../lib/server/runtime";
export const runtime="nodejs";
export async function POST(request:Request){return reviewService.review(request);}
