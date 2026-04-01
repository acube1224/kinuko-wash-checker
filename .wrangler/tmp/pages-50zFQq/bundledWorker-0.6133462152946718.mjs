var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-oL3OeR/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// _worker.js
var ADMIN_PASSWORD = "Hibikinukosan_checker";
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/api/log" && request.method === "POST") {
      return handleSaveLog(request, env);
    }
    if (path === "/api/fabric-check" && request.method === "POST") {
      return handleFabricCheck(request, env);
    }
    if (path.startsWith("/api/fabric-image/") && request.method === "GET") {
      return handleFabricImage(request, env, path);
    }
    if (path === "/hibikinu" || path === "/hibikinu/") {
      return renderAdminLogin();
    }
    if (path === "/hibikinu/login" && request.method === "POST") {
      return handleAdminLogin(request);
    }
    if (path === "/hibikinu/data" && request.method === "GET") {
      return handleAdminData(request, env, url);
    }
    if (path === "/hibikinu/stats" && request.method === "GET") {
      return handleAdminStats(request, env);
    }
    if (path === "/hibikinu/delete" && request.method === "POST") {
      return handleAdminDelete(request, env);
    }
    if (path === "/hibikinu/flag" && request.method === "POST") {
      return handleAdminFlag(request, env);
    }
    if (path === "/hibikinu/export" && request.method === "GET") {
      return handleAdminExport(request, env);
    }
    if (path === "/hibikinu/fabric-data" && request.method === "GET") {
      return handleFabricAdminData(request, env, url);
    }
    if (path === "/hibikinu/fabric-stats" && request.method === "GET") {
      return handleFabricAdminStats(request, env);
    }
    if (path === "/hibikinu/fabric-delete" && request.method === "POST") {
      return handleFabricAdminDelete(request, env);
    }
    if (path === "/hibikinu/fabric-flag" && request.method === "POST") {
      return handleFabricAdminFlag(request, env);
    }
    if (path.startsWith("/hibikinu/")) {
      return renderAdminApp(request, env, url);
    }
    return env.ASSETS.fetch(request);
  }
};
async function hashIP(ip) {
  if (!ip) return null;
  const data = new TextEncoder().encode(ip + "_kinuko_salt");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
__name(hashIP, "hashIP");
function parseDevice(ua) {
  if (!ua) return "unknown";
  const u = ua.toLowerCase();
  let os = "PC";
  if (u.includes("iphone")) os = "iPhone";
  else if (u.includes("ipad")) os = "iPad";
  else if (u.includes("android")) os = "Android";
  let br = "Other";
  if (u.includes("edg/")) br = "Edge";
  else if (u.includes("chrome") && !u.includes("chromium")) br = "Chrome";
  else if (u.includes("safari") && !u.includes("chrome")) br = "Safari";
  else if (u.includes("firefox")) br = "Firefox";
  return `${os} ${br}`;
}
__name(parseDevice, "parseDevice");
function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateToken, "generateToken");
function checkAuth(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/hibikinu_token=([a-f0-9]+)/);
  if (!match) return false;
  return match[1].length === 48;
}
__name(checkAuth, "checkAuth");
async function handleFabricCheck(request, env) {
  try {
    const { images, nickname } = await request.json();
    if (!images || images.length !== 3) {
      return Response.json({ error: "\u753B\u50CF\u304C3\u679A\u5FC5\u8981\u3067\u3059" }, { status: 400 });
    }
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "API\u30AD\u30FC\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093" }, { status: 500 });
    }
    const parts = images.map((img) => {
      const base64 = img.replace(/^data:image\/\w+;base64,/, "");
      return { inlineData: { mimeType: "image/jpeg", data: base64 } };
    });
    const prompt = `\u3042\u306A\u305F\u306F\u548C\u670D\u306E\u751F\u5730\u306E\u5C02\u9580\u5BB6\u3067\u3059\u3002
\u6DFB\u4ED8\u3055\u308C\u305F\u9577\u8966\u88A2\u306E\u5199\u771F3\u679A\uFF08\u5168\u4F53\u50CF\u30FB\u5149\u6CA2\u89D2\u5EA6\u30FB\u751F\u5730\u30A2\u30C3\u30D7\uFF09\u3092\u898B\u3066\u3001\u7D20\u6750\u3068\u751F\u5730\u306E\u7A2E\u985E\u3092\u5224\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u5224\u5B9A\u30EB\u30FC\u30EB1\uFF1A\u7D20\u6750\u30AB\u30C6\u30B4\u30EA\u3011
\u5FC5\u305A\u4EE5\u4E0B\u306E\u4E2D\u304B\u30891\u3064\u9078\u3093\u3067\u304F\u3060\u3055\u3044\uFF1A
- silk\uFF08\u7D79\u30FB\u30B7\u30EB\u30AF\uFF09
- cotton\uFF08\u7DBF\u30FB\u30B3\u30C3\u30C8\u30F3\uFF09
- linen\uFF08\u9EBB\u30FB\u30EA\u30CD\u30F3\uFF09
- poly\uFF08\u30DD\u30EA\u30A8\u30B9\u30C6\u30EB\u30FB\u5316\u7E4A\uFF09
- other\uFF08\u305D\u306E\u4ED6\u30FB\u4E0D\u660E\uFF09

\u3010\u5224\u5B9A\u30EB\u30FC\u30EB2\uFF1A\u751F\u5730\u306E\u7A2E\u985E\u3011
\u4EE5\u4E0B\u306E\u30EA\u30B9\u30C8\u3092\u53C2\u7167\u3057\u3001\u660E\u78BA\u306B\u8A72\u5F53\u3059\u308B\u3082\u306E\u304C\u3042\u308C\u3070 fabricKey \u306B\u305D\u306E\u30AD\u30FC\u3092\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\u3002
- chirimen\uFF08\u3061\u308A\u3081\u3093\uFF1A\u7E26\u30FB\u6A2A\u65B9\u5411\u306B\u7D30\u304B\u3044\u30B7\u30DC\uFF08\u51F9\u51F8\uFF09\u304C\u3042\u308B\u30FB\u30DE\u30C3\u30C8\u3067\u5149\u6CA2\u304C\u5C11\u306A\u3044\u30FB\u72EC\u7279\u306E\u3056\u3089\u3064\u304D\u611F\u304C\u3042\u308B\uFF09
- rinzu\uFF08\u7DB8\u5B50\uFF1A\u5149\u6CA2\u304C\u3042\u308A\u5730\u7D0B\uFF08\u7E54\u308A\u67C4\uFF09\u304C\u898B\u3048\u308B\u30FB\u30B7\u30DC\u306F\u306A\u304F\u306A\u3081\u3089\u304B\uFF09
- habutae\uFF08\u7FBD\u4E8C\u91CD\uFF1A\u5E73\u7E54\u308A\u3067\u975E\u5E38\u306B\u306A\u3081\u3089\u304B\u30FB\u4E0A\u54C1\u306A\u5149\u6CA2\u304C\u3042\u308B\u30FB\u8584\u624B\u3067\u8EFD\u3044\u30FB\u30B7\u30DC\u3084\u5730\u7D0B\u306F\u306A\u3044\u30FB\u3061\u308A\u3081\u3093\u3084\u7DB8\u5B50\u3088\u308A\u8584\u304F\u30C9\u30EC\u30FC\u30D7\u6027\u304C\u9AD8\u3044\uFF09
- ro\uFF08\u7D7D\u30FB\u7D17\uFF1A\u900F\u3051\u611F\u304C\u3042\u308B\u590F\u7269\u30FB\u683C\u5B50\u72B6\u307E\u305F\u306F\u6A2A\u7E1E\u72B6\u306E\u900F\u3051\u76EE\u304C\u898B\u3048\u308B\uFF09
- seika\uFF08\u7CBE\u83EF\u30D1\u30EC\u30B9\uFF1A\u3061\u308A\u3081\u3093\u306E\u4E00\u7A2E\u3060\u304C\u30B7\u30DC\u304C\u975E\u5E38\u306B\u5C0F\u3055\u304F\u6D45\u3044\u30FB\u3061\u308A\u3081\u3093\u3088\u308A\u5E73\u6ED1\u306B\u8FD1\u304F\u898B\u3048\u308B\u30FB\u5149\u6CA2\u304C\u3042\u308A\u8584\u624B\u30FB\u30D1\u30EC\u30B9\u7E2E\u7DEC\u3068\u3082\u547C\u3070\u308C\u308B\uFF09
- shioze\uFF08\u5869\u702C\uFF1A\u6A2A\u755D\uFF08\u6A2A\u65B9\u5411\u306E\u51F9\u51F8\uFF09\u304C\u306F\u3063\u304D\u308A\u3042\u308B\u30FB\u539A\u624B\u3067\u3057\u3063\u304B\u308A\u3057\u305F\u751F\u5730\u611F\u30FB\u5149\u6CA2\u306F\u3084\u3084\u6291\u3048\u3081\uFF09
- smooth\uFF08\u4E00\u822C\u7684\u306A\u5E73\u7E54\u308A\u30FB\u4E0A\u8A18\u306E\u3044\u305A\u308C\u306E\u7279\u5FB4\u3082\u660E\u78BA\u3067\u306A\u3044\uFF09

\u30EA\u30B9\u30C8\u306E\u3044\u305A\u308C\u306B\u3082\u660E\u78BA\u306B\u8A72\u5F53\u3057\u306A\u3044\u304C\u3001\u6700\u3082\u8FD1\u3044\u5019\u88DC\u304C\u3042\u308B\u3068\u5224\u65AD\u3057\u305F\u5834\u5408\u306F\uFF1A
  fabricKey \u306B "closest_match" \u3092\u8FD4\u3057\u3001
  closestFabricKey \u306B\u305D\u306E\u30AD\u30FC\u3092\u3001
  closestReason \u306B\u305D\u306E\u7406\u7531\u3092400\u5B57\u524D\u5F8C\u3067\u65E5\u672C\u8A9E\u3067\u8A18\u5165\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u5168\u304F\u5224\u65AD\u3067\u304D\u306A\u3044\u5834\u5408\u306E\u307F fabricKey \u306B "unknown" \u3092\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u51FA\u529B\u5F62\u5F0F\u3011\u5FC5\u305AJSON\u5F62\u5F0F\u306E\u307F\u3067\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u4F59\u8A08\u306A\u6587\u7AE0\u306F\u4E0D\u8981\u3067\u3059\u3002
{
  "materialKey": "\u7D20\u6750\u30AB\u30C6\u30B4\u30EA\u306E\u30AD\u30FC",
  "fabricKey": "\u751F\u5730\u7A2E\u985E\u306E\u30AD\u30FC \u307E\u305F\u306F closest_match \u307E\u305F\u306F unknown",
  "confidence": "high \u307E\u305F\u306F mid \u307E\u305F\u306F low",
  "comment": "\u5224\u5B9A\u6839\u62E0\u3092400\u5B57\u524D\u5F8C\u3067\u65E5\u672C\u8A9E\u3067\u8AAC\u660E\u3002\u751F\u5730\u306E\u7279\u5FB4\uFF08\u5149\u6CA2\u30FB\u30B7\u30DC\u30FB\u7E54\u308A\u76EE\u30FB\u900F\u3051\u611F\u306A\u3069\uFF09\u3092\u5177\u4F53\u7684\u306B\u8FF0\u3079\u3001\u5224\u5B9A\u306E\u6839\u62E0\u3068\u6CE8\u610F\u70B9\u3082\u542B\u3081\u308B\u3053\u3068",
  "closestFabricKey": "closest_match\u6642\u306E\u307F\u8A18\u5165\u3002\u305D\u308C\u4EE5\u5916\u306Fnull",
  "closestReason": "closest_match\u6642\u306E\u307F\u8A18\u5165\u3002\u305D\u308C\u4EE5\u5916\u306Fnull"
}`;
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              ...parts,
              { text: prompt }
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        })
      }
    );
    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      return Response.json({ error: "AI\u5224\u5B9A\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u3057\u3070\u3089\u304F\u3057\u3066\u304B\u3089\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002" }, { status: 502 });
    }
    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { fabricKey: "unknown", confidence: "low", comment: "\u5199\u771F\u304B\u3089\u306E\u5224\u5B9A\u304C\u96E3\u3057\u3044\u72B6\u614B\u3067\u3057\u305F\u3002\u5225\u306E\u89D2\u5EA6\u3067\u64AE\u308A\u76F4\u3057\u3066\u307F\u3066\u304F\u3060\u3055\u3044\u3002" };
    }
    const VALID_FABRIC = ["chirimen", "rinzu", "habutae", "ro", "seika", "shioze", "smooth", "unknown", "closest_match"];
    const VALID_MATERIAL = ["silk", "cotton", "linen", "poly", "other"];
    if (!VALID_FABRIC.includes(parsed.fabricKey)) parsed.fabricKey = "unknown";
    if (!VALID_MATERIAL.includes(parsed.materialKey)) parsed.materialKey = "other";
    const VALID_CLOSEST = ["chirimen", "rinzu", "habutae", "ro", "seika", "shioze", "smooth"];
    if (parsed.fabricKey === "closest_match") {
      if (!VALID_CLOSEST.includes(parsed.closestFabricKey)) {
        parsed.fabricKey = "unknown";
        parsed.closestFabricKey = null;
        parsed.closestReason = null;
      }
    } else {
      parsed.closestFabricKey = null;
      parsed.closestReason = null;
    }
    const imageUrls = [null, null, null];
    if (env.kinuko_fabric_images) {
      const ts = Date.now();
      for (let i = 0; i < 3; i++) {
        try {
          const base64 = images[i].replace(/^data:image\/\w+;base64,/, "");
          const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
          const key = `fabric/${ts}_${i + 1}.jpg`;
          await env.kinuko_fabric_images.put(key, binary, {
            httpMetadata: { contentType: "image/jpeg" }
          });
          imageUrls[i] = key;
        } catch (e) {
          console.error(`R2 upload error (image ${i + 1}):`, e);
        }
      }
    }
    if (env.kinuko_logs) {
      try {
        await env.kinuko_logs.prepare(`
          INSERT INTO fabric_logs
            (nickname, material_key, fabric_key, closest_fabric_key,
             confidence, comment, closest_reason,
             image_url_1, image_url_2, image_url_3, is_test)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `).bind(
          nickname || null,
          parsed.materialKey,
          parsed.fabricKey,
          parsed.closestFabricKey || null,
          parsed.confidence,
          parsed.comment,
          parsed.closestReason || null,
          imageUrls[0],
          imageUrls[1],
          imageUrls[2]
        ).run();
      } catch (e) {
        console.error("D1 log error:", e);
      }
    }
    return Response.json(parsed);
  } catch (e) {
    console.error("handleFabricCheck error:", e);
    return Response.json({ error: "\u4E88\u671F\u3057\u306A\u3044\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F" }, { status: 500 });
  }
}
__name(handleFabricCheck, "handleFabricCheck");
async function handleFabricImage(request, env, path) {
  const key = decodeURIComponent(path.replace("/api/fabric-image/", ""));
  if (!env.kinuko_fabric_images) {
    return new Response("R2 not configured", { status: 500 });
  }
  const obj = await env.kinuko_fabric_images.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "max-age=86400" }
  });
}
__name(handleFabricImage, "handleFabricImage");
async function handleFabricAdminData(request, env, url) {
  if (!checkAuth(request)) return new Response("Unauthorized", { status: 401 });
  const showTest = url.searchParams.get("test") === "1";
  const limit = parseInt(url.searchParams.get("limit") || "100");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const rows = await env.kinuko_logs.prepare(`
    SELECT * FROM fabric_logs
    WHERE is_test = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(showTest ? 1 : 0, limit, offset).all();
  const total = await env.kinuko_logs.prepare(
    `SELECT COUNT(*) as cnt FROM fabric_logs WHERE is_test = ?`
  ).bind(showTest ? 1 : 0).first();
  return Response.json({ rows: rows.results, total: total?.cnt || 0 });
}
__name(handleFabricAdminData, "handleFabricAdminData");
async function handleFabricAdminStats(request, env) {
  if (!checkAuth(request)) return new Response("Unauthorized", { status: 401 });
  const [total, fabricDist, materialDist, confDist, daily] = await Promise.all([
    env.kinuko_logs.prepare(`SELECT COUNT(*) as cnt FROM fabric_logs WHERE is_test = 0`).first(),
    env.kinuko_logs.prepare(`
      SELECT fabric_key, COUNT(*) as cnt FROM fabric_logs
      WHERE is_test = 0 GROUP BY fabric_key ORDER BY cnt DESC`).all(),
    env.kinuko_logs.prepare(`
      SELECT material_key, COUNT(*) as cnt FROM fabric_logs
      WHERE is_test = 0 GROUP BY material_key ORDER BY cnt DESC`).all(),
    env.kinuko_logs.prepare(`
      SELECT confidence, COUNT(*) as cnt FROM fabric_logs
      WHERE is_test = 0 GROUP BY confidence`).all(),
    env.kinuko_logs.prepare(`
      SELECT DATE(created_at) as day, COUNT(*) as cnt FROM fabric_logs
      WHERE is_test = 0 GROUP BY day ORDER BY day DESC LIMIT 30`).all()
  ]);
  return Response.json({
    total: total?.cnt || 0,
    fabricDist: fabricDist.results,
    materialDist: materialDist.results,
    confDist: confDist.results,
    daily: daily.results
  });
}
__name(handleFabricAdminStats, "handleFabricAdminStats");
async function handleFabricAdminDelete(request, env) {
  if (!checkAuth(request)) return new Response("Unauthorized", { status: 401 });
  const { id } = await request.json();
  await env.kinuko_logs.prepare(`DELETE FROM fabric_logs WHERE id = ?`).bind(id).run();
  return Response.json({ success: true });
}
__name(handleFabricAdminDelete, "handleFabricAdminDelete");
async function handleFabricAdminFlag(request, env) {
  if (!checkAuth(request)) return new Response("Unauthorized", { status: 401 });
  const { id, is_test } = await request.json();
  await env.kinuko_logs.prepare(`UPDATE fabric_logs SET is_test = ? WHERE id = ?`).bind(is_test, id).run();
  return Response.json({ success: true });
}
__name(handleFabricAdminFlag, "handleFabricAdminFlag");
async function handleSaveLog(request, env) {
  try {
    const body = await request.json();
    const {
      grade,
      score,
      duration_sec,
      session_id,
      ans_material,
      ans_silk_fabric,
      ans_fabric,
      ans_tailoring,
      ans_decoration,
      ans_water_history,
      ans_past_result,
      ans_color,
      ans_option_guard,
      ans_option_vintage
    } = body;
    const referrer = request.headers.get("Referer") || "";
    const ua = request.headers.get("User-Agent") || "";
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0].trim() || "";
    const ip_hash = await hashIP(ip);
    const device = parseDevice(ua);
    await env.kinuko_logs.prepare(`
      INSERT INTO diagnosis_logs
        (grade, score, duration_sec, session_id, referrer,
         ans_material, ans_silk_fabric, ans_fabric,
         ans_tailoring, ans_decoration, ans_water_history,
         ans_past_result, ans_color,
         ans_option_guard, ans_option_vintage,
         ip_hash, device)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      grade,
      score,
      duration_sec || null,
      session_id || null,
      referrer,
      ans_material || null,
      ans_silk_fabric || null,
      ans_fabric || null,
      ans_tailoring || null,
      ans_decoration || null,
      ans_water_history || null,
      ans_past_result || null,
      ans_color || null,
      ans_option_guard ? 1 : 0,
      ans_option_vintage ? 1 : 0,
      ip_hash || null,
      device || null
    ).run();
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(handleSaveLog, "handleSaveLog");
async function handleAdminLogin(request) {
  const body = await request.formData();
  const password = body.get("password");
  if (password !== ADMIN_PASSWORD) {
    return renderAdminLogin("\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u9055\u3044\u307E\u3059");
  }
  const token = generateToken();
  return new Response("", {
    status: 302,
    headers: {
      "Location": "/hibikinu/dashboard",
      "Set-Cookie": `hibikinu_token=${token}; Path=/hibikinu; HttpOnly; SameSite=Strict; Max-Age=86400`
    }
  });
}
__name(handleAdminLogin, "handleAdminLogin");
async function handleAdminData(request, env, url) {
  if (!checkAuth(request)) return new Response("Unauthorized", { status: 401 });
  const page = parseInt(url.searchParams.get("page") || "1");
  const grade = url.searchParams.get("grade") || "";
  const isTest = url.searchParams.get("test") || "";
  const perPage = 50;
  const offset = (page - 1) * perPage;
  let where = [];
  let params = [];
  if (grade) {
    where.push("grade = ?");
    params.push(grade);
  }
  if (isTest !== "") {
    where.push("is_test = ?");
    params.push(parseInt(isTest));
  }
  const whereSQL = where.length ? "WHERE " + where.join(" AND ") : "";
  const total = await env.kinuko_logs.prepare(
    `SELECT COUNT(*) as cnt FROM diagnosis_logs ${whereSQL}`
  ).bind(...params).first();
  const rows = await env.kinuko_logs.prepare(
    `SELECT * FROM diagnosis_logs ${whereSQL} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, perPage, offset).all();
  const ipCounts = {};
  const hashes = [...new Set(rows.results.map((r) => r.ip_hash).filter(Boolean))];
  if (hashes.length > 0) {
    const ph = hashes.map(() => "?").join(",");
    const ipRows = await env.kinuko_logs.prepare(
      `SELECT ip_hash, COUNT(*) as cnt FROM diagnosis_logs WHERE ip_hash IN (${ph}) GROUP BY ip_hash`
    ).bind(...hashes).all();
    ipRows.results.forEach((r) => {
      ipCounts[r.ip_hash] = r.cnt;
    });
  }
  return new Response(JSON.stringify({ rows: rows.results, total: total.cnt, page, perPage, ipCounts }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleAdminData, "handleAdminData");
async function handleAdminStats(request, env) {
  if (!checkAuth(request)) return new Response("Unauthorized", { status: 401 });
  const [gradeCount, daily, materialDist, fabricDist, tailoringDist, waterHistoryDist, colorDist, totalRow, optionRow] = await Promise.all([
    env.kinuko_logs.prepare(
      `SELECT grade, COUNT(*) as cnt FROM diagnosis_logs WHERE is_test=0 GROUP BY grade`
    ).all(),
    env.kinuko_logs.prepare(
      `SELECT date(created_at, '+9 hours') as day, COUNT(*) as cnt FROM diagnosis_logs WHERE is_test=0 GROUP BY day ORDER BY day DESC LIMIT 30`
    ).all(),
    env.kinuko_logs.prepare(
      `SELECT ans_material, COUNT(*) as cnt FROM diagnosis_logs WHERE is_test=0 GROUP BY ans_material`
    ).all(),
    env.kinuko_logs.prepare(
      `SELECT COALESCE(ans_silk_fabric, ans_fabric) as fabric_key, COUNT(*) as cnt FROM diagnosis_logs WHERE is_test=0 AND (ans_silk_fabric IS NOT NULL OR ans_fabric IS NOT NULL) GROUP BY fabric_key`
    ).all(),
    env.kinuko_logs.prepare(
      `SELECT ans_tailoring, COUNT(*) as cnt FROM diagnosis_logs WHERE is_test=0 AND ans_tailoring IS NOT NULL GROUP BY ans_tailoring`
    ).all(),
    env.kinuko_logs.prepare(
      `SELECT ans_water_history, COUNT(*) as cnt FROM diagnosis_logs WHERE is_test=0 AND ans_water_history IS NOT NULL GROUP BY ans_water_history`
    ).all(),
    env.kinuko_logs.prepare(
      `SELECT ans_color, COUNT(*) as cnt FROM diagnosis_logs WHERE is_test=0 AND ans_color IS NOT NULL GROUP BY ans_color`
    ).all(),
    env.kinuko_logs.prepare(
      `SELECT COUNT(*) as cnt, AVG(score) as avg_score FROM diagnosis_logs WHERE is_test=0`
    ).first(),
    env.kinuko_logs.prepare(
      `SELECT SUM(ans_option_guard) as guard_cnt, SUM(ans_option_vintage) as vintage_cnt FROM diagnosis_logs WHERE is_test=0`
    ).first()
  ]);
  return new Response(JSON.stringify({
    gradeCount: gradeCount.results,
    daily: daily.results,
    materialDist: materialDist.results,
    fabricDist: fabricDist.results,
    tailoringDist: tailoringDist.results,
    waterHistoryDist: waterHistoryDist.results,
    colorDist: colorDist.results,
    total: totalRow.cnt,
    avgScore: Math.round((totalRow.avg_score || 0) * 10) / 10,
    guardCnt: optionRow.guard_cnt || 0,
    vintageCnt: optionRow.vintage_cnt || 0
  }), { headers: { "Content-Type": "application/json" } });
}
__name(handleAdminStats, "handleAdminStats");
async function handleAdminDelete(request, env) {
  if (!checkAuth(request)) return new Response("Unauthorized", { status: 401 });
  const body = await request.json();
  const { ids, deleteTestAll } = body;
  if (deleteTestAll) {
    await env.kinuko_logs.prepare(`DELETE FROM diagnosis_logs WHERE is_test = 1`).run();
  } else if (ids && ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    await env.kinuko_logs.prepare(
      `DELETE FROM diagnosis_logs WHERE id IN (${placeholders})`
    ).bind(...ids).run();
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
}
__name(handleAdminDelete, "handleAdminDelete");
async function handleAdminFlag(request, env) {
  if (!checkAuth(request)) return new Response("Unauthorized", { status: 401 });
  const { id, is_test } = await request.json();
  await env.kinuko_logs.prepare(
    `UPDATE diagnosis_logs SET is_test = ? WHERE id = ?`
  ).bind(is_test ? 1 : 0, id).run();
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
}
__name(handleAdminFlag, "handleAdminFlag");
async function handleAdminExport(request, env) {
  if (!checkAuth(request)) return new Response("Unauthorized", { status: 401 });
  const rows = await env.kinuko_logs.prepare(
    `SELECT * FROM diagnosis_logs WHERE is_test=0 ORDER BY created_at DESC`
  ).all();
  const header = "ID,\u65E5\u6642,\u5224\u5B9A,\u30B9\u30B3\u30A2,\u7D20\u6750,\u6B63\u7D79\u751F\u5730,\u751F\u5730,\u4ED5\u7ACB\u3066,\u88C5\u98FE,\u6C34\u51E6\u7406,\u904E\u53BB\u5909\u5316,\u5730\u8272,\u6240\u8981\u79D2,\u30C6\u30B9\u30C8\n";
  const csv = rows.results.map(
    (r) => [
      r.id,
      r.created_at,
      r.grade,
      r.score,
      r.ans_material,
      r.ans_silk_fabric,
      r.ans_fabric,
      r.ans_tailoring,
      r.ans_decoration,
      r.ans_water_history,
      r.ans_past_result,
      r.ans_color,
      r.duration_sec,
      r.is_test
    ].map((v) => v ?? "").join(",")
  ).join("\n");
  return new Response(header + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="kinuko-logs.csv"'
    }
  });
}
__name(handleAdminExport, "handleAdminExport");
function renderAdminLogin(error = "") {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>\u7BA1\u7406\u753B\u9762 | \u9577\u8966\u88A2\u30BB\u30EB\u30D5\u5224\u5B9A</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Noto Sans JP', sans-serif; background: #f5f0eb; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { background: #fff; border-radius: 16px; padding: 40px 32px; width: 340px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  h1 { font-size: 1.1rem; color: #4a3728; margin-bottom: 6px; }
  p.sub { font-size: 0.75rem; color: #999; margin-bottom: 28px; }
  label { font-size: 0.8rem; color: #666; display: block; margin-bottom: 6px; }
  input[type=password] { width: 100%; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.95rem; margin-bottom: 18px; }
  button { width: 100%; padding: 12px; background: #4a7c6f; color: #fff; border: none; border-radius: 8px; font-size: 0.95rem; cursor: pointer; }
  .error { color: #c0392b; font-size: 0.8rem; margin-bottom: 14px; }
</style>
</head>
<body>
<div class="card">
  <h1>\u{1F33F} \u7BA1\u7406\u753B\u9762\u30ED\u30B0\u30A4\u30F3</h1>
  <p class="sub">\u9577\u8966\u88A2\u30BB\u30EB\u30D5\u5224\u5B9A \u30ED\u30B0\u7BA1\u7406</p>
  ${error ? `<p class="error">\u26A0 ${error}</p>` : ""}
  <form method="POST" action="/hibikinu/login">
    <label>\u30D1\u30B9\u30EF\u30FC\u30C9</label>
    <input type="password" name="password" autofocus placeholder="\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B">
    <button type="submit">\u30ED\u30B0\u30A4\u30F3</button>
  </form>
</div>
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
__name(renderAdminLogin, "renderAdminLogin");
function renderAdminApp(request, env, url) {
  if (!checkAuth(request)) {
    return new Response("", { status: 302, headers: { "Location": "/hibikinu" } });
  }
  const LABEL = {
    material: { silk: "\u6B63\u7D79", mix: "\u6DF7\u7D21\u30FB\u7DBF\u30FB\u9EBB", other: "\u5316\u7E4A", unknown: "\u308F\u304B\u3089\u306A\u3044" },
    silkFabric: { chirimen: "\u7E2E\u7DEC", rinzu: "\u7DB8\u5B50", ro: "\u7D7D\u7D17", seika: "\u7CBE\u83EF", habutae: "\u7FBD\u4E8C\u91CD", shioze: "\u5869\u702C", unknown: "\u308F\u304B\u3089\u306A\u3044" },
    fabric: { smooth: "\u6A19\u6E96", crepe: "\u3061\u308A\u3081\u3093\u51F9\u51F8", ro: "\u7D7D", unknown: "\u308F\u304B\u3089\u306A\u3044" },
    tailoring: { hitoe: "\u3072\u3068\u3048", awase: "\u88B7", muso: "\u8896\u7121\u53CC", hanmuso: "\u534A\u7121\u53CC", shikiate: "\u5C45\u6577\u5F53\u4ED8\u304D", unknown: "\u308F\u304B\u3089\u306A\u3044" },
    decoration: { yes: "\u3042\u308A", no: "\u306A\u3057", unknown: "\u308F\u304B\u3089\u306A\u3044" },
    waterHistory: { yes: "\u6B74\u3042\u308A", no: "\u306A\u3057", unknown: "\u308F\u304B\u3089\u306A\u3044" },
    pastResult: { ok: "\u5909\u5316\u306A\u3057", smallshrink: "\u5FAE\u7E2E\u307F", shrink: "\u5927\u7E2E\u307F", torn: "\u88C2\u3051", color: "\u8272\u306B\u3058\u307F", unknown: "\u308F\u304B\u3089\u306A\u3044" },
    color: { white: "\u767D\u30FB\u6DE1", light: "\u6DE1\u8272", mid: "\u4E2D\u9593\u8272", dark: "\u6FC3\u8272", multi: "\u591A\u8272\u307C\u304B\u3057", unknown: "\u308F\u304B\u3089\u306A\u3044" }
  };
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>\u7BA1\u7406\u753B\u9762 | \u9577\u8966\u88A2\u30BB\u30EB\u30D5\u5224\u5B9A</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Noto Sans JP', sans-serif; background: #f5f0eb; color: #3a2e28; font-size: 14px; }
header { background: #4a7c6f; color: #fff; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; }
header h1 { font-size: 1rem; font-weight: 600; }
header span { font-size: 0.75rem; opacity: 0.8; }
.tabs { display: flex; gap: 4px; padding: 16px 20px 0; }
.tab { padding: 8px 20px; border-radius: 8px 8px 0 0; background: #e8e0d8; cursor: pointer; font-size: 0.85rem; border: none; color: #666; }
.tab.active { background: #fff; color: #4a7c6f; font-weight: 600; }
.panel { display: none; background: #fff; border-radius: 0 12px 12px 12px; margin: 0 20px 20px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.panel.active { display: block; }

/* \u7D71\u8A08 */
.stat-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
.stat-card { background: #f9f5f1; border-radius: 10px; padding: 16px; text-align: center; }
.stat-card .num { font-size: 2rem; font-weight: 700; }
.stat-card .num.A { color: #4a7c6f; }
.stat-card .num.B { color: #a0764b; }
.stat-card .num.C { color: #8b3a3a; }
.stat-card .lbl { font-size: 0.72rem; color: #999; margin-top: 4px; }
.charts { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
.chart-box { background: #f9f5f1; border-radius: 10px; padding: 12px; min-width: 0; }
.chart-box h3 { font-size: 0.75rem; color: #666; margin-bottom: 10px; text-align: center; }
.chart-box canvas { max-height: 180px; }
/* \u30BF\u30D6\u30EC\u30C3\u30C8\uFF1A3\u5217 */
@media(max-width:1100px){ .charts { grid-template-columns: repeat(3, 1fr); } }
/* \u30B9\u30DE\u30DB\uFF1A2\u5217 */
@media(max-width:600px){ .charts { grid-template-columns: repeat(2, 1fr); gap: 10px; } }
@media(max-width:600px){ .chart-box { padding: 10px; } }
@media(max-width:600px){ .chart-box h3 { font-size: 0.7rem; } }
@media(max-width:600px){ .chart-box canvas { max-height: 150px; } }

/* \u30ED\u30B0\u4E00\u89A7 */
.toolbar { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; }
.toolbar select, .toolbar input { padding: 7px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.82rem; }
.btn { padding: 7px 14px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.82rem; }
.btn-green  { background: #4a7c6f; color: #fff; }
.btn-red    { background: #c0392b; color: #fff; }
.btn-orange { background: #e67e22; color: #fff; }
.btn-gray   { background: #aaa; color: #fff; }
.btn-sm     { padding: 4px 10px; font-size: 0.75rem; border-radius: 4px; border: none; cursor: pointer; }
table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
th { background: #f0ebe4; padding: 8px 6px; text-align: left; font-weight: 600; color: #666; position: sticky; top: 0; }
td { padding: 7px 6px; border-bottom: 1px solid #f0ebe4; vertical-align: middle; }
tr:hover td { background: #fdf9f5; }
tr.test-row td { background: #fff8f0; color: #aaa; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.72rem; font-weight: 700; }
.badge-A { background: #e8f4f0; color: #4a7c6f; }
.badge-B { background: #fdf3e3; color: #a0764b; }
.badge-C { background: #fdecea; color: #8b3a3a; }
.badge-test { background: #fff0e0; color: #e67e22; }
.badge-dup  { background: #fdecea; color: #c0392b; font-weight: 700; }
.pagination { display: flex; gap: 6px; justify-content: center; margin-top: 16px; }
.pagination button { padding: 5px 12px; border: 1px solid #ddd; border-radius: 5px; background: #fff; cursor: pointer; font-size: 0.8rem; }
.pagination button.active { background: #4a7c6f; color: #fff; border-color: #4a7c6f; }
.confirm-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:1000; align-items:center; justify-content:center; }
.confirm-overlay.show { display:flex; }
.confirm-box { background:#fff; border-radius:14px; padding:28px 28px 20px; width:320px; text-align:center; }
.confirm-box h3 { font-size:1rem; margin-bottom:10px; }
.confirm-box p { font-size:0.82rem; color:#666; margin-bottom:20px; }
.confirm-box .btns { display:flex; gap:10px; justify-content:center; }
</style>
</head>
<body>

<header>
  <h1>\u{1F33F} \u9577\u8966\u88A2\u30BB\u30EB\u30D5\u5224\u5B9A \u7BA1\u7406\u753B\u9762</h1>
  <span>Ver 1.41</span>
</header>

<div class="tabs">
  <button class="tab active" onclick="showTab('stats')">\u{1F4CA} \u7D71\u8A08\u30EC\u30DD\u30FC\u30C8</button>
  <button class="tab" onclick="showTab('logs')">\u{1F4CB} \u30ED\u30B0\u4E00\u89A7</button>
  <button class="tab" onclick="showTab('fabric-logs')">\u{1F9F5} \u751F\u5730\u30ED\u30B0</button>
  <button class="tab" onclick="showTab('fabric-stats')">\u{1F4C8} \u751F\u5730\u7D71\u8A08</button>
</div>

<!-- \u7D71\u8A08\u30D1\u30CD\u30EB -->
<div class="panel active" id="panel-stats">
  <div class="stat-cards" id="stat-cards">\u8AAD\u307F\u8FBC\u307F\u4E2D...</div>
  <div class="charts">
    <div class="chart-box"><h3>\u5224\u5B9A\u7D50\u679C\u306E\u5272\u5408</h3><canvas id="chart-grade"></canvas></div>
    <div class="chart-box"><h3>\u65E5\u5225\u8A3A\u65AD\u6570\uFF08\u76F4\u8FD130\u65E5\uFF09</h3><canvas id="chart-daily"></canvas></div>
    <div class="chart-box"><h3>\u7D20\u6750\u306E\u5206\u5E03</h3><canvas id="chart-material"></canvas></div>
    <div class="chart-box"><h3>\u751F\u5730\u306E\u7A2E\u985E\u306E\u5272\u5408</h3><canvas id="chart-fabric"></canvas></div>
    <div class="chart-box"><h3>\u4ED5\u7ACB\u3066\u306E\u5272\u5408</h3><canvas id="chart-tailoring"></canvas></div>
    <div class="chart-box"><h3>\u6C34\u51E6\u7406\u306E\u5272\u5408</h3><canvas id="chart-water"></canvas></div>
    <div class="chart-box"><h3>\u5730\u8272\u306E\u5272\u5408</h3><canvas id="chart-color"></canvas></div>
  </div>
</div>

<!-- \u30ED\u30B0\u4E00\u89A7\u30D1\u30CD\u30EB -->
<div class="panel" id="panel-logs">
  <div class="toolbar">
    <select id="filter-grade" onchange="loadLogs(1)">
      <option value="">\u5168\u5224\u5B9A</option>
      <option value="A">A\u5224\u5B9A</option>
      <option value="B">B\u5224\u5B9A</option>
      <option value="C">C\u5224\u5B9A</option>
    </select>
    <select id="filter-test" onchange="loadLogs(1)">
      <option value="">\u5168\u3066</option>
      <option value="0">\u672C\u756A\u306E\u307F</option>
      <option value="1">\u30C6\u30B9\u30C8\u306E\u307F</option>
    </select>
    <button class="btn btn-red" onclick="confirmDeleteTest()">\u{1F5D1} \u30C6\u30B9\u30C8\u30C7\u30FC\u30BF\u3092\u5168\u524A\u9664</button>
    <button class="btn btn-red" onclick="confirmDeleteSelected()">\u{1F5D1} \u9078\u629E\u524A\u9664</button>
    <button class="btn btn-green" onclick="exportCSV()">\u2B07 CSV\u51FA\u529B</button>
  </div>
  <div style="overflow-x:auto;">
    <table>
      <thead>
        <tr>
          <th><input type="checkbox" id="check-all" onchange="toggleAll(this)"></th>
          <th>ID</th><th>\u65E5\u6642</th><th>\u5224\u5B9A</th><th>\u30B9\u30B3\u30A2</th>
          <th>\u7D20\u6750</th><th>\u751F\u5730</th><th>\u4ED5\u7ACB\u3066</th><th>\u88C5\u98FE</th>
          <th>\u6C34\u51E6\u7406</th><th>\u5730\u8272</th><th>\u{1F6E1}\uFE0F</th><th>\u{1F3FA}</th><th>\u7AEF\u672B</th><th>\u91CD\u8907</th><th>\u79D2</th><th>\u64CD\u4F5C</th>
        </tr>
      </thead>
      <tbody id="log-tbody">
        <tr><td colspan="13" style="text-align:center;padding:20px;color:#aaa;">\u8AAD\u307F\u8FBC\u307F\u4E2D...</td></tr>
      </tbody>
    </table>
  </div>
  <div class="pagination" id="pagination"></div>
</div>

<!-- \u78BA\u8A8D\u30C0\u30A4\u30A2\u30ED\u30B0 -->
<div class="confirm-overlay" id="confirm-overlay">
  <div class="confirm-box">
    <h3 id="confirm-title">\u78BA\u8A8D</h3>
    <p id="confirm-msg"></p>
    <div class="btns">
      <button class="btn btn-gray" onclick="closeConfirm()">\u30AD\u30E3\u30F3\u30BB\u30EB</button>
      <button class="btn btn-red" id="confirm-ok">\u524A\u9664\u3059\u308B</button>
    </div>
  </div>
</div>

<!-- \u751F\u5730\u30ED\u30B0\u4E00\u89A7\u30D1\u30CD\u30EB -->
<div class="panel" id="panel-fabric-logs">
  <div class="toolbar">
    <button class="btn" id="fabric-btn-real" onclick="setFabricTestFilter(0)" style="background:#4a7c6f;color:#fff;">\u672C\u756A\u306E\u307F</button>
    <button class="btn" id="fabric-btn-test" onclick="setFabricTestFilter(1)">\u30C6\u30B9\u30C8\u306E\u307F</button>
  </div>
  <div style="overflow-x:auto;">
    <table>
      <thead>
        <tr>
          <th>ID</th><th>\u65E5\u6642</th><th>\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0</th>
          <th>\u7D20\u6750</th><th>\u751F\u5730</th><th>\u5019\u88DC</th>
          <th>\u78BA\u4FE1\u5EA6</th><th>\u753B\u50CF1</th><th>\u753B\u50CF2</th><th>\u753B\u50CF3</th>
          <th>\u30C6\u30B9\u30C8</th><th>\u64CD\u4F5C</th>
        </tr>
      </thead>
      <tbody id="fabric-log-tbody">
        <tr><td colspan="12" style="text-align:center;padding:20px;">\u8AAD\u307F\u8FBC\u307F\u4E2D...</td></tr>
      </tbody>
    </table>
  </div>
  <div id="fabric-log-pager" style="display:flex;gap:8px;padding:12px 20px;align-items:center;"></div>
</div>

<!-- \u751F\u5730\u7D71\u8A08\u30D1\u30CD\u30EB -->
<div class="panel" id="panel-fabric-stats">
  <div class="stat-cards" id="fabric-stat-cards">\u8AAD\u307F\u8FBC\u307F\u4E2D...</div>
  <div class="charts">
    <div class="chart-box"><h3>\u751F\u5730\u7A2E\u985E\u306E\u5206\u5E03</h3><canvas id="chart-fabric-dist"></canvas></div>
    <div class="chart-box"><h3>\u7D20\u6750\u30AB\u30C6\u30B4\u30EA\u306E\u5206\u5E03</h3><canvas id="chart-material-dist"></canvas></div>
    <div class="chart-box"><h3>\u78BA\u4FE1\u5EA6\u306E\u5206\u5E03</h3><canvas id="chart-conf-dist"></canvas></div>
    <div class="chart-box"><h3>\u65E5\u5225\u5224\u5B9A\u6570\uFF08\u76F4\u8FD130\u65E5\uFF09</h3><canvas id="chart-fabric-daily"></canvas></div>
  </div>
</div>

<script>
const LABEL = ${JSON.stringify(LABEL)};

function lbl(type, val) {
  return (LABEL[type] && LABEL[type][val]) || val || '-';
}

// \u2500\u2500 \u30BF\u30D6\u5207\u308A\u66FF\u3048 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function showTab(name) {
  const TABS = ['stats','logs','fabric-logs','fabric-stats'];
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', TABS[i] === name);
  });
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  if (name === 'stats')         loadStats();
  if (name === 'logs')          loadLogs(1);
  if (name === 'fabric-logs')   loadFabricLogs(1);
  if (name === 'fabric-stats')  loadFabricStats();
}

// \u2500\u2500 \u7D71\u8A08\u8AAD\u307F\u8FBC\u307F \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function loadStats() {
  const res = await fetch('/hibikinu/stats');
  if (!res.ok) { location.href = '/hibikinu'; return; }
  const d = await res.json();

  const gc = { A: 0, B: 0, C: 0 };
  d.gradeCount.forEach(r => gc[r.grade] = r.cnt);
  const total = d.total || 1;
  const guardPct   = d.total > 0 ? Math.round((d.guardCnt   || 0) / d.total * 100) : 0;
  const vintagePct = d.total > 0 ? Math.round((d.vintageCnt || 0) / d.total * 100) : 0;

  document.getElementById('stat-cards').innerHTML = \`
    <div class="stat-card"><div class="num">\${d.total}</div><div class="lbl">\u7DCF\u8A3A\u65AD\u6570</div></div>
    <div class="stat-card"><div class="num A">\${gc.A}</div><div class="lbl">A\u5224\u5B9A\uFF08\u6D17\u3048\u308B\u5019\u88DC\uFF09</div></div>
    <div class="stat-card"><div class="num B">\${gc.B}</div><div class="lbl">B\u5224\u5B9A\uFF08\u614E\u91CD\u691C\u8A0E\uFF09</div></div>
    <div class="stat-card"><div class="num C">\${gc.C}</div><div class="lbl">C\u5224\u5B9A\uFF08\u975E\u63A8\u5968\uFF09</div></div>
    <div class="stat-card"><div class="num">\${d.avgScore}</div><div class="lbl">\u5E73\u5747\u30B9\u30B3\u30A2</div></div>
    <div class="stat-card"><div class="num">\${guardPct}%</div><div class="lbl">\u{1F6E1}\uFE0F \u30AC\u30FC\u30C9\u52A0\u5DE5\u3042\u308A<br><span style="font-size:0.75rem;color:#888;">\${d.guardCnt || 0}\u4EF6</span></div></div>
    <div class="stat-card"><div class="num">\${vintagePct}%</div><div class="lbl">\u{1F3FA} \u30D3\u30F3\u30C6\u30FC\u30B8\u3042\u308A<br><span style="font-size:0.75rem;color:#888;">\${d.vintageCnt || 0}\u4EF6</span></div></div>
  \`;

  // \u5224\u5B9A\u5272\u5408
  makeChart('chart-grade', 'doughnut',
    ['A\u5224\u5B9A', 'B\u5224\u5B9A', 'C\u5224\u5B9A'],
    [gc.A, gc.B, gc.C],
    ['#4a7c6f','#a0764b','#8b3a3a']
  );

  // \u65E5\u5225\u8A3A\u65AD\u6570
  const days = d.daily.slice().reverse();
  if (chartInstances['chart-daily']) { chartInstances['chart-daily'].destroy(); }
  chartInstances['chart-daily'] = new Chart(document.getElementById('chart-daily'), {
    type: 'bar',
    data: {
      labels: days.map(r => r.day.slice(5)),
      datasets: [{ label: '\u8A3A\u65AD\u6570', data: days.map(r => r.cnt), backgroundColor: '#4a7c6f88', borderWidth: 1 }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });

  // \u7D20\u6750\u5206\u5E03
  const matLabels = { silk: '\u6B63\u7D79', mix: '\u6DF7\u7D21', other: '\u5316\u7E4A', unknown: '\u308F\u304B\u3089\u306A\u3044' };
  makeChart('chart-material', 'doughnut',
    d.materialDist.map(r => matLabels[r.ans_material] || r.ans_material || '\u306A\u3057'),
    d.materialDist.map(r => r.cnt),
    ['#4a7c6f','#a0764b','#8b3a3a','#7b9e9a','#aaa']
  );

  // \u751F\u5730\u306E\u7A2E\u985E\u306E\u5272\u5408
  const fabricLabels = {
    chirimen: '\u7E2E\u7DEC', rinzu: '\u7DB8\u5B50', ro: '\u7D7D\u30FB\u7D17', seika: '\u7CBE\u83EF',
    habutae: '\u7FBD\u4E8C\u91CD', shioze: '\u5869\u702C', unknown: '\u305D\u306E\u4ED6\u30FB\u308F\u304B\u3089\u306A\u3044',
    smooth: '\u6A19\u6E96\u7684', crepe: '\u3061\u308A\u3081\u3093\u51F9\u51F8', null: '\u306A\u3057'
  };
  makeChart('chart-fabric', 'doughnut',
    d.fabricDist.map(r => fabricLabels[r.fabric_key] || r.fabric_key || '\u306A\u3057'),
    d.fabricDist.map(r => r.cnt),
    ['#7b9e9a','#4a7c6f','#a0764b','#8b3a3a','#c9a96e','#e0c4a8','#aaa','#6b8f8a']
  );

  // \u4ED5\u7ACB\u3066\u306E\u5272\u5408
  const tailoringLabels = {
    hitoe: '\u3072\u3068\u3048', awase: '\u88B7', muso: '\u8896\u7121\u53CC\u80F4\u629C\u304D',
    hanmuso: '\u534A\u7121\u53CC', shikiate: '\u5C45\u6577\u5F53\u4ED8\u304D', unknown: '\u308F\u304B\u3089\u306A\u3044'
  };
  makeChart('chart-tailoring', 'doughnut',
    d.tailoringDist.map(r => tailoringLabels[r.ans_tailoring] || r.ans_tailoring || '\u306A\u3057'),
    d.tailoringDist.map(r => r.cnt),
    ['#4a7c6f','#7b9e9a','#a0764b','#c9a96e','#8b3a3a','#aaa']
  );

  // \u6C34\u51E6\u7406\u306E\u5272\u5408
  const waterLabels = { yes: '\u6B74\u3042\u308A', no: '\u3057\u305F\u3053\u3068\u304C\u306A\u3044', unknown: '\u308F\u304B\u3089\u306A\u3044' };
  makeChart('chart-water', 'doughnut',
    d.waterHistoryDist.map(r => waterLabels[r.ans_water_history] || r.ans_water_history || '\u306A\u3057'),
    d.waterHistoryDist.map(r => r.cnt),
    ['#4a7c6f','#a0764b','#aaa']
  );

  // \u5730\u8272\u306E\u5272\u5408
  const colorLabels = { white: '\u767D\u30FB\u6DE1\u8272', light: '\u6DE1\u8272', mid: '\u4E2D\u9593\u8272', dark: '\u6FC3\u8272', multi: '\u591A\u8272\u30FB\u307C\u304B\u3057' };
  makeChart('chart-color', 'doughnut',
    d.colorDist.map(r => colorLabels[r.ans_color] || r.ans_color || '\u306A\u3057'),
    d.colorDist.map(r => r.cnt),
    ['#f0e8d8','#e8c4a0','#c9a96e','#4a3728','#8b3a3a','#aaa']
  );
}

// \u30B0\u30E9\u30D5\u751F\u6210\u30D8\u30EB\u30D1\u30FC\uFF08\u518D\u63CF\u753B\u6642\u306B\u65E2\u5B58\u30B0\u30E9\u30D5\u3092\u7834\u68C4\uFF09
const chartInstances = {};
function makeChart(id, type, labels, data, colors) {
  if (chartInstances[id]) { chartInstances[id].destroy(); }
  const opts = type === 'bar'
    ? { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    : { plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 6, boxWidth: 10 } } } };
  chartInstances[id] = new Chart(document.getElementById(id), {
    type,
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 1 }] },
    options: opts
  });
}

// \u2500\u2500 \u30ED\u30B0\u4E00\u89A7\u8AAD\u307F\u8FBC\u307F \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
let currentPage = 1;
async function loadLogs(page) {
  currentPage = page;
  const grade = document.getElementById('filter-grade').value;
  const test  = document.getElementById('filter-test').value;
  const params = new URLSearchParams({ page, ...(grade && { grade }), ...(test !== '' && { test }) });
  const res = await fetch('/hibikinu/data?' + params);
  if (!res.ok) { location.href = '/hibikinu'; return; }
  const d = await res.json();

  const tbody = document.getElementById('log-tbody');
  if (!d.rows.length) {
    tbody.innerHTML = '<tr><td colspan="15" style="text-align:center;padding:20px;color:#aaa;">\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093</td></tr>';
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = d.rows.map(r => {
    const ipCnt = r.ip_hash ? (d.ipCounts[r.ip_hash] || 1) : null;
    const dupBadge = ipCnt && ipCnt > 1
      ? \`<span class="badge badge-dup" title="\u540C\u4E00\u7AEF\u672B\u304B\u3089\${ipCnt}\u56DE">\${ipCnt}\u56DE</span>\`
      : '<span style="color:#ccc;font-size:0.7rem">-</span>';
    const devIcon = !r.device ? '' :
      r.device.startsWith('iPhone') ? '\u{1F4F1}' :
      r.device.startsWith('Android') ? '\u{1F916}' :
      r.device.startsWith('iPad') ? '\u{1F4CB}' : '\u{1F4BB}';
    return \`
    <tr class="\${r.is_test ? 'test-row' : ''}">
      <td><input type="checkbox" class="row-check" value="\${r.id}"></td>
      <td>\${r.id}</td>
      <td>\${new Date(\`\${r.created_at.endsWith('Z') ? r.created_at : r.created_at + 'Z'}\`).toLocaleString('ja-JP', {timeZone:'Asia/Tokyo', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'})}</td>
      <td><span class="badge badge-\${r.grade}">\${r.grade}</span>\${r.is_test ? ' <span class="badge badge-test">TEST</span>' : ''}</td>
      <td>\${r.score}</td>
      <td>\${lbl('material', r.ans_material)}</td>
      <td>\${r.ans_silk_fabric ? lbl('silkFabric', r.ans_silk_fabric) : lbl('fabric', r.ans_fabric)}</td>
      <td>\${lbl('tailoring', r.ans_tailoring)}</td>
      <td>\${lbl('decoration', r.ans_decoration)}</td>
      <td>\${lbl('waterHistory', r.ans_water_history)}</td>
      <td>\${lbl('color', r.ans_color)}</td>
      <td style="text-align:center">\${r.ans_option_guard   ? '\u{1F6E1}\uFE0F' : '-'}</td>
      <td style="text-align:center">\${r.ans_option_vintage ? '\u{1F3FA}' : '-'}</td>
      <td style="font-size:0.75rem">\${devIcon} \${r.device || '-'}</td>
      <td style="text-align:center">\${dupBadge}</td>
      <td>\${r.duration_sec || '-'}</td>
      <td>
        <button class="btn-sm \${r.is_test ? 'btn-green' : 'btn-orange'}" onclick="toggleFlag(\${r.id}, \${r.is_test ? 0 : 1})">
          \${r.is_test ? '\u672C\u756A\u306B\u623B\u3059' : 'TEST\u306B\u3059\u308B'}
        </button>
        <button class="btn-sm btn-red" onclick="deleteOne(\${r.id})">\u524A\u9664</button>
      </td>
    </tr>\`;
  }).join('');

  // \u30DA\u30FC\u30B8\u30CD\u30FC\u30B7\u30E7\u30F3
  const totalPages = Math.ceil(d.total / d.perPage);
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === page) btn.classList.add('active');
    btn.onclick = () => loadLogs(i);
    pagination.appendChild(btn);
  }
}

function toggleAll(cb) {
  document.querySelectorAll('.row-check').forEach(c => c.checked = cb.checked);
}

// \u2500\u2500 \u524A\u9664\u51E6\u7406 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function doDelete(payload) {
  await fetch('/hibikinu/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  closeConfirm();
  loadLogs(currentPage);
  if (document.getElementById('panel-stats').classList.contains('active')) loadStats();
}

function confirmDeleteTest() {
  showConfirm('\u30C6\u30B9\u30C8\u30C7\u30FC\u30BF\u3092\u5168\u524A\u9664', 'TEST\u30D5\u30E9\u30B0\u306E\u3064\u3044\u305F\u30C7\u30FC\u30BF\u3092\u3059\u3079\u3066\u524A\u9664\u3057\u307E\u3059\u3002', () => doDelete({ deleteTestAll: true }));
}

function confirmDeleteSelected() {
  const ids = [...document.querySelectorAll('.row-check:checked')].map(c => parseInt(c.value));
  if (!ids.length) return alert('\u524A\u9664\u3059\u308B\u30ED\u30B0\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044');
  showConfirm('\u9078\u629E\u3057\u305F\u30ED\u30B0\u3092\u524A\u9664', \`\u9078\u629E\u3057\u305F\${ids.length}\u4EF6\u3092\u524A\u9664\u3057\u307E\u3059\u3002\`, () => doDelete({ ids }));
}

function deleteOne(id) {
  showConfirm('\u30ED\u30B0\u3092\u524A\u9664', \`ID:\${id} \u3092\u524A\u9664\u3057\u307E\u3059\u3002\`, () => doDelete({ ids: [id] }));
}

// \u2500\u2500 \u30C6\u30B9\u30C8\u30D5\u30E9\u30B0\u5207\u308A\u66FF\u3048 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function toggleFlag(id, is_test) {
  await fetch('/hibikinu/flag', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_test }) });
  loadLogs(currentPage);
}

// \u2500\u2500 CSV\u51FA\u529B \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function exportCSV() { window.location.href = '/hibikinu/export'; }

// \u2500\u2500 \u78BA\u8A8D\u30C0\u30A4\u30A2\u30ED\u30B0 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
let confirmCallback = null;
function showConfirm(title, msg, cb) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  confirmCallback = cb;
  document.getElementById('confirm-ok').onclick = () => confirmCallback && confirmCallback();
  document.getElementById('confirm-overlay').classList.add('show');
}
function closeConfirm() { document.getElementById('confirm-overlay').classList.remove('show'); }

// \u2500\u2500 \u751F\u5730\u30ED\u30B0 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const FABRIC_NAME = {
  chirimen:'\u3061\u308A\u3081\u3093', rinzu:'\u7DB8\u5B50', habutae:'\u7FBD\u4E8C\u91CD',
  ro:'\u7D7D\u30FB\u7D17', seika:'\u7CBE\u83EF\u30D1\u30EC\u30B9', shioze:'\u5869\u702C',
  smooth:'\u5E73\u7E54\u308A', unknown:'\u308F\u304B\u3089\u306A\u3044', closest_match:'\u5019\u88DC\u306A\u3057'
};
const MATERIAL_NAME = {
  silk:'\u7D79', cotton:'\u7DBF', linen:'\u9EBB', poly:'\u30DD\u30EA', other:'\u305D\u306E\u4ED6'
};
const CONF_NAME = { high:'\u9AD8', mid:'\u4E2D', low:'\u4F4E' };

let fabricTestFilter = 0;
let fabricCurrentPage = 1;
const FABRIC_PER_PAGE = 50;

function setFabricTestFilter(v) {
  fabricTestFilter = v;
  document.getElementById('fabric-btn-real').style.background = v === 0 ? '#4a7c6f' : '';
  document.getElementById('fabric-btn-real').style.color      = v === 0 ? '#fff'    : '';
  document.getElementById('fabric-btn-test').style.background = v === 1 ? '#c0392b' : '';
  document.getElementById('fabric-btn-test').style.color      = v === 1 ? '#fff'    : '';
  loadFabricLogs(1);
}

async function loadFabricLogs(page) {
  fabricCurrentPage = page;
  const offset = (page - 1) * FABRIC_PER_PAGE;
  const res = await fetch(\`/hibikinu/fabric-data?test=\${fabricTestFilter}&limit=\${FABRIC_PER_PAGE}&offset=\${offset}\`);
  if (!res.ok) { location.href = '/hibikinu'; return; }
  const d = await res.json();
  const tbody = document.getElementById('fabric-log-tbody');
  if (!d.rows.length) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:20px;">\u30C7\u30FC\u30BF\u306A\u3057</td></tr>';
  } else {
    tbody.innerHTML = d.rows.map(r => {
      const thumb = (url) => url
        ? \`<a href="/api/fabric-image/\${encodeURIComponent(url)}" target="_blank">
            <img src="/api/fabric-image/\${encodeURIComponent(url)}"
              style="width:48px;height:48px;object-fit:cover;border-radius:4px;"></a>\`
        : '-';
      return \`<tr>
        <td>\${r.id}</td>
        <td style="white-space:nowrap">\${r.created_at?.slice(0,16) || '-'}</td>
        <td>\${r.nickname || '-'}</td>
        <td>\${MATERIAL_NAME[r.material_key] || r.material_key || '-'}</td>
        <td>\${FABRIC_NAME[r.fabric_key] || r.fabric_key || '-'}</td>
        <td>\${r.closest_fabric_key ? (FABRIC_NAME[r.closest_fabric_key] || r.closest_fabric_key) : '-'}</td>
        <td>\${CONF_NAME[r.confidence] || r.confidence || '-'}</td>
        <td>\${thumb(r.image_url_1)}</td>
        <td>\${thumb(r.image_url_2)}</td>
        <td>\${thumb(r.image_url_3)}</td>
        <td>\${r.is_test ? '\u{1F9EA}' : '\u2705'}</td>
        <td>
          <button class="btn btn-sm" onclick="toggleFabricTest(\${r.id}, \${r.is_test})">\${r.is_test ? '\u672C\u756A\u3078' : '\u30C6\u30B9\u30C8\u3078'}</button>
          <button class="btn btn-red btn-sm" onclick="deleteFabricLog(\${r.id})">\u524A\u9664</button>
        </td>
      </tr>\`;
    }).join('');
  }
  // \u30DA\u30FC\u30B8\u30E3\u30FC
  const totalPages = Math.ceil(d.total / FABRIC_PER_PAGE);
  const pager = document.getElementById('fabric-log-pager');
  pager.innerHTML = \`
    <span style="font-size:0.85rem;color:#666;">\u8A08 \${d.total} \u4EF6 / \${page}/\${totalPages} \u30DA\u30FC\u30B8</span>
    \${page > 1 ? \`<button class="btn" onclick="loadFabricLogs(\${page-1})">\u2190 \u524D</button>\` : ''}
    \${page < totalPages ? \`<button class="btn" onclick="loadFabricLogs(\${page+1})">\u6B21 \u2192</button>\` : ''}
  \`;
}

async function toggleFabricTest(id, current) {
  await fetch('/hibikinu/fabric-flag', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ id, is_test: current ? 0 : 1 })
  });
  loadFabricLogs(fabricCurrentPage);
}

async function deleteFabricLog(id) {
  if (!confirm('\u3053\u306E\u30ED\u30B0\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F')) return;
  await fetch('/hibikinu/fabric-delete', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ id })
  });
  loadFabricLogs(fabricCurrentPage);
}

// \u2500\u2500 \u751F\u5730\u7D71\u8A08 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
let fabricCharts = {};
async function loadFabricStats() {
  const res = await fetch('/hibikinu/fabric-stats');
  if (!res.ok) { location.href = '/hibikinu'; return; }
  const d = await res.json();

  document.getElementById('fabric-stat-cards').innerHTML = \`
    <div class="stat-card"><div class="stat-num">\${d.total}</div><div class="stat-label">\u7DCF\u5224\u5B9A\u6570</div></div>
  \`;

  const drawPie = (id, labels, data, colors) => {
    if (fabricCharts[id]) fabricCharts[id].destroy();
    const ctx = document.getElementById(id)?.getContext('2d');
    if (!ctx) return;
    fabricCharts[id] = new Chart(ctx, {
      type: 'pie',
      data: { labels, datasets: [{ data, backgroundColor: colors }] },
      options: { plugins: { legend: { position: 'right' } } }
    });
  };

  const drawBar = (id, labels, data) => {
    if (fabricCharts[id]) fabricCharts[id].destroy();
    const ctx = document.getElementById(id)?.getContext('2d');
    if (!ctx) return;
    fabricCharts[id] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: '#4a7c6f88' }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  };

  // \u751F\u5730\u7A2E\u985E\u5206\u5E03
  const fabricColors = ['#e8a87c','#7cb9e8','#a8e87c','#e87c9a','#b87ce8','#e8d87c','#7ce8d8','#aaa'];
  drawPie('chart-fabric-dist',
    d.fabricDist.map(r => FABRIC_NAME[r.fabric_key] || r.fabric_key),
    d.fabricDist.map(r => r.cnt), fabricColors);

  // \u7D20\u6750\u5206\u5E03
  const matColors = ['#c9a96e','#6eb5c9','#6ec98a','#c96e6e','#999'];
  drawPie('chart-material-dist',
    d.materialDist.map(r => MATERIAL_NAME[r.material_key] || r.material_key),
    d.materialDist.map(r => r.cnt), matColors);

  // \u78BA\u4FE1\u5EA6\u5206\u5E03
  drawPie('chart-conf-dist',
    d.confDist.map(r => CONF_NAME[r.confidence] || r.confidence),
    d.confDist.map(r => r.cnt), ['#4a7c6f','#a0764b','#c0392b']);

  // \u65E5\u5225
  const dailyRev = [...d.daily].reverse();
  drawBar('chart-fabric-daily', dailyRev.map(r => r.day), dailyRev.map(r => r.cnt));
}

// \u2500\u2500 \u521D\u671F\u8868\u793A \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
loadStats();
<\/script>
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
__name(renderAdminApp, "renderAdminApp");

// ../../../usr/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../usr/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-oL3OeR/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../usr/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-oL3OeR/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=bundledWorker-0.6133462152946718.mjs.map
