// Vercel Serverless Function – POST /api/chat
// 브라우저에는 API 키가 절대 노출되지 않아요. 키는 Vercel 환경변수 ANTHROPIC_API_KEY 에서만 읽어요.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';
const PER_MINUTE = Number(process.env.CHAT_RATE_LIMIT || 12);

const SYSTEM = [
  '당신은 한국어로 대화하는 따뜻하고 차분한 웰빙 대화 도우미다. 전문 상담사, 의사, 치료사가 아니며 진단·치료·약 처방을 하지 않는다.',
  '사용자의 감정을 먼저 공감하고, 한 번에 질문 하나만 짧게 묻는다. 판단·훈계·과장된 낙관을 피하고, 사용자가 원하면 작고 현실적인 다음 행동을 함께 찾는다.',
  '운동 후 대화에서는 통증이나 어지럼증이 있으면 즉시 운동을 멈추고 휴식하도록 말한다. 심하거나 지속되는 증상은 의료 전문가의 도움을 권한다. 부상 위험이 있는 운동 처방은 하지 않는다.',
  '자해·자살 의도 또는 급박한 위험이 언급되면 안전을 우선한다. 지금 즉시 위험한지 물어보고, 혼자 있지 말고 신뢰하는 사람에게 알리도록 권한다. 한국에 있다면 자살예방상담전화 109, 긴급하면 112 또는 119에 연락하도록 안내한다. 안전한 곳에서 대화하는지 확인한다.',
  '사용자가 AI의 성격이나 한계를 묻지 않는 한 기술 설명을 대화에 끌어오지 않는다. 모바일 화면에서 읽기 좋게 3~4문장 이내로 간결하고 다정하게 답하고, 마크다운 서식은 쓰지 않는다.',
].join('\n');

const client = new Anthropic(); // ANTHROPIC_API_KEY

// 인스턴스 단위의 간단한 속도 제한 (서버리스라 인스턴스마다 따로 세요. 본격 운영 시 Vercel Firewall/KV 권장)
const buckets = new Map();
function allow(ip) {
  const now = Date.now();
  const b = buckets.get(ip) || { start: now, count: 0 };
  if (now - b.start > 60_000) { b.start = now; b.count = 0; }
  b.count++;
  buckets.set(ip, b);
  if (buckets.size > 5000) buckets.clear();
  return b.count <= PER_MINUTE;
}

const json = (status, data) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request) {
  if (!sameOrigin(request)) return json(403, { error: '요청 출처를 확인할 수 없습니다.' });
  if (!process.env.ANTHROPIC_API_KEY) return json(503, { error: '서버에 API 키가 설정되지 않았습니다.' });

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
  if (!allow(ip)) return json(429, { error: '요청이 잠시 많아요. 조금 뒤에 다시 보내 주세요.' });

  const raw = await request.text();
  if (raw.length > 16_384) return json(413, { error: '메시지가 너무 길어요.' });
  let body;
  try { body = JSON.parse(raw); } catch { body = null; }
  if (!body || !Array.isArray(body.messages)) return json(400, { error: '대화 내용 형식이 올바르지 않습니다.' });

  // user/assistant 만 허용, 연속된 같은 역할은 합치고, 첫 메시지는 user 여야 해요.
  const messages = [];
  for (const m of body.messages.slice(-12)) {
    if (!m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string') continue;
    const content = m.content.trim().slice(0, 1800);
    if (!content) continue;
    const last = messages[messages.length - 1];
    if (last && last.role === m.role) last.content += '\n\n' + content;
    else messages.push({ role: m.role, content });
  }
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return json(400, { error: '사용자 메시지가 필요합니다.' });
  }

  try {
    const response = await client.beta.messages.create(
      {
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM,
        messages,
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      },
      { timeout: 40_000, maxRetries: 1 },
    );

    if (response.stop_reason === 'refusal') {
      return json(200, { text: '그 이야기는 제가 도와드리기 어려워요. 지금 마음이 많이 힘들다면 믿을 수 있는 사람이나 자살예방상담전화 109에 연락해 주세요.' });
    }
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    if (!text) return json(502, { error: 'AI 응답이 비어 있습니다. 다시 시도해 주세요.' });
    return json(200, { text });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json(429, { error: '요청이 잠시 많아요. 조금 뒤에 다시 보내 주세요.' });
    }
    if (err instanceof Anthropic.APIConnectionTimeoutError || err instanceof Anthropic.APIConnectionError) {
      console.error('Anthropic connection error:', err.name);
      return json(504, { error: 'AI 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.' });
    }
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error:', err.status, err.requestID || 'no request id');
      return json(502, { error: 'AI 답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    }
    console.error('Chat handler error:', err?.name || err);
    return json(500, { error: '알 수 없는 오류가 발생했어요.' });
  }
}
