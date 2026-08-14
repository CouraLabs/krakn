export const isTextPart = (p: unknown): p is { type: "text"; text: string } =>
  !!p &&
  typeof p === "object" &&
  "type" in p &&
  p.type === "text" &&
  "text" in p &&
  typeof p.text === "string";

export const isImagePart = (p: unknown): p is { type: "image"; mimeType: string } =>
  !!p && typeof p === "object" && "type" in p && p.type === "image";

export const extractText = (content: unknown[]): string =>
  content.filter(isTextPart).map((p) => p.text).join("\n");
