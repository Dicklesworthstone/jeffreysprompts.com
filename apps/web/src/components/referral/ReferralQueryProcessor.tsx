"use client";

import { startTransition, useCallback, useEffect, useRef } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface ReferralApplyResponse {
  success?: boolean;
  data?: {
    rewards?: {
      message?: string;
    };
  };
  error?: string;
}

function buildUrlWithoutReferral(
  pathname: string,
  searchParams: URLSearchParams | ReadonlyURLSearchParams
): string {
  const nextParams = new URLSearchParams(searchParams.toString());
  nextParams.delete("ref");

  return nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
}

export function ReferralQueryProcessor() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error } = useToast();
  const attemptedCodeRef = useRef<string | null>(null);

  const referralCode = searchParams.get("ref")?.trim() ?? "";

  const clearReferralParam = useCallback(() => {
    const nextUrl = buildUrlWithoutReferral(pathname, searchParams);
    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!referralCode) {
      attemptedCodeRef.current = null;
      return;
    }

    if (attemptedCodeRef.current === referralCode) {
      return;
    }

    attemptedCodeRef.current = referralCode;
    const controller = new AbortController();

    async function applyCode() {
      try {
        const response = await fetch("/api/referral/apply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code: referralCode }),
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => ({}))) as ReferralApplyResponse;
        if (controller.signal.aborted) {
          return;
        }

        if (response.ok && payload.success) {
          success(
            "Referral code applied",
            payload.data?.rewards?.message ?? "Your referral reward has been applied."
          );
          clearReferralParam();
          return;
        }

        const message =
          typeof payload.error === "string" && payload.error
            ? payload.error
            : "Please try again later.";

        error("Unable to apply referral code", message);

        if (response.status >= 400 && response.status < 500) {
          clearReferralParam();
          return;
        }

        attemptedCodeRef.current = null;
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          return;
        }

        attemptedCodeRef.current = null;
        error(
          "Unable to apply referral code",
          "Please check your connection and try again."
        );
      }
    }

    applyCode();

    return () => {
      controller.abort();
    };
  }, [clearReferralParam, error, referralCode, success]);

  return null;
}
