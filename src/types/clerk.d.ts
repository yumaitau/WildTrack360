export {};

declare global {
  interface CustomJwtSessionClaims {
    org_url?: string;
  }
}
