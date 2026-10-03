import { toast } from "sonner";

// User feedback (legacy: frontend/src/utils/alerts.js with sweetalert2).
// Requires <Toaster /> in the root layout.

export function toastSuccess(message: string): void {
  toast.success(message);
}

export function toastError(message: string): void {
  toast.error(message);
}

/** Message from a failed API call: the server's pt-BR `message`, or a fallback. */
export function apiErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }
  return fallback;
}
