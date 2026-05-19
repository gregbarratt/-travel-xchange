"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, Settings, X } from "lucide-react";

const consentStorageKey = "travel-xchange-cookie-consent-v1";

type ConsentChoice = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  savedAt: string;
  version: "1";
};

function saveConsent(analytics: boolean, marketing: boolean) {
  const consent: ConsentChoice = {
    necessary: true,
    analytics,
    marketing,
    savedAt: new Date().toISOString(),
    version: "1",
  };

  window.localStorage.setItem(consentStorageKey, JSON.stringify(consent));
}

export function CookieConsentBanner() {
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedConsent = window.localStorage.getItem(consentStorageKey);

      setIsVisible(!storedConsent);
      setIsReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!isReady || !isVisible) {
    return null;
  }

  function acceptAll() {
    saveConsent(true, true);
    setIsVisible(false);
  }

  function rejectOptional() {
    saveConsent(false, false);
    setIsVisible(false);
  }

  function saveChoices() {
    saveConsent(analytics, marketing);
    setIsVisible(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] px-4 pb-4 sm:px-6">
      <div className="mx-auto max-w-5xl rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <span className="mt-1 rounded-lg bg-[#e0f2f1] p-2 text-[#0f766e]">
              <Cookie className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#082f49]">
                Cookie preferences
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Travel Xchange uses necessary browser storage to run the site.
                Optional analytics and marketing tools will only be used when
                you allow them. You can read more in the{" "}
                <Link
                  className="font-semibold text-[#0f766e] underline-offset-4 hover:underline"
                  href="/legal/cookies"
                >
                  Cookie Policy
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#082f49] hover:bg-slate-50"
              onClick={() => setIsManaging((current) => !current)}
              type="button"
            >
              <Settings className="mr-2 size-4" aria-hidden="true" />
              Manage
            </button>
            <button
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#082f49] hover:bg-slate-50"
              onClick={rejectOptional}
              type="button"
            >
              Reject optional
            </button>
            <button
              className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#115e59]"
              onClick={acceptAll}
              type="button"
            >
              Accept all
            </button>
            <button
              aria-label="Close cookie banner"
              className="inline-flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              onClick={rejectOptional}
              type="button"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {isManaging ? (
          <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-3">
            <label className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <span className="font-semibold text-[#082f49]">Necessary</span>
              <span className="mt-2 block leading-6 text-slate-600">
                Required for login, security, and saved preferences.
              </span>
              <input checked className="mt-3" disabled type="checkbox" />
            </label>
            <label className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <span className="font-semibold text-[#082f49]">Analytics</span>
              <span className="mt-2 block leading-6 text-slate-600">
                Helps understand product usage and improve the service.
              </span>
              <input
                checked={analytics}
                className="mt-3"
                onChange={(event) => setAnalytics(event.target.checked)}
                type="checkbox"
              />
            </label>
            <label className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <span className="font-semibold text-[#082f49]">Marketing</span>
              <span className="mt-2 block leading-6 text-slate-600">
                Supports future advert and sponsorship measurement.
              </span>
              <input
                checked={marketing}
                className="mt-3"
                onChange={(event) => setMarketing(event.target.checked)}
                type="checkbox"
              />
            </label>
            <div className="sm:col-span-3">
              <button
                className="rounded-lg bg-[#082f49] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b3d5f]"
                onClick={saveChoices}
                type="button"
              >
                Save choices
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
