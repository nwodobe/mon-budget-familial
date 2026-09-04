import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PACKAGE_NAME = "io.github.nwodobe.monbudgetfamilial";
const ALLOWED_PRODUCTS = new Set(["premium_monthly", "premium_annual"]);
const ACCESS_STATES = new Set(["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD", "SUBSCRIPTION_STATE_CANCELED"]);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const serviceAccountRaw = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!serviceAccountRaw) return json({ error: "google_play_not_configured" }, 503);

  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  const user = userData.user;
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  let body: { productId?: string; purchaseToken?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const productId = body.productId?.trim() ?? "";
  const purchaseToken = body.purchaseToken?.trim() ?? "";
  if (!ALLOWED_PRODUCTS.has(productId) || purchaseToken.length < 20) return json({ error: "invalid_purchase" }, 400);

  try {
    const serviceAccount = JSON.parse(serviceAccountRaw) as { client_email: string; private_key: string; token_uri?: string };
    const accessToken = await googleAccessToken(serviceAccount);
    const verifyUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    const verifyResponse = await fetch(verifyUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!verifyResponse.ok) return json({ error: "play_verification_failed", status: verifyResponse.status }, 400);
    const purchase = await verifyResponse.json() as any;

    const expectedAccountId = await sha256(user.id);
    if (purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId !== expectedAccountId) return json({ error: "purchase_account_mismatch" }, 403);
    if (!ACCESS_STATES.has(purchase.subscriptionState)) return json({ entitled: false, state: purchase.subscriptionState }, 200);

    const lineItems = Array.isArray(purchase.lineItems) ? purchase.lineItems : [];
    const matching = lineItems.filter((item: any) => item?.productId === productId && item?.expiryTime);
    if (matching.length === 0) return json({ error: "product_mismatch" }, 400);
    const premiumUntil = matching.map((item: any) => new Date(item.expiryTime)).sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];
    if (!premiumUntil || premiumUntil.getTime() <= Date.now()) return json({ entitled: false, state: "expired" }, 200);

    if (purchase.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING") {
      const ackUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
      const ackResponse = await fetch(ackUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ externalAccountIds: { obfuscatedAccountId: expectedAccountId } }),
      });
      if (!ackResponse.ok) return json({ error: "acknowledgement_failed", status: ackResponse.status }, 502);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const tokenHash = await sha256(purchaseToken);
    const { error: writeError } = await admin.from("mbf_entitlements").upsert({
      user_id: user.id,
      product_id: productId,
      premium_until: premiumUntil.toISOString(),
      purchase_token_hash: tokenHash,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (writeError) return json({ error: "entitlement_write_failed" }, 500);

    return json({ entitled: true, productId, premiumUntil: premiumUntil.toISOString() }, 200);
  } catch (error) {
    console.error("verify-play-purchase", error);
    return json({ error: "verification_error" }, 500);
  }
});

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

async function googleAccessToken(sa: { client_email: string; private_key: string; token_uri?: string }): Promise<string> {
  if (!sa.client_email || !sa.private_key) throw new Error("invalid service account");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: sa.token_uri || "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${payload}`;
  const key = await importPrivateKey(sa.private_key);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64UrlBytes(new Uint8Array(signature))}`;
  const tokenResponse = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!tokenResponse.ok) throw new Error("google oauth failed");
  const tokenJson = await tokenResponse.json() as { access_token?: string };
  if (!tokenJson.access_token) throw new Error("missing access token");
  return tokenJson.access_token;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const binary = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", binary, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
function base64Url(value: string): string { return base64UrlBytes(new TextEncoder().encode(value)); }
function base64UrlBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
