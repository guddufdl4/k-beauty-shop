"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  extractProductImageFileFromClipboard,
  validateClientProductImageFile,
} from "@/lib/admin/product-image-upload";
import { appendProductImageNormalizeOptionsToFormData } from "@/lib/admin/product-image-normalize-options";
import type { ProductImageNormalizeOptions } from "@/lib/admin/product-image-normalize-options";
import { isValidProductImageUrl } from "@/lib/admin/product-image-resolver";
import {
  ProductImageUploadSettingsPanel,
  useProductImageUploadSettings,
} from "@/components/admin/product-image-upload-settings";
import { resolveProductImageUrl } from "@/lib/product-images";
import type { ProductWithRelations } from "@/lib/supabase/products";
import { ProductNameWithCopy } from "@/components/admin/product-name-with-copy";
import { formatProductPrice } from "@/lib/utils";

type Props = {
  products: ProductWithRelations[];
  emptyMessage?: string;
  viewMode?: "active" | "deleted";
};

const UNDO_DELETE_MS = 30_000;

type UndoDeleteEntry = {
  product: ProductWithRelations;
  expiresAt: number;
};

type EditableProduct = Pick<
  ProductWithRelations,
  | "id"
  | "name"
  | "barcode"
  | "wholesale_price"
  | "price"
  | "sku"
  | "slug"
  | "image_url"
  | "category"
  | "images"
>;

function editPreviewUrl(product: EditableProduct, draftUrl: string): string {
  const trimmed = draftUrl.trim();
  if (trimmed && isValidProductImageUrl(trimmed)) {
    return trimmed;
  }

  return resolveProductImageUrl(product);
}

function statusBadge(status: ProductWithRelations["status"]) {
  const styles =
    status === "active"
      ? "bg-emerald-100 text-emerald-700"
      : status === "draft"
        ? "bg-zinc-100 text-zinc-600"
        : "bg-red-100 text-red-700";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${styles}`}
    >
      {status}
    </span>
  );
}

function displayPrice(product: Pick<ProductWithRelations, "wholesale_price" | "price">) {
  return product.wholesale_price ?? product.price;
}

const ADMIN_TIMESTAMP_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
};

function formatProductTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", ADMIN_TIMESTAMP_OPTIONS);
}

function productTimestampDisplay(product: {
  created_at: string;
  updated_at: string;
}): { primary: string; secondary: string | null } {
  const createdMs = new Date(product.created_at).getTime();
  const updatedMs = new Date(product.updated_at).getTime();
  const isSameMoment = Math.abs(updatedMs - createdMs) < 60_000;

  return {
    primary: formatProductTimestamp(product.updated_at),
    secondary: isSameMoment
      ? null
      : `등록 ${formatProductTimestamp(product.created_at)}`,
  };
}

export function AdminProductsTable({
  products: initialProducts,
  emptyMessage = "등록된 상품이 없습니다. seed SQL을 실행하거나 폼으로 추가하세요.",
  viewMode = "active",
}: Props) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [editing, setEditing] = useState<EditableProduct | null>(null);
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [normalizedPreviewUrl, setNormalizedPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [backgroundRemovalApplied, setBackgroundRemovalApplied] = useState(false);
  const [backgroundRemovalLoading, setBackgroundRemovalLoading] = useState(false);
  const [uploadSettings, setUploadSettingsState] = useProductImageUploadSettings();
  const setUploadSettings = useCallback(
    (options: ProductImageNormalizeOptions) => {
      setUploadSettingsState(options);
      setBackgroundRemovalApplied(false);
    },
    [setUploadSettingsState],
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tableMessage, setTableMessage] = useState<string | null>(null);
  const [undoDelete, setUndoDelete] = useState<UndoDeleteEntry | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [undoPending, setUndoPending] = useState(false);
  const [stockEditingId, setStockEditingId] = useState<string | null>(null);
  const [stockDraft, setStockDraft] = useState("");
  const [stockPending, setStockPending] = useState(false);
  const [soldOutPendingId, setSoldOutPendingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    if (!undoDelete) {
      setUndoSecondsLeft(0);
      return;
    }

    const tick = () => {
      const remainingMs = undoDelete.expiresAt - Date.now();
      if (remainingMs <= 0) {
        setUndoDelete(null);
        setUndoSecondsLeft(0);
        return;
      }
      setUndoSecondsLeft(Math.ceil(remainingMs / 1000));
    };

    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [undoDelete]);

  const restoreProduct = useCallback(
    async (product: Pick<ProductWithRelations, "id" | "name">) => {
      setRestoringId(product.id);
      setError(null);

      try {
        const response = await fetch(`/api/admin/products/${product.id}/restore`, {
          method: "POST",
        });

        const data = (await response.json()) as {
          restored?: boolean;
          product?: { id: string; name: string; sku: string };
          error?: string;
        };

        if (!response.ok || !data.restored) {
          setError(data.error ?? "상품 복구에 실패했습니다.");
          return false;
        }

        setProducts((current) => current.filter((item) => item.id !== product.id));
        setUndoDelete((current) => (current?.product.id === product.id ? null : current));
        setTableMessage(`"${data.product?.name ?? product.name}" 상품을 복구했습니다.`);
        router.refresh();
        return true;
      } catch {
        setError("네트워크 오류로 상품을 복구하지 못했습니다.");
        return false;
      } finally {
        setRestoringId(null);
      }
    },
    [router],
  );

  useEffect(() => {
    return () => {
      if (localPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(localPreviewUrl);
      }
      if (normalizedPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(normalizedPreviewUrl);
      }
    };
  }, [localPreviewUrl, normalizedPreviewUrl]);

  const clearPendingImage = useCallback(() => {
    setPendingImageFile(null);
    setBackgroundRemovalApplied(false);
    setBackgroundRemovalLoading(false);
    setLocalPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    setNormalizedPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }, []);

  async function handleUndoDelete() {
    if (!undoDelete || undoPending) {
      return;
    }

    setUndoPending(true);
    setError(null);
    const restored = await restoreProduct(undoDelete.product);
    if (restored) {
      setProducts((current) => {
        const exists = current.some((item) => item.id === undoDelete.product.id);
        if (exists) {
          return current;
        }
        return [undoDelete.product, ...current];
      });
    }
    setUndoPending(false);
  }

  const openEdit = useCallback((product: ProductWithRelations) => {
    setEditing({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      wholesale_price: product.wholesale_price,
      price: product.price,
      sku: product.sku,
      slug: product.slug,
      image_url: product.image_url,
      category: product.category,
      images: product.images,
    });
    setName(product.name);
    setBarcode(product.barcode ?? "");
    setPrice(String(displayPrice(product)));
    setImageUrl(product.image_url ?? "");
    clearPendingImage();
    setDragOver(false);
    setMessage(null);
    setError(null);
    setConfirmDelete(false);
  }, [clearPendingImage]);

  const closeEdit = useCallback(() => {
    if (pending || uploading || deleting) {
      return;
    }
    setEditing(null);
    clearPendingImage();
    setMessage(null);
    setError(null);
    setConfirmDelete(false);
  }, [pending, uploading, deleting, clearPendingImage]);

  const selectPendingImageFile = useCallback((file: File) => {
    const validationError = validateClientProductImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setMessage(null);
    setBackgroundRemovalApplied(false);
    setPendingImageFile(file);
    setLocalPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return URL.createObjectURL(file);
    });
  }, []);

  const uploadImageFile = useCallback(
    async (file: File, withBackgroundRemoval = false) => {
      if (!editing) {
        return;
      }

      const validationError = validateClientProductImageFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setUploading(true);
      setError(null);
      setMessage(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        appendProductImageNormalizeOptionsToFormData(formData, uploadSettings);
        if (withBackgroundRemoval) {
          formData.append("removeBackground", "true");
        }

        const response = await fetch(`/api/admin/products/${editing.id}/image`, {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as {
          image_url?: string;
          error?: string;
        };

        if (!response.ok || !data.image_url) {
          setError(data.error ?? "이미지 업로드에 실패했습니다.");
          return;
        }

        const uploadedUrl = data.image_url;
        setImageUrl(uploadedUrl);
        clearPendingImage();
        const now = new Date().toISOString();
        setProducts((current) =>
          current.map((product) =>
            product.id === editing.id
              ? {
                  ...product,
                  image_url: uploadedUrl,
                  updated_at: now,
                  needs_image: false,
                  images: [
                    {
                      id: `upload-${editing.id}`,
                      product_id: editing.id,
                      url: uploadedUrl,
                      alt_text: editing.name,
                      sort_order: 0,
                      is_primary: true,
                    },
                  ],
                }
              : product,
          ),
        );
        setMessage(
          withBackgroundRemoval
            ? "배경을 제거한 PNG 이미지를 업로드하고 저장했습니다."
            : "이미지를 업로드하고 저장했습니다.",
        );
        router.refresh();
      } catch {
        setError("네트워크 오류로 이미지를 업로드하지 못했습니다.");
      } finally {
        setUploading(false);
      }
    },
    [clearPendingImage, editing, router, uploadSettings],
  );

  const removeImageBackground = useCallback(async () => {
    if (!editing || !pendingImageFile) {
      return;
    }

    setBackgroundRemovalLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", pendingImageFile);
      formData.append("preview", "true");
      formData.append("removeBackground", "true");
      appendProductImageNormalizeOptionsToFormData(formData, uploadSettings);

      const response = await fetch(`/api/admin/products/${editing.id}/image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "배경 제거 미리보기 생성에 실패했습니다.");
        return;
      }

      const blob = await response.blob();
      setNormalizedPreviewUrl((current) => {
        if (current?.startsWith("blob:")) {
          URL.revokeObjectURL(current);
        }
        return URL.createObjectURL(blob);
      });
      setBackgroundRemovalApplied(true);
      setMessage("배경 제거 미리보기가 준비되었습니다. 확인 후 업로드하세요.");
    } catch {
      setError("배경 제거 중 네트워크 오류가 발생했습니다. 원본 이미지를 유지합니다.");
    } finally {
      setBackgroundRemovalLoading(false);
    }
  }, [editing, pendingImageFile, uploadSettings]);

  useEffect(() => {
    if (!editing || !pendingImageFile || backgroundRemovalApplied) {
      if (!pendingImageFile) {
        setNormalizedPreviewUrl((current) => {
          if (current?.startsWith("blob:")) {
            URL.revokeObjectURL(current);
          }
          return null;
        });
        setPreviewLoading(false);
      }
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const runPreview = async () => {
      setPreviewLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", pendingImageFile);
        formData.append("preview", "true");
        appendProductImageNormalizeOptionsToFormData(formData, uploadSettings);

        const response = await fetch(`/api/admin/products/${editing.id}/image`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          if (!cancelled) {
            setError(data?.error ?? "미리보기 생성에 실패했습니다.");
          }
          return;
        }

        const blob = await response.blob();
        if (cancelled) {
          return;
        }

        setNormalizedPreviewUrl((current) => {
          if (current?.startsWith("blob:")) {
            URL.revokeObjectURL(current);
          }
          return URL.createObjectURL(blob);
        });
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setError("미리보기를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    const timeoutId = window.setTimeout(() => {
      void runPreview();
    }, 300);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [backgroundRemovalApplied, editing, pendingImageFile, uploadSettings]);

  useEffect(() => {
    if (!editing || uploading) {
      return;
    }

    const handlePaste = (event: ClipboardEvent) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) {
        return;
      }

      const file = extractProductImageFileFromClipboard(clipboardData);
      if (!file) {
        return;
      }

      event.preventDefault();
      selectPendingImageFile(file);
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [editing, uploading, selectPendingImageFile]);

  const handleImageInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) {
        selectPendingImageFile(file);
      }
    },
    [selectPendingImageFile],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      const file = event.dataTransfer.files?.[0];
      if (file) {
        selectPendingImageFile(file);
      }
    },
    [selectPendingImageFile],
  );

  const saveStock = useCallback(
    async (productId: string) => {
      const stock = Number(stockDraft);
      if (!Number.isInteger(stock) || stock < 0) {
        setError("재고는 0 이상의 정수여야 합니다.");
        return;
      }

      setStockPending(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/products/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stock }),
        });

        const data = (await response.json()) as {
          product?: { id: string; stock: number; sold_out: boolean };
          error?: string;
        };

        if (!response.ok || !data.product) {
          setError(data.error ?? "재고 저장에 실패했습니다.");
          return;
        }

        const saved = data.product;
        const now = new Date().toISOString();
        setProducts((current) =>
          current.map((product) =>
            product.id === saved.id
              ? { ...product, stock: saved.stock, sold_out: saved.sold_out, updated_at: now }
              : product,
          ),
        );
        setStockEditingId(null);
        router.refresh();
      } catch {
        setError("네트워크 오류로 재고를 저장하지 못했습니다.");
      } finally {
        setStockPending(false);
      }
    },
    [router, stockDraft],
  );

  const toggleSoldOut = useCallback(
    async (product: ProductWithRelations) => {
      setSoldOutPendingId(product.id);
      setError(null);

      try {
        const response = await fetch(`/api/admin/products/${product.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sold_out: !product.sold_out }),
        });

        const data = (await response.json()) as {
          product?: { id: string; stock: number; sold_out: boolean };
          error?: string;
        };

        if (!response.ok || !data.product) {
          setError(data.error ?? "품절 상태 변경에 실패했습니다.");
          return;
        }

        const saved = data.product;
        const now = new Date().toISOString();
        setProducts((current) =>
          current.map((item) =>
            item.id === saved.id
              ? { ...item, stock: saved.stock, sold_out: saved.sold_out, updated_at: now }
              : item,
          ),
        );
        router.refresh();
      } catch {
        setError("네트워크 오류로 품절 상태를 변경하지 못했습니다.");
      } finally {
        setSoldOutPendingId(null);
      }
    },
    [router],
  );

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) {
      return;
    }

    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/products/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          barcode: barcode.trim(),
          wholesale_price: price.trim(),
          image_url: imageUrl.trim(),
        }),
      });

      const data = (await response.json()) as {
        product?: {
          id: string;
          name: string;
          barcode: string | null;
          wholesale_price: number | null;
          image_url: string | null;
        };
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      if (data.product) {
        const saved = data.product;
        const now = new Date().toISOString();
        setProducts((current) =>
          current.map((product) =>
            product.id === saved.id
              ? {
                  ...product,
                  name: saved.name,
                  barcode: saved.barcode,
                  wholesale_price: saved.wholesale_price,
                  image_url: saved.image_url,
                  updated_at: now,
                  needs_image: !saved.image_url,
                  images: saved.image_url
                    ? [
                        {
                          id: `manual-${saved.id}`,
                          product_id: saved.id,
                          url: saved.image_url,
                          alt_text: saved.name,
                          sort_order: 0,
                          is_primary: true,
                        },
                      ]
                    : [],
                }
              : product,
          ),
        );
      }

      setMessage("상품 정보를 저장했습니다.");
      router.refresh();
      setTimeout(() => {
        setEditing(null);
        setMessage(null);
      }, 600);
    } catch {
      setError("네트워크 오류로 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!editing) {
      return;
    }

    setDeleting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/products/${editing.id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as {
        deleted?: boolean;
        product?: { id: string; name: string; sku: string };
        error?: string;
      };

      if (!response.ok || !data.deleted) {
        setError(data.error ?? "상품 삭제에 실패했습니다.");
        return;
      }

      const deletedProduct =
        products.find((product) => product.id === editing.id) ??
        ({
          ...editing,
          brand: "",
          description: null,
          short_description: null,
          moq: 1,
          stock: 0,
          sold_out: false,
          status: "active" as const,
          deleted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as ProductWithRelations);

      setProducts((current) => current.filter((product) => product.id !== editing.id));
      setEditing(null);
      setConfirmDelete(false);
      setTableMessage(null);
      setUndoDelete({
        product: deletedProduct,
        expiresAt: Date.now() + UNDO_DELETE_MS,
      });
      router.refresh();
    } catch {
      setError("네트워크 오류로 상품을 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  const undoBanner =
    viewMode === "active" && undoDelete ? (
      <div className="mx-6 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <p>
          &quot;{undoDelete.product.name}&quot; 상품을 삭제했습니다.{" "}
          <span className="text-amber-700">{undoSecondsLeft}초 내 되돌릴 수 있습니다.</span>
        </p>
        <button
          type="button"
          onClick={() => void handleUndoDelete()}
          disabled={undoPending}
          className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {undoPending ? "복구 중…" : "되돌리기"}
        </button>
      </div>
    ) : null;

  if (products.length === 0) {
    return (
      <>
        {error ? (
          <p className="mx-6 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {undoBanner}
        {tableMessage ? (
          <p className="mx-6 mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {tableMessage}
          </p>
        ) : null}
        <p className="px-6 py-10 text-center text-sm text-zinc-500">{emptyMessage}</p>
      </>
    );
  }

  return (
    <>
      {error && !editing ? (
        <p className="mx-6 mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {undoBanner}
      {tableMessage && !editing ? (
        <p className="mx-6 mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {tableMessage}
        </p>
      ) : null}
      <div className="max-h-[min(70vh,900px)] overflow-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-rose-100 bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500 shadow-sm">
            <tr>
              <th className="w-14 px-3 py-2.5 font-semibold">이미지</th>
              <th className="min-w-[7rem] px-3 py-2.5 font-semibold">SKU</th>
              <th className="min-w-[12rem] px-3 py-2.5 font-semibold">상품명</th>
              <th className="min-w-[6rem] px-3 py-2.5 font-semibold">브랜드</th>
              <th className="min-w-[5rem] px-3 py-2.5 font-semibold">가격</th>
              <th className="min-w-[4rem] px-3 py-2.5 font-semibold">재고</th>
              <th className="min-w-[4rem] px-3 py-2.5 font-semibold">품절</th>
              <th className="min-w-[5rem] px-3 py-2.5 font-semibold">카테고리</th>
              <th className="min-w-[4rem] px-3 py-2.5 font-semibold">상태</th>
              <th className="min-w-[7rem] px-3 py-2.5 font-semibold">업로드/수정</th>
              <th className="w-16 px-3 py-2.5 font-semibold">편집</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => {
              const imageUrl = resolveProductImageUrl(product);
              const isEven = index % 2 === 0;
              const shownPrice = displayPrice(product);
              const timestamp = productTimestampDisplay(product);

              return (
                <tr
                  key={product.id}
                  className={`border-b border-zinc-100 ${
                    isEven ? "bg-white" : "bg-zinc-50/70"
                  } hover:bg-rose-50/50`}
                >
                  <td className="px-3 py-2.5">
                    <div className="relative h-10 w-10 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-contain"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <p className="font-mono text-xs font-medium text-zinc-800">{product.sku}</p>
                    {product.barcode ? (
                      <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                        {product.barcode}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <ProductNameWithCopy
                      name={product.name}
                      href={`/en/products/${product.slug}`}
                      linkClassName="line-clamp-2 font-medium leading-snug text-zinc-900 hover:text-rose-700"
                    />
                    <p className="mt-0.5 select-none text-[10px] text-zinc-400">MOQ {product.moq}</p>
                  </td>
                  <td className="px-3 py-2.5 align-top text-xs text-zinc-700">{product.brand}</td>
                  <td className="px-3 py-2.5 align-top">
                    <p
                      className={`text-xs font-semibold ${
                        shownPrice <= 1 ? "text-amber-700" : "text-zinc-900"
                      }`}
                    >
                      {formatProductPrice(shownPrice)}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    {stockEditingId === product.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={stockDraft}
                          onChange={(event) => setStockDraft(event.target.value)}
                          disabled={stockPending}
                          className="w-16 rounded border border-zinc-300 px-1.5 py-0.5 text-xs"
                          autoFocus
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void saveStock(product.id);
                            }
                            if (event.key === "Escape") {
                              setStockEditingId(null);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => void saveStock(product.id)}
                          disabled={stockPending}
                          className="rounded border border-rose-200 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          {stockPending ? "…" : "저장"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setStockEditingId(null)}
                          disabled={stockPending}
                          className="rounded px-1 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setStockEditingId(product.id);
                          setStockDraft(String(product.stock));
                          setError(null);
                        }}
                        className={`rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums hover:bg-zinc-100 ${
                          product.stock <= 0 ? "text-red-600" : "text-zinc-800"
                        }`}
                        title="클릭하여 재고 수정"
                      >
                        {product.stock}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <button
                      type="button"
                      onClick={() => void toggleSoldOut(product)}
                      disabled={soldOutPendingId === product.id}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase disabled:opacity-50 ${
                        product.sold_out
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      }`}
                    >
                      {soldOutPendingId === product.id
                        ? "…"
                        : product.sold_out
                          ? "품절"
                          : "판매중"}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 align-top text-xs text-zinc-600">
                    {product.category?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 align-top">{statusBadge(product.status)}</td>
                  <td className="px-3 py-2.5 align-top">
                    <p className="whitespace-nowrap text-[11px] text-zinc-700">
                      {timestamp.primary}
                    </p>
                    {timestamp.secondary ? (
                      <p className="mt-0.5 whitespace-nowrap text-[10px] text-zinc-400">
                        {timestamp.secondary}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    {viewMode === "deleted" ? (
                      <button
                        type="button"
                        onClick={() => void restoreProduct(product)}
                        disabled={restoringId === product.id}
                        className="rounded-md border border-emerald-200 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        {restoringId === product.id ? "복구 중…" : "복구"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openEdit(product)}
                        className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:border-rose-200 hover:text-rose-700"
                      >
                        편집
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={closeEdit}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-edit-title"
            className="w-full max-w-lg rounded-2xl border border-rose-100 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="product-edit-title" className="text-lg font-semibold text-zinc-900">
                  상품 편집
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  상품명, 바코드, 도매가, 이미지를 수정합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                disabled={pending || uploading || deleting}
                className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:text-zinc-700 disabled:opacity-50"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="edit-sku" className="block text-sm font-medium text-zinc-700">
                  SKU
                </label>
                <input
                  id="edit-sku"
                  value={editing.sku}
                  readOnly
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-500"
                />
                <p className="mt-1 text-[11px] text-zinc-400">SKU는 수정할 수 없습니다.</p>
              </div>

              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-zinc-700">
                  상품명 *
                </label>
                <input
                  id="edit-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={200}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="edit-barcode" className="block text-sm font-medium text-zinc-700">
                  바코드
                </label>
                <input
                  id="edit-barcode"
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  maxLength={64}
                  placeholder="선택 입력"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
                />
              </div>

              <div>
                <label htmlFor="edit-price" className="block text-sm font-medium text-zinc-700">
                  가격 (도매가) *
                </label>
                <input
                  id="edit-price"
                  type="number"
                  min={0}
                  step={1}
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="block text-sm font-medium text-zinc-700">상품 이미지</span>
                  <Link
                    href="/admin/products/images"
                    className="text-[11px] text-zinc-400 hover:text-rose-600"
                  >
                    배치 플레이스홀더 →
                  </Link>
                </div>

                <div className="mt-2 flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        normalizedPreviewUrl ??
                        localPreviewUrl ??
                        editPreviewUrl(editing, imageUrl)
                      }
                      alt=""
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                    {uploading || previewLoading || backgroundRemovalLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/80">
                        <span className="text-[10px] font-medium text-rose-700">
                          {uploading
                            ? "업로드 중…"
                            : backgroundRemovalLoading
                              ? "배경 제거 중…"
                              : "미리보기…"}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="이미지 파일 업로드"
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      onDragEnter={(event) => {
                        event.preventDefault();
                        setDragOver(true);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={(event) => {
                        event.preventDefault();
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                          setDragOver(false);
                        }
                      }}
                      onDrop={handleDrop}
                      className={`rounded-lg border-2 border-dashed px-3 py-4 text-center transition-colors ${
                        dragOver
                          ? "border-rose-400 bg-rose-50"
                          : "border-zinc-200 bg-zinc-50/70 hover:border-rose-200 hover:bg-rose-50/40"
                      } ${uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
                    >
                      <p className="text-sm font-medium text-zinc-700">
                        이미지를 드래그하거나 클릭하여 선택
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-400">
                        Ctrl+V로 캡처 붙여넣기
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-400">
                        JPG · PNG · WEBP · 최대 5MB
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={handleImageInputChange}
                    />

                    <div>
                      <label
                        htmlFor="edit-image-url"
                        className="block text-[11px] font-medium text-zinc-500"
                      >
                        또는 URL 직접 입력
                      </label>
                      <input
                        id="edit-image-url"
                        type="url"
                        value={imageUrl}
                        onChange={(event) => setImageUrl(event.target.value)}
                        maxLength={2048}
                        placeholder="https://… 또는 비워두면 카테고리 플레이스홀더"
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <ProductImageUploadSettingsPanel
                    options={uploadSettings}
                    onChange={setUploadSettings}
                    disabled={uploading}
                  />
                </div>

                {pendingImageFile ? (
                  <div className="mt-3 space-y-3 rounded-lg border border-rose-100 bg-rose-50/40 p-3">
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => void removeImageBackground()}
                        disabled={
                          uploading ||
                          previewLoading ||
                          backgroundRemovalLoading ||
                          backgroundRemovalApplied
                        }
                        className={`w-full rounded-lg px-4 py-3 text-base font-bold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          backgroundRemovalApplied
                            ? "border-2 border-rose-300 bg-rose-100 text-rose-700"
                            : "bg-rose-600 text-white hover:bg-rose-700"
                        }`}
                      >
                        {backgroundRemovalLoading
                          ? "배경 제거 중…"
                          : backgroundRemovalApplied
                            ? "배경 제거 완료"
                            : "배경 제거하기"}
                      </button>
                      <p className="text-center text-xs font-medium text-rose-700/90">
                        배경을 투명 PNG로 만들기
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] font-medium text-zinc-500">원본</p>
                        <div className="relative mt-1 aspect-square overflow-hidden rounded-md border border-zinc-200 bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={localPreviewUrl ?? ""}
                            alt=""
                            className="absolute inset-0 h-full w-full object-contain"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-zinc-500">
                          {backgroundRemovalApplied ? "배경 제거 미리보기" : "처리 미리보기"}
                        </p>
                        <div
                          className={`relative mt-1 aspect-square overflow-hidden rounded-md border border-zinc-200 ${
                            backgroundRemovalApplied
                              ? "bg-[linear-gradient(45deg,#e4e4e7_25%,transparent_25%),linear-gradient(-45deg,#e4e4e7_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e4e4e7_75%),linear-gradient(-45deg,transparent_75%,#e4e4e7_75%)] bg-[length:12px_12px] bg-[position:0_0,0_6px,6px_-6px,-6px_0]"
                              : "bg-white"
                          }`}
                        >
                          {normalizedPreviewUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={normalizedPreviewUrl}
                              alt=""
                              className="absolute inset-0 h-full w-full object-contain"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">
                              {previewLoading || backgroundRemovalLoading
                                ? "생성 중…"
                                : "미리보기 없음"}
                            </div>
                          )}
                          {backgroundRemovalLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                              <span className="text-[10px] font-medium text-rose-700">
                                배경 제거 중…
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          void uploadImageFile(pendingImageFile, backgroundRemovalApplied)
                        }
                        disabled={uploading || previewLoading || backgroundRemovalLoading}
                        className="w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 sm:w-auto"
                      >
                        {uploading
                          ? "업로드 중…"
                          : backgroundRemovalApplied
                            ? "투명 PNG 업로드"
                            : "이 설정으로 업로드"}
                      </button>
                      <button
                        type="button"
                        onClick={clearPendingImage}
                        disabled={uploading}
                        className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-600 hover:border-zinc-300 disabled:opacity-50 sm:w-auto"
                      >
                        선택 취소
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}
              {message ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {message}
                </p>
              ) : null}

              {confirmDelete ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3">
                  <p className="text-sm font-medium text-red-800">
                    &quot;{name.trim() || editing.name}&quot; 상품을 삭제하시겠습니까?
                  </p>
                  <p className="mt-1 text-xs text-red-600">
                    스토어에서 숨겨지며, 관리자 &quot;삭제됨&quot; 탭에서 복구할 수 있습니다.
                  </p>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:border-zinc-300 disabled:opacity-50"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      disabled={deleting}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? "삭제 중…" : "삭제 확인"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(true);
                    setError(null);
                    setMessage(null);
                  }}
                  disabled={pending || uploading || deleting || confirmDelete}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  삭제
                </button>
                <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={pending || uploading || deleting}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:border-zinc-300 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={pending || uploading || deleting}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {pending ? "저장 중…" : uploading ? "업로드 중…" : "저장"}
                </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
