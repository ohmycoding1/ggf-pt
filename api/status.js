// GET /api/status – AI 상담이 설정되어 있는지 확인 (키 값은 노출하지 않아요)
export function GET() {
  return new Response(JSON.stringify({ configured: Boolean(process.env.ANTHROPIC_API_KEY) }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
