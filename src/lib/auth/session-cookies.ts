export const accessTokenCookieName = "tx_access_token";
export const refreshTokenCookieName = "tx_refresh_token";

export const accessTokenMaxAgeSeconds = 60 * 60;
export const refreshTokenMaxAgeSeconds = 60 * 60 * 24 * 30;

export function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
