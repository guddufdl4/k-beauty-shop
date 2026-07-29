import { HERO_IMAGE_RECOMMENDED } from "@/lib/admin/hero-image-spec";

/** Client-side cover-crop to the recommended hero banner size (WebP quality 90). */
export async function resizeHeroImageToRecommended(file: File): Promise<File> {
  const { width: targetW, height: targetH } = HERO_IMAGE_RECOMMENDED;

  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context is unavailable.");
    }

    const scale = Math.max(targetW / bitmap.width, targetH / bitmap.height);
    const scaledW = bitmap.width * scale;
    const scaledH = bitmap.height * scale;
    const offsetX = (targetW - scaledW) / 2;
    const offsetY = (targetH - scaledH) / 2;

    ctx.drawImage(bitmap, offsetX, offsetY, scaledW, scaledH);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Failed to encode hero image."));
          }
        },
        "image/webp",
        0.9,
      );
    });

    const baseName = file.name.replace(/\.[^.]+$/u, "") || "hero";
    return new File([blob], `${baseName}-${targetW}x${targetH}.webp`, { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}