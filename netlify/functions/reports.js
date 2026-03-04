const { getStore } = require("@netlify/blobs");

exports.handler = async function (event) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  const store = getStore("parish-reports");

  // ── LIST all reports for a site ───────────────────────────────────────────
  if (event.httpMethod === "GET") {
    const siteId = event.queryStringParameters?.siteId;
    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "siteId required" }) };
    }
    try {
      const { blobs } = await store.list({ prefix: `${siteId}/` });
      const reports = await Promise.all(
        blobs.map(async (blob) => {
          const data = await store.get(blob.key, { type: "json" });
          return { key: blob.key, ...data };
        })
      );
      reports.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      return { statusCode: 200, headers, body: JSON.stringify({ reports }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── SAVE a report ─────────────────────────────────────────────────────────
  if (event.httpMethod === "POST") {
    let body;
    try { body = JSON.parse(event.body); } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const { siteId, siteLabel, scores, narrative, isBaseline } = body;
    if (!siteId || !scores) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "siteId and scores required" }) };
    }

    const now = new Date().toISOString();
    const key = `${siteId}/${now}`;
    const report = { siteId, siteLabel, scores, narrative: narrative || null, isBaseline: !!isBaseline, savedAt: now };

    try {
      await store.setJSON(key, report);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, key, savedAt: now }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── DELETE a report ───────────────────────────────────────────────────────
  if (event.httpMethod === "DELETE") {
    const key = event.queryStringParameters?.key;
    if (!key) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "key required" }) };
    }
    try {
      await store.delete(key);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
};
