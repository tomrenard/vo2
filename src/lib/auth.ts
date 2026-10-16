import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/client";
import { account, session, user, verification } from "@/db/schema";

/** Comma-separated env list, compared lowercased. */
const emails = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

/**
 * Email + password accounts. Only invited emails (ALLOWED_EMAILS) can sign up: the URL is
 * public.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db(), {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  // Login and signup go through the pages' server actions (with the database-backed lockout);
  // the raw HTTP routes would skip it.
  disabledPaths: ["/sign-in/email", "/sign-up/email"],
  session: {
    expiresIn: 60 * 60 * 24 * 365,
    updateAge: 60 * 60 * 24,
    // A signed copy of the session in a cookie for 5 minutes: most pages skip the session query.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          const email = newUser.email.toLowerCase();
          if (!emails(process.env.ALLOWED_EMAILS).includes(email)) {
            throw new APIError("FORBIDDEN", { message: "This email isn't invited." });
          }
        },
      },
    },
  },
  // Lets server actions set the session cookie.
  plugins: [nextCookies()],
});
