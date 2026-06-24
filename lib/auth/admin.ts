import { getCurrentUser } from "@/lib/auth/session";

/** The current user if they're an admin, else null. */
export async function getAdminUser() {
  const user = await getCurrentUser();
  return user?.isAdmin ? user : null;
}
