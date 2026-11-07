// ===== 상태 =====
const K='rehab_v1';let S=null;
const GOLD_MAX=999999999; // 골드 최대치 (닉네임 '하준' 특별 보상에 사용)
const today=()=>new Date().toLocaleDateString('sv');
const dd=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
function load(){try{S=JSON.parse(localStorage.getItem(K))}catch(e){S=null}}
function save(){if(S&&S.gold>GOLD_MAX)S.gold=GOLD_MAX;if(S&&layerPack)S.pngEq={...layerChoice};try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}}
// ===== 맨몸 운동 (부위별) · 쉬운 것부터 / f: 1=동작, 0=준비 자세, -1=판단불가 / low=발목까지 보여야 함 =====
const vis=(m,y)=>y;const D1=(m)=>Math.abs(m.wlx-m.wrx)/m.sw,KR=(m,k)=>(k-m.hy)/m.tl;
const ang=(L,a,b,c)=>{const p=[(L[a].x-L[b].x)*1.33,L[a].y-L[b].y],q=[(L[c].x-L[b].x)*1.33,L[c].y-L[b].y];return Math.acos(Math.max(-1,Math.min(1,(p[0]*q[0]+p[1]*q[1])/((Math.hypot(...p)*Math.hypot(...q))||1))))*180/Math.PI};
const ST=['neck'];
// 판정은 느슨하게: 정확한 자세보다 '움직였는지'를 봐요.
// RK: 처음 선 자세를 기준(1.0)으로 무릎-골반 높이가 얼마나 줄었는지(앉을수록 작아짐). 체형·카메라 각도와 무관해요.
const RK=(m,X,k)=>{const r=KR(m,m.ky);if(X.kb==null||r>X.kb)X.kb=r;else if(r>.92*X.kb)X.kb+=(r-X.kb)*.02;return KR(m,k??m.ky)/Math.max(.05,X.kb)};
const AB=(m,X)=>{const a=Math.max(m.al,m.ar)-m.hy;if(X.ab==null||a>X.ab)X.ab=a;return X.ab};
const POOL=[
{id:'neck',n:'목 스트레칭',t:6,h:'어깨는 내리고, 고개를 천천히 왼쪽·오른쪽으로 번갈아 기울여요',f:m=>m.tt>.15?1:m.tt<.08?0:-1},
{id:'cross',n:'팔 스트레칭',t:6,up:1,h:'한쪽 팔을 가슴 앞으로 뻗어 반대 팔로 당겨주고, 팔을 바꿔요',f:m=>(m.wlx-m.wrx)*m.sg<.15*m.sw&&m.wl<m.hy+.2*m.tl?1:((m.wlx-m.wrx)*m.sg>.5*m.sw?0:-1)},
{id:'sidelunge',n:'사이드 런지',t:10,low:1,h:'발을 넓게 벌리고 한쪽 무릎을 굽히며 몸을 옆으로 내렸다가 돌아와요',f:m=>{const sh=Math.abs(m.hx-m.ax)/m.sw;return sh>.28?1:sh<.14?0:-1}},
{id:'sidestep',n:'사이드 스텝',t:16,hip:1,h:'한 걸음씩 옆으로 크게 스텝했다가 제자리로 돌아와요',f:(m,X)=>{X.c=X.c??m.hx;const d=Math.abs(m.hx-X.c)/m.sw;if(d>.42)return 1;if(d<.2){X.c+=(m.hx-X.c)*.08;return 0}return -1}},
{id:'jsq',n:'점프 스쿼트',t:8,low:1,h:'스쿼트로 앉았다가 힘차게 위로 점프해요',f:(m,X)=>{const r=RK(m,X);X.b=X.b??m.hy;if(r<.85)X.q=1;if(X.q&&m.hy<X.b-.06*m.tl){X.q=0;return 1}if(r>.93){X.b+=(m.hy-X.b)*.05;return 0}return -1}},
{id:'buttkick',n:'버트 킥',t:16,low:1,h:'제자리에서 뒤꿈치를 엉덩이 쪽으로 번갈아 차올려요',f:(m,X)=>{const b=AB(m,X),l=(m.al-m.hy)/b,r=(m.ar-m.hy)/b;return l<.88||r<.88?1:(l>.95&&r>.95?0:-1)}},
{id:'toe',n:'토 터치',t:10,low:1,up:1,h:'다리를 벌리고 서서 두 손으로 발끝을 향해 숙였다가 일어나요',f:m=>Math.max(m.wl,m.wr)>m.hy+.45*m.tl?1:(Math.max(m.wl,m.wr)<m.hy+.25*m.tl?0:-1)},
{id:'sqpress',n:'스쿼트 프레스',t:8,low:1,up:1,h:'주먹을 어깨에 두고 앉았다가, 일어나며 두 팔을 머리 위로 밀어 올려요',f:(m,X)=>{const r=RK(m,X);return r>.9&&Math.min(m.wl,m.wr)<m.ny+.05*m.tl?1:(r<.88?0:-1)}},
{id:'fwd',n:'프론트 레이즈',t:8,up:1,h:'두 팔을 어깨 높이로 앞으로 쭉 뻗었다가 내려요',f:m=>Math.max(m.wl,m.wr)<m.sy+.45*m.tl?1:(Math.min(m.wl,m.wr)>m.sy+.55*m.tl?0:-1)},
{id:'tpose',n:'레터럴 레이즈',t:8,up:1,h:'팔을 양옆 어깨 높이까지 쭉 펴서 올렸다가 내려요',f:m=>D1(m)>1.7&&Math.max(m.wl,m.wr)<m.sy+.45*m.tl?1:(Math.min(m.wl,m.wr)>m.sy+.55*m.tl?0:-1)},
{id:'alt',n:'얼터네이팅 숄더 프레스',t:12,up:1,h:'왼팔, 오른팔을 번갈아 머리 위로 쭉 밀어 올려요',f:(m,X)=>{const t=m.ny+.1*m.tl,a=m.wl<t,b=m.wr<t,side=a&&!b?1:b&&!a?2:0;if(side&&side!==X.last){X.last=side;return 2}return a||b?-1:0}},
{id:'lat',n:'랫 풀다운',t:10,up:1,h:'두 팔을 머리 위로 들었다가, 팔꿈치를 옆구리로 당기며 어깨 높이까지 내려요',f:m=>Math.min(m.wl,m.wr)>m.ny+.05*m.tl&&m.el>m.wl&&m.er>m.wr?1:(Math.max(m.wl,m.wr)<m.ny?0:-1)},
{id:'jack',n:'점핑잭',t:15,low:1,up:1,h:'점프하며 다리를 벌리고 팔을 머리 위로, 다시 모아요',f:m=>Math.max(m.wl,m.wr)<m.sy&&m.ag>1.25*m.sw?1:(Math.min(m.wl,m.wr)>m.sy+.1*m.tl?0:-1)},
{id:'jump',n:'제자리 점프',t:10,hip:1,h:'무릎을 살짝 굽혔다가 가볍게 위로 뛰어요',f:(m,X)=>{X.b=X.b??m.hy;if(m.hy<X.b-.08*m.tl)return 1;if(m.hy>X.b-.04*m.tl){X.b+=(m.hy-X.b)*.05;return 0}return -1}},
{id:'press',n:'숄더 프레스',t:10,up:1,h:'두 주먹을 어깨 높이에서 머리 위로 쭉 밀어 올렸다가 내려요',f:m=>Math.max(m.wl,m.wr)<m.ny+.05*m.tl?1:(Math.min(m.wl,m.wr)>m.ny+.2*m.tl?0:-1)},
{id:'half',n:'하프 스쿼트',t:10,low:1,h:'발을 어깨너비로 벌리고 의자에 앉듯 살짝만 앉았다 일어나요',f:(m,X)=>{const r=RK(m,X);return r<.9?1:r>.96?0:-1}},
{id:'knee',n:'하이 니',t:20,low:1,h:'제자리에서 무릎을 허리 높이까지 번갈아 올려요',f:(m,X)=>{RK(m,X);const l=RK(m,X,m.kl),r=RK(m,X,m.kr);return l<.82||r<.82?1:(l>.9&&r>.9?0:-1)}},
{id:'sq',n:'스쿼트',t:12,low:1,h:'엉덩이를 뒤로 빼며 허벅지가 바닥과 가까워질 때까지 앉았다 일어나요',f:(m,X)=>{const r=RK(m,X);return r<.82?1:r>.94?0:-1}},
{id:'sumo',n:'스모 스쿼트',t:10,low:1,h:'다리를 넓게 벌리고 무릎을 바깥으로 향한 채 앉았다 일어나요',f:(m,X)=>{const r=RK(m,X);return r<.85?1:r>.94?0:-1}},
{id:'hinge',n:'굿모닝',t:8,hip:1,h:'무릎을 살짝 굽히고 허리를 곧게 편 채 인사하듯 상체를 숙였다 일어나요',f:(m,X)=>{X.b=Math.max(X.b||0,m.tl);return m.tl<.78*X.b?1:m.tl>.9*X.b?0:-1}},
{id:'wpu',n:'벽 팔굽혀 펴기',t:10,arm:1,h:'벽을 짚고 서서 가슴을 벽에 가깝게 굽혔다 펴요 (카메라는 옆에 두고 옆모습이 보이게)',f:m=>m.pa<125?1:m.pa>145?0:-1},
{id:'kpu',n:'무릎 팔굽혀 펴기',t:8,arm:1,h:'무릎을 바닥에 대고 가슴을 바닥 가까이 내렸다 올라와요 (카메라는 옆에 두고 옆모습이 보이게)',f:m=>m.pa<120?1:m.pa>145?0:-1},
{id:'pu',n:'팔굽혀 펴기',t:6,arm:1,h:'몸을 일직선으로 유지하고 가슴을 바닥 가까이 내렸다 올라와요 (카메라는 옆에 두고 옆모습이 보이게)',f:m=>m.pa<115?1:m.pa>145?0:-1},
{id:'curl',n:'바이셉 컬',t:12,up:1,h:'팔꿈치를 옆구리에 붙이고 주먹이 어깨로 오게 접었다 펴요',f:m=>m.wl<m.el||m.wr<m.er?1:(m.wl>m.el+.15*m.tl&&m.wr>m.er+.15*m.tl?0:-1)},
{id:'bend',n:'사이드 벤드',t:10,h:'두 발을 벌리고 상체를 왼쪽, 오른쪽으로 번갈아 기울여요',f:m=>{const l=Math.abs(m.nx-m.hx)/m.sw;return l>.33?1:l<.18?0:-1}},
{id:'twist',n:'러시안 트위스트',t:12,up:1,h:'두 손을 가슴 앞에 모으고, 배에 힘을 주며 몸통을 좌우로 돌려요',f:m=>{const w=Math.abs((m.wlx+m.wrx)/2-m.hx)/m.sw;return w>.42?1:w<.2?0:-1}},
{id:'ke',n:'스탠딩 바이시클 크런치',t:12,low:1,h:'무릎을 올리면서 같은 쪽 팔꿈치를 내려 서로 만나게 해요',f:(m,X)=>{RK(m,X);const l=RK(m,X,m.kl),r=RK(m,X,m.kr);return l<.82||r<.82?1:(l>.9&&r>.9?0:-1)}}];
const PARTS=['하체','전신','상체'];
const PT={'하체':{e:'🦵',d:'허벅지와 엉덩이 큰 근육을 써요. 천천히 앉았다 일어나요.',ids:['half','sq','sumo','knee','sidestep','sidelunge','buttkick','jsq']},
'전신':{e:'🔥',d:'온몸을 크게 움직이는 운동이에요. 가볍게 뛰면서 심장을 깨워요.',ids:['knee','half','jack','buttkick','toe','sqpress','jsq','jump']},
'상체':{e:'💪',d:'어깨와 팔, 옆구리를 크게 움직여요. 팔을 쭉 뻗어 주세요.',ids:['fwd','tpose','curl','press','alt','lat','bend','jack']}};
const pick=()=>{const n=Math.max(0,dd(S.start,today())),part=PARTS[n%PARTS.length],sc=Math.min(.75,.35+S.lv*.01),Lp=PT[part].ids,c=Math.floor(n/PARTS.length),ids=[0,...[0,1,2].map(k=>1+(c*3+k)%(Lp.length-1))].sort((a,b)=>a-b).map(i=>Lp[i]);
 return{part,ids,tg:ids.map(id=>Math.max(3,Math.round(POOL.find(p=>p.id===id).t*sc)))}};
const EXl=()=>{const d=D();return d.ids.map((id,k)=>{const p=POOL.find(q=>q.id===id);return[p.n,d.tg[k],id,p.h]})};
const I=(id,s,n,p,c,x)=>Object.assign({id,s,n,p,c:c||'#999999'},x||{});
const ITEMS=[
// ── 헤어스타일 ──
I('hr1','hair','단정한 짧은 머리',0),I('hr2','hair','자연스러운 긴 머리',0),
I('hr3','hair','포니테일',80),I('hr4','hair','양갈래 머리',80),I('hr7','hair','똥머리',100),
I('hr9','hair','단발 보브컷',120),I('hr5','hair','삐죽삐죽 머리',120),I('hr6','hair','웨이브 롱헤어',150),
I('hr10','hair','히메컷',180),I('hr8','hair','모히칸',200),
// ── 염색 ──
I('c1','hairc','흑발',0,'#2b2230'),I('c2','hairc','갈색',0,'#7b4a2d'),I('c3','hairc','진갈색',0,'#4a2f22'),
I('c4','hairc','금발',60,'#e8c36a'),I('c5','hairc','핑크',100,'#ff8fb8'),I('c6','hairc','하늘색',100,'#5fb8ff'),
I('c7','hairc','보라',100,'#a78bfa'),I('c9','hairc','빨강',100,'#d9453d'),I('c10','hairc','민트',100,'#5fd6b4'),
I('c8','hairc','은발',150,'#dfe3ec'),I('c12','hairc','노을 그라데이션',300,'#ff9a6b',{grad:['#ffe27a','#ff9a6b','#ff6f91']}),
I('c13','hairc','바다 그라데이션',300,'#5fb8ff',{grad:['#9be7ff','#4f8cff','#8b5cf6']}),I('c14','hairc','숲 그라데이션',300,'#5fd6b4',{grad:['#d4f7a0','#5fd6b4','#2f9e8f']}),
I('c15','hairc','벚꽃 옴브레',400,'#ff6f91',{grad:['#fff0f4','#ffb0c4','#e8405e','#a03ccf']}),I('c16','hairc','달빛 옴브레',400,'#a78bfa',{grad:['#f4f0ff','#b8a4ff','#6a5cf0','#2d3a8c']}),
I('c11','hairc','무지개',400,'#ff6b6b',{rainbow:1}),
// ── 피부 ──
I('s6','skin','하얀 피부',0,'#fdeee4'),I('s1','skin','밝은 피부',0,'#fbe0cc'),I('s2','skin','보통 피부',0,'#f2c9a0'),
I('s3','skin','건강한 피부',0,'#e3ae80'),I('s4','skin','구릿빛 피부',0,'#bd8660'),I('s5','skin','짙은 피부',0,'#8f5e3e'),
// ── 얼굴(표정) ──
I('f1','face','기본 얼굴',0),I('f2','face','웃는 눈',40),I('f3','face','윙크',50),I('f5','face','졸린 눈',40),
I('f10','face','깜짝 놀란 얼굴',40),I('f7','face','주근깨 얼굴',60),I('f6','face','고양이 입',60),
I('f8','face','쿨한 눈매',70),I('f4','face','반짝반짝 눈',80),I('f9','face','하트 눈',150),
// ── 눈동자 ──
I('ey1','eyec','보랏빛 눈동자',0,'#6a4fa8'),I('ey2','eyec','갈색 눈동자',0,'#8a5a3a'),I('ey3','eyec','하늘빛 눈동자',60,'#3f8fe0'),
I('ey4','eyec','에메랄드 눈동자',60,'#2fae7a'),I('ey5','eyec','루비빛 눈동자',80,'#d6455d'),I('ey6','eyec','황금빛 눈동자',80,'#e0a82e'),
I('ey7','eyec','핑크빛 눈동자',80,'#e45fa0'),I('ey8','eyec','은빛 눈동자',100,'#9aa6c0'),
// ── 모자 ──
I('h1','hat','빨간 모자',100,'#e55039'),I('h3','hat','파란 비니',70,'#2d98da'),I('h7','hat','곰돌이 머리띠',90,'#a0693d'),
I('h5','hat','고양이 귀 머리띠',150,'#333333'),I('h11','hat','별 머리핀',60,'#f6b93b'),
I('h13','hat','헤드폰',220,'#e74c3c'),I('h6','hat','밀짚모자',120,'#e6c36a'),I('h10','hat','요리사 모자',100,'#ffffff'),
I('h12','hat','꽃 화관',180,'#ff9ff3'),I('h9','hat','악마 뿔',300,'#d63031'),I('h4','hat','마법사 모자',250,'#6c3fc7'),
I('h8','hat','천사 헤일로',350,'#f6d365'),I('h2','hat','황금 왕관',300,'#f6b93b'),I('h14','hat','고딕 실크햇 (장미)',450,'#3a3340'),
// ── 의상 ──
I('o8','out','빨간 운동복',60,'#d63031'),I('o7','out','별무늬 잠옷',80,'#8fc5ff'),I('o1','out','파란 후드',80,'#4a69bd'),
I('o14','out','하와이안 셔츠',100,'#ffd54a'),I('o4','out','교복 블레이저',120,'#22305e'),I('o2','out','숲속 망토옷',150,'#38ada9'),
I('o5','out','블랙 정장',250,'#1f2430'),I('o11','out','핑크 드레스',280,'#ff8fb8'),I('o6','out','분홍 한복',300,'#ff9fb5'),
I('o9','out','마법사 로브',300,'#6c3fc7'),I('o13','out','닌자복',350,'#262a3d'),I('o10','out','기사의 갑옷',350,'#b8c2d0'),
I('o3','out','황금 갑옷',400,'#f0b429'),I('o15','out','고딕 로리타 드레스',450,'#2a2530'),I('o12','out','우주복',500,'#f4f6fb'),
// ── 악세사리 ──
I('a10','acc','볼 반창고',40,'#f5cba7'),I('a1','acc','동그란 안경',60,'#222222'),I('a5','acc','뿔테 안경',70,'#6d4c41'),
I('a6','acc','나비넥타이',80,'#c0392b'),I('a7','acc','별 귀걸이',90,'#f6b93b'),I('a4','acc','선글라스',100,'#111111'),
I('a2','acc','핑크 목도리',120,'#ff7aa8'),I('a9','acc','꽃 브로치',130,'#ff6b9d'),I('a8','acc','금목걸이',200,'#f6b93b'),
I('a3','acc','천사 날개',500,'#ffffff'),
// ── 등 / 날개 ──
I('b3','back','튼튼한 배낭',100,'#e67e22'),I('b2','back','빨간 망토',200,'#c0392b'),I('b6','back','기타',250,'#d35400'),
I('b1','back','악마 날개',250,'#5b2a86'),I('b4','back','나비 날개',300,'#ff7ad9'),I('b5','back','용 날개',600,'#27ae60'),
// ── 신발 ──
I('sh0','shoes','기본 신발',0,'#2b2b3a'),I('sh1','shoes','빨간 운동화',60,'#e74c3c'),I('sh4','shoes','토끼 슬리퍼',80,'#ffffff'),
I('sh2','shoes','갈색 부츠',100,'#8d5a2b'),I('sh6','shoes','하이탑 스니커즈',120,'#ffffff'),
I('sh5','shoes','롤러스케이트',200,'#ff8fb8'),I('sh3','shoes','황금 신발',300,'#f0b429'),
// ── 오라(효과) ──
I('au1','aura','반짝이 오라',200,'#fff3a0'),I('au5','aura','하트 오라',250,'#ff7aa8'),I('au2','aura','벚꽃잎 오라',250,'#ffb7d5'),
I('au4','aura','눈꽃 오라',300,'#bfe6ff'),I('au3','aura','불꽃 오라',400,'#ff7a30'),I('au6','aura','무지개 오라',600,'#a78bfa'),
// ── 한정 (보물 지도에서 획득) ──
I('e1','hat','벚꽃 리본 (한정)',0,'#ffb7d5',{ev:1}),I('e2','acc','달토끼 귀 (한정)',0,'#e8e8ff',{ev:1}),
I('e3','aura','달빛 오라 (한정)',0,'#cfd8ff',{ev:1}),I('e4','hat','무지개 왕관 (한정)',0,'#ff9ff3',{ev:1}),
];

const NPC=[['달빛여우',64],['말랑곰',48],['새벽고래',37],['조용한숲',25],['구름한점',12]];
let tab='mission',stream=null,outT=null,pos=null,watch=null,treasure=null,demo=0;
const D=()=>{const t=today();const d=S.days[t]=S.days[t]||{chat:0,done:0,walk:0,start:0};if(!d.st||d.v!==4||d.ids.some(id=>!POOL.some(q=>q.id===id))){const p=pick();d.st=1;d.v=4;d.warm=d.done?[5]:[];d.part=p.part;d.ids=p.ids;d.tg=p.tg;d.ex=d.done?p.tg.slice():p.ids.map(()=>0)}return d};
const isWalkDay=()=>dd(S.start,today())%7===6;
const need=l=>40+l*15;
function addXp(n){S.exp+=n;while(S.lv<100&&S.exp>=need(S.lv)){S.exp-=need(S.lv);S.lv++}if(S.lv>=100){S.lv=100;S.exp=0}}
function loseLv(n,why){S.lv=Math.max(1,S.lv-n);S.exp=0;return why}
// ===== 시작: 접속 보상/패널티 =====
function enter(){let msg=[];const t=today();
 // 닉네임이 '하준'이면 골드 최대 + 99레벨 (처음 한 번만 지급)
 if(S.name==='하준'&&!S.perk){S.perk=1;S.gold=GOLD_MAX;S.lv=99;S.exp=0;msg.push('🎁 특별 보상! 골드 최대, Lv.99로 시작해요.')}
 if(S.last!==t){
  if(S.last){const gap=dd(S.last,t)-1;if(gap>0){loseLv(gap);msg.push(`${gap}일 접속하지 않아 레벨이 ${gap} 내려갔어요.`)}
   const y=S.days[S.last];if(y&&y.start&&!y.done){loseLv(1);msg.push('어제 미션을 끝내지 못해 레벨이 1 내려갔어요.')}}
  S.gold+=50;msg.push('접속 보상 +50G');S.last=t}
 D();save();return msg}
// ===== 캐릭터 엔진 (Canvas 벡터 + 가벼운 애니메이션) =====
let pv={};                                   // 상점 '미리보기' (저장되지 않아요)
const itm=id=>ITEMS.find(i=>i.id===id);
const mixc=(a,b,t)=>{const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('')};
const OL0='rgba(50,30,45,.4)';let OL=OL0,PXM=false,EYEC='#6a4fa8',HOL=OL0,lastCap='jag';
const BS=.64,HS=1.48;                                  // 치비 비율: 몸은 더 작게, 머리는 크게
const BT=c=>{c.translate(80,196);c.scale(BS,BS);c.translate(-80,-196)};
const HT=(c,b)=>{c.translate(80,196-88*BS+3+(b||0));c.scale(HS,HS);c.translate(-80,-106)};
function lookOf(extra,nopv){const f=S.gender==='여',e=Object.assign({},S.eq||{},nopv?{}:pv,extra||{});
 return{hair:e.hair||(f?'hr2':'hr1'),hairc:e.hairc||(f?'c2':'c3'),skin:e.skin||'s2',face:e.face||'f1',eyec:e.eyec||'ey1',
  hat:e.hat||null,out:e.out||null,acc:e.acc||null,back:e.back||null,shoes:e.shoes||'sh0',aura:e.aura||null}}
const PP=(c,f,s,lw)=>{if(f){c.fillStyle=f;c.fill()}if(s){if(PXM&&s===OL&&typeof f==='string'&&f.length===7&&f[0]==='#')s=mixc(f,'#2a1630',.58);c.strokeStyle=s;c.lineWidth=lw||1.2;c.lineJoin='round';c.stroke()}};
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function star(c,x,y,r,k){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,d=i%2?r*(k||.45):r;c.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d)}c.closePath()}
function heart(c,x,y,s){c.beginPath();c.moveTo(x,y+s*.45);c.bezierCurveTo(x-s*1.2,y-s*.3,x-s*.5,y-s*1.0,x,y-s*.35);c.bezierCurveTo(x+s*.5,y-s*1.0,x+s*1.2,y-s*.3,x,y+s*.45);c.closePath()}
const mirror=(c,fn)=>{fn();c.save();c.translate(160,0);c.scale(-1,1);fn();c.restore()};

// ── 머리 색 ──
function hairPal(c,h){
 if(h.rainbow){const g=c.createLinearGradient(40,10,120,110);['#ff6b6b','#ffb347','#ffe66d','#6bdc8b','#5fb8ff','#a78bfa'].forEach((k,i)=>g.addColorStop(i/5,k));
  return{f:g,s:'rgba(0,0,0,.2)',h:'rgba(255,255,255,.5)',stub:'#d9b49a'}}
 if(h.grad){const g=c.createLinearGradient(0,18,0,150);h.grad.forEach((k,i)=>g.addColorStop(i/(h.grad.length-1),k));return{f:g,s:mixc(h.grad[1],'#000000',.3),h:mixc(h.grad[0],'#ffffff',.5),stub:mixc(h.grad[0],'#f0d0b0',.6)}}
 return{f:h.c,s:mixc(h.c,'#000000',.28),h:mixc(h.c,'#ffffff',.42),stub:mixc(h.c,'#f0d0b0',.68)}}

// ── 뒷머리 ──
function hairBack(c,id,H){
 const paths={
  hr2:()=>{c.beginPath();c.moveTo(42,56);c.bezierCurveTo(32,86,32,108,38,130);c.lineTo(80,135);c.lineTo(122,130);c.bezierCurveTo(128,108,128,86,118,56);c.closePath()},
  hr10:()=>{c.beginPath();c.moveTo(42,56);c.bezierCurveTo(30,90,30,116,34,142);c.lineTo(80,147);c.lineTo(126,142);c.bezierCurveTo(130,116,130,90,118,56);c.closePath()},
  hr6:()=>{c.beginPath();c.moveTo(42,56);c.bezierCurveTo(30,84,26,98,34,110);c.quadraticCurveTo(26,120,38,132);c.quadraticCurveTo(50,126,58,136);c.quadraticCurveTo(70,130,80,138);c.quadraticCurveTo(92,130,102,136);c.quadraticCurveTo(110,126,122,132);c.quadraticCurveTo(134,120,126,110);c.bezierCurveTo(134,98,130,84,118,56);c.closePath()},
  hr9:()=>{c.beginPath();c.moveTo(42,60);c.bezierCurveTo(34,84,34,104,44,118);c.lineTo(80,122);c.lineTo(116,118);c.bezierCurveTo(126,104,126,84,118,60);c.closePath()},
  hr3:()=>{c.beginPath();c.moveTo(108,44);c.bezierCurveTo(134,38,142,80,128,116);c.bezierCurveTo(125,128,119,132,116,127);c.bezierCurveTo(123,108,121,84,104,64);c.closePath()}};
 if(id==='hr4'){const t=()=>{c.beginPath();c.moveTo(46,52);c.bezierCurveTo(28,58,22,92,30,126);c.bezierCurveTo(34,134,42,132,42,122);c.bezierCurveTo(40,98,44,78,54,62);c.closePath();c.fillStyle=H.f;c.fill();c.strokeStyle=HOL;c.lineWidth=1.2;c.stroke()};mirror(c,t);return}
 const p=paths[id];if(!p)return;p();c.fillStyle=H.f;c.fill();c.strokeStyle=HOL;c.lineWidth=1.2;c.lineJoin='round';c.stroke();
 c.strokeStyle=H.s;c.lineWidth=1.35;c.globalAlpha=.58;for(const x of [49,57,66,76,86,96,105,113]){c.beginPath();c.moveTo(x,76);c.bezierCurveTo(x+(x-80)*.12,91,x+(x-80)*.18,108,x+(x-80)*.22,124+(x%3)*2);c.stroke()}c.globalAlpha=.68;c.strokeStyle=H.h;c.lineWidth=1;for(const x of [54,69,91,107]){c.beginPath();c.moveTo(x,84);c.quadraticCurveTo(x+(x-80)*.12,102,x+(x-80)*.16,119);c.stroke()}c.globalAlpha=1}

// ── 앞머리 / 윗머리 ──
function cap(c,kind){lastCap=kind;
 c.beginPath();c.moveTo(39,74);c.bezierCurveTo(32,30,58,16,80,16);c.bezierCurveTo(102,16,128,30,121,74);
 if(kind==='jag'){c.bezierCurveTo(119,64,113,60,106,58);c.lineTo(100,71);c.lineTo(93,58);c.lineTo(84,73);c.lineTo(74,57);c.lineTo(66,71);c.lineTo(58,58);c.bezierCurveTo(48,60,42,66,39,74)}
 else if(kind==='side'){c.bezierCurveTo(119,66,113,60,102,57);c.bezierCurveTo(94,68,76,72,60,67);c.lineTo(54,73);c.bezierCurveTo(47,69,41,70,39,74)}
 else if(kind==='straight'){c.bezierCurveTo(119,68,117,70,112,73);c.quadraticCurveTo(104,82,95,76);c.quadraticCurveTo(88,70,82,56);c.quadraticCurveTo(75,72,65,76);c.quadraticCurveTo(56,82,48,73);c.bezierCurveTo(43,71,41,72,39,74)}
 else{c.bezierCurveTo(118,58,106,46,80,44);c.bezierCurveTo(54,46,42,58,39,74)}
 c.closePath()}
function hl(c,H){
 c.save();cap(c,lastCap);c.clip();c.lineCap='round';c.lineWidth=2;c.strokeStyle=H.s;c.globalAlpha=1;
 [[43,64],[48,61],[53,66],[58,62],[63,68],[68,63],[73,67],[78,63],[84,67],[89,62],[94,67],[99,63],[104,66],[109,61],[116,64]].forEach(([x,y],i)=>{c.beginPath();c.moveTo(80+(x-80)*.12,19+(i%3));c.quadraticCurveTo(80+(x-80)*.58,29+(i%4)*3,x,y);c.stroke()});
 c.strokeStyle=H.h;c.globalAlpha=.68;c.lineWidth=1.1;[[46,59],[54,62],[62,60],[70,63],[77,60],[85,63],[93,60],[101,62],[110,59]].forEach(([x,y],i)=>{c.beginPath();c.moveTo(80+(x-80)*.18,22+(i%2));c.quadraticCurveTo(80+(x-80)*.63,31+(i%3)*2,x,y);c.stroke()});
 c.globalAlpha=1;c.restore();
 c.strokeStyle=H.h;c.lineCap='round';c.lineWidth=3;c.beginPath();c.moveTo(54,36);c.quadraticCurveTo(68,24,90,25);c.stroke();c.lineWidth=1.6;c.beginPath();c.moveTo(97,26);c.quadraticCurveTo(103,27,107,31);c.stroke()}
function lock(c,H,Lb){mirror(c,()=>{c.beginPath();c.moveTo(40,62);c.bezierCurveTo(34,84,34,Lb-14,40,Lb);c.quadraticCurveTo(48,Lb+2,52,Lb-10);c.bezierCurveTo(48,98,50,80,52,60);c.closePath();c.fillStyle=H.f;c.fill();c.strokeStyle=HOL;c.lineWidth=1.2;c.lineJoin='round';c.stroke()})}
function hairFront(c,id,H){
 const fill=()=>{c.fillStyle=H.f;c.fill();c.strokeStyle=HOL;c.lineWidth=1.2;c.lineJoin='round';c.stroke()};
 switch(id){
  case 'hr1':cap(c,'jag');fill();hl(c,H);break;
  case 'hr2':lock(c,H,112);cap(c,'side');fill();hl(c,H);break;
  case 'hr3':cap(c,'side');fill();hl(c,H);c.beginPath();c.ellipse(112,46,5,4,.5,0,7);PP(c,'#e74c3c',OL);break;
  case 'hr4':cap(c,'side');fill();hl(c,H);mirror(c,()=>{c.beginPath();c.arc(45,54,5.5,0,7);PP(c,'#ff6b9d',OL);c.beginPath();c.arc(45,54,1.8,0,7);PP(c,'#fff')});break;
  case 'hr5':c.beginPath();c.moveTo(39,74);c.lineTo(32,44);c.lineTo(50,52);c.lineTo(50,24);c.lineTo(66,40);c.lineTo(76,8);c.lineTo(88,38);c.lineTo(104,18);c.lineTo(108,46);c.lineTo(126,38);c.lineTo(121,74);
   c.bezierCurveTo(119,62,113,56,106,54);c.lineTo(99,65);c.lineTo(92,52);c.lineTo(83,67);c.lineTo(73,52);c.lineTo(65,65);c.lineTo(57,54);c.bezierCurveTo(48,57,42,64,39,74);c.closePath();fill();lastCap='jag';hl(c,H);break;
  case 'hr6':lock(c,H,118);cap(c,'side');fill();hl(c,H);break;
  case 'hr7':cap(c,'side');fill();hl(c,H);c.beginPath();c.arc(80,13,14,0,7);fill();c.strokeStyle=H.h;c.lineWidth=2.4;c.beginPath();c.arc(80,13,9,3.6,4.8);c.stroke();rr(c,70,24,20,5,2.5);PP(c,'#e74c3c',OL);break;
  case 'hr8':cap(c,'jag');c.fillStyle=H.stub;c.fill();c.strokeStyle=HOL;c.lineWidth=1.2;c.stroke();
   c.beginPath();c.moveTo(66,54);c.lineTo(60,22);c.lineTo(71,32);c.lineTo(80,2);c.lineTo(89,32);c.lineTo(100,22);c.lineTo(94,54);c.quadraticCurveTo(80,46,66,54);c.closePath();fill();break;
  case 'hr9':lock(c,H,104);cap(c,'straight');fill();hl(c,H);break;
  case 'hr10':lock(c,H,126);cap(c,'straight');fill();hl(c,H);break;
 }}

// ── 얼굴 ──
function face(c,id,blink,H){
 const ex=[66,94],ey=77,dk='#2a2233';
 const open=(x,rx,ry,iris)=>{
  if(blink){c.strokeStyle=dk;c.lineWidth=2.8;c.lineCap='round';c.beginPath();c.moveTo(x-rx,ey+1);c.quadraticCurveTo(x,ey+3.5,x+rx,ey+1);c.stroke();return}
  // 가로로 조금 넓고 낮은 눈: 아래 윤곽은 완만하게 펴고, 윗윤곽은 속눈썹처럼 강조
  c.beginPath();c.moveTo(x-rx,ey);
  c.bezierCurveTo(x-rx*.55,ey-ry*1.02,x+rx*.48,ey-ry*1.02,x+rx,ey);
  c.bezierCurveTo(x+rx*.68,ey+ry*.55,x+rx*.28,ey+ry*.72,x,ey+ry*.70);
  c.bezierCurveTo(x-rx*.28,ey+ry*.72,x-rx*.68,ey+ry*.55,x-rx,ey);
  c.closePath();c.fillStyle='#fff';c.fill();
  const ic=iris||EYEC,g=c.createLinearGradient(0,ey-ry,0,ey+ry);g.addColorStop(0,mixc(ic,'#000000',.55));g.addColorStop(.55,ic);g.addColorStop(1,mixc(ic,'#ffffff',.5));
  c.fillStyle=g;c.beginPath();c.ellipse(x,ey+ry*.10,rx*.66,ry*.72,0,0,7);c.fill();
  c.fillStyle=dk;c.beginPath();c.ellipse(x,ey+ry*.13,rx*.25,ry*.34,0,0,7);c.fill();
  c.fillStyle='#fff';c.beginPath();c.arc(x-rx*.24,ey-ry*.18,rx*.20,0,7);c.fill();c.beginPath();c.arc(x+rx*.18,ey+ry*.28,rx*.10,0,7);c.fill();
  // 두꺼운 윗속눈썹과 상대적으로 곧은 아랫선
  c.strokeStyle=dk;c.lineCap='round';c.lineJoin='round';c.lineWidth=4.0;c.beginPath();
  c.moveTo(x-rx,ey);c.bezierCurveTo(x-rx*.55,ey-ry*1.02,x+rx*.48,ey-ry*1.02,x+rx,ey);c.stroke();
  c.lineWidth=1.5;c.beginPath();c.moveTo(x-rx*.94,ey+ry*.08);
  c.bezierCurveTo(x-rx*.58,ey+ry*.68,x+rx*.58,ey+ry*.68,x+rx*.94,ey+ry*.08);c.stroke();
  const o=x<80?-1:1;c.lineWidth=2.2;c.beginPath();c.moveTo(x+o*rx*.94,ey-ry*.12);c.lineTo(x+o*(rx+3.2),ey-ry*.45);c.stroke()};
 const arc=(x,up,r)=>{c.strokeStyle=dk;c.lineWidth=2.6;c.lineCap='round';c.beginPath();c.arc(x,ey+(up?3:-3),r||6,up?Math.PI*1.1:Math.PI*.1,up?Math.PI*1.9:Math.PI*.9);c.stroke()};
 const brow=(a,b)=>{c.strokeStyle='rgba(60,40,45,.55)';c.lineWidth=2;c.lineCap='round';c.beginPath();c.moveTo(59,60+a);c.lineTo(72,60+b);c.stroke();c.beginPath();c.moveTo(88,60+b);c.lineTo(101,60+a);c.stroke()};
 const smile=(w,d)=>{c.strokeStyle='#a8544f';c.lineWidth=2;c.lineCap='round';c.beginPath();c.arc(80,86-d*.4,w,Math.PI*.15,Math.PI*.85);c.stroke()};
 const open_mouth=()=>{c.beginPath();c.moveTo(73,85);c.quadraticCurveTo(80,99,87,85);c.closePath();PP(c,'#b8434f');c.fillStyle='#ff8a8a';c.beginPath();c.ellipse(80,91.5,3.6,2,0,0,7);c.fill()};
 c.fillStyle='rgba(255,110,130,.30)';[[52,90],[108,90]].forEach(([x,y])=>{c.beginPath();c.ellipse(x,y,8,5,0,0,7);c.fill()});
 switch(id){
  case 'f2':brow(-1,-1);arc(65,1);arc(95,1);open_mouth();break;
  case 'f3':brow(-1,-1);open(65,7.4,6.5);arc(95,1);smile(6,0);break;
  case 'f4':brow(-2,-2);open(65,8.1,7.1,'#2f9bff');open(95,8.1,7.1,'#2f9bff');c.fillStyle='#fff';[65,95].forEach(x=>{if(!blink){star(c,x+3,ey+3,2.6,.4);c.fill()}});smile(5,0);break;
  case 'f5':brow(1,1);[65,95].forEach(x=>{arc(x,0,6.5);c.strokeStyle=dk;c.lineWidth=1.6;c.beginPath();c.moveTo(x+6,ey+1);c.lineTo(x+9,ey-1);c.stroke()});c.fillStyle='#b8636a';c.beginPath();c.ellipse(80,90,2.6,3.2,0,0,7);c.fill();break;
  case 'f6':brow(0,0);open(65,7.4,6.5);open(95,7.4,6.5);c.strokeStyle='#a8544f';c.lineWidth=1.8;c.lineCap='round';c.beginPath();c.arc(76.6,87,3.4,.1,Math.PI-.1);c.stroke();c.beginPath();c.arc(83.4,87,3.4,.1,Math.PI-.1);c.stroke();
   c.strokeStyle='rgba(60,40,45,.45)';c.lineWidth=1.2;[-3,1,5].forEach(d=>{c.beginPath();c.moveTo(46,90+d);c.lineTo(34,89+d*1.6);c.stroke();c.beginPath();c.moveTo(114,90+d);c.lineTo(126,89+d*1.6);c.stroke()});break;
  case 'f7':brow(0,0);open(65,7.4,6.5);open(95,7.4,6.5);smile(5,0);c.fillStyle='rgba(150,90,60,.65)';[[50,86],[55,90],[60,86],[100,86],[105,90],[110,86]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,1.2,0,7);c.fill()});break;
  case 'f8':brow(-2,2);open(65,6.4,4.5);open(95,6.4,4.5);c.fillStyle='rgba(0,0,0,.18)';c.fillRect(58,ey-6,14,3);c.fillRect(88,ey-6,14,3);c.strokeStyle='#a8544f';c.lineWidth=2;c.lineCap='round';c.beginPath();c.moveTo(75,88);c.quadraticCurveTo(81,90,86,86);c.stroke();break;
  case 'f9':brow(-2,-2);[65,95].forEach(x=>{heart(c,x,ey,7.5);PP(c,blink?'#c24468':'#ff4f81','#c02857',1);c.fillStyle='rgba(255,255,255,.8)';c.beginPath();c.arc(x-2.4,ey-2.6,1.6,0,7);c.fill()});smile(6,0);break;
  case 'f10':brow(-3,-3);[65,95].forEach(x=>{c.beginPath();c.ellipse(x,ey,7.7,7.0,0,0,7);PP(c,'#fff',dk,1.8);c.fillStyle=dk;c.beginPath();c.arc(x,ey+1,2.8,0,7);c.fill()});c.beginPath();c.ellipse(80,90,4,5.2,0,0,7);PP(c,'#9d2f3a');c.fillStyle='#ff8a8a';c.beginPath();c.ellipse(80,92.6,2.3,1.6,0,0,7);c.fill();break;
  default:brow(0,0);open(65,7.4,6.5);open(95,7.4,6.5);smile(5,0)}}

// ── 얼굴/머리에 붙는 악세사리 ──
function foreShadow(c,id){const k={hr1:'jag',hr2:'side',hr3:'side',hr4:'side',hr5:'jag',hr6:'side',hr7:'side',hr8:'jag',hr9:'straight',hr10:'straight'}[id];if(!k)return;
 c.save();c.beginPath();c.moveTo(42,66);c.bezierCurveTo(42,40,60,33,80,33);c.bezierCurveTo(100,33,118,40,118,66);c.bezierCurveTo(118,92,100,107,80,107);c.bezierCurveTo(60,107,42,92,42,66);c.closePath();c.clip();
 c.translate(0,4.5);cap(c,k);c.fillStyle='rgba(110,50,60,.3)';c.fill();c.restore()}
function faceAcc(c,id){
 if(id==='a1'){c.strokeStyle='#222';c.lineWidth=2;[65,95].forEach(x=>{c.beginPath();c.arc(x,77,10,0,7);c.stroke();c.fillStyle='rgba(180,220,255,.2)';c.fill()});c.beginPath();c.moveTo(75,76);c.quadraticCurveTo(80,72,85,76);c.stroke();c.beginPath();c.moveTo(55,76);c.lineTo(44,72);c.moveTo(105,76);c.lineTo(116,72);c.stroke()}
 if(id==='a5'){c.strokeStyle='#6d4c41';c.lineWidth=3.2;c.lineJoin='round';[65,95].forEach(x=>{rr(c,x-10.5,68,21,17,5);c.stroke();c.fillStyle='rgba(180,220,255,.16)';c.fill()});c.beginPath();c.moveTo(75.5,75);c.lineTo(84.5,75);c.stroke();c.beginPath();c.moveTo(54.5,74);c.lineTo(44,71);c.moveTo(105.5,74);c.lineTo(116,71);c.stroke()}
 if(id==='a4'){[65,95].forEach(x=>{c.beginPath();c.moveTo(x-11,70);c.lineTo(x+11,70);c.quadraticCurveTo(x+10,87,x,87);c.quadraticCurveTo(x-10,87,x-11,70);c.closePath();PP(c,'#15151c','#000',1.2);c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=1.6;c.beginPath();c.moveTo(x-7,73);c.lineTo(x-2,73);c.stroke()});
  c.strokeStyle='#15151c';c.lineWidth=2.4;c.beginPath();c.moveTo(76,72);c.lineTo(84,72);c.moveTo(54,71);c.lineTo(44,70);c.moveTo(106,71);c.lineTo(116,70);c.stroke()}
 if(id==='a7'){[44,116].forEach(x=>{c.strokeStyle='#d4a017';c.lineWidth=1.2;c.beginPath();c.moveTo(x,80);c.lineTo(x,86);c.stroke();star(c,x,91,5.5,.5);PP(c,'#f6c23e','#b8860b',1)})}
 if(id==='a10'){c.save();c.translate(108,92);c.rotate(-.5);rr(c,-8,-3.4,16,6.8,3);PP(c,'#f5cba7','rgba(120,80,50,.5)',1);c.fillStyle='#e8b894';c.fillRect(-2.6,-3.4,5.2,6.8);c.fillStyle='rgba(150,100,70,.5)';[[-1,-1],[1,1],[-1,1],[1,-1]].forEach(([a,b])=>{c.fillRect(a,b,.8,.8)});c.restore()}}

// ── 모자 / 머리 장식 ──
function crown(c,fill){c.beginPath();c.moveTo(42,42);c.lineTo(44,12);c.lineTo(62,28);c.lineTo(80,4);c.lineTo(98,28);c.lineTo(116,12);c.lineTo(118,42);c.closePath();PP(c,fill,'#8a6a10',1.4);rr(c,42,38,76,9,3);PP(c,mixc('#f6b93b','#000',.12),'#8a6a10',1.2)}
function hat(c,id,t){
 const col=itm(id).c,dk=(x,a)=>mixc(x,'#000000',a||.25);
 switch(id){
  case 'h1':c.beginPath();c.moveTo(40,56);c.bezierCurveTo(38,22,60,12,80,12);c.bezierCurveTo(100,12,122,22,120,56);c.quadraticCurveTo(80,48,40,56);c.closePath();PP(c,col,OL);
   c.strokeStyle='rgba(0,0,0,.15)';c.beginPath();c.moveTo(80,12);c.lineTo(80,50);c.stroke();c.beginPath();c.arc(80,12,3.2,0,7);PP(c,dk(col),OL);c.beginPath();c.arc(80,32,5.2,0,7);PP(c,'#fff',OL);
   c.beginPath();c.moveTo(38,54);c.quadraticCurveTo(80,45,122,54);c.quadraticCurveTo(120,66,80,67);c.quadraticCurveTo(40,66,38,54);c.closePath();PP(c,dk(col,.18),OL);break;
  case 'h2':crown(c,'#f6c23e');[[80,24,'#e74c3c'],[60,32,'#3498db'],[100,32,'#2ecc71']].forEach(([x,y,k])=>{c.beginPath();c.arc(x,y,3.6,0,7);PP(c,k,'#444',.8)});c.fillStyle='rgba(255,255,255,.7)';[44,62,80,98,116].forEach((x,i)=>{c.beginPath();c.arc(x,[12,28,4,28,12][i],1.8,0,7);c.fill()});break;
  case 'e4':{const g=c.createLinearGradient(42,0,118,0);['#ff6b6b','#ffb347','#ffe66d','#6bdc8b','#5fb8ff','#a78bfa'].forEach((k,i)=>g.addColorStop(i/5,k));crown(c,g);c.fillStyle='#fff';[44,80,116].forEach((x,i)=>{star(c,x,[12,4,12][i]+1,4,.45);c.fill()});break}
  case 'h3':c.beginPath();c.moveTo(40,54);c.bezierCurveTo(36,20,62,8,80,8);c.bezierCurveTo(98,8,124,20,120,54);c.quadraticCurveTo(80,46,40,54);c.closePath();PP(c,col,OL);
   c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=2;for(let x=50;x<=110;x+=10){c.beginPath();c.moveTo(80+(x-80)*.55,12);c.lineTo(x,48);c.stroke()}
   rr(c,37,46,86,13,6);PP(c,dk(col,.2),OL);c.strokeStyle='rgba(255,255,255,.2)';c.lineWidth=1.4;for(let x=44;x<120;x+=7){c.beginPath();c.moveTo(x,48);c.lineTo(x,57);c.stroke()}
   c.beginPath();c.arc(80,6,8,0,7);PP(c,'#fff',OL);break;
  case 'h4':c.beginPath();c.moveTo(50,50);c.bezierCurveTo(58,28,68,12,102,-10);c.bezierCurveTo(94,10,108,30,112,50);c.closePath();PP(c,col,OL);
   c.beginPath();c.ellipse(80,50,54,10,0,0,7);PP(c,dk(col,.15),OL);rr(c,50,40,62,8,2);PP(c,'#f6c23e',OL);
   c.fillStyle='#f6e58d';star(c,78,28,6,.45);c.fill();star(c,94,14,3.4,.45);c.fill();break;
  case 'h5':c.strokeStyle='#333';c.lineWidth=3.4;c.beginPath();c.moveTo(44,50);c.quadraticCurveTo(80,6,116,50);c.stroke();
   mirror(c,()=>{c.beginPath();c.moveTo(46,38);c.lineTo(52,6);c.lineTo(76,24);c.closePath();PP(c,col,OL);c.beginPath();c.moveTo(53,30);c.lineTo(56,15);c.lineTo(67,25);c.closePath();PP(c,'#ff8fb8')});break;
  case 'h6':c.beginPath();c.ellipse(80,44,64,14,0,0,7);PP(c,col,OL);c.beginPath();c.moveTo(48,44);c.bezierCurveTo(46,12,64,4,80,4);c.bezierCurveTo(96,4,114,12,112,44);c.quadraticCurveTo(80,52,48,44);c.closePath();PP(c,mixc(col,'#ffffff',.12),OL);
   c.beginPath();c.moveTo(48,40);c.quadraticCurveTo(80,48,112,40);c.lineTo(112,32);c.quadraticCurveTo(80,40,48,32);c.closePath();PP(c,'#d63031',OL);
   c.strokeStyle='rgba(120,80,20,.3)';c.lineWidth=1;for(let i=0;i<6;i++){c.beginPath();c.ellipse(80,44,64-i*10,14-i*1.6,0,.2,Math.PI-.2);c.stroke()}break;
  case 'h7':mirror(c,()=>{c.beginPath();c.arc(48,30,13,0,7);PP(c,col,OL);c.beginPath();c.arc(48,30,6.4,0,7);PP(c,'#e8c9a0')});c.strokeStyle='#7a4e2a';c.lineWidth=3;c.beginPath();c.moveTo(50,40);c.quadraticCurveTo(80,12,110,40);c.stroke();break;
  case 'h8':{const y=8+Math.sin(t*2)*1.5;c.save();c.shadowColor='rgba(255,215,90,.9)';c.shadowBlur=10;c.strokeStyle='#f6d365';c.lineWidth=4.4;c.beginPath();c.ellipse(80,y,24,6.4,0,0,7);c.stroke();c.restore();c.strokeStyle='#fff6c8';c.lineWidth=1.4;c.beginPath();c.ellipse(80,y-1,24,6.4,0,3.5,5.6);c.stroke();break}
  case 'h9':mirror(c,()=>{c.beginPath();c.moveTo(50,32);c.bezierCurveTo(40,20,42,6,52,-2);c.bezierCurveTo(52,8,60,16,68,24);c.closePath();PP(c,col,OL);c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.ellipse(49,16,1.6,6,.4,0,7);c.fill()});break;
  case 'h10':rr(c,48,34,64,17,4);PP(c,'#fff',OL);[[62,26,16],[80,18,19],[98,26,16]].forEach(([x,y,r])=>{c.beginPath();c.arc(x,y,r,0,7);PP(c,'#fff',OL)});rr(c,49,35,62,15,4);PP(c,'#fff');c.strokeStyle='rgba(0,0,0,.08)';c.lineWidth=1.4;[62,80,98].forEach(x=>{c.beginPath();c.moveTo(x,36);c.lineTo(x,49);c.stroke()});break;
  case 'h11':star(c,52,38,9,.48);PP(c,'#f6c23e','#b8860b',1.2);c.fillStyle='rgba(255,255,255,.7)';c.beginPath();c.arc(50,35,1.8,0,7);c.fill();star(c,60,24,4,.5);PP(c,'#ffe08a','#b8860b',.8);break;
  case 'h12':for(let k=0;k<7;k++){const x=44+k*12,y=42-Math.sin(k/6*Math.PI)*22+(k===0||k===6?6:0);c.beginPath();c.ellipse(x-4,y+3,5,2.4,.5,0,7);PP(c,'#4caf50')}
   for(let k=0;k<7;k++){const x=44+k*12,y=42-Math.sin(k/6*Math.PI)*22+(k===0||k===6?6:0),k2=['#ff9ff3','#ffe66d','#fff','#ff8fb8','#fff','#ffe66d','#ff9ff3'][k];for(let p=0;p<5;p++){const a=p*Math.PI*2/5;c.beginPath();c.arc(x+Math.cos(a)*3.8,y+Math.sin(a)*3.8,3.1,0,7);PP(c,k2,'rgba(0,0,0,.18)',.7)}c.beginPath();c.arc(x,y,2.4,0,7);PP(c,'#f9a825')}break;
  case 'h13':c.strokeStyle='#2d3436';c.lineWidth=5.4;c.lineCap='round';c.beginPath();c.moveTo(38,76);c.bezierCurveTo(30,6,130,6,122,76);c.stroke();
   mirror(c,()=>{rr(c,28,62,15,28,7);PP(c,col,OL);rr(c,31,66,6,20,3);PP(c,dk(col,.3))});break;
  case 'h14':{c.save();c.translate(66,32);c.rotate(-.2);
   c.beginPath();c.ellipse(0,6,31,8.5,0,0,7);PP(c,'#2c2630',OL);
   c.beginPath();c.moveTo(-19,6);c.lineTo(-17,-14);c.quadraticCurveTo(0,-19,17,-14);c.lineTo(19,6);c.quadraticCurveTo(0,13,-19,6);c.closePath();PP(c,'#3a3340',OL);
   c.beginPath();c.ellipse(0,-14,17,4.6,0,0,7);PP(c,'#4c4456',OL);
   c.beginPath();c.moveTo(-18.4,-2);c.quadraticCurveTo(0,3,18.4,-2);c.lineTo(19,6);c.quadraticCurveTo(0,13,-19,6);c.closePath();PP(c,'#5a1f33',OL);
   c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=1.6;c.beginPath();c.moveTo(-12,-12);c.lineTo(-13,2);c.stroke();
   c.beginPath();c.moveTo(20,-1);c.quadraticCurveTo(38,-10,45,1);c.quadraticCurveTo(36,1,31,8);c.closePath();PP(c,'#2c2630',OL);
   [[9,-1,10,'#a82038'],[9,-1,6.6,'#d13a55'],[9,-1,3.6,'#8a1830']].forEach(([x,y,r,k])=>{c.beginPath();c.arc(x,y,r,0,7);PP(c,k,OL)});
   c.strokeStyle='#f08ba0';c.lineWidth=1.3;c.beginPath();c.arc(9,-1,5,.4,3.8);c.stroke();c.beginPath();c.arc(9,-1,2.2,3.4,6.6);c.stroke();
   c.beginPath();c.moveTo(-2,6);c.lineTo(-6,12);c.lineTo(0,10);c.closePath();PP(c,'#4a8a5a',OL);
   c.restore();break}
  case 'e1':c.fillStyle='#ffb7d5';[[40,34],[118,60],[48,100]].forEach(([x,y])=>{});
   c.save();c.translate(110,30);c.rotate(.3);[[-1],[1]].forEach(([s])=>{c.beginPath();c.moveTo(0,0);c.bezierCurveTo(s*18,-14,s*22,12,0,3);c.closePath();PP(c,'#ffb7d5',OL)});c.beginPath();c.arc(0,1.4,4,0,7);PP(c,'#ff7aa8',OL);
   c.beginPath();c.moveTo(-2,3);c.lineTo(-8,17);c.lineTo(-2,13);c.closePath();PP(c,'#ff9fc5',OL);c.beginPath();c.moveTo(2,3);c.lineTo(8,17);c.lineTo(2,13);c.closePath();PP(c,'#ff9fc5',OL);c.restore();break;
 }}
function bunny(c,t){mirror(c,()=>{const s=Math.sin(t*2)*.04;c.save();c.translate(60,30);c.rotate(-.12+s);c.beginPath();c.ellipse(0,-22,9,24,0,0,7);PP(c,'#f1f1ff',OL);c.beginPath();c.ellipse(0,-20,4.4,17,0,0,7);PP(c,'#ffc2d9');c.restore()})}

// ── 날개 / 등 ──
function wings(c,kind,t){
 const fl=Math.sin(t*3)*.07;
 const one=()=>{c.save();c.translate(60,120);c.rotate(-.06+fl);c.translate(-60,-120);
  if(kind==='angel'){c.translate(60,118);c.scale(1.18,1.18);c.translate(-60,-118);const g=c.createLinearGradient(6,70,58,140);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#cfe6ff');
   c.beginPath();c.moveTo(60,118);c.bezierCurveTo(40,90,14,86,2,62);c.bezierCurveTo(0,96,12,122,30,130);c.bezierCurveTo(22,131,14,129,6,124);c.bezierCurveTo(14,146,38,154,58,142);c.closePath();PP(c,g,'rgba(90,110,160,.85)',1.6);
   c.strokeStyle='rgba(120,140,190,.7)';c.lineWidth=1.2;[[50,112,14,84],[48,122,10,106],[50,132,14,126]].forEach(([a,b,x,y])=>{c.beginPath();c.moveTo(a,b);c.quadraticCurveTo((a+x)/2,(b+y)/2-6,x,y);c.stroke()})}
  else if(kind==='bat'||kind==='dragon'){const dg=kind==='dragon',k=dg?1.16:1;c.translate(60,118);c.scale(k,k);c.translate(-60,-118);
   c.beginPath();c.moveTo(60,118);c.lineTo(24,66);c.quadraticCurveTo(22,96,10,104);c.quadraticCurveTo(26,108,22,128);c.quadraticCurveTo(38,118,38,136);c.quadraticCurveTo(50,126,60,136);c.closePath();PP(c,dg?'#2fae66':'#5b2a86',OL);
   c.strokeStyle=dg?'#f6c23e':'#9b59b6';c.lineWidth=2;[[24,66],[10,104],[22,128],[38,136]].forEach(([x,y])=>{c.beginPath();c.moveTo(60,118);c.lineTo(x,y);c.stroke()})}
  else if(kind==='butterfly'){const g=c.createLinearGradient(8,70,60,140);g.addColorStop(0,'#ff7ad9');g.addColorStop(1,'#6ec6ff');
   c.beginPath();c.moveTo(60,118);c.bezierCurveTo(40,60,6,60,8,92);c.bezierCurveTo(10,108,40,118,60,122);c.closePath();PP(c,g,OL);
   c.beginPath();c.moveTo(60,122);c.bezierCurveTo(30,124,14,138,26,152);c.bezierCurveTo(40,160,56,142,60,130);c.closePath();PP(c,g,OL);
   c.fillStyle='rgba(255,255,255,.7)';[[26,82,5],[20,96,3],[34,142,3.4]].forEach(([x,y,r])=>{c.beginPath();c.arc(x,y,r,0,7);c.fill()})}
  c.restore()};
 mirror(c,one)}
function backItem(c,id,t){
 if(id==='b1')wings(c,'bat',t);else if(id==='b5')wings(c,'dragon',t);else if(id==='b4')wings(c,'butterfly',t);
 else if(id==='b2'){const f=Math.sin(t*2.4)*2;c.beginPath();c.moveTo(56,112);c.lineTo(104,112);c.quadraticCurveTo(120,150,118+f,178);c.quadraticCurveTo(80,186+f,42-f,178);c.quadraticCurveTo(40,150,56,112);c.closePath();PP(c,'#c0392b',OL);
  c.fillStyle='rgba(0,0,0,.18)';c.beginPath();c.moveTo(66,114);c.lineTo(94,114);c.lineTo(104,176);c.lineTo(56,176);c.closePath();c.fill()}
 else if(id==='b3'){rr(c,48,118,64,46,11);PP(c,'#e67e22',OL);rr(c,60,146,40,15,6);PP(c,'#d35400',OL);c.beginPath();c.arc(80,125,3,0,7);PP(c,'#f6c23e')}
 else if(id==='b6'){c.save();c.translate(106,142);c.rotate(.5);rr(c,-3,-84,6,86,2);PP(c,'#7a4e2a',OL);rr(c,-5,-96,10,15,3);PP(c,'#4a2f22',OL);
  c.beginPath();c.ellipse(0,20,17,20,0,0,7);PP(c,'#e67e22',OL);c.beginPath();c.arc(0,20,6,0,7);PP(c,'#2a1a10');c.restore()}}

// ── 신발 ──
function shoe(c,id,x){const y=190;
 switch(id){
  case 'sh1':c.beginPath();c.ellipse(x,y,10.6,7,0,0,7);PP(c,'#e74c3c',OL);c.beginPath();c.ellipse(x,y+4.6,10.6,2.6,0,0,7);PP(c,'#fff',OL);c.fillStyle='#fff';c.fillRect(x-3,y-4,6,1.8);c.fillRect(x-3,y-.6,6,1.8);break;
  case 'sh2':rr(c,x-8,175,16,18,4);PP(c,'#8d5a2b',OL);c.beginPath();c.ellipse(x,y+1,10.8,6.4,0,0,7);PP(c,'#7a4a20',OL);rr(c,x-8,175,16,5,2);PP(c,'#c9a26b',OL);c.fillStyle='#f6c23e';c.fillRect(x-2,183,4,2.4);break;
  case 'sh3':{const g=c.createLinearGradient(x-10,y-7,x+10,y+7);g.addColorStop(0,'#fff3a0');g.addColorStop(.5,'#f0b429');g.addColorStop(1,'#c58a12');c.beginPath();c.ellipse(x,y,10.8,7,0,0,7);PP(c,g,'#8a6a10');c.fillStyle='#fff';star(c,x,y-1,3.2,.45);c.fill();break}
  case 'sh4':c.beginPath();c.ellipse(x,y,10.6,7,0,0,7);PP(c,'#fff',OL);c.beginPath();c.ellipse(x-4,y-8,2.8,7,-.2,0,7);PP(c,'#fff',OL);c.beginPath();c.ellipse(x+4,y-8,2.8,7,.2,0,7);PP(c,'#fff',OL);c.fillStyle='#ffb7d0';c.beginPath();c.ellipse(x-4,y-8,1.2,4.6,-.2,0,7);c.fill();c.beginPath();c.ellipse(x+4,y-8,1.2,4.6,.2,0,7);c.fill();c.fillStyle='#ff8fb8';c.beginPath();c.arc(x,y+1,2,0,7);c.fill();break;
  case 'sh5':rr(c,x-9,178,18,13,5);PP(c,'#fff',OL);rr(c,x-9,178,18,4,2);PP(c,'#ff8fb8',OL);c.fillStyle='#ff8fb8';[x-6,x+6].forEach(a=>{c.beginPath();c.arc(a,195,3,0,7);PP(c,'#ff8fb8',OL)});c.fillStyle='#ccc';c.fillRect(x-9,191,18,2);break;
  case 'sh6':rr(c,x-8.6,177,17.2,16,5);PP(c,'#fff',OL);c.beginPath();c.ellipse(x,y+3,10.8,4.4,0,0,7);PP(c,'#e8e8f0',OL);c.fillStyle='#e74c3c';c.fillRect(x-8.6,181,17.2,2.6);c.beginPath();c.arc(x,179.6,2,0,7);PP(c,'#e74c3c');break;
  default:c.beginPath();c.ellipse(x,y,10.6,7,0,0,7);PP(c,'#2b2b3a',OL);c.beginPath();c.ellipse(x,y+4.6,10.6,2.4,0,0,7);PP(c,'#6b6b80');}}

// ── 의상 ──
const OUT0={top:'#cfcfd8',sl:1,pants:'#555a78',pl:'long'};
const OUT={
 o1:{top:'#4a69bd',sl:2,pants:'#34495e',pl:'long'},o2:{top:'#38ada9',sl:2,pants:'#2d6a4f',pl:'long'},
 o3:{top:'#f0b429',sl:1,slc:'#8d96a8',pants:'#6b4f2a',pl:'long'},o4:{top:'#22305e',sl:2,pants:'#22305e',pl:'long'},
 o5:{top:'#1f2430',sl:2,pants:'#1f2430',pl:'long'},o6:{top:'#ff9fb5',sl:2,pants:'#3d6fd1',pl:'none',skirt:{c:'#3d6fd1',len:38,w:66}},
 o7:{top:'#8fc5ff',sl:2,pants:'#8fc5ff',pl:'long'},o8:{top:'#d63031',sl:2,pants:'#d63031',pl:'long'},
 o9:{top:'#6c3fc7',sl:2,slc:'#5a31ad',pants:'#5a31ad',pl:'none',skirt:{c:'#6c3fc7',len:34,w:62}},
 o10:{top:'#b8c2d0',sl:1,slc:'#9aa5b5',pants:'#7c8798',pl:'long'},o11:{top:'#ff8fb8',sl:0,pants:'#ff8fb8',pl:'none',skirt:{c:'#ff8fb8',len:26,w:66}},
 o12:{top:'#f4f6fb',sl:2,pants:'#f4f6fb',pl:'long'},o13:{top:'#262a3d',sl:2,pants:'#262a3d',pl:'long'},
 o14:{top:'#ffd54a',sl:1,pants:'#2f80ed',pl:'short'},
 o15:{top:'#2a2530',sl:1,slc:'#2a2530',pants:'#2a2530',pl:'none',skirt:{c:'#2a2530',len:30,w:72}}};
function legs(c,L,T,skin){
 for(const x of [63,82]){rr(c,x,146,15,46,6);PP(c,mixc(skin,'#8a4b2a',.08),OL);
  if(T.pl!=='none'){rr(c,x-.6,144,16.2,T.pl==='long'?42:22,6);PP(c,T.pants,OL);
   if(L.out==='o8'){c.fillStyle='#fff';c.fillRect(x+(x<70?0:13.4),150,2.2,34)}
   if(L.out==='o13'){c.fillStyle='#8a8fa8';c.fillRect(x-.6,178,16.2,3)}
   if(L.out==='o10'){c.fillStyle='rgba(255,255,255,.35)';c.fillRect(x+3,150,3,28)}}}
 if(T.skirt){const k=T.skirt;c.beginPath();c.moveTo(56,142);c.lineTo(104,142);c.lineTo(80+k.w/2,146+k.len);c.quadraticCurveTo(80,146+k.len+7,80-k.w/2,146+k.len);c.closePath();PP(c,k.c,OL);
  c.strokeStyle='rgba(255,255,255,.28)';c.lineWidth=1;for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(80+i*6,150);c.lineTo(80+i*k.w/7.2,146+k.len+(Math.abs(i)<3?3:0));c.stroke()}
  if(L.out==='o11'){c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(80-k.w/2+1,146+k.len-1);c.quadraticCurveTo(80,146+k.len+6,80+k.w/2-1,146+k.len-1);c.stroke()}
  if(L.out==='o15'){c.beginPath();c.moveTo(54,150);c.lineTo(106,150);c.lineTo(80+k.w/2+6,146+k.len+5);c.quadraticCurveTo(80,146+k.len+13,80-k.w/2-6,146+k.len+5);c.closePath();PP(c,'#7a1f3a',OL);
   c.beginPath();c.moveTo(56,142);c.lineTo(104,142);c.lineTo(80+k.w/2,146+k.len);c.quadraticCurveTo(80,146+k.len+7,80-k.w/2,146+k.len);c.closePath();PP(c,k.c,OL);
   c.strokeStyle='#f6f0f4';c.lineWidth=2.4;c.lineCap='round';c.beginPath();for(let i=0;i<=8;i++){const x=80-k.w/2+i*k.w/8;c.lineTo(x,146+k.len+(i%2?2.6:-.4))}c.stroke();
   c.strokeStyle='rgba(255,255,255,.16)';c.lineWidth=1;for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(80+i*6,150);c.lineTo(80+i*k.w/7.2,146+k.len);c.stroke()}}
  if(L.out==='o9'){c.fillStyle='#f6e58d';[[66,160],[92,166],[80,172]].forEach(([x,y])=>{star(c,x,y,3.4,.45);c.fill()})}}
 shoe(c,L.shoes,69);shoe(c,L.shoes,91)}
function outDetail(c,id,T,t){
 switch(id){
  case 'o1':c.beginPath();c.ellipse(80,111,23,8,0,0,Math.PI);PP(c,mixc(T.top,'#000000',.16),OL);c.strokeStyle='#fff';c.lineWidth=1.8;c.beginPath();c.moveTo(74,114);c.lineTo(73,128);c.moveTo(86,114);c.lineTo(87,128);c.stroke();rr(c,66,134,28,12,5);PP(c,mixc(T.top,'#000000',.14),OL);break;
  case 'o2':c.beginPath();c.moveTo(54,114);c.quadraticCurveTo(80,102,106,114);c.lineTo(112,136);for(let i=0;i<6;i++){c.lineTo(112-i*12-6,142);c.lineTo(112-(i+1)*12,136)}c.closePath();PP(c,'#2a8c88',OL);c.fillStyle='#8be3a0';[[66,122],[94,122],[80,128]].forEach(([x,y])=>{c.beginPath();c.ellipse(x,y,3.4,1.8,.6,0,7);c.fill()});rr(c,58,142,44,6,2);PP(c,'#7a4e2a',OL);c.beginPath();c.arc(80,145,3,0,7);PP(c,'#f6c23e');break;
  case 'o3':{const g=c.createLinearGradient(58,108,102,150);g.addColorStop(0,'#fff3a0');g.addColorStop(.5,'#f0b429');g.addColorStop(1,'#b8860b');rr(c,60,110,40,32,9);PP(c,g,'#8a6a10',1.4);c.strokeStyle='rgba(120,80,0,.5)';c.lineWidth=1;c.beginPath();c.moveTo(80,112);c.lineTo(80,140);c.moveTo(62,126);c.lineTo(98,126);c.stroke();
   [54,106].forEach(x=>{c.beginPath();c.arc(x,116,10,0,7);PP(c,g,'#8a6a10',1.3)});rr(c,58,142,44,7,2);PP(c,'#6b4f2a',OL);c.beginPath();c.arc(80,125,4.4,0,7);PP(c,'#e74c3c','#7a1010',1);break}
  case 'o4':c.beginPath();c.moveTo(70,108);c.lineTo(90,108);c.lineTo(80,128);c.closePath();PP(c,'#fff',OL);c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=1.6;c.beginPath();c.moveTo(80,130);c.lineTo(80,148);c.stroke();
   c.beginPath();c.moveTo(80,114);c.lineTo(72,111);c.lineTo(72,120);c.closePath();PP(c,'#d63031',OL);c.beginPath();c.moveTo(80,114);c.lineTo(88,111);c.lineTo(88,120);c.closePath();PP(c,'#d63031',OL);c.beginPath();c.arc(80,115,2.4,0,7);PP(c,'#b02020');
   c.beginPath();c.arc(68,127,4.2,0,7);PP(c,'#f6c23e','#8a6a10',.8);[136,142].forEach(y=>{c.beginPath();c.arc(84,y,1.6,0,7);PP(c,'#f6c23e')});break;
  case 'o5':c.beginPath();c.moveTo(70,108);c.lineTo(90,108);c.lineTo(80,130);c.closePath();PP(c,'#fff',OL);c.beginPath();c.moveTo(78,110);c.lineTo(82,110);c.lineTo(84,132);c.lineTo(80,138);c.lineTo(76,132);c.closePath();PP(c,'#c0392b',OL);
   c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=1.4;c.beginPath();c.moveTo(70,108);c.lineTo(76,132);c.lineTo(80,148);c.moveTo(90,108);c.lineTo(84,132);c.lineTo(80,148);c.stroke();c.fillStyle='#fff';c.fillRect(88,128,6,2);break;
  case 'o6':c.beginPath();c.moveTo(72,108);c.lineTo(88,108);c.lineTo(86,124);c.lineTo(80,128);c.lineTo(74,124);c.closePath();PP(c,'#fff',OL);c.strokeStyle='#e97a97';c.lineWidth=1.6;c.beginPath();c.moveTo(72,108);c.lineTo(92,132);c.stroke();c.beginPath();c.moveTo(88,108);c.lineTo(68,132);c.stroke();
   [[-1],[1]].forEach(([s])=>{c.beginPath();c.moveTo(80,124);c.quadraticCurveTo(80+s*14,114,80+s*13,128);c.quadraticCurveTo(80+s*5,126,80,124);c.closePath();PP(c,'#3d6fd1',OL)});c.beginPath();c.arc(80,125,2.4,0,7);PP(c,'#2c4fa0');
   c.beginPath();c.moveTo(78,126);c.lineTo(74,144);c.moveTo(82,126);c.lineTo(86,144);c.strokeStyle='#3d6fd1';c.lineWidth=2;c.stroke();break;
  case 'o7':c.fillStyle='#fff';[[66,118],[80,122],[94,118],[72,134],[88,134],[80,144]].forEach(([x,y])=>{star(c,x,y,3.4,.45);c.fill()});c.beginPath();c.moveTo(72,108);c.lineTo(80,118);c.lineTo(88,108);c.strokeStyle='#fff';c.lineWidth=1.8;c.stroke();break;
  case 'o8':c.strokeStyle='#fff';c.lineWidth=2.4;c.beginPath();c.moveTo(80,108);c.lineTo(80,150);c.moveTo(62,112);c.lineTo(62,148);c.moveTo(98,112);c.lineTo(98,148);c.stroke();c.beginPath();c.arc(80,112,2,0,7);PP(c,'#ddd');break;
  case 'o9':c.fillStyle='#f6e58d';[[68,122],[92,126],[78,138],[90,142]].forEach(([x,y])=>{star(c,x,y,3.6,.45);c.fill()});c.strokeStyle='#f6c23e';c.lineWidth=3;c.beginPath();c.moveTo(58,142);c.lineTo(102,142);c.stroke();c.beginPath();c.arc(80,142,3,0,7);PP(c,'#f6c23e');break;
  case 'o10':rr(c,60,110,40,34,8);PP(c,'#cfd6e2',OL);rr(c,71,109,18,40,3);PP(c,'#c0392b',OL);c.fillStyle='#fff';c.fillRect(77,118,6,22);c.fillRect(73,125,14,5);[54,106].forEach(x=>{c.beginPath();c.arc(x,116,10,0,7);PP(c,'#d6dce8',OL)});rr(c,58,143,44,6,2);PP(c,'#5b4636',OL);break;
  case 'o11':c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(66,110);c.quadraticCurveTo(80,122,94,110);c.stroke();rr(c,58,140,44,6,2);PP(c,'#c2185b',OL);c.beginPath();c.moveTo(80,143);c.lineTo(72,136);c.lineTo(72,150);c.closePath();PP(c,'#c2185b',OL);c.beginPath();c.moveTo(80,143);c.lineTo(88,136);c.lineTo(88,150);c.closePath();PP(c,'#c2185b',OL);break;
  case 'o12':rr(c,66,114,28,18,4);PP(c,'#4aa3ff',OL);c.fillStyle='#fff';[[72,120],[80,120],[88,120]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,2,0,7);c.fill()});c.fillStyle='#ff9f43';c.fillRect(58,140,44,6);c.beginPath();c.arc(104,128,4.2,0,7);PP(c,'#d63031','#fff',1.2);c.beginPath();c.arc(56,128,4.2,0,7);PP(c,'#4aa3ff','#fff',1.2);c.strokeStyle='#cfd6e2';c.lineWidth=2;c.beginPath();c.moveTo(72,108);c.quadraticCurveTo(80,114,88,108);c.stroke();break;
  case 'o13':c.fillStyle='#d63031';rr(c,58,138,44,9,3);c.fill();c.strokeStyle=OL;c.stroke();c.beginPath();c.moveTo(94,142);c.lineTo(108,152);c.lineTo(100,156);c.closePath();PP(c,'#d63031',OL);c.beginPath();c.moveTo(94,142);c.lineTo(104,158);c.lineTo(96,150);c.closePath();PP(c,'#b02020',OL);
   c.strokeStyle='#8a8fa8';c.lineWidth=3;c.beginPath();c.moveTo(66,112);c.lineTo(94,134);c.stroke();break;
  case 'o15':c.beginPath();c.ellipse(80,110,19,6.4,0,0,Math.PI);PP(c,'#f6f0f4',OL);c.strokeStyle='#d9ccd6';c.lineWidth=1.2;for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(80+i*5.6,111);c.lineTo(80+i*5.8,115.6);c.stroke()}
   c.strokeStyle='#7a2a3a';c.lineWidth=1.4;c.beginPath();c.moveTo(72,122);c.lineTo(80,130);c.lineTo(88,122);c.moveTo(72,130);c.lineTo(80,138);c.lineTo(88,130);c.stroke();
   [[-1],[1]].forEach(([s])=>{c.beginPath();c.moveTo(80,118);c.quadraticCurveTo(80+s*13,111,80+s*12,123);c.quadraticCurveTo(80+s*5,121,80,118);c.closePath();PP(c,'#c0304a',OL)});c.beginPath();c.arc(80,118.4,2.4,0,7);PP(c,'#8a1830',OL);
   rr(c,58,140,44,6,2);PP(c,'#5a1f33',OL);break;
  case 'o14':[[66,118,'#ff6b9d'],[88,116,'#e74c3c'],[74,132,'#2ecc71'],[92,134,'#ff6b9d'],[66,142,'#e74c3c']].forEach(([x,y,k])=>{c.fillStyle=k;c.beginPath();c.arc(x,y,3.2,0,7);c.fill();c.fillStyle='#fff3a0';c.beginPath();c.arc(x,y,1,0,7);c.fill()});c.beginPath();c.moveTo(72,108);c.lineTo(80,120);c.lineTo(88,108);c.strokeStyle='#e8b92e';c.lineWidth=2;c.stroke();break;
 }}

// ── 목/가슴 악세사리 ──
function neckAcc(c,id,t){
 if(id==='a2'){const sw=Math.sin(t*2)*1.2;c.beginPath();c.ellipse(80,111,24,8,0,0,7);PP(c,'#ff7aa8',OL);c.strokeStyle='rgba(255,255,255,.4)';c.lineWidth=1.4;[-12,-4,4,12].forEach(x=>{c.beginPath();c.moveTo(80+x,104);c.lineTo(80+x*1.1,118);c.stroke()});
  c.beginPath();c.moveTo(94,116);c.lineTo(104+sw,142);c.lineTo(94+sw,146);c.lineTo(86,120);c.closePath();PP(c,'#ff7aa8',OL);c.strokeStyle='#fff';c.lineWidth=1.4;c.beginPath();c.moveTo(97,130);c.lineTo(92+sw,134);c.stroke()}
 if(id==='a6'){[[-1],[1]].forEach(([s])=>{c.beginPath();c.moveTo(80,112);c.lineTo(80+s*13,105);c.lineTo(80+s*13,119);c.closePath();PP(c,'#c0392b',OL)});c.beginPath();c.arc(80,112,3.2,0,7);PP(c,'#8e2519',OL)}
 if(id==='a8'){c.strokeStyle='#f6c23e';c.lineWidth=2.2;c.beginPath();c.moveTo(70,109);c.quadraticCurveTo(80,128,90,109);c.stroke();c.beginPath();c.arc(80,123,3.8,0,7);PP(c,'#f6c23e','#8a6a10',1);c.fillStyle='#e74c3c';c.beginPath();c.arc(80,123,1.6,0,7);c.fill()}
 if(id==='a9'){c.save();c.translate(67,126);for(let p=0;p<5;p++){const a=p*Math.PI*2/5;c.beginPath();c.arc(Math.cos(a)*4.2,Math.sin(a)*4.2,3.4,0,7);PP(c,'#ff6b9d','rgba(0,0,0,.2)',.7)}c.beginPath();c.arc(0,0,2.6,0,7);PP(c,'#ffd54a');c.restore()}}

// ── 오라(효과) ──
function aura(c,id,t,layer){
 const N=(n,f)=>{for(let k=0;k<n;k++)f(k,(t*.3+k/n)%1)};
 if(layer===0){
  if(id==='au3'){const g=c.createRadialGradient(80,170,4,80,170,70);g.addColorStop(0,'rgba(255,170,60,.5)');g.addColorStop(1,'rgba(255,90,30,0)');c.fillStyle=g;c.fillRect(0,90,160,120)}
  if(id==='e3'){const g=c.createRadialGradient(80,100,10,80,100,86);g.addColorStop(0,'rgba(190,210,255,.5)');g.addColorStop(1,'rgba(150,170,255,0)');c.fillStyle=g;c.fillRect(0,0,160,220)}
  if(id==='au6'){c.lineWidth=4.4;c.lineCap='round';['#ff6b6b','#ffb347','#ffe66d','#6bdc8b','#5fb8ff','#a78bfa'].forEach((k,i)=>{c.strokeStyle=k;c.globalAlpha=.8;c.beginPath();c.ellipse(80,102,54,72,0,t*.6+i*1.047,t*.6+i*1.047+1.0);c.stroke()});c.globalAlpha=1}
  return}
 if(id==='au1')N(9,(k,ph)=>{const x=80+Math.cos(k*2.4)*(46+k%3*9),y=30+(k*41%130),a=Math.max(0,Math.sin((t*1.2+k*.37)*Math.PI));star(c,x,y,2.6+a*4.2,.4);c.fillStyle=`rgba(255,240,150,${a})`;c.fill()});
 if(id==='au2')N(12,(k,ph)=>{const x=12+(k*29%136)+Math.sin(ph*7+k)*9,y=-10+ph*200;c.save();c.translate(x,y);c.rotate(ph*6+k);c.beginPath();c.ellipse(0,0,4.4,2.4,0,0,7);c.fillStyle='rgba(255,170,200,.9)';c.fill();c.restore()});
 if(id==='au4')N(14,(k,ph)=>{const x=10+(k*37%140)+Math.sin(ph*5+k)*6,y=-8+ph*196;c.strokeStyle='rgba(210,235,255,.95)';c.lineWidth=1.3;c.save();c.translate(x,y);c.rotate(ph*3);for(let a=0;a<3;a++){c.rotate(Math.PI/3);c.beginPath();c.moveTo(-3.4,0);c.lineTo(3.4,0);c.stroke()}c.restore()});
 if(id==='au5')N(8,(k,ph)=>{const x=34+(k*31%92)+Math.sin(ph*6+k)*6,y=190-ph*170;heart(c,x,y,3.2+(k%3));c.fillStyle=`rgba(255,110,150,${Math.sin(ph*Math.PI)})`;c.fill()});
 if(id==='au3')N(13,(k,ph)=>{const x=80+((k%7)-3)*11+Math.sin(ph*8+k)*3,y=196-ph*84,r=(1-ph)*7+1;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,240,150,.95)');g.addColorStop(.5,'rgba(255,140,40,.7)');g.addColorStop(1,'rgba(220,40,20,0)');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,7);c.fill()});
 if(id==='e3'){c.beginPath();c.arc(32,34,11,0,7);c.fillStyle='#fff7d6';c.fill();c.beginPath();c.arc(36,31,10,0,7);c.fillStyle='rgba(150,170,255,.0)';c.globalCompositeOperation='destination-out';c.fill();c.globalCompositeOperation='source-over';
  N(6,(k,ph)=>{const x=14+k*26,y=20+(k*53%120),a=Math.max(0,Math.sin((t+k)*Math.PI*.8));star(c,x,y,2+a*2.4,.4);c.fillStyle=`rgba(230,235,255,${a})`;c.fill()})}}

// ── 메인 그리기 ──
let HEADM=null;
const headPath=c=>{c.beginPath();c.moveTo(38,65);c.bezierCurveTo(38,39,58,31,80,31);c.bezierCurveTo(102,31,122,39,122,65);c.bezierCurveTo(122,87,105,105,80,107);c.bezierCurveTo(55,105,38,87,38,65);c.closePath()};
function core(c,L,t,which){
 // which: all(벡터 전체) | a0/a1(오라) | below(몸·뒷머리·귀) | mask(머리 모양) | above(앞머리·모자·안경)
 const w0=which==='all'||which==='a0',w1=which==='all'||which==='a1';
 const wBody=which==='all'||which==='below',wMask=which==='mask',wAbove=which==='all'||which==='above';
 const bob=PXM?Math.round(Math.sin(t*2.2)*.8)*2:Math.sin(t*2.2)*1.4,blink=(t%4.3)>4.15;
 const skin=itm(L.skin).c,T=OUT[L.out]||OUT0,H=hairPal(c,itm(L.hairc));EYEC=itm(L.eyec).c;
 HOL=PXM?(typeof H.f==='string'?mixc(H.f,'#2a1630',.6):(H.s[0]==='#'?mixc(H.s,'#2a1630',.45):OL)):OL0;
 c.save();c.translate(0,18);
 if(w0){if(L.aura)aura(c,L.aura,t,0);c.fillStyle=PXM?'rgba(0,0,0,.3)':'rgba(0,0,0,.17)';c.beginPath();c.ellipse(80,197,34,5,0,0,7);c.fill()}
 if(wBody){
 c.save();BT(c);if(L.back)backItem(c,L.back,t);if(L.acc==='a3')wings(c,'angel',t);c.restore();
 // 참고 이미지에 맞춰 뒷머리는 머리 중심으로 확대
 c.save();HT(c,bob);c.translate(80,73);c.scale(.96,.96);c.translate(-80,-73);hairBack(c,L.hair,H);c.restore();
 // 몸은 살짝 작게 잡아 머리-몸 비율을 치비 스타일로 조정
 c.save();BT(c);c.translate(80,145);c.scale(1.0,1.0);c.translate(-80,-145);legs(c,L,T,skin);
 // 몸통 + 팔
 c.save();c.translate(0,PXM?0:bob*.5);
 rr(c,72,98,16,16,5);PP(c,mixc(skin,'#8a4b2a',.16),OL);
 const sw=PXM?0:Math.sin(t*1.7)*.05;
 for(const m of [0,1]){c.save();c.translate(m?105:55,114);c.rotate((m?-1:1)*(.06+sw));
  rr(c,-5.5,-3,11,34,5.5);PP(c,skin,OL);c.beginPath();c.arc(0,31.5,6,0,7);PP(c,skin,OL);
  if(T.sl){const len=T.sl===2?28:15;rr(c,-6.6,-4,13.2,len+2,5.5);PP(c,T.slc||T.top,OL);if(T.sl===2){c.fillStyle='rgba(0,0,0,.14)';c.fillRect(-6.6,len-4,13.2,4)}
   if(L.out==='o8'){c.fillStyle='#fff';c.fillRect(-1,-3,2.2,len+1)}}
  c.restore()}
 const g=c.createLinearGradient(58,0,102,0);g.addColorStop(0,'rgba(255,255,255,.14)');g.addColorStop(1,'rgba(0,0,0,.14)');
 rr(c,58,108,44,42,12);PP(c,T.top,OL);rr(c,58,108,44,42,12);c.fillStyle=g;c.fill();
 outDetail(c,L.out,T,t);
 if(L.back==='b3'){c.strokeStyle='#d35400';c.lineWidth=3.4;c.lineCap='round';c.beginPath();c.moveTo(66,110);c.lineTo(64,146);c.moveTo(94,110);c.lineTo(96,146);c.stroke()}
 if(L.back==='b6'){c.strokeStyle='#5b3a1e';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(94,110);c.lineTo(66,148);c.stroke()}
 if(L.back==='b2'){c.beginPath();c.arc(66,112,3,0,7);PP(c,'#f6c23e','#8a6a10',.8);c.beginPath();c.arc(94,112,3,0,7);PP(c,'#f6c23e','#8a6a10',.8);c.strokeStyle='#f6c23e';c.lineWidth=1.6;c.beginPath();c.moveTo(66,112);c.quadraticCurveTo(80,118,94,112);c.stroke()}
 neckAcc(c,L.acc,t);
 c.restore();
 c.restore();
 }
 if(wBody||wMask||wAbove){
 c.save();HT(c,bob);
 // 머리·얼굴·앞머리·귀·모자를 함께 조정해 약 3등신에 가까운 비율로 맞춤
 c.translate(80,73);c.scale(.96,.96);c.translate(-80,-73);
 if(wBody)mirror(c,()=>{c.beginPath();c.ellipse(42,75,5.2,7,0,0,7);PP(c,skin,OL);c.beginPath();c.ellipse(42.6,75.4,2.4,3.8,0,0,7);c.fillStyle='rgba(200,100,90,.28)';c.fill()});
 if(which==='all'){
  const hg=c.createLinearGradient(0,33,0,106);hg.addColorStop(0,skin);hg.addColorStop(1,mixc(skin,'#c98a62',.28));
  headPath(c);PP(c,hg,OL,1.4);face(c,L.face,blink,H);foreShadow(c,L.hair)}
 if(wMask){headPath(c);c.fillStyle='#fff';c.fill();HEADM=c.getTransform()}
 if(wAbove){faceAcc(c,L.acc);hairFront(c,L.hair,H);if(L.acc==='e2')bunny(c,t);if(L.hat)hat(c,L.hat,t)}
 c.restore();
 }
 if(w1&&L.aura)aura(c,L.aura,t,1);
 c.restore()}
function drawChar(cv,L,t,zoom){
 const c=cv.getContext('2d');t=t||0;cv.style.imageRendering='auto';
 c.setTransform(cv.width/160,0,0,cv.height/220,0,0);c.clearRect(0,0,160,220);
 if(zoom){c.translate(80,zoom.y);c.scale(zoom.z,zoom.z);c.translate(-80,-106)}
 core(c,L,t,'all')}

// ── 픽셀 아트 렌더러 (80×110 격자에 그린 뒤 정수배 확대) ──
const PXW=120,PXH=166,PXSTEP=14,PXLINE=[30,16,40];
const _pxb={};
function pxBuf(key){let o=_pxb[key];if(!o){const cv=document.createElement('canvas');cv.width=PXW;cv.height=PXH;const c=cv.getContext('2d',{willReadFrequently:true});
  const proto=Object.getPrototypeOf(c),d=Object.getOwnPropertyDescriptor(proto,'lineWidth');   // 선은 최소 1픽셀 두께
  if(d&&d.set)Object.defineProperty(c,'lineWidth',{get(){return d.get.call(this)},set(v){d.set.call(this,Math.max(v,1.6))},configurable:true});
  o=_pxb[key]={cv,c}}return o}
function pxAuraPass(d){for(let i=3;i<d.length;i+=4){const a=d[i];d[i]=a<40?0:a<110?80:a<190?150:255}}
function pxPoster(d,o){for(let k=0;k<3;k++)d[o+k]=Math.min(255,Math.round(d[o+k]/PXSTEP)*PXSTEP)}
function drawPixel(cv,L,t,zoom){
 t=t||0;const out=cv.getContext('2d');out.setTransform(1,0,0,1,0,0);out.imageSmoothingEnabled=false;out.clearRect(0,0,cv.width,cv.height);cv.style.imageRendering='pixelated';
 PXM=true;OL='rgba(40,24,44,.92)';
 const grab=which=>{const b=pxBuf(which),c=b.c;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,PXW,PXH);c.setTransform(PXW/160,0,0,PXH/220,0,0);
  if(zoom){c.translate(80,zoom.y);c.scale(zoom.z,zoom.z);c.translate(-80,-106)}
  core(c,L,t,which);c.setTransform(1,0,0,1,0,0);return c.getImageData(0,0,PXW,PXH)};
 const show=(which,id)=>{const b=pxBuf(which);b.c.putImageData(id,0,0);out.drawImage(b.cv,0,0,PXW,PXH,0,0,cv.width,cv.height)};
 try{
  const a0=grab('a0');pxAuraPass(a0.data);show('a0',a0);
  // 캐릭터: 몸(below) → 피부(mask, 직접 셰이딩) → 얼굴(직접 찍기) → 앞머리·모자(above) → 외곽선
  const below=grab('below').data,mask=grab('mask').data,M=HEADM,above=grab('above').data;
  const N=PXW*PXH,mA=new Uint8Array(N),aA=new Uint8Array(N),res=pxBuf('res'),id=res.c.createImageData(PXW,PXH),R=id.data;
  for(let i=0;i<N;i++){const o=i*4;mA[i]=mask[o+3]>=110?1:0;aA[i]=above[o+3]>=110?1:0;
   if(below[o+3]>=110){pxPoster(below,o);R[o]=below[o];R[o+1]=below[o+1];R[o+2]=below[o+2];R[o+3]=255}}
  pxSkin(R,mA,aA,itm(L.skin).c,M);
  pxFace(R,mA,L.face,(t%4.3)>4.15,itm(L.eyec).c,itm(L.skin).c,M);
  for(let i=0;i<N;i++){if(aA[i]){const o=i*4;pxPoster(above,o);R[o]=above[o];R[o+1]=above[o+1];R[o+2]=above[o+2];R[o+3]=255}}
  pxOutline(R);show('res',id);
  if(L.aura){const a1=grab('a1');pxAuraPass(a1.data);show('a1',a1)}
 }finally{PXM=false;OL=OL0}}
function render(cv,L,t,zoom){if(S&&S.vec)drawChar(cv,L,t,zoom);else drawPixel(cv,L,t,zoom)}
function togPx(){S.vec=!S.vec;save();side();if(tab==='shop')vShop()}

// ── 화면 연결 + PNG 파츠 시스템 ──
const ZOOM={hair:{z:1.3,y:104},hairc:{z:1.3,y:104},skin:{z:1.3,y:104},face:{z:1.9,y:112},eyec:{z:1.9,y:112},hat:{z:1.0,y:98},acc:{z:1.2,y:104}};
let lastA=0;
let layerPack=null,layerChoice={};
// Drawing order: base -> clothes -> hair -> eyes/expression -> accessories.
const LAYER_META={clothes:{label:'옷',order:10},hairFront:{label:'헤어',order:20},expression:{label:'눈·표정',order:30},accessory:{label:'액세서리',order:40}};
const PNG_SLOT_LABELS={expression:'눈·표정 PNG',hairFront:'헤어 PNG',clothes:'의상 PNG',accessory:'액세서리 PNG'};
function escHTML(s){return String(s??'').replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));}
function loadImagePath(path){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('이미지를 읽지 못했어요: character_parts/'+path));img.src=new URL('./character_parts/'+path,document.baseURI).href;});}
function allPngParts(){return layerPack?Object.values(layerPack.slots).flat():[];}
function findPngPart(key){return allPngParts().find(p=>p.path===key)||null;}
function pngOwned(p){return !!p&&(Number(p.price)===0||!!(S&&Array.isArray(S.pngOwn)&&S.pngOwn.includes(p.path)));}
function pngEquipped(p){return !!p&&layerChoice[p.slot]===p.path;}
function ensurePngState(){if(!S)return;if(!Array.isArray(S.pngOwn))S.pngOwn=[];if(!S.pngEq||typeof S.pngEq!=='object')S.pngEq={};}
function restorePngEquipment(){
 ensurePngState();layerChoice={};if(!layerPack)return;
 const requiredDefaults={expression:layerPack.slots.expression.find(p=>p.price===0)?.path,hairFront:layerPack.slots.hairFront.find(p=>p.price===0)?.path};
 for(const slot of Object.keys(LAYER_META)){
  const desired=S&&S.pngEq?S.pngEq[slot]:null;
  const saved=desired&&layerPack.slots[slot].find(p=>p.path===desired&&pngOwned(p));
  if(saved)layerChoice[slot]=saved.path;
  else if(requiredDefaults[slot])layerChoice[slot]=requiredDefaults[slot];
 }
 if(S)S.pngEq={...layerChoice};
}
async function loadLocalCharacterParts(){
 const status=document.getElementById('layerStatus');
 if(status)status.textContent='character_parts 폴더에서 PNG를 불러오는 중…';
 const manifest=window.CHARACTER_PARTS;
 if(!manifest){if(status)status.textContent='parts.js를 찾지 못했어요. HTML과 character_parts 폴더가 같은 위치에 있는지 확인해 주세요.';return;}
 const canvasW=Number(manifest.canvas&&manifest.canvas.width)||160;
 const canvasH=Number(manifest.canvas&&manifest.canvas.height)||220;
 try{
  const base=await loadImagePath(manifest.base||'base.png');
  const basePart={path:'base',fileName:manifest.base||'base.png',slot:'base',label:'기본 캐릭터',img:base,pos:manifest.basePosition||{x:0,y:0,w:canvasW,h:canvasH}};
  layerPack={width:canvasW,height:canvasH,base:basePart,slots:{},layout:manifest};
  const missing=[];const slotsCfg=manifest.slots||{};
  for(const slot of Object.keys(LAYER_META)){
   const listed=Array.isArray(slotsCfg[slot])?slotsCfg[slot]:[];layerPack.slots[slot]=[];
   for(const raw of listed){
    const item=typeof raw==='string'?{file:raw}:raw;if(!item||!item.file)continue;
    try{
     const img=await loadImagePath(item.file);const key=slot+'::'+item.file;
     layerPack.slots[slot].push({path:key,fileName:item.file,slot,label:item.label||item.file.split('/').pop().replace(/\.png$/i,''),img,
       price:Math.max(0,Number(item.price??100)||0),pos:{x:item.x??0,y:item.y??0,w:item.w??item.width,h:item.h??item.height,crop:Array.isArray(item.crop)?item.crop:null,hideHair:!!item.hideHair}});
    }catch(e){console.warn(e);missing.push(item.file);}
   }
   layerPack.slots[slot].sort((a,b)=>a.label.localeCompare(b.label,'ko'));
  }
  restorePngEquipment();renderLayerControls();if(tab==='shop'&&document.getElementById('v'))vShop();
  const count=Object.values(layerPack.slots).reduce((n,a)=>n+a.length,0);
  if(status){status.textContent=`PNG 자동 불러오기 완료: 기본 캐릭터 + 파츠 ${count}개 · ${canvasW}×${canvasH}`;if(missing.length)status.textContent+=` · 찾지 못한 파일 ${missing.length}개`;}
 }catch(e){console.error(e);layerPack=null;layerChoice={};renderLayerControls();if(status)status.textContent='기본 PNG를 불러오지 못했어요. character_parts/base.png 경로와 파일명을 확인해 주세요.';}
}
function renderLayerControls(){
 const root=document.getElementById('layerControls');if(!root)return;root.innerHTML='';if(!layerPack)return;ensurePngState();
 for(const slot of Object.keys(LAYER_META)){
  const items=(layerPack.slots[slot]||[]).filter(p=>pngOwned(p));if(!items.length)continue;
  const wrap=document.createElement('div'),label=document.createElement('label'),select=document.createElement('select');
  label.textContent=LAYER_META[slot].label;label.style.cssText='display:block;font-size:12px;font-weight:600;margin-bottom:2px';select.style.cssText='margin:0;padding:6px;font-size:12px';
  const required=(slot==='expression'||slot==='hairFront');
  if(!required){const none=document.createElement('option');none.value='';none.textContent='미착용';select.appendChild(none);}
  for(const p of items){const o=document.createElement('option');o.value=p.path;o.textContent=p.label;select.appendChild(o);}
  select.value=layerChoice[slot]||'';
  select.onchange=()=>{if(select.value)layerChoice[slot]=select.value;else delete layerChoice[slot];if(S){S.pngEq={...layerChoice};save();}if(tab==='shop')vShop();};
  wrap.append(label,select);root.appendChild(wrap);
 }
}
function drawLayerPart(c,part,pack){const p=part.pos||{},x=Number(p.x)||0,y=Number(p.y)||0,w=Number(p.w??p.width),h=Number(p.h??p.height);if(Array.isArray(p.crop)&&p.crop.length===4&&Number.isFinite(w)&&w>0&&Number.isFinite(h)&&h>0){const [sx,sy,sw,sh]=p.crop;c.drawImage(part.img,sx,sy,sw,sh,x,y,w,h);}else if(Number.isFinite(w)&&w>0&&Number.isFinite(h)&&h>0)c.drawImage(part.img,x,y,w,h);else if(part.img.naturalWidth===pack.width&&part.img.naturalHeight===pack.height)c.drawImage(part.img,0,0,pack.width,pack.height);else c.drawImage(part.img,x,y,part.img.naturalWidth,part.img.naturalHeight);}
function drawLayeredAvatarToCanvas(cv,overrides={}){
 const pack=layerPack;if(!pack)return;const c=cv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cv.width,cv.height);c.imageSmoothingEnabled=false;
 const scale=Math.min(cv.width/pack.width,cv.height/pack.height),dw=pack.width*scale,dh=pack.height*scale,ox=(cv.width-dw)/2,oy=(cv.height-dh)/2;c.translate(ox,oy);c.scale(scale,scale);
 // Shrink the whole assembled character uniformly (not just the base), so all PNG layers stay aligned.
 const avatarScale=0.84;c.translate(pack.width*(1-avatarScale)/2,pack.height*(1-avatarScale)/2);c.scale(avatarScale,avatarScale);
 drawLayerPart(c,pack.base,pack);const choices={...layerChoice,...overrides};
 const order=Object.keys(LAYER_META).sort((a,b)=>LAYER_META[a].order-LAYER_META[b].order);
 for(const slot of order){const path=choices[slot],p=(pack.slots[slot]||[]).find(x=>x.path===path);if(!p)continue;
  // The base character is already bald. Selecting the bald option means no hair overlay at all.
  if(slot==='hairFront' && (p.pos?.hideHair || /대머리/.test(p.label)))continue;
  drawLayerPart(c,p,pack);
 }
 cv.style.imageRendering='pixelated';
}
function drawLayeredAvatar(cv){drawLayeredAvatarToCanvas(cv);}
function anim(ts){const cv=document.getElementById('ch');
 if(cv&&!document.hidden&&ts-lastA>66){lastA=ts;try{if(layerPack)drawLayeredAvatar(cv);else if(S&&S.gender)render(cv,lookOf(),ts/1000)}catch(e){console.error(e)}}
 requestAnimationFrame(anim)}
loadLocalCharacterParts();requestAnimationFrame(anim);
function side(){if(!S)return;if(S.gold>GOLD_MAX)S.gold=GOLD_MAX;
 const pct=S.lv>=100?100:Math.round(S.exp/need(S.lv)*100);
 const set=(id,fn)=>{const e=document.getElementById(id);if(e)fn(e)};
 set('abName',e=>e.textContent=S.name);
 set('abLv',e=>e.textContent='Lv.'+S.lv+(S.lv>=100?' MAX':''));
 set('abGold',e=>e.textContent=S.gold.toLocaleString());
 set('xp',e=>e.style.width=pct+'%');
 set('xpt',e=>e.textContent=S.lv>=100?'만렙 달성!':`EXP ${S.exp} / ${need(S.lv)}`);
 document.body.classList.toggle('preview',Object.keys(pv).length>0)}
// ===== 토스트 / 아이콘 =====
let toastT=null;
function toast(msg){const t=document.getElementById('toast');if(!t)return;t.innerHTML=String(msg).split('\n').map(escHTML).join('<br>');t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),3200)}
const IC={
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
 play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
 cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14"/><rect x="3" y="6" width="12" height="12" rx="2.5"/></svg>',
 send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
 chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 0 1-11.6 7.14L4 20l.9-4.2A8 8 0 1 1 20 12z"/></svg>',
 tree:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-6M7 16h10l-3-4h2l-4-6-4 6h2z"/></svg>',
};
// ===== 픽셀 얼굴 / 피부 (벡터를 줄이지 않고, 격자 위에 1픽셀 단위로 직접 찍어요) =====
const hx=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mixr=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
const K1=[43,20,38];                                     // 눈·속눈썹 색 (자주빛 검정)
function spx(R,m,x,y,c,force){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=PXW||y>=PXH)return;const i=y*PXW+x;if(!force&&m&&!m[i])return;const o=i*4;R[o]=c[0];R[o+1]=c[1];R[o+2]=c[2];R[o+3]=255}
function blob(R,m,cx,cy,rx,ry,c){for(let y=Math.floor(cy-ry-1);y<=Math.ceil(cy+ry+1);y++)for(let x=Math.floor(cx-rx-1);x<=Math.ceil(cx+rx+1);x++){const a=(x+.5-cx)/rx,b=(y+.5-cy)/ry;if(a*a+b*b<=1)spx(R,m,x,y,c)}}

// ── 하트 눈 ──
function pxHeart(R,m,cx,cy,r,main,dk){
 const inH=(x,y)=>{const a=(x+.5-cx)/(r*1.05),b=-(y+.5-cy)/(r*1.05)+.1,q=a*a+b*b-1;return q*q*q-a*a*b*b*b<=0};
 for(let y=Math.floor(cy-r*1.3);y<=Math.ceil(cy+r*1.3);y++)for(let x=Math.floor(cx-r*1.3);x<=Math.ceil(cx+r*1.3);x++){
  if(!inH(x,y))continue;const edge=!inH(x-1,y)||!inH(x+1,y)||!inH(x,y-1)||!inH(x,y+1);
  spx(R,m,x,y,edge?dk:(y>cy+r*.2?[255,120,160]:main))}
 spx(R,m,cx-r*.45,cy-r*.3,[255,255,255]);spx(R,m,cx-r*.45+1,cy-r*.3,[255,225,235]);spx(R,m,cx-r*.45,cy-r*.3+1,[255,225,235])}

// ── 눈 ──
function pxEye(R,m,cx,cy,rx,ry,o){
 const side=o.side,ec=o.eyec,sk=o.skin,mode=o.mode||'open';
 const dark=mixr(ec,[0,0,0],.72),dk2=mixr(ec,[0,0,0],.46),lt1=mixr(ec,[255,255,255],.22),lt2=mixr(ec,[255,255,255],.48),rim=mixr(ec,[0,0,0],.5);
 const white=[253,244,247],whiteS=[224,208,228],hi=[255,255,255],hi2=[255,224,240],crease=mixr(sk,[205,95,130],.38),lowl=mixr(sk,[105,48,78],.6),pupil=[22,8,26];
 if(mode==='happy'||mode==='closed'){
  const th=Math.max(2,Math.round(rx*.25));
  for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){const nx=(x+.5-cx)/rx,k=1-nx*nx;
   const yy=mode==='happy'?cy+ry*.3-k*ry*.62:cy-ry*.22+k*ry*.38;
   for(let j=0;j<th;j++)spx(R,m,x,yy+j-(th>>1),K1,1);
   if(mode==='closed'&&(x&1))spx(R,m,x,yy+th-(th>>1),crease)}
  for(let k=1;k<=2;k++)spx(R,m,cx+side*(rx+k*.8),cy-ry*(mode==='happy'?.25:.1)-k*.7,K1,1);
  return}
 if(mode==='heart'){pxHeart(R,m,cx,cy,rx*.78,[255,92,138],[170,30,80]);return}
 const sleepy=mode==='sleepy',round=mode==='round';
 for(let y=Math.floor(cy-ry-3);y<=Math.ceil(cy+ry+3);y++)for(let x=Math.floor(cx-rx-3);x<=Math.ceil(cx+rx+3);x++){
  const nx=(x+.5-cx)/rx,ny=(y+.5-cy)/ry,ax=Math.abs(nx);
  // 눈 전체는 가로로 넓고 낮게. 윗선은 둥근 아치, 아랫선은 중앙이 비교적 평평한 곡선.
  const halfH=Math.pow(Math.max(0,1-Math.pow(ax,round?2.1:1.72)),round?.5:.66);
  const top=round?-halfH:-Math.pow(Math.max(0,1-Math.pow(ax,1.85)),.52);
  const bottom=round?halfH:.73*Math.pow(Math.max(0,1-Math.pow(ax,2.35)),.5);
  if(ax>1||ny<top||ny>bottom)continue;
  // 윗속눈썹은 약 2~3픽셀로 강조하고, 아랫선은 한 줄로 깔끔하게 유지
  const edgeTop=ny < top+(round?.23:.38),edgeBottom=ny > bottom-.16;
  if(edgeTop&&!sleepy){spx(R,m,x,y,K1);continue}
  if(edgeBottom&&ny>0.35){spx(R,m,x,y,lowl);continue}
  if(sleepy&&ny<-.12){spx(R,m,x,y,mixr(sk,[190,110,125],.22));continue}
  if(sleepy&&ny<.02){spx(R,m,x,y,K1);continue}
  if(round){const q=nx*nx+ny*ny;if(q>.7)spx(R,m,x,y,K1);else if(q<.08)spx(R,m,x,y,pupil);else if(q<.32)spx(R,m,x,y,dk2);else spx(R,m,x,y,white);continue}
  // 홍채는 눈보다 작고 약간 아래에 놓아 흰자와 눈매가 함께 보이게 함
  const ix=nx/.58,iy=(ny-.08)/.68,ie=ix*ix+iy*iy;
  let col=white;
  if(ie<=1){
   const v=(iy+1)/2+(((x+y)&1)?.035:-.035);
   col=v<.12?dark:v<.34?dk2:v<.60?ec:v<.82?lt1:lt2;
   if(ie>.82)col=rim;
   const px_=(x+.5-cx)/(rx*.23),py_=(y+.5-(cy+ry*.14))/(ry*.34);
   if(px_*px_+py_*py_<=1)col=pupil;
  }else if(ny<-.48)col=whiteS;
  spx(R,m,x,y,col);
 }
 // 흰자 바깥 윤곽을 1픽셀로 끊김 없이 감싸고, 윗부분은 기존 속눈썹 밴드가 더 굵게 남도록 함
 const inside=(xx,yy)=>{
  const ax=(xx+.5-cx)/rx,ay=(yy+.5-cy)/ry,a=Math.abs(ax);
  if(a>1)return false;
  const hh=Math.pow(Math.max(0,1-Math.pow(a,round?2.1:1.72)),round?.5:.66);
  const top=round?-hh:-Math.pow(Math.max(0,1-Math.pow(a,1.85)),.52);
  const bottom=round?hh:.73*Math.pow(Math.max(0,1-Math.pow(a,2.35)),.5);
  return ay>=top&&ay<=bottom;
 };
 for(let y=Math.floor(cy-ry-1);y<=Math.ceil(cy+ry+1);y++)for(let x=Math.floor(cx-rx-1);x<=Math.ceil(cx+rx+1);x++){
  if(!inside(x,y))continue;
  if(!inside(x-1,y)||!inside(x+1,y)||!inside(x,y-1)||!inside(x,y+1))spx(R,m,x,y,K1);
 }
 // 작은 비대칭 하이라이트: 동그란 눈알처럼 보이지 않게 크기와 위치를 절제
 spx(R,m,cx-rx*.22,cy-ry*.16,hi);spx(R,m,cx-rx*.22+1,cy-ry*.16,hi2);
 spx(R,m,cx+rx*.24,cy+ry*.28,hi2);
 // 눈꼬리와 윗속눈썹이 외곽선에 연결되도록 마무리
 for(let k=1;k<=2;k++)spx(R,m,cx+side*(rx+k*.8),cy-ry*.48-k*.55,K1,1);
 spx(R,m,cx+side*(rx+.3),cy-ry*.28,K1,1)
}

// ── 입 ──
function pxMouth(R,m,cx,cy,w,kind){
 const mc=[178,80,94],md=[132,48,70],tg=[235,112,128],wh=[255,246,246];
 if(kind==='smile'){for(let dx=-w;dx<=w;dx++){const k=1-(dx*dx)/(w*w);spx(R,m,cx+dx,cy+Math.round(k*1.3),mc)}spx(R,m,cx-w-1,cy-0,md);spx(R,m,cx+w+1,cy-0,md)}
 else if(kind==='open'){for(let y=0;y<=w;y++)for(let dx=-w;dx<=w;dx++){const a=dx/w,b=y/(w*.9);if(a*a+b*b<=1)spx(R,m,cx+dx,cy+y,y===0?wh:(y>=w-0&&dx*dx<w*w*.5?tg:md))}
  for(let dx=-w;dx<=w;dx++)spx(R,m,cx+dx,cy-1,mc)}
 else if(kind==='o'){const r=Math.max(1,Math.round(w*.55));for(let y=-r;y<=r;y++)for(let dx=-r;dx<=r;dx++){const d=dx*dx/(r*r)+y*y/(r*r*1.3);if(d<=1)spx(R,m,cx+dx,cy+y+1,d>.55?mc:md)}}
 else if(kind==='cat'){for(const sgn of [-1,1]){for(let k=0;k<=2;k++)spx(R,m,cx+sgn*(1+k),cy+(k===1?1:(k===2?0:0))+(k===0?0:0),mc);spx(R,m,cx+sgn*3,cy-1,mc)}spx(R,m,cx,cy-1,mc);spx(R,m,cx,cy-2,md)}
 else if(kind==='smirk'){for(let dx=-w;dx<=w;dx++)spx(R,m,cx+dx,cy+(dx>w*.4?-1:0)+(dx<-w*.3?1:0),mc);spx(R,m,cx+w+1,cy-2,md)}}

// ── 얼굴 전체 ──
function pxFace(R,m,id,blink,eyec,skin,M){
 const s=M.a,P=(lx,ly)=>[M.a*lx+M.e,M.d*ly+M.f],ec=hx(eyec),sk=hx(skin);
 const base={eyec:ec,skin:sk};
 let rx=8.45*s,ry=5.9*s,ex=15.7,ey=84.8;
 const eye=(side,o)=>{const[X,Y]=P(80+side*ex,ey+((o&&o.dy)||0));pxEye(R,m,X,Y,rx*((o&&o.k)||1),ry*((o&&o.ky)||1),Object.assign({side},base,o||{}))};
 const[mx,my]=P(80,100.5),[nx_,ny_]=P(80,96),w=Math.max(2,Math.round(3.2*s));
 const mode=blink?'closed':'open';
 // 볼터치 (점 찍기 느낌의 디더링)
 const bl=mixr(sk,[255,105,135],.5),bl2=mixr(sk,[255,125,150],.28);
 for(const sd of [-1,1]){const[bx,by]=P(80+sd*30,98);for(let y=Math.floor(by-5*s);y<=Math.ceil(by+5*s);y++)for(let x=Math.floor(bx-9*s);x<=Math.ceil(bx+9*s);x++){const a=(x+.5-bx)/(8*s),b=(y+.5-by)/(3.8*s),d=a*a+b*b;if(d<=1){if(d<.42)spx(R,m,x,y,bl);else if((x+y)&1)spx(R,m,x,y,bl2)}}}
 // 눈썹은 눈을 감싸는 윗눈꺼풀보다 살짝 위에, 눈보다 또렷하게 배치
 const brow=(side,dy,tilt)=>{
  // 실제 눈썹은 윗속눈썹과 붙지 않게 위쪽에 따로 배치하고 2픽셀 정도 두께를 줌
  const[X,Y]=P(80+side*ex,ey-ry/s-6.2+dy),bc=mixr(sk,[45,25,38],.82),len=Math.round(4.1*s);
  for(let k=-len;k<=len;k++){
   const curve=Math.round((k*k)/(len*len)*1.35*s)+Math.round(k*tilt*side*(-1)/Math.max(1,len));
   const thick=Math.abs(k)<len-1?2:1;
   spx(R,m,X+k,Y+curve,bc);if(thick===2)spx(R,m,X+k,Y+curve+1,mixr(bc,[28,16,30],.24));
  }
 };
 // 코 (아주 작은 점)
 /* no nose dot */
 switch(id){
  case 'f2':eye(-1,{mode:'happy'});eye(1,{mode:'happy'});pxMouth(R,m,mx,my,w,'open');break;
  case 'f3':eye(-1,{mode:mode});eye(1,{mode:'happy'});pxMouth(R,m,mx,my,w,'smile');break;
  case 'f4':eye(-1,{mode,k:1.1,ky:1.08,spark:1});eye(1,{mode,k:1.1,ky:1.08,spark:1});pxMouth(R,m,mx,my,w,'smile');break;
  case 'f5':eye(-1,{mode:'sleepy'});eye(1,{mode:'sleepy'});pxMouth(R,m,mx,my,w,'o');break;
  case 'f6':eye(-1,{mode});eye(1,{mode});pxMouth(R,m,mx,my,w,'cat');
   for(const sd of [-1,1]){const[wx,wy]=P(80+sd*34,97);for(let k=0;k<4;k++){spx(R,m,wx+sd*k,wy-1+k*0,[150,100,110]);spx(R,m,wx+sd*k,wy+3,[150,100,110]);spx(R,m,wx+sd*k,wy+1+(k>>1)*0,[150,100,110])}}break;
  case 'f7':eye(-1,{mode});eye(1,{mode});pxMouth(R,m,mx,my,w,'smile');
   for(const sd of [-1,1]){const[fx,fy]=P(80+sd*30,92);[[0,0],[2,1],[-2,1],[1,3],[-1,3]].forEach(([a,b])=>spx(R,m,fx+a,fy+b,[196,122,92]))}break;
  case 'f8':eye(-1,{mode,ky:.68,dy:1.5});eye(1,{mode,ky:.68,dy:1.5});pxMouth(R,m,mx,my,w,'smirk');break;
  case 'f9':eye(-1,{mode:blink?'closed':'heart'});eye(1,{mode:blink?'closed':'heart'});pxMouth(R,m,mx,my,w,'smile');break;
  case 'f10':eye(-1,{mode:'round',k:.9,ky:.95});eye(1,{mode:'round',k:.9,ky:.95});pxMouth(R,m,mx,my,w,'o');break;
  default:eye(-1,{mode});eye(1,{mode});pxMouth(R,m,mx,my,w,'smile')}
 brow(-1,0,0);brow(1,0,0)}

// ── 피부 셰이딩 (턱·옆면·앞머리 아래 그림자 + 1픽셀 외곽선) ──
function pxSkin(R,mA,aA,skin,M){
 const sk=hx(skin),S1=mixr(sk,[205,128,125],.3),S2=mixr(sk,[172,88,100],.52),EO=mixr(sk,[58,26,42],.62);
 const s=M.a,cx=M.a*80+M.e,cy=M.d*70+M.f,hw=42*s,hh=39*s;
 for(let y=0;y<PXH;y++)for(let x=0;x<PXW;x++){const i=y*PXW+x;if(!mA[i])continue;
  const edge=!(x>0&&mA[i-1])||!(x<PXW-1&&mA[i+1])||!(y>0&&mA[i-PXW])||!(y<PXH-1&&mA[i+PXW]);
  const u=(x+.5-cx)/hw,v=(y+.5-cy)/hh,chk=((x+y)&1)===0;
  let c=sk;
  if(v>.82||(v>.74&&chk))c=S1;
  if(v>.95)c=S2;
  if(Math.abs(u)>.9&&v>-.3)c=S1;
  if(v>-.2&&v<.62&&Math.abs(u)>.78&&chk)c=S1;
  if((y>0&&aA[i-PXW])||(x>0&&aA[i-1])||(x<PXW-1&&aA[i+1]))c=S1;                 // 머리카락 바로 옆
  if(y>0&&aA[i-PXW]&&((y>1&&aA[i-2*PXW])||chk))c=S2;                              // 앞머리 아래 그림자
  else if(y>1&&aA[i-2*PXW])c=S1;
  if(edge)c=EO;
  const o=i*4;R[o]=c[0];R[o+1]=c[1];R[o+2]=c[2];R[o+3]=255}}

// ── 윤곽선 (면 색을 따라가는 1픽셀 외곽선) ──
function pxOutline(R){
 const n=PXW*PXH,a=new Uint8Array(n);for(let i=0;i<n;i++)a[i]=R[i*4+3]?1:0;
 const edge=[];
 for(let y=0;y<PXH;y++)for(let x=0;x<PXW;x++){const i=y*PXW+x;if(a[i])continue;
  const j=(x>0&&a[i-1])?i-1:(x<PXW-1&&a[i+1])?i+1:(y>0&&a[i-PXW])?i-PXW:(y<PXH-1&&a[i+PXW])?i+PXW:-1;
  if(j>=0)edge.push([i,j])}
 for(const [i,j] of edge){const o=i*4,q=j*4;for(let k=0;k<3;k++)R[o+k]=Math.round(R[q+k]*.36+PXLINE[k]*.64);R[o+3]=255}}
// ===== 렌더 =====
const TABS=['mission','map','avatar','shop','rank'];
function R(notes){side();const m=document.getElementById('main');
 document.body.classList.remove('onboarding');
 document.querySelectorAll('.tabbar button').forEach(b=>{const on=b.dataset.tab===tab;b.classList.toggle('on',on);b.setAttribute('aria-current',on?'page':'false')});
 m.innerHTML=`<div id="v" class="view"></div>`;
 ({mission:vMission,map:vMap,avatar:vAvatar,shop:vShop,rank:vRank})[tab]();
 if(notes&&notes.length)toast(notes.join('\n'))}
function go(t){if(!TABS.includes(t))return;if(document.getElementById('wo')){woClose();}if(t===tab){window.scrollTo({top:0,behavior:'smooth'});return}stopCam();pv={};tab=t;R();window.scrollTo(0,0)}
function ring(p){const r=26,c=2*Math.PI*r;return `<svg class="ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" class="ring-bg"/><circle cx="32" cy="32" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-p)}"/></svg>`}
function greet(){const h=new Date().getHours();return h<6?'고요한 새벽이에요':h<12?'좋은 아침이에요':h<18?'좋은 오후예요':'편안한 저녁이에요'}
function vMission(){const d=D(),v=document.getElementById('v'),walk=isWalkDay(),EX=EXl();
 const exDone=d.ex.every((s,i)=>s>=EX[i][1]),workDone=exDone,walkOk=!walk||d.walk>=600,chatOk=d.chat>=1;
 const step=!d.start?1:(!workDone?2:(!chatOk?3:4));
 const total=EX.length+1+(walk?1:0),got=EX.filter((e,i)=>d.ex[i]>=e[1]).length+(chatOk?1:0)+(walk&&walkOk?1:0),pr=d.done?1:got/total;
 const STEPS=['준비','운동','상담','완료'];
 const exRow=(e,i)=>{const ok=d.ex[i]>=e[1],cur=d.start&&!ok&&EX.findIndex((x,k)=>d.ex[k]<x[1])===i;
  return `<li class="task ${ok?'done':''} ${cur?'cur':''}"><span class="tk">${ok?IC.check:i+1}</span><div class="tx"><b>${e[0]}</b><small>${e[3]}</small></div><span class="ct">${ok?'완료':`${Math.floor(d.ex[i])}<i>/${e[1]}</i>`}</span></li>`};
 v.innerHTML=`
 <section class="hero">
  <div class="hero-tx">
   <p class="eyebrow">${greet()}, ${escHTML(S.name)}님</p>
   <h1>오늘은 <em>${d.part}</em> 운동<br>함께 해봐요 ${PT[d.part].e}</h1>
   <p class="sub">${PT[d.part].d}</p>
  </div>
  <div class="hero-av"><canvas id="ch" width="320" height="440"></canvas></div>
 </section>
 ${!workDone&&!d.done?`<section class="wo-cta">
  <div class="wo-cta-vis"><span class="pulse"></span>${IC.cam}</div>
  <div class="wo-cta-tx"><p class="eyebrow light">동작 인식 운동 · ${EX.filter((e,i)=>d.ex[i]>=e[1]).length}/${EX.length} 완료</p>
   <b>카메라 앞에서 움직이면<br>자동으로 횟수를 세요</b>
   <p>${voiceCoach?'음성으로 동작을 하나씩 안내해 드려요':'안내문을 읽고 천천히 따라 해요'}</p></div>
  <button class="btn white block lg" onclick="openWorkout()">${IC.play} ${d.start?'운동 이어하기':'운동 시작하기'}</button>
 </section>`:''}
 <section class="card prog">
  <div class="prog-ring">${ring(pr)}<b>${Math.round(pr*100)}<small>%</small></b></div>
  <div class="prog-tx"><b>${d.done?'오늘 미션 완료!':step===1?'준비가 되면 시작해요':`Step ${step} · ${STEPS[step-1]}`}</b>
   <ol class="stepper">${STEPS.map((s,i)=>`<li class="${step>i+1||d.done?'past':step===i+1?'on':''}">${s}</li>`).join('')}</ol></div>
 </section>
 <section class="card">
  <div class="card-h"><h2>오늘의 미션</h2><span class="pill">${got}/${total}</span></div>
  <ul class="tasks">
   ${EX.map(exRow).join('')}
   ${walk?`<li class="task ${walkOk?'done':''}"><span class="tk">${walkOk?IC.check:IC.tree}</span><div class="tx"><b>7일 산책 이벤트 <span class="tag">EVENT</span></b><small>보물 지도 탭에서 10분 이상 밖에 나가기</small></div><span class="ct">${walkOk?'완료':Math.floor(d.walk/60)+'<i>/10분</i>'}</span></li>`:''}
   <li class="task ${chatOk?'done':''}"><span class="tk">${chatOk?IC.check:IC.chat}</span><div class="tx"><b>마음 상담 1번</b><small>운동 후 오늘의 기분을 나눠요</small></div><span class="ct">${chatOk?'완료':'0<i>/1</i>'}</span></li>
  </ul>
  <p class="note">불편하면 바로 멈추고, 편안한 범위에서만 움직여요.</p>
  ${d.start&&!d.done?`<button class="btn ghost block sm" onclick="giveUp()">오늘은 쉬어갈래요 (Lv −1)</button>`:''}
 </section>
 ${d.start&&workDone&&!d.done?`<section class="card" id="counsel">
  <div class="card-h"><h2>마음 상담</h2><span class="pill ${chatOk?'':'accent'}">${chatOk?'미션 달성 ✔':'Step 3'}</span></div>
  <p class="notice">AI가 감정을 정리하고 다음 질문을 함께 찾아요. 메시지는 답변 생성을 위해 Anthropic Claude API로 전송되니 이름·연락처 같은 민감한 정보는 적지 마세요. 전문 상담이나 진료를 대신하지 않아요.</p>
  <div id="chat" class="chat"></div>
  <div class="composer"><input id="ci" placeholder="오늘 기분이나 생각을 편하게 적어보세요" enterkeyhint="send" onkeydown="if(event.key==='Enter'&&!event.isComposing)send()"><button id="sendBtn" class="btn primary icon" onclick="send()" aria-label="보내기">${IC.send}</button></div>
 </section>`:''}
 ${d.start&&workDone&&chatOk&&walkOk&&!d.done?`<button class="btn primary block lg glow" onclick="finish()">🎉 미션 완료하고 보상 받기</button>`:''}
 ${d.done?`<section class="card done-card"><div class="done-ic">${IC.check}</div><b>오늘 미션 완료!</b><p class="mu">내일 또 만나요. 보물 지도에서 산책하면 경험치를 더 얻어요.</p></section>`:''}`;
 if(d.start&&workDone&&!d.done)chatInit()}
function vAvatar(){const v=document.getElementById('v');
 v.innerHTML=`<header class="page-h"><h1>내 캐릭터</h1><p class="mu">구매한 파츠를 골라 입혀 보세요</p></header>
 <section class="card avatar-card">
  <div class="stage"><canvas id="ch" width="400" height="552"></canvas></div>
  <div class="stat-row">
   <div><small>레벨</small><b>${S.lv}</b></div><div><small>골드</small><b>${S.gold.toLocaleString()}</b></div><div><small>보유 파츠</small><b>${(S.pngOwn||[]).length}</b></div>
  </div>
 </section>
 <section class="card">
  <div class="card-h"><h2>착용 파츠</h2><button class="btn soft sm" onclick="go('shop')">상점 가기</button></div>
  <div id="layerControls" class="layer-controls"></div>
  <p id="layerStatus" class="mu small">character_parts 폴더에서 파츠를 불러오는 중…</p>
  <button class="btn ghost block sm" type="button" onclick="loadLocalCharacterParts()">↻ 파츠 다시 불러오기</button>
 </section>`;
 renderLayerControls();
 const st=document.getElementById('layerStatus');if(st&&layerPack){const n=Object.values(layerPack.slots).reduce((a,b)=>a+b.length,0);st.textContent=`레이어 순서: 기본 몸 → 옷 → 헤어 → 표정 → 액세서리 · 전체 파츠 ${n}개`}}
function startM(){D().start=1;save();R()}
function openWorkout(){audioUnlock();const d=D();if(!d.start){d.start=1;save()}woMount();}
function giveUp(){if(!confirm('포기하면 레벨이 1 내려가요. 괜찮을까요?'))return;D().done=1;D().gave=1;loseLv(1);save();stopCam();R(['괜찮아요. 내일 다시 해봐요. 오늘 여기까지 온 것도 대단해요.'])}
function finish(){const d=D();d.done=1;S.gold+=100;addXp(60);save();R(['미션 완료! +100G, +60EXP'])}
// ===== 카메라 운동 인식 (관절 실시간 표시) =====
let PL=null,HL=null,VM=null,VL=null,handInfo=null,raf=null,lastT=0,X={i:-2,s:-1,t:0,n:0,l:-9},SM=null,voiceLast='',voiceAt=0;let voiceCoach=true;try{voiceCoach=localStorage.getItem('rehab_voice')!=='0'}catch(e){}
const setMsg=t=>{const s=document.getElementById('cs');if(s)s.textContent=t};
// 준비 운동: 손가락 인식(손목 돌리기). 본 운동을 시작하기 전에만 나와요.
const WARM=[{n:'손목 돌리기',t:5,h:'손바닥을 카메라 쪽으로 활짝 펴고, 손등이 보이게 뒤집었다가 다시 손바닥이 보이게 돌려요. 한 손만 해도 되고 두 손을 같이 해도 돼요.'}];
const warmLeft=d=>!d.done&&d.ex.every(x=>!x)&&WARM.some((w,i)=>((d.warm||[])[i]||0)<w.t);
const cur=()=>{const d=D(),w=d.warm||[];
 if(warmLeft(d)){const i=WARM.findIndex((x,k)=>(w[k]||0)<x.t),W=WARM[i];return{i,warm:1,key:'w'+i,p:{id:'warm'+i,h:W.h,hand:i===0},n:W.n,t:W.t,h:W.h,c:w[i]||0}}
 const i=d.ex.findIndex((s,k)=>s<d.tg[k]);if(i<0)return null;const p=POOL.find(q=>q.id===d.ids[i]);return{i,key:'e'+i,p,n:p.n,t:d.tg[i],h:p.h,c:d.ex[i]}};
function skipWarm(){const d=D();d.warm=WARM.map(w=>w.t);save();toast('준비 운동을 건너뛰었어요');showRc();const e=cur();if(e&&voiceCoach)speakNow(e.n+'. '+e.h)}
// ===== 소리·진동·카운트다운 =====
let AC=null;
function audioUnlock(){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume()}catch(e){}}
function beep(f,d){if(!AC)return;try{const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.35,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(AC.destination);o.start(t);o.stop(t+d+.03)}catch(e){}}
const vib=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
const KN=['영','하나','둘','셋','넷','다섯','여섯','일곱','여덟','아홉','열','열하나','열둘','열셋','열넷','열다섯','열여섯','열일곱','열여덟','열아홉','스물'];
function speakNow(text){if(!voiceCoach||!text||!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=1;voiceLast=text;voiceAt=Date.now();speechSynthesis.speak(u)}
function repFx(c,last){beep(last?880:740,last?.22:.1);vib(last?[80,60,160]:60);
 const b=document.getElementById('woNum');if(b){b.classList.remove('bump');void b.offsetWidth;b.classList.add('bump')}
 if(!last)speakNow(KN[c]||String(c))}
// 자세 확인 → 3·2·1 카운트다운 → 횟수 세기
let G={key:'',ph:'pos',ok:0,cd:0,last:-1};
function cdShow(t){const c=document.getElementById('woCd');if(c)c.innerHTML=t===''?'':`<b class="${typeof t==='number'?'':'go'}">${t}</b>`}
function frameState(s){const w=document.getElementById('vw');if(!w)return;w.classList.toggle('pos-ok',s==='ok');w.classList.toggle('pos-bad',s==='bad')}
function gateReset(e){G={key:e?e.key:'',ph:'pos',ok:0,cd:0,last:-1};X={k:G.key,s:-1,t:0,n:0,l:-9,phaseAt:0};cdShow('');frameState('')}
function gateMiss(){if(G.ph==='go')return;if(G.ph==='cd'){G.ph='pos';cdShow('');beep(330,.15)}G.ok=0;frameState('bad')}
function gatePass(n){if(G.ph==='go')return true;
 if(document.getElementById('woGuide')?.classList.contains('show')){G.ok=0;if(G.ph==='cd'){G.ph='pos';cdShow('')}return false}
 frameState('ok');
 if(G.ph==='pos'){
  if(voiceCoach&&'speechSynthesis'in window&&speechSynthesis.speaking){G.ok=0;setMsg('안내를 듣고 자리를 잡아 주세요.');return false}
  if(!G.ok)G.ok=n;if(n-G.ok<800){setMsg('좋아요! 그대로 잠깐 멈춰 주세요.');return false}
  G.ph='cd';G.cd=n;G.last=-1}
 const k=3-Math.floor((n-G.cd)/1000);
 if(k>0){if(k!==G.last){G.last=k;cdShow(k);beep(660,.12);vib(40);speakNow(KN[k])}setMsg('자세 확인 완료! 곧 시작해요');return false}
 G.ph='go';cdShow('시작!');beep(990,.3);vib(150);speakNow('시작!');setTimeout(()=>{if(G.ph==='go')cdShow('')},800);frameState('');return true}
function demoTick(){const e=cur();if(!e)return;tick(1);setMsg('데모 모드 · '+e.n+' +1회');}
function toggleCoach(){audioUnlock();voiceCoach=!voiceCoach;try{localStorage.setItem('rehab_voice',voiceCoach?'1':'0')}catch(e){}
 if(!voiceCoach&&('speechSynthesis'in window))speechSynthesis.cancel();coachBtn();
 if(voiceCoach)sayCoach('음성 안내를 켰어요. 자세를 차근차근 안내할게요.');else{toast('음성 안내를 껐어요. 안내문을 읽고 따라 해 주세요.');openGuide()}}
function sayCoach(text){if(!voiceCoach||!text||!('speechSynthesis'in window))return;const now=Date.now();if(text===voiceLast&&now-voiceAt<4500)return;if(now-voiceAt<1300)return;voiceLast=text;voiceAt=now;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=.92;u.pitch=1.02;speechSynthesis.speak(u)}
function showRc(){const e=cur(),d=D(),EX=EXl(),set=(id,t)=>{const x=document.getElementById(id);if(x)x.textContent=t};
 if(!e)return;
 set('woName',e.n);set('woNum',Math.floor(e.c));set('woTgt','/'+e.t+'회');
 set('hint',e.h);set('woNeed',e.p.hand?'손이 화면에 보여야 해요 (한 손도 OK)':e.p.arm?'옆모습·팔이 보여야 해요':e.p.low?'무릎·발까지 전신이 보여야 해요':e.p.hip?'허리까지 보여야 해요':'상체만 보여도 돼요');
 const sk=document.getElementById('woSkip');if(sk)sk.hidden=!e.warm;const wl=warmLeft(d);
 const seg=document.getElementById('woSeg');if(seg)seg.innerHTML=WARM.map((x,i)=>`<i class="${!wl?'done':e.warm&&i===e.i?'on':''}"><b style="width:${Math.min(100,((d.warm||[])[i]||0)/x.t*100)}%"></b></i>`).join('')+EX.map((x,i)=>`<i class="${d.ex[i]>=x[1]?'done':!e.warm&&i===e.i?'on':''}"><b style="width:${Math.min(100,d.ex[i]/x[1]*100)}%"></b></i>`).join('');
 const g=document.getElementById('woGuide');if(g&&g.classList.contains('show'))fillGuide()}
function woMount(){if(document.getElementById('wo'))return;const e=cur();if(!e){R();return}
 const w=document.createElement('section');w.id='wo';w.className='wo';w.setAttribute('role','dialog');w.setAttribute('aria-label','동작 인식 운동');
 w.innerHTML=`<div class="vw" id="vw"><video id="vid" playsinline muted autoplay></video><canvas id="ov" class="ov"></canvas><div class="wo-cd" id="woCd" aria-live="assertive"></div>
  <div class="vw-empty" id="woEmpty">${IC.cam}<span>카메라를 준비하고 있어요</span></div></div>
 <canvas id="tmp" width="64" height="48" class="hide"></canvas>
 <header class="wo-top">
  <button class="wo-ic" onclick="woClose()" aria-label="운동 닫기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
  <div class="wo-seg" id="woSeg"></div>
  <button class="wo-ic" id="voiceToggle" onclick="toggleCoach()" aria-label="음성 안내 켜기/끄기"></button>
 </header>
 <div class="wo-bot">
  <div id="bd" class="bd"></div>
  <div class="wo-panel">
   <div class="wo-row"><div class="wo-tx"><small id="woNeed"></small><h2 id="woName"></h2></div><div class="wo-cnt"><b id="woNum">0</b><span id="woTgt"></span></div></div>
   <p class="wo-hint" id="hint"></p>
   <p class="wo-msg" id="cs">카메라를 켜는 중…</p>
   <div class="wo-act"><button class="btn glass" onclick="openGuide()">📖 안내문 보기</button><button class="btn glass sm" onclick="demoTick()" title="인식이 안 될 때 직접 1회 추가">＋1회</button><button class="btn glass sm" id="woSkip" onclick="skipWarm()" hidden>건너뛰기</button></div>
  </div>
 </div>
 <div class="sheet-bg" id="woGuideBg" onclick="closeGuide()"></div>
 <div class="sheet" id="woGuide" role="dialog" aria-label="동작 안내문"></div>`;
 document.body.appendChild(w);document.body.classList.add('wo-open');
 const vid=document.getElementById('vid');vid.addEventListener('playing',()=>{const x=document.getElementById('woEmpty');if(x)x.remove()});
 coachBtn();showRc();
 if(voiceCoach)cam();else openGuide(true)}
function woClose(done){stopCam();if('speechSynthesis'in window)speechSynthesis.cancel();const w=document.getElementById('wo');if(w)w.remove();document.body.classList.remove('wo-open');R(done?['🎉 오늘 운동을 모두 마쳤어요! 이제 마음 상담을 해볼까요?']:null)}
function coachBtn(){const b=document.getElementById('voiceToggle');if(!b)return;b.classList.toggle('off',!voiceCoach);
 b.innerHTML=voiceCoach?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>'}
function fillGuide(first){const g=document.getElementById('woGuide'),e=cur();if(!g||!e)return;const EX=EXl();
 g.innerHTML=`<div class="grab"></div>
 <p class="eyebrow">${e.warm?'준비 운동 · 손가락 인식':`${e.i+1}번째 동작 · 전체 ${EX.length}개`}</p>
 <h2>${escHTML(e.n)} <span class="pill accent">${e.t}회</span></h2>
 <ol class="guide-steps">
  <li><b>자리 잡기</b><span>${e.warm?'휴대폰을 세워 두고 손이 잘 보이게 한 걸음 떨어져요. ':'휴대폰을 세워 두고 2~3걸음 뒤로 가요. '}${document.getElementById('woNeed')?.textContent||''}</span></li>
  <li><b>동작</b><span>${escHTML(e.h)}</span></li>
  <li><b>시작</b><span>${e.warm?'손이':'몸이'} 화면에 다 들어오면 테두리가 초록색으로 바뀌고 3, 2, 1 카운트다운 뒤에 시작해요.</span></li>
  <li><b>횟수</b><span>동작을 한 번 할 때마다 "띵" 소리·진동과 함께 숫자가 올라가요. ${e.t}회를 채우면 다음 동작으로 넘어가요.</span></li>
 </ol>
 <p class="guide-safe">통증이나 어지럼증이 느껴지면 바로 멈추고 쉬어요.</p>
 <div class="btn-row two"><button class="btn soft" onclick="speakGuide()">🔊 한 번 듣기</button><button class="btn primary" onclick="closeGuide(true)">${stream?'계속하기':'시작하기'}</button></div>`}
function openGuide(first){fillGuide(first);document.getElementById('woGuide')?.classList.add('show');document.getElementById('woGuideBg')?.classList.add('show')}
function closeGuide(go){audioUnlock();document.getElementById('woGuide')?.classList.remove('show');document.getElementById('woGuideBg')?.classList.remove('show');if(go&&!stream)cam()}
function speakGuide(){const e=cur();if(!e||!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(`${e.n}. ${e.h}. ${e.t}회 해볼게요.`);u.lang='ko-KR';u.rate=.92;speechSynthesis.speak(u)}
async function cam(){const v=document.getElementById('vid');setMsg('카메라를 켜는 중…');
 try{stream=await navigator.mediaDevices.getUserMedia({video:innerHeight>innerWidth?{facingMode:'user',width:{ideal:480},height:{ideal:640}}:{facingMode:'user',width:{ideal:640},height:{ideal:480}}});v.srcObject=stream;await v.play()}
 catch(e){return setMsg(!navigator.mediaDevices?'이 화면에서는 카메라를 쓸 수 없어요. 파일을 크롬/사파리에서 직접 열거나 https 주소로 열어주세요.':e.name==='NotAllowedError'?'카메라 권한이 막혀 있어요. 주소창 왼쪽 자물쇠 → 카메라 허용 후 새로고침해 주세요.':e.name==='NotFoundError'?'카메라를 찾지 못했어요.':e.name==='NotReadableError'?'다른 앱이 카메라를 쓰고 있어요. 닫고 다시 눌러주세요.':'카메라를 켜지 못했어요 ('+e.name+'). 아래 직접 체크 버튼을 써주세요.')}
 showRc();setMsg('몸 인식 모델을 불러오는 중… (처음엔 몇 초 걸려요)');
 try{if(!VM){const B='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';VM=await import(B+'/vision_bundle.mjs');VL=await VM.FilesetResolver.forVisionTasks(B+'/wasm')}if(!PL){const B='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14',M=VM,F=VL;const mk=d=>M.PoseLandmarker.createFromOptions(F,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',delegate:d},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.55,minPosePresenceConfidence:.55,minTrackingConfidence:.55});try{PL=await mk('GPU')}catch(e){PL=await mk('CPU')}}
  if(!HL&&cur()?.p.hand){setMsg('손가락 인식 모델을 불러오는 중…');try{const mkH=d=>VM.HandLandmarker.createFromOptions(VL,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:d},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.5});try{HL=await mkH('GPU')}catch(e){HL=await mkH('CPU')}}catch(e){HL=null}}
  SM=null;const first=cur();gateReset(first);setMsg(first&&first.p.hand?'손 인식이 준비됐어요. 손바닥을 카메라 쪽으로 펴 보여 주세요.':'몸 인식이 준비됐어요. 2~3걸음 뒤로 가서 전신이 화면에 보이게 서 주세요.');if(first)sayCoach(first.p.h||first.h);loop()}
 catch(e){PL=null;stopCam();setMsg('인식 모델을 불러오지 못했어요. 인터넷 연결을 확인하고 카메라를 다시 켜 주세요.')}}
const BONE=[[11,13,'#4aa3ff'],[13,15,'#4aa3ff'],[12,14,'#4aa3ff'],[14,16,'#4aa3ff'],[23,25,'#ffb347'],[25,27,'#ffb347'],[24,26,'#ffb347'],[26,28,'#ffb347'],[11,12,'#4cc38a'],[11,23,'#4cc38a'],[12,24,'#4cc38a'],[23,24,'#4cc38a']];
const PART=[['머리',[0]],['왼팔',[11,13,15]],['오른팔',[12,14,16]],['몸통',[11,12,23,24]],['왼다리',[23,25,27]],['오른다리',[24,26,28]]];
const ok=(L,i)=>!!L[i]&&Number.isFinite(L[i].x)&&Number.isFinite(L[i].y)&&(L[i].visibility??1)>.5;
function drawPoseOverlay(v,L){const c=document.getElementById('ov');if(!c)return;if(c.width!==v.videoWidth){c.width=v.videoWidth;c.height=v.videoHeight}
 const g=c.getContext('2d'),W=c.width,H=c.height;g.clearRect(0,0,W,H);if(!L)return;g.lineWidth=5;g.lineCap='round';
 BONE.forEach(([a,b,col])=>{if(!ok(L,a)||!ok(L,b))return;g.strokeStyle=col;g.beginPath();g.moveTo(L[a].x*W,L[a].y*H);g.lineTo(L[b].x*W,L[b].y*H);g.stroke()});
 [0,11,12,13,14,15,16,23,24,25,26,27,28].forEach(i=>{const o=ok(L,i);g.globalAlpha=o?1:.25;g.fillStyle=i===0?'#ff7aa8':'#fff';g.strokeStyle='#222';g.lineWidth=2;g.beginPath();g.arc(L[i].x*W,L[i].y*H,i===0?9:(i===15||i===16||i===27||i===28?8:6),0,7);g.fill();g.stroke()});g.globalAlpha=1;
 const b=document.getElementById('bd');if(b)b.innerHTML=PART.map(([n,ix])=>`<span class="${ix.every(i=>ok(L,i))?'on':''}">${ix.every(i=>ok(L,i))?'✔':'✖'} ${n}</span>`).join('')}
const HAND_BONES=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
function openFingerCount(L){if(!L||L.length<21)return 0;const pts=L;const dist=(a,b)=>Math.hypot(pts[a].x-pts[b].x,pts[a].y-pts[b].y,((pts[a].z||0)-(pts[b].z||0))*.8);const extended=[[8,6],[12,10],[16,14],[20,18]].filter(([tip,pip])=>dist(0,tip)>dist(0,pip)*1.12).length;return extended+(dist(4,5)>dist(3,5)*1.05?1:0)}
function drawHandOverlay(v,Hs){const c=document.getElementById('ov');if(!c||!Hs||!Hs.length)return;const g=c.getContext('2d'),W=c.width,Hh=c.height,col=['#ffdf57','#5fd6ff'],b=document.getElementById('bd');
 Hs.forEach((H,j)=>{const L=H.points;g.lineWidth=3;g.strokeStyle=col[j%2];g.fillStyle=col[j%2];HAND_BONES.forEach(([p,q])=>{g.beginPath();g.moveTo(L[p].x*W,L[p].y*Hh);g.lineTo(L[q].x*W,L[q].y*Hh);g.stroke()});L.forEach((p,i)=>{g.beginPath();g.arc(p.x*W,p.y*Hh,i===0?5:3,0,Math.PI*2);g.fill()});
  if(b)b.innerHTML+=`<span class="on">✋ ${Hs.length>1?(j===0?'왼쪽':'오른쪽')+' 손':'손'} · 손가락 ${H.fingers}/5</span>`})}
function chooseHand(r,asp){if(!r||!r.landmarks||!r.landmarks.length)return [];const hs=[],hd=r.handedness||r.handednesses||[];
 for(let i=0;i<r.landmarks.length;i++){const points=r.landmarks[i],world=r.worldLandmarks&&r.worldLandmarks[i];if(!points||points.length<21)continue;
  hs.push({points,world,fingers:world&&world.length>=21?openFingerCount(world):openFingerCount(points),x:points[0].x,label:hd[i]?.[0]?.categoryName||('h'+i),side:palmSide(points,asp||1)})}
 return hs.sort((a,b)=>b.x-a.x).slice(0,2)}
// 손바닥/손등 방향: 손목→검지 뿌리, 손목→새끼 뿌리 벡터의 회전 방향(2D). 손을 뒤집으면 부호가 바뀌어요.
function palmSide(L,asp){const ax=(L[5].x-L[0].x)*asp,ay=L[5].y-L[0].y,bx=(L[17].x-L[0].x)*asp,by=L[17].y-L[0].y,sz=Math.hypot(ax,ay)*Math.hypot(bx,by);if(sz<1e-6)return 0;const v=(ax*by-ay*bx)/sz;return v>.2?1:v<-.2?-1:0}
// 손목 돌리기 1회 = 한쪽 손이라도 (처음 면 → 뒤집기 → 원래 면). 3프레임 이상 유지돼야 방향 전환으로 인정해요.
function wristHandPose(Hs,X,n){if(!Hs||!Hs.length){if(n-(X.lastHand||0)>1500)X.hp={};return -1}
 X.lastHand=n;X.hp=X.hp||{};let fired=false;X.half=false;
 Hs.forEach(h=>{const st=X.hp[h.label]=X.hp[h.label]||{cur:0,cand:0,cnt:0,flips:0,at:0};if(!h.side)return;
  if(h.side===st.cand)st.cnt++;else{st.cand=h.side;st.cnt=1}
  if(st.cnt>=3&&st.cur!==st.cand){if(st.cur){st.flips++;st.at=n}st.cur=st.cand;if(st.flips>=2){st.flips=0;fired=true}}
  if(st.flips===1&&n-st.at>5000)st.flips=0;// 반만 돌리고 5초가 지나면 다시 시작
  if(st.flips===1)X.half=true});
 if(fired&&n-(X.handFire||0)>700){X.handFire=n;X.handPulseUntil=n+450;Object.values(X.hp).forEach(t=>t.flips=0);X.half=false}
 return n<(X.handPulseUntil||0)?1:0}
function coachCue(e,m,L){if(!e||e.warm)return '';if(!m)return '몸 전체가 화면에 보이도록 카메라에서 조금 물러나 주세요.';if(e.p.low&&!m.low)return '발끝까지 화면에 들어오도록 조금 뒤로 가 주세요.';if(e.p.hip&&!m.hip)return '골반과 허리가 보이도록 조금 뒤로 가 주세요.';if(e.p.arm&&m.pa<95)return '팔꿈치가 너무 많이 접혔어요. 편안한 범위에서 천천히 움직여요.';if(e.p.id==='half'||e.p.id==='sq'||e.p.id==='sumo'){if(Math.abs(L[25].x-L[27].x)>.18||Math.abs(L[26].x-L[28].x)>.18)return '무릎이 발끝 방향을 향하도록 맞춰 주세요.';return '허리를 편안하게 세우고, 무릎이 발끝을 향하게 앉아 주세요.'}if(e.p.id==='knee'||e.p.id==='ke')return '상체를 세우고 좌우를 번갈아 천천히 움직여요.';if(e.p.id==='hinge')return '등을 둥글게 말지 말고, 엉덩이를 뒤로 보내며 숙여요.';if(e.p.id==='curl'){if(Math.abs(L[13].x-L[11].x)>.16||Math.abs(L[14].x-L[12].x)>.16)return '팔꿈치를 옆구리 가까이에 두고 팔을 접어 주세요.';return '팔꿈치를 몸 가까이에 두고 천천히 접었다 펴요.'}if(e.p.id==='wpu'||e.p.id==='kpu'||e.p.id==='pu')return '몸통을 곧게 유지하고, 무리하지 않는 범위에서 팔을 굽혀요.';if(e.p.id==='neck')return '어깨 힘을 빼고 목만 좌우로 천천히 기울여요.';if(e.p.id==='bend')return '골반은 정면을 향하게 두고 상체만 부드럽게 기울여요.';if(e.p.id==='twist')return '허리를 과하게 꺾지 말고 배에 힘을 준 채 작게 회전해요.';return '좋아요. 호흡을 멈추지 말고 편안한 범위에서 계속해요.'}
function loop(){const v=document.getElementById('vid');if(!v||!stream||!PL)return;raf=requestAnimationFrame(loop);
 const n=performance.now();if(n-lastT<50||v.readyState<2)return;lastT=n;
 const e=cur(),w=document.getElementById('vw');if(!e)return;if(G.key!==e.key)gateReset(e);
 if(e.p.hand){// 준비 운동: 손가락 인식
  drawPoseOverlay(v,null);const b=document.getElementById('bd');if(b)b.innerHTML='';
  if(!HL){gateMiss();return setMsg('손가락 인식 모델을 쓸 수 없어요. 「건너뛰기」를 눌러 본 운동으로 넘어가 주세요.')}
  handInfo=chooseHand(HL.detectForVideo(v,n),v.videoWidth/Math.max(1,v.videoHeight));drawHandOverlay(v,handInfo);
  if(!handInfo.some(h=>h.fingers>=3)){gateMiss();if(G.ph!=='go'){sayCoach('손바닥을 카메라 쪽으로 활짝 펴 보여 주세요.');return setMsg('✋ 손바닥을 카메라 쪽으로 펴 보여 주세요.')}}
  if(!gatePass(n))return;
  const p=wristHandPose(handInfo,X,n);if(p<0){X.s=-1;const msg='손이 화면에서 사라졌어요. 손을 카메라 앞으로 다시 보여 주세요.';setMsg(msg);sayCoach(msg);return}
  if(X.s<0)X.s=0;// 손목 돌리기는 '돌림 감지' 순간만 1로 바뀌어요
  countPhase(e,p,n,w);if(X.half&&p!==1)setMsg('좋아요! 이제 반대로 돌려서 처음 면이 보이게 해요 ↺');return}
 const R0=PL.detectForVideo(v,n).landmarks[0];handInfo=null;
 if(!R0){SM=null;X.s=-1;X.n=0;X.l=-9;gateMiss();drawPoseOverlay(v,null);const b=document.getElementById('bd');if(b)b.innerHTML='';sayCoach('몸이 카메라에 잘 보이지 않아요. 조금 뒤로 가서 몸이 화면 안에 들어오도록 해주세요.');return setMsg('몸이 보이지 않아요. 뒤로 물러나 전신이 보이게 서 주세요.')}
 SM=SM?R0.map((p,k)=>({x:SM[k].x*.35+p.x*.65,y:SM[k].y*.35+p.y*.65,visibility:p.visibility??1})):R0.map(p=>({...p}));
 drawPoseOverlay(v,SM);let m;
 if(e.p.arm){const r=[[11,13,15],[12,14,16]].filter(t=>t.every(i=>ok(SM,i)));if(!r.length){gateMiss();return setMsg('팔(어깨·팔꿈치·손목)이 보여야 해요. 카메라를 옆에 두고 옆모습이 나오게 해주세요.')}m={pa:Math.min(...r.map(t=>ang(SM,...t)))}}
 else{m=met(SM,e.p);if(!m){gateMiss();const t=e.p.up?'머리·어깨·팔':'머리와 어깨';sayCoach(t+'가 화면에 보이도록 카메라 위치를 조정해 주세요.');return setMsg(t+' 관절이 보여야 인식해요. ✖ 표시된 부위를 화면 안으로 옮겨 주세요.')}}
 if(e.p.hip&&!m.hip){X.s=-1;X.n=0;gateMiss();sayCoach('골반까지 화면에 들어오도록 조금 뒤로 가 주세요.');return setMsg('골반 관절이 보여야 인식해요. 조금 뒤로 가 주세요.')}
 if(e.p.low&&!m.low){X.s=-1;X.n=0;gateMiss();sayCoach('무릎과 발목이 화면에 들어오도록 조금 뒤로 이동해 주세요.');return setMsg('무릎·발목 관절이 보여야 인식해요. 전신이 화면에 들어오도록 해 주세요.')}
 if(!gatePass(n))return;
 const cue=coachCue(e,m,SM);if(cue){const h=document.getElementById('hint');if(h)h.textContent=e.h+' · 코칭: '+cue;if(X.n===0||X.l!==1)sayCoach(cue)}
 countPhase(e,e.p.f(m,X),n,w)}
function countPhase(e,p,n,w){if(p===2){if(n-X.t>450){X.t=n;X.s=1;if(w)w.classList.add('hit');tick(1)}return}// 2 = 좌우 번갈아 동작: 방향이 바뀔 때마다 바로 1회
 if(p===X.l)X.n++;else{X.l=p;X.n=1;X.phaseAt=n}
 if(w)w.classList.toggle('hit',p===1&&X.n>=2);
 if(X.n>=2&&n-X.phaseAt>=80){if(p===0)X.s=0;else if(p===1&&X.s===0&&n-X.t>450){X.s=1;X.t=n;tick(1);return}}
 setMsg(`${e.n} · ${p===1?'💪 동작 인식!':p===0?'준비 자세 ✔':'움직이는 중…'}`)}
function warmPose(e,L,X,n){const k=e.i;const center=(a,b)=>({x:(L[a].x+L[b].x)/2,y:(L[a].y+L[b].y)/2});const fire=()=>{X.warmUntil=n+450;return 1};
 if(k===0)return -1;if(k===1){const need=[23,25,27];if(!need.every(i=>ok(L,i)))return -1;const ang=Math.atan2(L[27].y-L[25].y,L[27].x-L[25].x);if(X.lastAngle!==undefined){let d=ang-X.lastAngle;while(d>Math.PI)d-=2*Math.PI;while(d< -Math.PI)d+=2*Math.PI;if(!X.turnDir||Math.sign(d)===X.turnDir){X.turnDir=Math.sign(d)||X.turnDir;X.turnSum=(X.turnSum||0)+d}else{X.turnSum=d;X.turnDir=Math.sign(d)}if(Math.abs(X.turnSum)>=Math.PI*1.65){X.turnSum=0;X.turnDir=0;fire()}}X.lastAngle=ang;return n<(X.warmUntil||0)?1:0}
 if(k===2){if(![0,11,12].every(i=>ok(L,i)))return -1;const sh=center(11,12),w=Math.max(.06,Math.abs(L[11].x-L[12].x)),v=(L[0].x-sh.x)/w;return alternate(v,X,n,.12)}
 if(k===3){if(![0,11,12,23,24].every(i=>ok(L,i)))return -1;const sh=center(11,12),hip=center(23,24),w=Math.max(.06,Math.abs(L[11].x-L[12].x)),v=(sh.x-hip.x)/w;return alternate(v,X,n,.12)}
 if(k===4){if(![11,12,7,8].every(i=>ok(L,i)))return -1;const diff=(L[11].y-L[12].y)/Math.max(.06,Math.abs(L[11].x-L[12].x));return alternate(diff,X,n,.1)}
 if(k===5){if(![11,12,15,16,23,24,27,28].every(i=>ok(L,i)))return -1;const sw=Math.abs(L[23].x-L[24].x),ank=Math.abs(L[27].x-L[28].x),open=L[15].y<L[11].y&&L[16].y<L[12].y&&ank>sw*1.35,closed=L[15].y>L[11].y&&L[16].y>L[12].y&&ank<sw*1.15;return open?1:closed?0:-1}
 return -1}
function alternate(v,X,n,threshold){const side=v>threshold?1:v< -threshold?-1:0;if(side){if(X.lastSide&&side!==X.lastSide){X.warmUntil=n+450;X.lastSide=side;return 1}X.lastSide=side;return n<(X.warmUntil||0)?1:0}return n<(X.warmUntil||0)?1:0}
function met(L,P){if(![0,11,12].every(i=>ok(L,i)))return null;if(P&&P.up&&!([11,13,15].every(i=>ok(L,i))||[12,14,16].every(i=>ok(L,i))))return null;
 const sy=(L[11].y+L[12].y)/2,sw0=Math.abs(L[11].x-L[12].x),ho=ok(L,23)&&ok(L,24),hy=ho?(L[23].y+L[24].y)/2:sy+1.25*Math.max(.05,sw0);
 return{ny:L[0].y,nx:L[0].x,sy,hy,ky:(L[25].y+L[26].y)/2,tl:Math.max(.05,hy-sy),sw:Math.max(.05,sw0),hx:ho?(L[23].x+L[24].x)/2:(L[11].x+L[12].x)/2,hip:ho,low:ho&&ok(L,25)&&ok(L,26)&&(ok(L,27)||ok(L,28)),
 tt:Math.abs(L[7].y-L[8].y)/Math.max(.05,sw0),sg:Math.sign(L[11].x-L[12].x)||1,el:L[13].y,er:L[14].y,wlx:L[15].x,wrx:L[16].x,wl:L[15].y,wr:L[16].y,kl:L[25].y,kr:L[26].y,ag:Math.abs(L[27].x-L[28].x),ax:(L[27].x+L[28].x)/2,al:L[27].y,ar:L[28].y}}
function tick(n){const e=cur();if(!e)return;const d=D();if(e.warm){d.warm=d.warm||[];d.warm[e.i]=Math.min(e.t,(d.warm[e.i]||0)+n)}else d.ex[e.i]=Math.min(e.t,d.ex[e.i]+n);const nx=cur();
 const c=Math.floor(e.warm?d.warm[e.i]:d.ex[e.i]);repFx(c,c>=e.t);
 if(!nx){save();if('speechSynthesis'in window&&voiceCoach){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance('오늘 운동을 모두 마쳤어요. 정말 잘했어요!');u.lang='ko-KR';speechSynthesis.speak(u)}woClose(true);return}save();showRc();if(nx.key!==e.key){setMsg(`${e.n} 완료! ✔ 다음은 ${nx.n}`);toast(`✔ ${e.n} 완료! 다음은 ${nx.n}`);if(voiceCoach)speakNow(`${KN[c]||c}! ${e.n} 완료. 다음은 ${nx.n}. ${nx.p.h||nx.h}`);else openGuide()}}
function stopCam(){cancelAnimationFrame(raf);G.key='';if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
// ===== 상담 챗봇 (규칙 기반) =====
const CB=[[/(불안|무서|두려)/,'불안한 마음이 드는군요. 숨을 4초 들이쉬고 6초 내쉬어 볼까요? 지금 가장 걱정되는 장면은 어떤 거예요?'],
[/(외롭|혼자)/,'혼자라는 느낌은 정말 힘들죠. 오늘 누군가와 짧게라도 눈을 마주치거나 인사를 해본 적 있나요?'],
[/(사람|사회|눈치|시선)/,'사람들의 시선이 신경 쓰이는 건 흔한 일이에요. 이번 주에 해볼 가장 작은 목표를 하나만 골라볼까요? (예: 편의점에서 "봉투 주세요" 말하기)'],
[/(피곤|힘들|우울|지쳐)/,'많이 지쳤군요. 여기까지 와서 운동까지 한 것만으로 충분히 잘한 거예요. 오늘 스스로에게 해주고 싶은 말은 뭐예요?'],
[/(좋|기뻐|뿌듯|괜찮)/,'좋은 소식이네요! 그 기분이 들었던 순간을 조금 더 이야기해 줄래요?']];
const FB=['말해줘서 고마워요. 지금 감정을 1~5로 표현하면 몇 점일까요?','그 감정이 생긴 순간을 함께 살펴봐요. 무엇이 가장 크게 영향을 줬나요?','지금 필요한 건 들어주기, 작은 해결책 찾기, 잠깐 쉬기 중 어느 쪽인가요?'];
const SAFETY=[/(죽고\s*싶|자살|자해|사라지고\s*싶)/,'힘든 마음을 말해줘서 고마워요. 지금 당장 자신을 해칠 위험이 있나요? 위험이 급하면 혼자 있지 말고 믿을 수 있는 사람에게 알리고, 한국에서는 자살예방상담전화 109 또는 긴급 시 112·119에 연락해 주세요.'];
let chatLog=[];
function chatInit(){if(!chatLog.length)chatLog=[['b',`안녕하세요, ${S.name}님. 운동하느라 수고했어요. 지금 기분은 어때요?`]];pc()}
function escChat(t){return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function pc(){const c=document.getElementById('chat');if(!c)return;c.innerHTML=chatLog.map(m=>`<div class="msg ${m[0]}">${escChat(m[1]).replace(/\n/g,'<br>')}</div>`).join('');c.scrollTop=c.scrollHeight}
let chatSending=false;
const CHAT_MAX=20;// 하루 최대 메시지 수 (비용 보호)
function chatErr(st,msg){return st===503?'서버에 AI 키가 아직 설정되지 않았어요. (관리자: Vercel 환경 변수 ANTHROPIC_API_KEY 확인 후 Redeploy)':st===404?'AI 상담 서버(/api/chat)를 찾지 못했어요. (관리자: Vercel 배포 설정 확인)':st===429?'요청이 잠시 많아요. 1분 뒤에 다시 보내 주세요.':st===0?'인터넷 연결이 불안정하거나 응답이 너무 늦어요.':(msg||'AI 답변을 가져오지 못했어요.')}
async function send(){const i=document.getElementById('ci'),btn=document.getElementById('sendBtn'),t=i?.value.trim();if(!t||chatSending)return;const d=D();
 if((d.chat||0)>=CHAT_MAX){toast('오늘은 대화를 충분히 나눴어요. 내일 다시 이야기해요 💜');return}
 chatSending=true;if(btn)btn.disabled=true;i.value='';chatLog.push(['u',t]);chatLog.push(['b','답변을 준비하고 있어요…','local']);pc();let answer='',local=false;
 // 위기 표현은 AI를 거치지 않고 바로 안전 안내를 보여 줘요
 const urgent=SAFETY[0].test(t);
 if(urgent){answer=SAFETY[1]}else{let st=0,em='';try{
   // 기본 응답(로컬)은 AI에게 보내지 않아요
   const history=chatLog.slice(0,-1).filter(m=>m[2]!=='local').slice(-12).map(m=>({role:m[0]==='u'?'user':'assistant',content:m[1]}));
   const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),45000);
   const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history}),signal:ctl.signal});clearTimeout(to);
   st=res.status;const data=await res.json().catch(()=>({}));if(!res.ok){em=data.error;throw new Error(em||'HTTP '+st)}
   answer=data.text||'답변을 만들지 못했어요. 다시 한 번 말씀해 주세요.'}
  catch(e){if(e.name==='AbortError'||e instanceof TypeError)st=0;console.warn('chat error',st,e);const h=CB.find(x=>x[0].test(t));local=true;answer='⚠️ '+chatErr(st,em)+'\n\n'+(h?h[1]:FB[(d.chat||0)%FB.length])}}
 chatLog[chatLog.length-1]=local?['b',answer,'local']:['b',answer];
 const first=!(d.chat>=1);d.chat=(d.chat||0)+1;
 if(first)chatLog.push(['b','오늘의 상담 미션을 달성했어요 🎉 더 이야기하고 싶으면 계속 적어도 괜찮아요. 다 됐다면 아래 「미션 완료」를 눌러 주세요.','local']);
 if(d.chat>=CHAT_MAX)chatLog.push(['b','오늘 대화는 여기까지예요. 내일 다시 이어가요 💜','local']);
 save();chatSending=false;if(btn)btn.disabled=false;
 if(first){R();setTimeout(()=>document.getElementById('chat')?.scrollIntoView({block:'end'}),50)}else{pc();i.focus()}}

// ===== 지도 =====
const hav=(a,b,c,d)=>{const r=x=>x*Math.PI/180,R=6371e3,h=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
let gAcc=0,gReal=null,gMsg='GPS를 확인하는 중…';
function gs(t){gMsg=t;const e=document.getElementById('gs');if(e)e.textContent=t}
function mkTreasure(){if(!pos)return;const wk=Math.floor(dd('2026-01-01',today())/7);let t=S.tr;
 if(!t||t.wk!==wk||(t.fake&&!pos.fake)||(!pos.fake&&!t.fake&&hav(pos.lat,pos.lng,t.lat,t.lng)>3000)){const a=(wk*137%360)*Math.PI/180,r=.0012+((wk*53)%5)*.00005;
  t=S.tr={wk,lat:pos.lat+Math.sin(a)*r,lng:pos.lng+Math.cos(a)*r,rare:wk%2===0,fake:pos.fake?1:0,poi:0};save()}
 treasure={...t,ev:S.claimed.includes('w'+wk)};if(!pos.fake&&t.poi!==1&&poiTry!==wk){poiTry=wk;findPoi(wk)}tnShow()}
const KIND={park:'공원',garden:'정원',nature_reserve:'자연공원',viewpoint:'전망대',attraction:'명소',artwork:'조형물',library:'도서관',fountain:'분수',historic:'역사 유적'};
let poiTry=0;
function tnShow(){const e=document.getElementById('tn');if(!e||!treasure)return;e.textContent=treasure.name?`📍 이번 주 보물 장소: ${treasure.name} (${KIND[treasure.kind]||'산책 명소'}) · 천천히 걸어서 가볼까요?`:(treasure.poi===0?'산책하기 좋은 장소를 찾는 중…':'')}
async function findPoi(wk){const la=pos.lat,ln=pos.lng,a=`(around:1300,${la},${ln})`,
 q=`[out:json][timeout:12];(nwr["leisure"~"^(park|garden|nature_reserve)$"]["name"]${a};nwr["tourism"~"^(viewpoint|attraction|artwork)$"]["name"]${a};nwr["historic"]["name"]${a};nwr["amenity"~"^(library|fountain)$"]["name"]${a};);out center 80;`;
 try{const c=new AbortController();setTimeout(()=>c.abort(),13000);
  const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(q),signal:c.signal,headers:{'Content-Type':'application/x-www-form-urlencoded'}}),j=await r.json();
  let L=(j.elements||[]).map(e=>{const g=e.tags||{},y=e.lat??(e.center&&e.center.lat),x=e.lon??(e.center&&e.center.lon);if(y==null||x==null||g.access==='private'||g.access==='no')return null;
   const d=hav(la,ln,y,x);return{id:e.id,lat:y,lng:x,d,name:g.name,kind:g.leisure||g.tourism||(g.historic?'historic':g.amenity),rk:g.leisure||g.tourism==='viewpoint'?0:g.tourism?1:g.historic?2:3}}).filter(x=>x&&x.d>=250&&x.d<=1300);
  if(!L.length)throw 0;const b=Math.min(...L.map(x=>x.rk)),P=L.filter(x=>x.rk<=Math.max(b,1)).sort((p,q)=>p.id-q.id),h=P[(wk*7919)%P.length];
  if(!S.tr||S.tr.wk!==wk||S.claimed.includes('w'+wk))return;
  S.tr={...S.tr,lat:h.lat,lng:h.lng,name:h.name,kind:h.kind,poi:1};save();mkTreasure();Lfit=0;dm()}
 catch(e){if(S.tr&&S.tr.wk===wk&&S.tr.poi!==1){S.tr.poi=-1;save();mkTreasure()}}}
function fakePos(){pos={lat:34.95,lng:127.49,fake:1};mkTreasure();dm()}
function startGps(){
 if(!navigator.geolocation){gs('이 기기는 GPS를 지원하지 않아요. 데모 모드를 써보세요.');fakePos();return}
 if(window.isSecureContext===false)gs('https 주소에서만 GPS가 켜져요. 주소가 https://로 시작하는지 확인해 주세요.');
 watch=navigator.geolocation.watchPosition(p=>{const c=p.coords;gAcc=c.accuracy||0;
  if(gAcc>300&&gReal){gs(`위치가 많이 부정확해요 (오차 약 ${Math.round(gAcc)}m). 창가나 야외로 가 주세요.`);return}
  const n={lat:c.latitude,lng:c.longitude};
  gReal=gReal&&hav(gReal.lat,gReal.lng,n.lat,n.lng)<25?{lat:gReal.lat*.5+n.lat*.5,lng:gReal.lng*.5+n.lng*.5}:n;
  gs(`GPS 연결됨 · 오차 약 ${Math.round(gAcc)}m`+(gAcc>50?' (실내·건물 사이라 부정확할 수 있어요)':''));
  if(!demo){pos={...gReal};mkTreasure();dm()}},
 e=>{gs(e.code===1?'위치 권한이 꺼져 있어요. 주소창 자물쇠 → 위치 허용 후 새로고침해 주세요. (데모 모드는 사용할 수 있어요)':e.code===2?'위치를 찾지 못했어요. 창가나 야외에서 「위치 다시 찾기」를 눌러주세요.':'위치 확인이 오래 걸려요. 잠시 기다리거나 「위치 다시 찾기」를 눌러주세요.');if(!pos)fakePos()},
 {enableHighAccuracy:true,maximumAge:3000,timeout:20000})}
function regps(){if(watch&&navigator.geolocation)navigator.geolocation.clearWatch(watch);watch=null;gReal=null;if(pos&&pos.fake)pos=null;gs('GPS를 다시 찾는 중…');startGps()}
function vMap(){const v=document.getElementById('v'),d=D();
 v.innerHTML=`<header class="page-h"><h1>보물 지도</h1><p class="mu">이번 주 보물을 찾아 천천히 걸어가요</p></header>
 <section class="map-card">
  <div id="lmap" style="${window.L?'':'display:none'}"></div><canvas id="map" width="560" height="320" style="${window.L?'display:none':''}"></canvas>
  <div class="map-fab"><button class="fab" onclick="lmMe()" aria-label="내 위치">🎯</button><button class="fab" onclick="lmBoth()" aria-label="보물까지 보기">🔭</button><button class="fab" onclick="regps()" aria-label="위치 다시 찾기">📍</button></div>
 </section>
 <section class="card">
  <p class="gps" id="gs">${gMsg}</p><p class="mu small" id="tn"></p>
  <div class="walk"><div><small>오늘 외출</small><b id="os">${Math.floor(d.walk/60)}분</b></div><span class="mu small">1분당 +5EXP</span></div>
  <div class="btn-row two"><button id="ob" class="btn ${outT?'soft':'primary'}" onclick="outing()">${outT?'산책 종료':'산책 시작'}</button><button class="btn soft" onclick="claim()">🎁 보물 줍기</button></div>
  <button class="btn ghost block sm" onclick="demoMove()">${demo?'🧪 데모 해제':'🧪 데모: 보물 쪽으로 이동'}</button>
 </section>`;
 if(!watch)startGps();mkTreasure();dm()}
// 한국 지도를 쓰려면 브이월드(vworld.kr)에서 무료 인증키를 받아 아래 따옴표 안에 붙여넣으세요.
const VWORLD_KEY='';
let LM=null,Lme=null,Lacc=null,Ltr=null,Lring=null,Lline=null,Lfit=0;
function dm(){if(window.L&&document.getElementById('lmap'))return lmDraw();dmCanvas()}
function lmDraw(){const el=document.getElementById('lmap');if(!el||!pos)return;
 if(!LM||LM.getContainer()!==el){if(LM){try{LM.remove()}catch(e){}}
  LM=L.map(el).setView([pos.lat,pos.lng],17);const ES='https://server.arcgisonline.com/ArcGIS/rest/services/',TL={};
  if(VWORLD_KEY){TL['한국 지도']=L.tileLayer(`https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Base/{z}/{y}/{x}.png`,{maxZoom:19,maxNativeZoom:18,attribution:'© VWorld'});TL['한국 위성']=L.tileLayer(`https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Satellite/{z}/{y}/{x}.jpeg`,{maxZoom:19,maxNativeZoom:18,attribution:'© VWorld'})}
  TL['일반 지도']=L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png',{maxZoom:20,maxNativeZoom:19,attribution:'© OpenStreetMap',referrerPolicy:'origin'});
  TL['위성 사진']=L.tileLayer(ES+'World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19,attribution:'Tiles © Esri'});
  TL['OpenStreetMap 2']=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,maxNativeZoom:19,attribution:'© OpenStreetMap',referrerPolicy:'origin'});
  TL['Esri 지도']=L.tileLayer(ES+'World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:16,attribution:'Tiles © Esri'});
  let tk=0,te=0;const k0=Object.keys(TL)[0],t0=TL[k0].addTo(LM),fb=TL[k0==='일반 지도'?'OpenStreetMap 2':'일반 지도'];t0.on('tileload',()=>tk++);t0.on('tileerror',()=>{if(++te>=4&&!tk&&LM&&LM.hasLayer(t0)){LM.removeLayer(t0);fb.addTo(LM)}});L.control.layers(TL,null,{position:'topright'}).addTo(LM);
  Lacc=L.circle([pos.lat,pos.lng],{radius:20,color:'#6e56cf',weight:1,fillOpacity:.15}).addTo(LM);
  Lme=L.circleMarker([pos.lat,pos.lng],{radius:8,color:'#fff',weight:3,fillColor:'#6e56cf',fillOpacity:1}).addTo(LM);Ltr=Lring=Lline=null;Lfit=0;setTimeout(()=>LM&&LM.invalidateSize(),80)}
 const ll=[pos.lat,pos.lng];Lme.setLatLng(ll);Lacc.setLatLng(ll).setRadius(demo?3:Math.max(gAcc,5));
 if(treasure){const tl=[treasure.lat,treasure.lng],dist=Math.round(hav(pos.lat,pos.lng,treasure.lat,treasure.lng)),tip=`${treasure.name?treasure.name+' · ':''}보물 ${dist}m${treasure.ev?' (이미 주움)':''}`;
  if(!Ltr){Ltr=L.marker(tl,{icon:L.divIcon({className:'',html:'<div style="font-size:26px;line-height:26px">🎁</div>',iconSize:[26,26],iconAnchor:[13,13]})}).addTo(LM);
   Lring=L.circle(tl,{radius:50,color:'#3fae6a',weight:2,dashArray:'5 4',fillOpacity:.15}).addTo(LM);Lline=L.polyline([ll,tl],{color:'#f0b429',weight:2,dashArray:'4 6'}).addTo(LM);Ltr.bindTooltip(tip,{permanent:true,direction:'top',offset:[0,-14]})}
  else{Ltr.setLatLng(tl);Lring.setLatLng(tl);Lline.setLatLngs([ll,tl]);Ltr.setTooltipContent(tip)}
  if(!Lfit){Lfit=1;LM.fitBounds(L.latLngBounds([ll,tl]).pad(.4),{maxZoom:18})}}
 if(Lfit&&!LM.getBounds().contains(ll))LM.panTo(ll)}
function lmMe(){if(LM&&pos)LM.setView([pos.lat,pos.lng],Math.max(LM.getZoom(),17))}
function lmBoth(){if(LM&&pos&&treasure)LM.fitBounds(L.latLngBounds([[pos.lat,pos.lng],[treasure.lat,treasure.lng]]).pad(.4),{maxZoom:18})}
function dmCanvas(){const cv=document.getElementById('map');if(!cv||!pos)return;const c=cv.getContext('2d'),W=560,H=320;c.clearRect(0,0,W,H);
 const dist=treasure?Math.round(hav(pos.lat,pos.lng,treasure.lat,treasure.lng)):0,ext=Math.max(dist*1.25,90),sc=(H/2-34)/ext,mx=111320,cl=Math.cos(pos.lat*Math.PI/180),tc=getComputedStyle(document.body).color;
 const P=(la,ln)=>[W/2+(ln-pos.lng)*mx*cl*sc,H/2-(la-pos.lat)*mx*sc];
 c.strokeStyle='rgba(128,128,150,.25)';c.lineWidth=1;for(let x=0;x<W;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke()}for(let y=0;y<H;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}
 if(treasure){const[x,y]=P(treasure.lat,treasure.lng),rr=Math.max(10,50*sc);
  c.setLineDash([5,4]);c.strokeStyle='#3fae6a';c.beginPath();c.arc(x,y,rr,0,7);c.stroke();c.setLineDash([]);c.fillStyle='#3fae6a33';c.beginPath();c.arc(x,y,rr,0,7);c.fill();
  c.font='20px sans-serif';c.fillStyle='#f0b429';c.fillText('🎁',x-10,y+7);c.font='13px sans-serif';c.fillStyle=tc;c.fillText(`${treasure.name?treasure.name+' · ':''}보물 ${dist}m${treasure.ev?' (이미 주움)':''}`,Math.max(4,Math.min(x-30,W-130)),Math.max(16,y-rr-6))}
 c.font='13px sans-serif';const r=Math.max(10,(demo?0:gAcc)*sc);c.fillStyle='#6e56cf33';c.beginPath();c.arc(W/2,H/2,r,0,7);c.fill();
 c.fillStyle='#6e56cf';c.beginPath();c.arc(W/2,H/2,8,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(W/2,H/2,3,0,7);c.fill();
 c.fillStyle=tc;c.fillText('N ↑',W-36,20);const L=[10,20,50,100,200,500,1000,2000,5000].find(v=>v*sc>60)||5000;c.strokeStyle=tc;c.lineWidth=2;c.beginPath();c.moveTo(12,H-16);c.lineTo(12+L*sc,H-16);c.stroke();c.fillText(L>=1000?L/1000+'km':L+'m',12,H-22)}
function demoMove(){if(demo){demo=0;if(gReal)pos={...gReal};vMap();gs('실제 GPS로 돌아왔어요');return}
 if(!treasure)return toast('위치를 먼저 찾아주세요');demo=1;pos={lat:treasure.lat+.0001,lng:treasure.lng};vMap();gs('데모 모드: 보물 근처로 이동했어요')}
function claim(){if(!treasure||!pos||(pos.fake&&!demo))return toast('실제 GPS 위치를 아직 못 찾았어요. 위치를 허용하거나 데모 모드를 써보세요');const k='w'+treasure.wk;
 const dist=Math.round(hav(pos.lat,pos.lng,treasure.lat,treasure.lng)),tol=demo?0:Math.min(gAcc,30);
 if(S.claimed.includes(k))return toast('이번 주 보물은 이미 주웠어요!');if(dist-tol>50)return toast(`보물까지 약 ${dist}m 남았어요. 50m 안으로 가면 주울 수 있어요!`);
 S.claimed.push(k);let m;if(treasure.rare){const e=ITEMS.filter(i=>i.ev&&!S.own.includes(i.id))[0];if(e){S.own.push(e.id);m=`한정 아이템 [${e.n}] 획득!`}else{S.gold+=300;m='+300G!'}}else{S.gold+=150;m='+150G!'}
 addXp(30);save();toast('🎁 '+(treasure.name?treasure.name+'에서 ':'')+'보물 발견! '+m+' +30EXP');R()}
function outing(){const d=D();if(outT){clearInterval(outT);outT=null;const mins=Math.floor(d.walk/60);addXp(Math.max(0,mins*5-(d.paid||0)));d.paid=mins*5;save();R(['산책 종료! 나간 시간만큼 경험치를 받았어요.']);return}
 outT=setInterval(()=>{d.walk+=1;const o=document.getElementById('os');if(o)o.textContent=`${Math.floor(d.walk/60)}분 ${d.walk%60}초`;if(d.walk%30===0)save()},1000);
 const b=document.getElementById('ob');if(b){b.textContent='산책 종료';b.className='btn soft'}if(!d.outBonus){d.outBonus=1;addXp(20);S.gold+=30;side()}}
// ===== 상점 / 랭킹 =====
const CATS=[['png_clothes','🧥 PNG 의상'],['png_expression','😊 PNG 표정'],['png_hairFront','💇 PNG 헤어'],['png_accessory','🎀 PNG 액세서리']];
const REQ=['hair','hairc','skin','face','eyec','shoes'];
let scat='png_hairFront';
const owned=i=>S.own.includes(i.id)||(i.p===0&&!i.ev);
function card(i){const own=owned(i),on=lookOf(0,1)[i.s]===i.id,pvOn=pv[i.s]===i.id;
 let btn;
 if(own)btn=REQ.includes(i.s)&&on?`<button class="g" disabled>착용 중</button>`:`<button class="${on?'g':''}" onclick="event.stopPropagation();eq('${i.id}')">${on?'해제':'착용'}</button>`;
 else if(i.ev)btn=`<div class="mu" style="font-size:11px;margin-top:4px">🎁 보물 지도에서 획득</div>`;
 else btn=`<button ${S.gold<i.p?'disabled':''} onclick="event.stopPropagation();buy('${i.id}')">${i.p.toLocaleString()}G</button>`;
 return `<div class="it ${on?'on':''} ${pvOn?'pv':''}" onclick="prv('${i.id}')"><canvas width="200" height="276" data-id="${i.id}"></canvas><div class="nm">${i.n}</div><div class="mu" style="font-size:11px">${own?(on?'착용 중':'보유'):(i.p?'':'무료')}</div>${btn}</div>`}
function vShop(){const v=document.getElementById('v');
 const tabs=`<div class="chips" role="tablist">${CATS.map(k=>`<button role="tab" class="${scat===k[0]?'on':''}" onclick="scat='${k[0]}';vShop()">${k[1]}</button>`).join('')}</div>`;
 const head=`<header class="page-h row-h"><div><h1>상점</h1><p class="mu">골드로 새 파츠를 모아요</p></div><span class="gold-chip"><i class="coin"></i>${S.gold.toLocaleString()}</span></header>`;
 if(String(scat).startsWith('png_')){
  const slot=scat.slice(4),items=layerPack?(layerPack.slots[slot]||[]):[];
  v.innerHTML=`${head}<div class="sticky-chips">${tabs}</div>${!layerPack?'<div class="card mu">파츠를 불러오는 중이에요…</div>':`<div class="grid">${items.map(pngCard).join('')}</div>`}<p class="mu small center">대머리·기본 표정은 무료예요.</p>`;
  v.querySelectorAll('canvas[data-png-id]').forEach(cv=>{const p=findPngPart(cv.dataset.pngId);if(p)try{drawLayeredAvatarToCanvas(cv,{[p.slot]:p.path})}catch(e){console.warn(e)}});
  v.querySelectorAll('button[data-png-action]').forEach(b=>b.onclick=()=>{const key=b.dataset.pngId;if(b.dataset.pngAction==='buy')buyPngPart(key);else equipPngPart(key)});
  return;
 }
 v.innerHTML=`${head}<div class="sticky-chips">${tabs}</div><div class="grid">${ITEMS.filter(i=>i.s===scat).map(card).join('')}</div>`;
 v.querySelectorAll('canvas[data-id]').forEach(cv=>{const i=itm(cv.dataset.id);try{render(cv,lookOf({[i.s]:i.id},1),0,ZOOM[i.s])}catch(e){}})}
function pngCard(p){
 const own=pngOwned(p),on=pngEquipped(p),price=Number(p.price)||0,name=escHTML(p.label.replace(/^\d+\s*/,''));
 let btn='';if(own)btn=on?'<button class="btn sm soft" disabled>착용 중</button>':`<button class="btn sm soft" data-png-action="equip" data-png-id="${escHTML(p.path)}">장착</button>`;
 else btn=`<button class="btn sm primary" data-png-action="buy" data-png-id="${escHTML(p.path)}" ${S.gold<price?'disabled':''}><i class="coin"></i>${price.toLocaleString()}</button>`;
 return `<div class="it ${on?'on':''}">${on?'<span class="it-badge">착용</span>':own?'<span class="it-badge own">보유</span>':''}<div class="it-img"><canvas width="160" height="220" data-png-id="${escHTML(p.path)}"></canvas></div><div class="nm">${name}</div>${btn}</div>`;
}
function buyPngPart(key){
 const p=findPngPart(key);if(!p||pngOwned(p))return;if(!S||S.gold<Number(p.price))return toast('골드가 부족해요!');
 S.gold-=Number(p.price);if(!Array.isArray(S.pngOwn))S.pngOwn=[];S.pngOwn.push(p.path);layerChoice[p.slot]=p.path;S.pngEq={...layerChoice};save();renderLayerControls();side();if(tab==='shop')vShop();
}
function equipPngPart(key){
 const p=findPngPart(key);if(!p||!pngOwned(p))return;const required=p.slot==='expression'||p.slot==='hairFront';
 if(layerChoice[p.slot]===p.path){if(required)return;delete layerChoice[p.slot];}else layerChoice[p.slot]=p.path;
 if(S){S.pngEq={...layerChoice};save();}renderLayerControls();side();if(tab==='shop')vShop();
}
function prv(id){const i=itm(id);if(pv[i.s]===id)delete pv[i.s];else pv[i.s]=id;side();vShop()}
function buy(id){const i=itm(id);if(!i||owned(i)||S.gold<i.p)return;S.gold-=i.p;S.own.push(id);S.eq[i.s]=id;delete pv[i.s];save();R()}
function eq(id){const i=itm(id);S.eq[i.s]=S.eq[i.s]===id?null:id;delete pv[i.s];save();R()}
function vRank(){const all=[...NPC.map(n=>({n:n[0],lv:n[1]})),{n:S.name,lv:S.lv,me:1}].sort((a,b)=>b.lv-a.lv),myI=all.findIndex(p=>p.me);
 const M=['🥇','🥈','🥉'];
 document.getElementById('v').innerHTML=`<header class="page-h"><h1>랭킹</h1><p class="mu">이웃들과 함께 한 걸음씩</p></header>
 <section class="card my-rank"><small>내 순위</small><b>${myI+1}<span>위</span></b><span class="pill accent">Lv.${S.lv}</span></section>
 <section class="card"><ol class="rank">${all.map((p,i)=>`<li class="${p.me?'me':''}"><span class="rk">${M[i]||i+1}</span><span class="rn">${escHTML(p.n)}${p.me?' <small>(나)</small>':''}</span><span class="rl">Lv.${p.lv}</span></li>`).join('')}</ol>
 <p class="mu small">지금은 예시 이웃과 비교하는 로컬 랭킹이에요.</p></section>`}
// ===== 초기 설정 =====
const freeOpts=slot=>'<option value="">기본</option>'+ITEMS.filter(i=>i.s===slot&&i.p===0&&!i.ev&&i.id!=='s2').map(i=>`<option value="${i.id}">${i.n}</option>`).join('');
function setup(){document.body.classList.add('onboarding');
 document.getElementById('main').innerHTML=`<section class="onb">
  <div class="onb-av"><canvas id="ch" width="400" height="552"></canvas></div>
  <p class="eyebrow">마음 한 걸음</p>
  <h1>나만의 캐릭터와<br>매일 한 걸음씩</h1>
  <p class="mu">가볍게 몸을 움직이고, 마음을 나누고, 산책하며 보물을 찾아요.</p>
  <div class="card form">
   <label>이름<input id="sn" maxlength="10" placeholder="캐릭터 이름" autocomplete="nickname"></label>
   <label>성별<div class="seg" id="sgSeg"><button type="button" class="on" data-v="여">여</button><button type="button" data-v="남">남</button></div><input type="hidden" id="sg" value="여"></label>
   <label>생일<input id="sb" type="date" value="2000-01-01"></label>
  </div>
  <button class="btn primary block lg" onclick="mk()">모험 시작하기</button>
 </section>`;
 document.querySelectorAll('#sgSeg button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#sgSeg button').forEach(x=>x.classList.toggle('on',x===b));document.getElementById('sg').value=b.dataset.v;pvs()});
 S={name:'새싹',gender:'여',gold:0,lv:1,exp:0,own:[],eq:{},pngOwn:[],pngEq:{},claimed:[],days:{},start:today()};pv={}}
function pvs(){S.gender=document.getElementById('sg').value}
function mk(){const n=document.getElementById('sn').value.trim();if(!n){toast('이름을 입력해 주세요');document.getElementById('sn').focus();return}
 const g=id=>document.getElementById(id).value;
 S={name:n,gender:g('sg'),bday:g('sb'),gold:0,lv:1,exp:0,own:[],eq:{},pngOwn:[],pngEq:{},claimed:[],days:{},start:today(),last:null};pv={};
 restorePngEquipment();const m=enter();m.unshift(`${n}님, 환영해요!`);window.scrollTo(0,0);R(m)}
load();if(S&&S.name){S.eq=S.eq||{};S.own=S.own||[];S.pngOwn=S.pngOwn||[];S.pngEq=S.pngEq||{};R(enter())}else setup();
