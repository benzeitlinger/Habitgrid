import { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/**
 * `router.back()` is a no-op when a screen was opened directly by URL (deep
 * link, or a browser reload during development), which leaves a sheet stuck
 * open. Fall back to the checklist in that case.
 */
export function closeSheet(router: Router) {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
