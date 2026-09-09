import { NextResponse } from "next/server";

export const dynamic = "force-static";

/** Swagger UI — docs/openapi.yaml 렌더링 */
export function GET() {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>리드마그넷 CRM API 문서</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
<style>body{margin:0}.topbar{display:none}</style></head>
<body><div id="swagger"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
<script>window.ui=SwaggerUIBundle({url:"/api-docs/openapi.yaml",dom_id:"#swagger",deepLinking:true,defaultModelsExpandDepth:0});</script>
</body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
