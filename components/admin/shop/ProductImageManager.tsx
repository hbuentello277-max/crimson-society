"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  SHOP_PRODUCT_IMAGE_MAX_BYTES,
  SHOP_PRODUCT_IMAGE_MIME_TYPES,
} from "@/lib/shop/product-images";

type Props = {
  productId: string;
  images: string[];
  disabled?: boolean;
  onImagesChange: (images: string[]) => void;
};

function parseUrlList(raw: string) {
  return raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ProductImageManager({
  productId,
  images,
  disabled = false,
  onImagesChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList?.length || disabled) return;

    setUploading(true);
    setError(null);

    const uploaded: string[] = [];

    try {
      for (const file of Array.from(fileList)) {
        if (!(SHOP_PRODUCT_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
          throw new Error(`${file.name}: only JPG, PNG, and WebP are allowed.`);
        }
        if (file.size > SHOP_PRODUCT_IMAGE_MAX_BYTES) {
          throw new Error(`${file.name}: exceeds 5MB limit.`);
        }

        const body = new FormData();
        body.set("product_id", productId);
        body.set("file", file);

        const res = await fetch("/api/admin/shop/upload", {
          method: "POST",
          body,
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          throw new Error(data.error ?? `Failed to upload ${file.name}`);
        }
        uploaded.push(data.url);
      }

      onImagesChange([...images, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      if (uploaded.length > 0) {
        onImagesChange([...images, ...uploaded]);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function removeImage(url: string) {
    onImagesChange(images.filter((item) => item !== url));
  }

  function addUrlsFromDraft() {
    const next = parseUrlList(urlDraft);
    if (next.length === 0) return;
    const merged = [...images];
    for (const url of next) {
      if (!merged.includes(url)) {
        merged.push(url);
      }
    }
    onImagesChange(merged);
    setUrlDraft("");
  }

  return (
    <div className="space-y-3">
      <label className="block text-[10px] uppercase tracking-[0.25em] text-zinc-500">
        Product images
      </label>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url) => (
            <div
              key={url}
              className="relative h-20 w-20 overflow-hidden rounded-xl border border-white/10 bg-black/40"
            >
              <Image src={url} alt="" fill className="object-cover" sizes="80px" unoptimized />
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => removeImage(url)}
                className="absolute right-1 top-1 rounded-full bg-black/80 px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-black"
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border border-[#b4141e]/40 bg-[#b4141e]/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#f1c3c7] transition hover:border-[#b4141e]/70 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload images"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={SHOP_PRODUCT_IMAGE_MIME_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => void handleFilesSelected(e.target.files)}
        />
      </div>

      <p className="text-[10px] leading-5 text-zinc-600">
        JPG, PNG, or WebP · max 5MB each · multiple files supported
      </p>

      <div>
        <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-zinc-600">
          Or paste image URLs (optional)
        </label>
        <textarea
          rows={2}
          value={urlDraft}
          disabled={disabled || uploading}
          onChange={(e) => setUrlDraft(e.target.value)}
          placeholder="https://…, one per line or comma-separated"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
        />
        <button
          type="button"
          disabled={disabled || uploading || !urlDraft.trim()}
          onClick={addUrlsFromDraft}
          className="mt-2 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-zinc-400 hover:text-white disabled:opacity-40"
        >
          Add URLs
        </button>
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
