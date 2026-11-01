// lib/googlePhoto.ts
//
// The student's Google (Gmail) profile photo, read from the Firebase Auth user.
//
// ⚠️ It is only there when Google is one of the account's sign-in providers
// (signed up with Google, or linked from the profile page's "Use Google
// photo"). A password-only account has no Google identity, and there is no
// keyless public endpoint that turns a Gmail address into its photo.
// ⚠️ Render these URLs with `referrerPolicy="no-referrer"` —
// lh3.googleusercontent.com intermittently answers 403 to a request that
// carries a Referer.

import type { User } from 'firebase/auth';

/** Ask Google's image server for a crisp square (`=s96-c` → `=s{size}-c`). */
export function sizedGooglePhoto(url: string, size = 400): string {
  if (!/googleusercontent\.com/.test(url)) return url;
  return /=s\d+(-c)?$/.test(url) ? url.replace(/=s\d+(-c)?$/, `=s${size}-c`) : url;
}

/** The Google provider's photo for this account, or `null` if it has none. */
export function googlePhotoURL(user: User | null | undefined, size = 400): string | null {
  const url = user?.providerData.find((p) => p.providerId === 'google.com')?.photoURL;
  return url ? sizedGooglePhoto(url, size) : null;
}
