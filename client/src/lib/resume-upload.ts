export const MAX_RESUME_FILE_SIZE = 10 * 1024 * 1024;
export const MIN_RESUME_TEXT_LENGTH = 50;

const POWERPOINT_EXTENSIONS = [".ppt", ".pptx"] as const;
const PPTX_EXTENSION = ".pptx";
const PPT_MIME_TYPES = new Set([
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export function isPowerPointFile(file: Pick<File, "name" | "type">): boolean {
  const lowerName = file.name.toLowerCase();
  return POWERPOINT_EXTENSIONS.some((extension) => lowerName.endsWith(extension)) || PPT_MIME_TYPES.has(file.type);
}

export function isModernPowerPointFile(file: Pick<File, "name" | "type">): boolean {
  return file.name.toLowerCase().endsWith(PPTX_EXTENSION) || file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation";
}

export function getPowerPointUploadHint(): string {
  return "PDF, Word (.docx), or PowerPoint (.pptx) resume, up to 10 MB";
}

export const RESUME_UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation";

function cleanExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isSupportedResumeFile(file: Pick<File, "name" | "type">): boolean {
  const lowerName = file.name.toLowerCase();
  return (
    lowerName.endsWith(".pdf") ||
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".docx") ||
    isPowerPointFile(file)
  );
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    pageTexts.push(pageText);
  }

  return cleanExtractedText(pageTexts.join("\n\n"));
}

async function extractOfficeText(file: File, fileType: "pptx" | "docx"): Promise<string> {
  const { OfficeParser } = await import("officeparser");
  const ast = await OfficeParser.parseOffice(file, {
    fileType,
    ignoreNotes: true,
    ignoreComments: true,
  });
  return cleanExtractedText(ast.toText());
}

/**
 * Extracts readable text from a resume file. Supports PDF, Word (.docx), and
 * PowerPoint (.pptx). Legacy binary formats (.doc, .ppt) are not supported in
 * the browser and should be re-saved in a modern format first.
 */
export async function extractResumeText(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdfText(file);
  }

  if (lowerName.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return extractOfficeText(file, "docx");
  }

  if (lowerName.endsWith(".doc") || file.type === "application/msword") {
    throw new Error("Legacy .doc files are not readable in the browser yet. Open the file in Word and save it as .docx, then upload it again.");
  }

  if (isPowerPointFile(file)) {
    if (!isModernPowerPointFile(file)) {
      throw new Error("Legacy .ppt files are not readable in the browser yet. Open the file in PowerPoint and save it as .pptx, then upload it again.");
    }
    return extractOfficeText(file, "pptx");
  }

  throw new Error("Please upload a PDF, Word (.docx), or PowerPoint (.pptx) resume.");
}

/** @deprecated Use extractResumeText, which also supports PDF and Word files. */
export async function extractPowerPointText(file: File): Promise<string> {
  if (!isPowerPointFile(file)) {
    throw new Error("Please upload a PowerPoint resume (.pptx or .ppt).");
  }

  if (!isModernPowerPointFile(file)) {
    throw new Error("Legacy .ppt files are not readable in the browser yet. Open the file in PowerPoint and save it as .pptx, then upload it again.");
  }

  return extractOfficeText(file, "pptx");
}
