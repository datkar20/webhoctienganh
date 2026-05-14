export function getFirebaseErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  if (code === "auth/configuration-not-found" || message.includes("auth/configuration-not-found")) {
    return "Firebase Authentication is not configured for this project. In Firebase Console, enable Authentication, turn on Email/Password sign-in, and make sure the env values belong to the same Firebase project.";
  }

  if (code === "auth/unauthorized-domain" || message.includes("auth/unauthorized-domain")) {
    return "This domain is not authorized in Firebase Authentication. Add localhost or your Vercel domain in Authentication > Settings > Authorized domains.";
  }

  if (code === "auth/invalid-api-key" || message.includes("auth/invalid-api-key")) {
    return "The Firebase API key is invalid. Check NEXT_PUBLIC_FIREBASE_API_KEY in .env.local and in Vercel Environment Variables.";
  }

  if (code === "auth/email-already-in-use") {
    return "This email is already registered. Try logging in instead.";
  }

  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Email or password is incorrect.";
  }

  return message;
}
