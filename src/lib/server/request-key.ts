import {validPersonalKey} from '../personal-key';
import {ReviewError} from '../review/types';
export function requestPersonalKey(request:Request):string|null {
 const mode=request.headers.get('x-docready-account'),key=request.headers.get('x-docready-deepseek-key');
 if(mode===null&&key===null)return null;
 if(mode!=='personal'||!validPersonalKey(key))throw new ReviewError('PERSONAL_KEY_INVALID');
 return key;
}
