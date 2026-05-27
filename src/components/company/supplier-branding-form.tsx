"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ImagePlus, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { uploadPublicImage } from "@/lib/media/uploads";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type SupplierBrandingFormProps = {
  companyId: string;
  initialCoverImageUrl?: string | null;
  initialLogoUrl?: string | null;
  onSaved?: (branding: {
    cover_image_url: string | null;
    logo_url: string | null;
  }) => void;
};

type BrandingResponse = {
  branding?: {
    cover_image_url: string | null;
    logo_url: string | null;
  };
  error?: string;
  message?: string;
};

export function SupplierBrandingForm({
  companyId,
  initialCoverImageUrl,
  initialLogoUrl,
  onSaved,
}: SupplierBrandingFormProps) {
  const configured = isSupabaseConfigured();
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialCoverImageUrl ?? "");
  const [isLoading, setIsLoading] = useState(configured);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<"logo" | "cover" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = useMemo(() => {
    if (!configured) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, [configured]);

  const getAccessToken = useCallback(async () => {
    const { data } = await supabase?.auth.getSession() ?? {
      data: { session: null },
    };

    return data.session?.access_token ?? null;
  }, [supabase]);

  const loadBranding = useCallback(async () => {
    const token = await getAccessToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    const response = await fetch(`/api/supplier-pages/${companyId}/branding`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as
      BrandingResponse;

    setIsLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Supplier brand images could not be loaded.");
      return;
    }

    setLogoUrl(payload.branding?.logo_url ?? "");
    setCoverImageUrl(payload.branding?.cover_image_url ?? "");
  }, [companyId, getAccessToken]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBranding();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadBranding]);

  async function handleBrandImageUpload(
    file: File | undefined,
    type: "logo" | "cover",
  ) {
    if (!file || !supabase) {
      return;
    }

    setUploadingImage(type);
    setError(null);
    setMessage(null);

    try {
      const publicUrl = await uploadPublicImage(
        supabase,
        file,
        `companies/${companyId}`,
        type,
      );

      if (type === "logo") {
        setLogoUrl(publicUrl);
      } else {
        setCoverImageUrl(publicUrl);
      }

      setMessage("Image uploaded. Save brand images to keep it.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The image could not be uploaded.",
      );
    } finally {
      setUploadingImage(null);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = await getAccessToken();

    if (!token) {
      setError("Please log in again before saving supplier images.");
      return;
    }

    setError(null);
    setMessage(null);
    setIsSaving(true);

    const response = await fetch(`/api/supplier-pages/${companyId}/branding`, {
      body: JSON.stringify({
        coverImageUrl,
        logoUrl,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      method: "PATCH",
    });
    const payload = (await response.json().catch(() => ({}))) as
      BrandingResponse;

    setIsSaving(false);

    if (!response.ok || !payload.branding) {
      setError(payload.error ?? "Supplier brand images could not be saved.");
      return;
    }

    setLogoUrl(payload.branding.logo_url ?? "");
    setCoverImageUrl(payload.branding.cover_image_url ?? "");
    setMessage(payload.message ?? "Supplier brand images saved.");
    onSaved?.(payload.branding);
  }

  if (!configured) {
    return null;
  }

  return (
    <article className="rounded-xl border border-[#c8d7ee] bg-white/95 p-5 shadow-[0_14px_45px_rgba(6,27,79,0.08)]">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#061b4f] text-white">
          <ImagePlus className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#061b4f]">Brand images</h2>
          <p className="mt-1 text-sm leading-6 text-[#4d6b9e]">
            Upload a supplier logo and cover banner. You can still paste image
            links if the image is already hosted elsewhere.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#dbe7f7] bg-[#f7faff] p-3 text-sm text-[#4d6b9e]">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading brand images...
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <form className="mt-5 grid gap-4" onSubmit={handleSave}>
        <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
          <div>
            <div className="flex size-28 items-center justify-center overflow-hidden rounded-lg border border-[#c8d7ee] bg-[#e0f2f1] text-2xl font-bold text-[#0f766e]">
              {logoUrl ? (
                <img alt="" className="size-full object-cover" src={logoUrl} />
              ) : (
                "TX"
              )}
            </div>
            <label className="mt-3 block">
              <span className="text-sm font-semibold text-[#061b4f]">
                Upload logo
              </span>
              <input
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="mt-2 block w-full text-sm text-[#4d6b9e]"
                disabled={uploadingImage !== null || isSaving}
                onChange={(event) =>
                  void handleBrandImageUpload(event.target.files?.[0], "logo")
                }
                type="file"
              />
            </label>
          </div>

          <div>
            <div
              className="h-36 rounded-lg border border-[#c8d7ee] bg-[linear-gradient(120deg,#061b4f,#0f766e)] bg-cover bg-center"
              style={
                coverImageUrl
                  ? { backgroundImage: `url(${coverImageUrl})` }
                  : undefined
              }
            />
            <label className="mt-3 block">
              <span className="text-sm font-semibold text-[#061b4f]">
                Upload cover banner
              </span>
              <input
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="mt-2 block w-full text-sm text-[#4d6b9e]"
                disabled={uploadingImage !== null || isSaving}
                onChange={(event) =>
                  void handleBrandImageUpload(event.target.files?.[0], "cover")
                }
                type="file"
              />
            </label>
          </div>
        </div>

        {uploadingImage ? (
          <div className="flex items-center gap-2 rounded-lg border border-[#dbe7f7] bg-[#f7faff] p-3 text-sm text-[#4d6b9e]">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Uploading {uploadingImage === "logo" ? "logo" : "cover banner"}...
          </div>
        ) : null}

        <div className="rounded-lg border border-[#dbe7f7] bg-[#f7faff] p-4 text-sm leading-6 text-[#29456f]">
          <p className="font-semibold text-[#061b4f]">Image guidance</p>
          <p className="mt-1">
            Supplier logo: use a square image, ideally 800 x 800 px.
          </p>
          <p>
            Cover banner: use a wide image, ideally 1600 x 400 px. Keep key
            brand marks and text near the centre so they stay visible on mobile.
          </p>
          <p>Maximum file size: 5MB.</p>
        </div>

        <TextField
          hint="Example: https://example.com/logo.png"
          label="Logo image URL"
          name="logo_url"
          onChange={(event) => setLogoUrl(event.target.value)}
          placeholder="https://example.com/logo.png"
          type="text"
          value={logoUrl}
        />
        <TextField
          hint="Wide images work best. Example: https://example.com/cover.jpg"
          label="Cover banner image URL"
          name="cover_image_url"
          onChange={(event) => setCoverImageUrl(event.target.value)}
          placeholder="https://example.com/cover.jpg"
          type="text"
          value={coverImageUrl}
        />
        <Button
          className="w-fit bg-[#061b4f] text-white hover:bg-[#123b7a]"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          Save brand images
        </Button>
      </form>
    </article>
  );
}
