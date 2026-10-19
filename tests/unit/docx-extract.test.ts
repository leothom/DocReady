import {describe,expect,it} from "vitest";
import {extractDocx} from "../../src/lib/docx/extract";
import {buildTestDocx} from "../fixtures/build-docx";

describe("docx extraction",()=>{
 it("extracts paragraphs and table cells from a test document",()=>{
  const data=buildTestDocx();
  const deck=extractDocx(data);
  expect(deck.slides.length).toBe(1);
  const slide=deck.slides[0];
  expect(slide.extractionStatus).toBe("read");
  expect(slide.elements.length).toBeGreaterThan(0);
  const texts=slide.elements.map(e=>e.text);
  expect(texts.some(t=>t.includes("Hello world"))).toBe(true);
  expect(texts.some(t=>t.includes("company sell goods"))).toBe(true);
  expect(texts.some(t=>t.includes("Cell one with eror"))).toBe(true);
 });
 it("assigns unique element IDs",()=>{
  const data=buildTestDocx();
  const deck=extractDocx(data);
  const ids=deck.slides[0].elements.map(e=>e.elementId);
  expect(new Set(ids).size).toBe(ids.length);
 });
});
