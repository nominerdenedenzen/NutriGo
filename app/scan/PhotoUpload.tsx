"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Shrink big phone photos to ~1024px wide before upload: faster and cheaper.
async function resizeImage(file: File, maxWidth = 1024): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Resize failed"))), "image/jpeg", 0.85),
  );
}

export default function PhotoUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setStatus("idle");
    setMessage("");
  }

  async function onUpload() {
    if (!file) return;
    setStatus("uploading");
    try {
      const small = await resizeImage(file);
      const form = new FormData();
      form.append("photo", small, "photo.jpg");

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      // Jump to the page that shows the uploaded photo.
      setStatus("done");
      setMessage("Uploaded! Opening your photo…");
      router.push(`/scan/${data.scanId}`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-[#101814]/15 bg-white p-10 text-center transition hover:border-[#1F8A4C] hover:bg-white">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Your photo" className="max-h-72 rounded-xl object-contain" />
        ) : (
          <span className="text-base font-medium text-[#101814]/60">Tap to take or choose a photo of your ingredients</span>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPick}
          className="hidden"
        />
      </label>

      <Button className="h-11 text-sm font-medium" onClick={onUpload} disabled={!file || status === "uploading"}>
        {status === "uploading" ? "Uploading…" : "Upload photo"}
      </Button>

      {message && (
        <p className={status === "error" ? "text-red-600" : "text-green-700"}>{message}</p>
      )}
    </div>
  );
}
