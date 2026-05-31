import { NextResponse } from "next/server";
import { createSessionToken, getAdminCredentials, setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const credentials = getAdminCredentials();

  if (email !== credentials.email || password !== credentials.password) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  setSessionCookie(createSessionToken(email));
  return NextResponse.redirect(new URL("/", request.url), 303);
}
