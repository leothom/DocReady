import {test,expect} from "./teacher-fixture";
import {archive,parts,slide,shape,paragraph} from "../fixtures/build-pptx";
import {choose,language,open,run,response} from "./helpers";
for(const locale of ["en","zh-Hans"] as const){
 test(locale+" keeps file bytes, notes, media and feedback off the network",async({page})=>{
  const marker="PRIVATE_MARKER_73ab: The company sell goods. 需求";
  const note="PRIVATE_NOTES_938b",media="PRIVATE_MEDIA_62cd",filename="PRIVATE_FILENAME_583a.pptx";
  const bytes=Buffer.from(archive({...parts([slide(shape("2",paragraph(marker)))]),"ppt/notesSlides/notesSlide1.xml":note,"ppt/media/test.bin":new TextEncoder().encode(media),"docProps/core.xml":"PRIVATE_METADATA_183e"}));
  const requests:{url:string;body:Buffer|null}[]=[];
  page.on("request",r=>requests.push({url:r.url(),body:r.postDataBuffer()}));
  await page.route("**/api/review",async route=>{
   const data=response(route);data.findings[0].suggestedText=marker.replace("sell goods","sells goods");
   await route.fulfill({json:data});
  });
  await open(page);await language(page,locale);await page.getByTestId("subject").selectOption("Business");
  await choose(page,{name:filename,mimeType:"application/vnd.openxmlformats-officedocument.presentationml.presentation",buffer:bytes});
  await run(page);
  await expect(page.locator(".quote").first()).toHaveAttribute("lang","und");
  await expect(page.locator(".suggested")).toHaveAttribute("lang","und");
  await expect(page.getByTestId("download-feedback")).toHaveCount(0);
  await language(page,locale==="en"?"zh-Hans":"en");
  const storage=await page.evaluate(async()=>({local:{...localStorage},session:{...sessionStorage},databases:await indexedDB.databases(),caches:await caches.keys(),workers:(await navigator.serviceWorker.getRegistrations()).length}));
  expect(storage.local).toEqual({"slideready.locale":locale==="en"?"zh-Hans":"en"});
  expect(storage.session).toEqual({});expect(storage.databases).toEqual([]);expect(storage.caches).toEqual([]);expect(storage.workers).toBe(0);
  const review=requests.filter(r=>new URL(r.url).pathname==="/api/review");expect(review).toHaveLength(1);
  const outgoing=JSON.parse(review[0].body!.toString("utf8"));
  expect(outgoing.slides[0].elements[0].text).toBe(marker);
  for(const req of requests){
   expect(new URL(req.url).origin).toBe(new URL(page.url()).origin);
   const body=req.body?.toString("utf8")??"";
   if(body.includes(marker))expect(new URL(req.url).pathname).toBe("/api/review");
   for(const value of [note,media,filename,"PRIVATE_METADATA_183e"])expect(body).not.toContain(value);
   if(req.body){expect(req.body.equals(bytes)).toBe(false);expect(body).not.toContain(bytes.toString("base64"));}
  }
  await page.getByTestId("reset").click();await page.getByTestId("replace-review").click();
  await expect(page.locator("main")).not.toContainText(marker);
  await expect(page.getByTestId("finding")).toHaveCount(0);
  await page.reload();await expect(page.locator("main")).not.toContainText(marker);
 });
 test(locale+" does not show an upstream error body",async({page})=>{
  await open(page);await language(page,locale);await page.getByTestId("subject").selectOption("Business");
  await page.route("**/api/review",route=>route.fulfill({status:502,body:"PRIVATE_ERROR_MARKER_821f"}));
  await choose(page);await run(page);await expect(page.locator("main")).not.toContainText("PRIVATE_ERROR_MARKER_821f");
 });
}
test("page uses a fresh CSP nonce and restricts browser connections",async({page})=>{
 const first=await page.goto("/"),headers=first!.headers();
 const policy=headers["content-security-policy"];expect(policy).toBeTruthy();
 expect(policy).toContain("connect-src 'self'");expect(policy).toContain("frame-ancestors 'none'");expect(policy).not.toContain("https://api.deepseek.com");
 expect(headers["referrer-policy"]).toBe("no-referrer");expect(headers["cache-control"]).toContain("no-store");
 const nonce=policy.match(/'nonce-([^']+)'/)?.[1];expect(nonce).toBeTruthy();
 const scriptNonce=await page.locator("script").evaluateAll(nodes=>nodes.filter(n=>!n.getAttribute("src")).map(n=>(n as HTMLScriptElement).nonce));
 expect(scriptNonce.length).toBeGreaterThan(0);expect(scriptNonce.every(n=>n===nonce)).toBe(true);
 const second=await page.reload();expect(second!.headers()["content-security-policy"]).not.toContain("'nonce-"+nonce+"'");
 await expect(page.getByTestId("language")).toBeVisible();
});

