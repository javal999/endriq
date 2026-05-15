// @ts-nocheck
import { redirect } from "next/navigation";

/** CSV path deprecated — integrations live under /settings. */
export default function UploadRedirect() {
  redirect("/settings");
}
