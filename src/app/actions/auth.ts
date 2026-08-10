"use server";

import { signIn, signOut } from "@/auth";

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

/** Google 동의 화면을 다시 거쳐 refresh_token 을 재발급받습니다. */
export async function reconnectGoogleAction() {
  await signIn("google", { redirectTo: "/settings" });
}
