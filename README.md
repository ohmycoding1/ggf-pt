# 마음 한 걸음

가볍게 운동하고, AI와 마음을 나누고, 산책하며 보물을 찾는 사회성 재활 게임. 모바일에 설치하는 PWA이고, Vercel에 배포하며 상담 기능은 Anthropic Claude API를 써요.

## 구조

```
public/                 정적 파일 (Vercel outputDirectory)
  index.html            앱 셸 (상단 바 + 하단 고정 탭 바)
  styles.css            디자인 토큰 · 라이트/다크 모드
  app.js                게임 로직 (미션 · 카메라 운동 인식 · 상담 · 보물 지도 · 상점 · 랭킹)
  manifest.webmanifest  PWA 매니페스트
  sw.js                 서비스 워커 (오프라인 캐시)
  icons/                앱 아이콘
  character_parts/      캐릭터 PNG 파츠 + parts.js
api/
  chat.js               POST /api/chat → Claude API (키는 서버에만 있어요)
  status.js             GET  /api/status
dev-server.mjs          로컬 개발 서버
```

## Vercel 배포

1. 이 저장소를 Vercel에서 Import 해요 (Framework Preset: **Other**, 빌드 명령 없음).
2. Settings → Environment Variables 에 추가해요.
   - `ANTHROPIC_API_KEY` (필수)
   - `ANTHROPIC_MODEL` (선택, 기본 `claude-opus-5-5`. 비용을 줄이려면 `claude-sonnet-5-5` 또는 `claude-haiku-5-5`)
   - `CHAT_RATE_LIMIT` (선택, IP당 분당 요청 수, 기본 12)
3. 배포 후 휴대폰 브라우저로 열고 **홈 화면에 추가**하면 앱처럼 실행돼요. 카메라·GPS는 https에서만 동작해요.

## 로컬 실행

```bash
npm install
cp .env.example .env   # ANTHROPIC_API_KEY 입력
npm run dev            # http://localhost:3000
```

## 참고

- 정적 파일을 바꿔 배포할 때는 `public/sw.js`의 `VERSION`을 올려야 사용자 기기의 캐시가 갱신돼요.
- `/api/chat`의 속도 제한은 서버리스 인스턴스 단위라 느슨해요. 공개 운영 전에는 Vercel Firewall 규칙이나 KV 기반 제한, 사용자 인증을 붙이는 걸 권장해요.
- 상담 메시지는 답변 생성을 위해 Anthropic API로 전송돼요. 앱은 대화 내용을 서버에 저장하지 않아요.
