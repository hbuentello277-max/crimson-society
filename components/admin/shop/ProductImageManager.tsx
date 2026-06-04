"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { SHOP_PRODUCT_IMAGE_MIME_TYPES } from "@/lib/shop/product-images";
import { uploadShopProductImages } from "@/lib/shop/upload-product-images";

type Props = {
  productId?: string;
  images: string[];
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
  disabled?: boolean;
  onImagesChange: (images: string[]) => void;
};

function parseUrlList(raw: string) {
  return raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pendingFileKey(file: File, index: number) {
  return `${file.name}-${file.size}-${file.lastModified}-${index}`;
}

export function ProductImageManager({
  productId,
  images,
  pendingFiles = [],
  onPendingFilesChange,
  disabled = false,
  onImagesChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canQueueLocally = !productId && Boolean(onPendingFilesChange);

  const pendingPreviewUrls = useMemo(() => {
    return pendingFiles.map((file) => URL.createObjectURL(file));
  }, [pendingFiles]);

  useEffect(() => {
    return () => {
      for (const url of pendingPreviewUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [pendingPreviewUrls]);

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList?.length || disabled) return;

    const files = Array.from(fileList);

    if (canQueueLocally) {
      onPendingFilesChange?.([...pendingFiles, ...files]);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    if (!productId) return;

    setUploading(true);
    setError(null);

    try {
      const uploaded = await uploadShopProductImages(productId, files);
      onImagesChange([...images, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
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

  function removePendingFile(index: number) {
    if (!onPendingFilesChange) return;
    onPendingFilesChange(pendingFiles.filter((_, i) => i !== index));
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

  const queuedCount = pendingFiles.length;
  const hasAnyImages = images.length > 0 || queuedCount > 0;

  return (
    <div className="space-y-3">
      <label className="block text-[10px] uppercase tracking-[0.25em] text-zinc-500">
        Product images
      </label>

      {canQueueLocally && queuedCount > 0 ? (
        <p className="text-[10px] leading-5 text-zinc-500">
          {queuedCount} image{queuedCount === 1 ? "" : "s"} queued — uploads when you save the
          product.
        </p>
      ) : null}

      {hasAnyImages && (
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

          {pendingFiles.map((file, index) => {
            const previewUrl = pendingPreviewUrls[index];
            if (!previewUrl) return null;
            return (
              <div
                key={pendingFileKey(file, index)}
                className="relative h-20 w-20 overflow-hidden rounded-xl border border-dashed border-[#b4141e]/40 bg-black/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                <span className="absolute bottom-0 left-0 right-0 bg-black/75 px-1 py-0.5 text-center text-[8px] uppercase tracking-wider text-[#e87a82]">
                  Queued
                </span>
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => removePendingFile(index)}
                  className="absolute right-1 top-1 rounded-full bg-black/80 px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-black"
                  aria-label="Remove queued image"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || uploading || (!productId && !canQueueLocally)}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border border-[#b4141e]/40 bg-[#b4141e]/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#f1c3c7] transition hover:border-[#b4141e]/70 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : canQueueLocally ? "Choose images" : "Upload images"}
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
        {canQueueLocally ? " · saved on Create product" : ""}
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
