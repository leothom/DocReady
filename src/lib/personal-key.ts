// Shared format check only. The provider checks whether the key is valid.
export const PERSONAL_KEY_STORAGE='docready.deepseek-key.v1';
export function validPersonalKey(value:unknown):value is string {
 return typeof value==='string'&&/^[A-Za-z0-9_-]{16,512}$/.test(value);
}
export function accountHeaders(key:string|null):Record<string,string>{
 return key===null?{}:{'X-DocReady-Account':'personal','X-DocReady-DeepSeek-Key':key};
}
