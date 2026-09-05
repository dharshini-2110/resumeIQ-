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
  return "PowerPoint resume (.pptx recommended; .ppt legacy files should be saved as .pptx), up to 10 MB";
}

export async function extractPowerPointText(file: File): Promise<string> {
  if (!isPowerPointFile(file)) {
    throw new Error("Please upload a PowerPoint resume (.pptx or .ppt).");
  }

  if (!isModernPowerPointFile(file)) {
    throw new Error("Legacy .ppt files are not readable in the browser yet. Open the file in PowerPoint and save it as .pptx, then upload it again.");
  }

  const { OfficeParser } = await import("officeparser");
  const ast = await OfficeParser.parseOffice(file, {
    fileType: "pptx",
    ignoreNotes: true,
    ignoreComments: true,
  });

  return ast.toText()
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
