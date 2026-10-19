import {describe,it,expect} from "vitest";
import {extractDocx} from "../../src/lib/docx/extract";
import {parts,archive,slide,shape,paragraph} from "../fixtures/build-pptx";

function withTarget(target:string,mode="") {
 const data=parts();
 data["ppt/_rels/presentation.xml.rels"]=data["ppt/_rels/presentation.xml.rels"].replace('Target="slides/slide1.xml"',`Target="${target}"${mode?' TargetMode="'+mode+'"':""}`);
 return archive(data);
}
describe("internal slide relationship paths",()=>{
 it.each(["/ppt/slides/slide1.xml","slides/slide1.xml","./slides/slide1.xml","../ppt/slides/slide1.xml"])("reads safe internal target %s",target=>{
  const deck=extractDocx(withTarget(target));
  expect(deck.slides[0].extractionStatus).toBe("read");
  expect(deck.slides[0].elements[0].text).toBe("Test text");
 });
 it("keeps slide order with mixed absolute and relative internal paths",()=>{
  const data=parts([slide(shape("2",paragraph("First"))),slide(shape("2",paragraph("Second")))],[2,1]);
  data["ppt/_rels/presentation.xml.rels"]=data["ppt/_rels/presentation.xml.rels"].replace('Target="slides/slide2.xml"','Target="/ppt/slides/slide2.xml"');
  expect(extractDocx(archive(data)).slides.map(s=>s.elements[0].text)).toEqual(["Second","First"]);
 });
 it.each(["//example.com/slide.xml","///ppt/slides/slide1.xml","/../ppt/slides/slide1.xml","/ppt/../../slide.xml","../../slide.xml","https://example.com/slide.xml","file:///tmp/slide.xml","C:/slide.xml","/ppt\\slides\\slide1.xml","/ppt/%2e%2e/slide.xml","/ppt/slides/slide1.xml?x=1","/ppt/slides/slide1.xml#text"])("rejects unsafe target %s",target=>{
  expect(()=>extractDocx(withTarget(target))).toThrow("UNSAFE_PACKAGE");
 });
 it("rejects external mode even when the target looks internal",()=>{
  expect(()=>extractDocx(withTarget("/ppt/slides/slide1.xml","External"))).toThrow("UNSAFE_PACKAGE");
 });
});
