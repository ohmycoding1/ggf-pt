// 마음 한 걸음 – service worker
// 버전을 올리면 이전 캐시가 정리돼요. 정적 파일을 바꿔 배포할 때마다 올려 주세요.
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;
const PRECACHE = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/apple-touch-icon.png",
  "/character_parts/accessories/01_야구모자_100x100.png",
  "/character_parts/accessories/02_베레모_100x100.png",
  "/character_parts/accessories/03_고양이후드_100x100.png",
  "/character_parts/accessories/04_헤드폰후드_100x100.png",
  "/character_parts/accessories/05_곰돌이후드_100x100.png",
  "/character_parts/accessories/06_리본_100x100.png",
  "/character_parts/accessories/07_꽃머리띠_100x100.png",
  "/character_parts/accessories/08_후드모자_100x100.png",
  "/character_parts/accessories/09_베레모_2_100x100.png",
  "/character_parts/accessories/10_캡모자_100x100.png",
  "/character_parts/accessories/11_비니_100x100.png",
  "/character_parts/accessories/12_선원모자_100x100.png",
  "/character_parts/accessories/13_메이드머리띠_100x100.png",
  "/character_parts/accessories/14_간호사모자_100x100.png",
  "/character_parts/accessories/15_마법사모자_100x100.png",
  "/character_parts/accessories/16_전투헬멧_100x100.png",
  "/character_parts/accessories/17_선캡_100x100.png",
  "/character_parts/accessories/18_스포츠캡_100x100.png",
  "/character_parts/accessories/19_고글_100x100.png",
  "/character_parts/base.png",
  "/character_parts/clothes/01_기본캐주얼_100x200.png",
  "/character_parts/clothes/02_교복_100x200.png",
  "/character_parts/clothes/03_스포츠웨어_100x200.png",
  "/character_parts/clothes/04_잠옷_100x200.png",
  "/character_parts/clothes/05_드레스_100x200.png",
  "/character_parts/clothes/06_한복_100x200.png",
  "/character_parts/clothes/07_정장_100x200.png",
  "/character_parts/clothes/08_후드티_2_100x200.png",
  "/character_parts/clothes/09_코트_100x200.png",
  "/character_parts/clothes/10_사복_여름_100x200.png",
  "/character_parts/clothes/11_사복_겨울_100x200.png",
  "/character_parts/clothes/12_스쿨룩_100x200.png",
  "/character_parts/clothes/13_메이드복_100x200.png",
  "/character_parts/clothes/14_간호사복_100x200.png",
  "/character_parts/clothes/15_마법사복_100x200.png",
  "/character_parts/clothes/16_전투복_100x200.png",
  "/character_parts/clothes/17_체육복_100x200.png",
  "/character_parts/clothes/18_잠수복_100x200.png",
  "/character_parts/expressions/01_기본_표정.png",
  "/character_parts/expressions/02_웃음.png",
  "/character_parts/expressions/03_화남.png",
  "/character_parts/expressions/04_슬픔.png",
  "/character_parts/expressions/05_놀람.png",
  "/character_parts/expressions/06_부끄러움.png",
  "/character_parts/expressions/07_기쁨.png",
  "/character_parts/expressions/08_삐짐.png",
  "/character_parts/expressions/09_의심.png",
  "/character_parts/expressions/10_울음.png",
  "/character_parts/expressions/11_당황.png",
  "/character_parts/hair_front/01_대머리.png",
  "/character_parts/hair_front/02_짧은_머리.png",
  "/character_parts/hair_front/03_사과머리.png",
  "/character_parts/hair_front/04_반곱슬.png",
  "/character_parts/hair_front/05_긴_생머리.png",
  "/character_parts/hair_front/06_긴_웨이브.png",
  "/character_parts/hair_front/07_포니테일.png",
  "/character_parts/hair_front/08_양갈래.png",
  "/character_parts/hair_front/09_땋은_머리.png",
  "/character_parts/hair_front/10_단발.png",
  "/character_parts/hair_front/11_컬러_헤어_백발.png",
  "/character_parts/hair_front/12_컬러_헤어_분홍.png",
  "/character_parts/hair_front/13_컬러_헤어_파랑.png",
  "/character_parts/hair_front/14_컬러_헤어_보라.png",
  "/character_parts/hair_front/15_컬러_헤어_금발.png",
  "/character_parts/hair_front/16_가르마펌.png",
  "/character_parts/hair_front/17_투블럭.png",
  "/character_parts/hair_front/18_울프컷.png",
  "/character_parts/hair_front/19_상투.png",
  "/character_parts/hair_front/20_히메컷.png",
  "/character_parts/hair_front/21_리본_헤어.png",
  "/character_parts/hair_front/22_모자_비니.png",
  "/character_parts/hair_front/23_모자_캡.png",
  "/character_parts/hair_front/24_헤어밴드.png",
  "/character_parts/hair_front/25_댄디컷.png",
  "/character_parts/hair_front/26_올백.png",
  "/character_parts/hair_front/27_컬리펌.png",
  "/character_parts/hair_front/28_중단발_웨이브.png",
  "/character_parts/hair_front/29_애쉬컷.png",
  "/character_parts/hair_front/30_롱_스트레이트.png",
  "/character_parts/parts.js",
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE.map((u) => encodeURI(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const CDN = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // API·지도 타일·외부 서비스는 항상 네트워크로
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  // 페이지 이동: 네트워크 우선, 오프라인이면 캐시된 앱 셸
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(SHELL).then((c) => c.put('/index.html', copy));
        return res;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 같은 출처 정적 파일 + CDN 라이브러리: 캐시 후 백그라운드 갱신
  if (url.origin === self.location.origin || CDN.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(url.origin === self.location.origin ? SHELL : RUNTIME).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
