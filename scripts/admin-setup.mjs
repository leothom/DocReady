// Run with the app stopped. Read the password from stdin, never from an argument.
import {randomBytes,scryptSync} from 'node:crypto';
import {mkdirSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync,chmodSync,existsSync,unlinkSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';

async function readPassword(){
 if(process.argv.length!==2)throw new Error('Use stdin for the password. Arguments are not allowed.');
 const chunks=[];let bytes=0;
 const timer=setTimeout(()=>process.stdin.destroy(new Error('Password input timed out.')),30000);
 try{for await(const chunk of process.stdin){bytes+=chunk.length;if(bytes>1024)throw new Error('Password input is too long.');chunks.push(chunk);}}
 finally{clearTimeout(timer);}
 const password=Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/,'');
 if(password.length<16||password.length>256||/[\r\n\0]/.test(password))throw new Error('Use a password with 16 to 256 characters on one line.');
 return password;
}
let temporary;
try{
 const password=await readPassword();
 const path=resolve(process.env.DOCREADY_ADMIN_HASH_PATH??'/data/admin-password.hash');
 const database=resolve(process.env.DOCREADY_DB_PATH??'/data/docready.sqlite');
 const salt=randomBytes(16).toString('hex');
 const encoded=salt+':'+scryptSync(password,salt,64).toString('hex')+'\n';
 mkdirSync(dirname(path),{recursive:true,mode:0o700});
 temporary=path+'.'+randomBytes(12).toString('hex')+'.tmp';
 const fd=openSync(temporary,'wx',0o600);
 try{writeFileSync(fd,encoded);fsyncSync(fd);}finally{closeSync(fd);}
 let db;
 try{
  if(existsSync(database)){
   db=new DatabaseSync(database);db.exec('PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
   if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_sessions'").get())db.exec('DELETE FROM admin_sessions');
  }
  renameSync(temporary,path);temporary=undefined;chmodSync(path,0o600);
  if(db)db.exec('COMMIT');
 }catch(error){if(db){try{db.exec('ROLLBACK');}catch{}}throw error;}finally{db?.close();}
 console.log('Owner password saved. Previous admin sessions removed.');
}catch(error){
 if(temporary){try{unlinkSync(temporary);}catch{}}
 // No password, hash, file content, or database details appear in errors.
 console.error(error instanceof Error&&/^(Use |Password input)/.test(error.message)?error.message:'Owner password setup failed. Check the private data volume and file permissions.');
 process.exitCode=1;
}
