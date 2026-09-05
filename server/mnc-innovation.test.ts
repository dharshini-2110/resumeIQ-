import { describe, expect, it } from "vitest";
import { extractPowerPointText, isModernPowerPointFile, isPowerPointFile, MAX_RESUME_FILE_SIZE } from "../client/src/lib/resume-upload";
import { calculateInterviewSignal, calculateMomentumSignal, calculateReadiness, clampReadinessScore } from "../client/src/lib/mnc-readiness";

describe("PowerPoint resume ingestion", () => {
  it("accepts PowerPoint extensions and MIME types but rejects text files", () => {
    expect(isPowerPointFile({ name: "resume.pptx", type: "" })).toBe(true);
    expect(isPowerPointFile({ name: "resume.ppt", type: "application/vnd.ms-powerpoint" })).toBe(true);
    expect(isPowerPointFile({ name: "resume.txt", type: "text/plain" })).toBe(false);
    expect(isModernPowerPointFile({ name: "resume.pptx", type: "" })).toBe(true);
  });

  it("gives a clear conversion message for legacy binary .ppt files", async () => {
    const legacyFile = new File(["legacy"], "resume.ppt", { type: "application/vnd.ms-powerpoint" });
    await expect(extractPowerPointText(legacyFile)).rejects.toThrow("save it as .pptx");
  });

  it("keeps the upload limit at 10 MB", () => {
    expect(MAX_RESUME_FILE_SIZE).toBe(10 * 1024 * 1024);
  });
});

describe("MNC readiness cockpit", () => {
  it("clamps and averages only available signals", () => {
    expect(clampReadinessScore(130)).toBe(100);
    expect(clampReadinessScore(-4)).toBe(0);
    expect(calculateReadiness([80, null, 60, undefined])).toBe(70);
    expect(calculateReadiness([null, undefined])).toBeNull();
  });

  it("turns consistent practice into bounded interview and momentum signals", () => {
    expect(calculateInterviewSignal(0)).toBeNull();
    expect(calculateInterviewSignal(2)).toBe(65);
    expect(calculateInterviewSignal(10)).toBe(100);
    expect(calculateMomentumSignal(0)).toBeNull();
    expect(calculateMomentumSignal(4)).toBe(70);
    expect(calculateMomentumSignal(10)).toBe(100);
  });
});
