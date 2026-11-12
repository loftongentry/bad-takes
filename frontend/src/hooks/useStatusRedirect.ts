import { useEffect } from "react";
import { useRouter } from "expo-router";

// Moves to another screen when the server changes the room's status,
// e.g. useStatusRedirect(room?.status, { VOTING: '/voting' })
export function useStatusRedirect(status: string | undefined, routes: Record<string, string>) {
  const router = useRouter();

  useEffect(() => {
    const target = status ? routes[status] : undefined;
    if (target) {
      router.replace(target);
    }
  }, [status]);
}
