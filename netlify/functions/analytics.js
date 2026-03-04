const crypto = require("crypto");

// ── JWT helpers for Google Service Account auth ──────────────────────────────

function base64url(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  const signingInput = `${header}.${payload}`;
  const privateKey = serviceAccount.private_key;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign
    .sign(privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signingInput}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Token error: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

// ── Main handler ──────────────────────────────────────────────────────────────

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "GOOGLE_SERVICE_ACCOUNT_KEY not set in Netlify environment variables." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body." }) };
  }

  const { propertyId, startDate = "30daysAgo", endDate = "today" } = body;
  if (!propertyId) {
    return { statusCode: 400, body: JSON.stringify({ error: "propertyId is required." }) };
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(KEY);
  } catch {
    return { statusCode: 500, body: JSON.stringify({ error: "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON." }) };
  }

  try {
    const accessToken = await getAccessToken(serviceAccount);

    // Run a GA4 report with the metrics we care about
    const reportRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: "sessions" },
            { name: "activeUsers" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
          ],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
        }),
      }
    );

    const reportData = await reportRes.json();

    if (reportData.error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: reportData.error.message }),
      };
    }

    // Also get top pages
    const pagesRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          metrics: [{ name: "screenPageViews" }, { name: "averageSessionDuration" }],
          dimensions: [{ name: "pagePath" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 5,
        }),
      }
    );

    const pagesData = await pagesRes.json();

    // Also get mobile vs desktop
    const deviceRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          metrics: [{ name: "sessions" }],
          dimensions: [{ name: "deviceCategory" }],
        }),
      }
    );

    const deviceData = await deviceRes.json();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channels: reportData,
        pages: pagesData,
        devices: deviceData,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
