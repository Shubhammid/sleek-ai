import { auth } from "@insforge/nextjs";
import { createClient } from "@insforge/sdk";

export async function getAuthServer() {
  const { token, user } = await auth();

  const insforge = createClient({
    baseUrl:
      process.env.INSFORGE_BASE_URL || "https://zywac77e.us-east.insforge.app",
    anonKey: process.env.INSFORGE_ANON_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    edgeFunctionToken: token || undefined,
  });

  return { insforge, user };
}
