'use strict';

/* =========================================================
   앱 상태 · 라이브러리(수업/챕터) · 화면 전환
   ========================================================= */
let prefs = {};
try { prefs = JSON.parse(localStorage.getItem('sn-prefs') || '{}'); } catch (e) { /* ignore */ }

const S = {
  mode: prefs.mode || 'study',      // 'study' | 'edit'
  lang: prefs.lang || 'click',      // 공부 모드 언어 보기: click | both | split | en
  showEn: prefs.showEn !== false,   // 편집 모드 영어 칸
  bg: prefs.bg || null,             // 색상 1: 노트 뒤 배경 (null = 기본 베이지)
  panel: prefs.panel || null,       // 색상 2: 사이드바·상단바 (null = 기본 크림색)
  dark: !!prefs.dark,               // 어두운 화면 (사이드바·상단바·배경)
  coverShape: prefs.coverShape || 'book', // 수업 표지 모양
  calIcon: prefs.calIcon != null ? prefs.calIcon : null, // 캘린더: 공부한 날 아이콘 (프리셋 따라감)
  calSync: prefs.calSync !== false, // 캘린더 모양을 배경(무드 프리셋)과 연동
  userPresets: Array.isArray(prefs.userPresets) ? prefs.userPresets : [], // 내가 저장한 무드 프리셋
  calPresets: Array.isArray(prefs.calPresets) ? prefs.calPresets : [],   // 내가 저장한 캘린더 프리셋
  calCustom: Object.assign({}, prefs.calCustom), // 연동 안 할 때: { heat, icon, card }
  coverAll: (() => { try { return localStorage.getItem('sn-coverall'); } catch (e) { return null; } })(), // 모든 표지에 쓸 사진
  bgPhoto: (() => { try { return localStorage.getItem('sn-bgphoto'); } catch (e) { return null; } })(), // 배경 사진 (dataURL)
  pattern: prefs.pattern || null,   // 배경 무늬 (check | dot | stripe | grid | heart | star)
  patColor: prefs.patColor || null, // 무늬 색
  logo: Object.assign({}, prefs.logo), // 왼쪽 위 표식 { icon: 이모지(없으면 책), color, name }
  coverPalette: prefs.coverPalette || null, // 프리셋의 수업 표지 색 (새 수업에 차례로)
  gap: prefs.gap != null ? prefs.gap : 10, // 공부 모드 블록 사이 간격 (px)
  zoom: prefs.zoom || 100,          // 공부 모드 글자 배율 (%)
  enStyle: Object.assign({}, prefs.enStyle), // 영어 기본 서식 { color, size, italic, bold }
  courses: [], notes: [],
  courseId: null, noteId: null, note: null, activeBlock: null,
};
function savePrefs() {
  try {
    localStorage.setItem('sn-prefs', JSON.stringify({
      mode: S.mode, lang: S.lang, showEn: S.showEn, sbOpen: document.body.classList.contains('sb-open'),
      laserColor: Laser.color, laserFinger: Laser.finger, laserWidth: Laser.width, bg: S.bg, panel: S.panel, dark: S.dark, coverShape: S.coverShape, calIcon: S.calIcon, calSync: S.calSync, calCustom: S.calCustom, userPresets: S.userPresets, calPresets: S.calPresets, pattern: S.pattern, patColor: S.patColor, logo: S.logo, coverPalette: S.coverPalette, gap: S.gap, zoom: S.zoom, enStyle: S.enStyle,
    }));
  } catch (e) { /* ignore */ }
}

/* ---------- 화면 모양: 색상 1(배경) · 색상 2(사이드바·상단바) · 영어 서식 · 블록 간격 → CSS 변수 ---------- */
const BG_COLORS = ['#f1efe9', '#f7f7f5', '#e9edf2', '#e8efe9', '#f3ebe4', '#efe9f3', '#dcdcd8', '#c9cfd6'];
const PANEL_COLORS = ['#fbfaf7', '#ffffff', '#f4f6f9', '#f2f6f2', '#f9f3ee', '#f6f2f9', '#ededeb', '#e3e7ec'];
const EN_COLORS = ['#4a5d85', '#1f2328', '#6b7280', '#1a73e8', '#188038', '#8430ce', '#b45309'];
const EN_SIZES = [[0.85, '작게'], [0.92, '기본'], [1, '한국어와 같게']];
const LANGS = [['click', '한국어 (눌러서 영어)'], ['both', '한 + 영'], ['split', '좌우 분할'], ['en', 'English']];
const DEFAULT_GAP = 10;
function applyLook() {
  const st = S.enStyle, r = document.documentElement.style;
  const set = (k, v) => { if (v) r.setProperty(k, v); else r.removeProperty(k); };
  set('--bg', S.bg);
  set('--panel', S.panel);
  set('--en', st.color);
  set('--en-size', st.size ? st.size + 'em' : null);
  set('--en-style', st.italic ? 'italic' : null);
  set('--en-weight', st.bold ? '600' : null);
  set('--blk-gap', S.gap !== DEFAULT_GAP ? S.gap + 'px' : null);
  document.body.classList.toggle('theme-dark', S.dark);
  const pat = patternStyle(S.pattern, S.patColor);
  set('--bg-img', pat.backgroundImage);
  set('--bg-size', pat.backgroundSize);
  set('--bg-pos', pat.backgroundPosition);
}

/* ---------- 배경 무늬 · 표식 · 무드 프리셋 ---------- */
const PATTERNS = [['none', '없음'], ['check', '체크'], ['dot', '도트'], ['stripe', '줄무늬'], ['grid', '모눈'], ['heart', '하트'], ['star', '별'],
  ['plank', '나무결'], ['spook', '박쥐'], ['photo', '내 사진']];
const FIXED_PATTERNS = ['photo']; // 무늬 색 고르기 없음
const PAT_COLORS = ['#d8d2c4', '#c9d3e0', '#bcd7f5', '#f3b8b0', '#ffc6dc', '#bfe3d6', '#cdd3f5', '#f5d98b', '#bdbdbd'];
const LOGO_COLORS = ['#4f5bd5', '#e0663c', '#2f8f6b', '#c2459a', '#3a8ec9', '#b8862b', '#7a56c2', '#37474f', '#ff7eb3', '#2a9d8f'];
const LOGO_ICONS = ['book', '📚', '📝', '🐰', '🐻', '🍀', '⭐', '🌙', '🍓', '☕'];
const hexA = (hex, a) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
// 무늬 → { backgroundImage, backgroundSize } (설정 미리보기와 실제 배경 공통)
function patternStyle(type, color) {
  const c = color || PAT_COLORS[0];
  switch (type) {
    case 'check': { const a = hexA(c, .4); return { backgroundImage: `linear-gradient(90deg, ${a} 50%, transparent 50%), linear-gradient(${a} 50%, transparent 50%)`, backgroundSize: '72px 72px' }; }
    case 'dot': return { backgroundImage: `radial-gradient(${c} 3px, transparent 3.6px), radial-gradient(${c} 3px, transparent 3.6px)`, backgroundSize: '56px 56px', backgroundPosition: '0 0, 28px 28px' };
    case 'stripe': return { backgroundImage: `repeating-linear-gradient(45deg, ${hexA(c, .45)} 0 10px, transparent 10px 46px)`, backgroundSize: 'auto' };
    case 'grid': return { backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`, backgroundSize: '44px 44px' };
    case 'heart': {
      const heart = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M10 17.5S2 12.6 2 7.3A4.3 4.3 0 0 1 10 5a4.3 4.3 0 0 1 8 2.3c0 5.3-8 10.2-8 10.2z" fill="${c}"/>`;
      return { backgroundImage: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">${heart(14, 14, .9)}${heart(74, 74, .9)}</svg>`), backgroundSize: '120px 120px' };
    }
    case 'star': {
      const star = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.8 4.8 17.6l1-5.8L1.5 7.7l5.9-.8z" fill="${c}"/>`;
      return { backgroundImage: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="130" height="130">${star(14, 14, .85)}${star(82, 76, .65)}</svg>`), backgroundSize: '130px 130px' };
    }
    case 'plank': return {
      backgroundImage: `repeating-linear-gradient(0deg, ${hexA(c, .6)} 0 2px, transparent 2px 120px), repeating-linear-gradient(90deg, ${hexA(c, .08)} 0 3px, transparent 3px 34px), repeating-linear-gradient(90deg, ${hexA(c, .05)} 0 1px, transparent 1px 13px)`,
      backgroundSize: 'auto' };
    case 'spook': { // 박쥐 + 작은 점
      const bat = (x, y, k) => `<path transform="translate(${x} ${y}) scale(${k})" d="M20 8c-2-4-8-6-13-4 3 2 4 5 3 8-3-2-7-2-10 0 4 1 7 4 8 9 3-3 8-3 10 0 1-3 1-5 2-5s1 2 2 5c2-3 7-3 10 0 1-5 4-8 8-9-3-2-7-2-10 0-1-3 0-6 3-8-5-2-11 0-13 4z" fill="${c}"/>`;
      return { backgroundImage: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150">${bat(14, 18, 1.1)}${bat(92, 92, .8)}<circle cx="110" cy="30" r="2.5" fill="${c}"/><circle cx="40" cy="112" r="2" fill="${c}"/><circle cx="72" cy="62" r="1.5" fill="${c}"/></svg>`), backgroundSize: '150px 150px' };
    }
    case 'photo': return S.bgPhoto ? { backgroundImage: `url("${S.bgPhoto}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundImage: null, backgroundSize: null };
    default: return { backgroundImage: null, backgroundSize: null };
  }
}
const LOOK_PRESETS = [
  { name: '기본', calIcon: '✏️', bg: '#f1efe9', panel: '#fbfaf7', pattern: null, patColor: null, logo: '#4f5bd5', covers: null }, // covers null = 기본 8색
  { name: '깔끔', calIcon: '●', bg: '#eeeeee', panel: '#fafafa', pattern: null, patColor: null, logo: '#222222',
    covers: ['#1f1f1f', '#3d3d3d', '#5c5c5c', '#7a7a7a', '#2e2e2e', '#4d4d4d', '#6b6b6b', '#878787'] },
  { name: '공책', calIcon: '✎', bg: '#f7f7f2', panel: '#ffffff', pattern: 'grid', patColor: '#dde3ea', logo: '#2f4b7c',
    covers: ['#c8a27a', '#2f4b7c', '#d1495b', '#2a9d8f', '#f4a259', '#5b5f97', '#8d99ae', '#3d405b'] },
  { name: '도서관', calIcon: '📖', bg: '#e9dcc6', panel: '#f6eee0', pattern: 'plank', patColor: '#b08a5e', logo: '#7a4e2d',
    covers: ['#7a4e2d', '#9c6b3f', '#5b6b4a', '#8c3b2e', '#b08a52', '#4a5a6a', '#6e4a3a', '#a0522d'] },
  { name: '꿈나라', calIcon: '⭐', bg: '#151a30', panel: '#1d2340', pattern: 'star', patColor: '#353d6e', logo: '#9fa8ff', dark: true,
    covers: ['#3f51b5', '#7e57c2', '#00897b', '#5c6bc0', '#ad1457', '#1e88e5', '#6d4c41', '#455a64'] },
  { name: '큐트', calIcon: '🍰', bg: '#fdf2f7', panel: '#eef6ff', pattern: 'grid', patColor: '#bcd7f5', logo: '#ffaecb', shape: 'dessert',
    covers: ['#ffc8dd', '#bde0fe', '#ffe9a8', '#ffd1e8', '#cfe6ff', '#fff1bd', '#ffbfd6', '#a9d4fb'] },
  { name: '피크닉', calIcon: '🧺', bg: '#fff8dc', panel: '#f1f9e8', pattern: 'check', patColor: '#f5a99e', logo: '#f08a7e', shape: 'picnic',
    covers: ['#f0b860', '#f08a7e', '#a9d47a', '#f6d36b', '#ec9a9a', '#c3e0a0', '#f2cf6a', '#f2b0b0'] },
  { name: '민트초코', calIcon: '🍫', bg: '#dff3ec', panel: '#f3fbf8', pattern: 'dot', patColor: '#7b5544', logo: '#6b4433', shape: 'mintchoco',
    covers: ['#5c3d2e', '#3eb489', '#8b5e3c', '#7fd1b9', '#4a2f24', '#2e9e7a', '#a47148', '#98e0c8'] },
  { name: '할로윈', calIcon: '🎃', bg: '#2b2238', panel: '#211a2c', pattern: 'spook', patColor: '#4a3d60', logo: '#ff8a1f', dark: true, shape: 'halloween',
    covers: ['#ff8a1f', '#7b4fa0', '#3d9a5c', '#c8102e', '#f2b632', '#5a4a78', '#e86a10', '#8b1e3f'] },
];

/* ---------- 수업 표지 모양 (책 대신 식빵·계란후라이 등). 묶음(mix)은 수업 순서대로 돌아가며 ---------- */
const SHAPE_SVG = {
  bread: '<path d="M14 64C2 40 18 12 46 14c8-9 20-9 28 0 28-2 44 26 32 50v84q0 8-8 8H22q-8 0-8-8z" fill="#d9a066"/><path d="M22 66c-9-19 4-42 27-41 6-7 16-7 22 0 23-1 36 22 27 41v78q0 4-4 4H26q-4 0-4-4z" fill="#f9e6bd"/>',
  egg: '<path d="M60 16c30-5 52 18 46 46 13 26 2 68-24 80-22 16-55 9-66-16C2 102 8 70 18 52 24 30 40 18 60 16z" fill="#fffdf6" stroke="#efe2c4" stroke-width="3"/><circle cx="60" cy="70" r="24" fill="#ffc93c"/><circle cx="52" cy="62" r="7" fill="#ffe08a"/>',
  tomato: '<circle cx="60" cy="94" r="52" fill="#ff6152"/><ellipse cx="38" cy="78" rx="9" ry="15" fill="#ff958a" transform="rotate(30 38 78)"/>'
    + [-75, -38, 0, 38, 75].map(a => `<ellipse cx="60" cy="56" rx="5.5" ry="13" fill="#5cb85c" transform="rotate(${a} 60 46)"/>`).join('')
    + '<circle cx="60" cy="47" r="7" fill="#4fa94f"/><rect x="57" y="30" width="6" height="18" rx="3" fill="#4a9a4a"/>',
  leaf: '<path d="M60 154C18 122 8 70 28 36 40 18 54 10 60 6c6 4 20 12 32 30 20 34 10 86-32 118z" fill="#7fd1b9"/><path d="M60 14v136M60 50l-20-14M60 50l20-14M60 80l-26-18M60 80l26-18M60 110l-22-16M60 110l22-16" stroke="#4fae93" stroke-width="3" fill="none" stroke-linecap="round"/>',
  choco: '<rect x="14" y="12" width="92" height="140" rx="8" fill="#6b4433"/><g fill="#7d5240"><rect x="22" y="20" width="34" height="28" rx="3"/><rect x="64" y="20" width="34" height="28" rx="3"/><rect x="22" y="56" width="34" height="28" rx="3"/><rect x="64" y="56" width="34" height="28" rx="3"/><rect x="22" y="92" width="34" height="28" rx="3"/><rect x="64" y="92" width="34" height="28" rx="3"/></g><path d="M58 152l48-48v40q0 8-8 8z" fill="#cfd6dd"/><path d="M58 152l48-48" stroke="#b5bec7" stroke-width="2"/>',
  strawberry: '<path d="M60 150C32 140 12 108 15 80c2-20 21-28 45-24 24-4 43 4 45 24 3 28-17 60-45 70z" fill="#ff5a6e"/><path d="M30 80c4-10 13-14 21-12" stroke="#ff9eab" stroke-width="5" stroke-linecap="round" fill="none"/><g fill="#ffe7a3">'
    + [[38, 90], [53, 82], [68, 82], [83, 90], [30, 106], [46, 102], [62, 100], [78, 102], [92, 108], [40, 122], [56, 118], [72, 118], [84, 124], [50, 136], [66, 136]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="3"/>`).join('')
    + '</g><path d="M60 66L44 72l6-12-16-6 18-2-2-14 10 10 10-10-2 14 18 2-16 6 6 12z" fill="#5fb85a"/><path d="M60 50q2-12 9-18" stroke="#4a9a4a" stroke-width="5" fill="none" stroke-linecap="round"/>',
  melon: '<g transform="translate(0 22)"><path d="M4 48a56 56 0 0 0 112 0z" fill="#8fbf5a"/><path d="M8 52a52 52 0 0 0 104 0" fill="none" stroke="#c9e3a0" stroke-width="2" stroke-dasharray="5 6"/><path d="M12 48a48 48 0 0 0 96 0z" fill="#e6f3c8"/><path d="M17 48a43 43 0 0 0 86 0z" fill="#ffb066"/><path d="M36 48a24 24 0 0 0 48 0z" fill="#ffd19a"/><g fill="#fff4dc"><ellipse cx="46" cy="55" rx="3.2" ry="2"/><ellipse cx="56" cy="61" rx="3.2" ry="2"/><ellipse cx="66" cy="61" rx="3.2" ry="2"/><ellipse cx="75" cy="55" rx="3.2" ry="2"/></g></g>',
  watermelon: '<path d="M60 18L108 116Q60 140 12 116z" fill="#ff5d73"/><path d="M12 116Q60 140 108 116l3 8Q60 150 9 124z" fill="#f4ffe6"/><path d="M9 124Q60 150 111 124l3 9Q60 162 6 133z" fill="#43a047"/><g fill="#3b2a2a"><path d="M52 60q3 6 0 10q-3-4 0-10z"/><path d="M70 74q3 6 0 10q-3-4 0-10z"/><path d="M44 88q3 6 0 10q-3-4 0-10z"/><path d="M62 98q3 6 0 10q-3-4 0-10z"/><path d="M82 96q3 6 0 10q-3-4 0-10z"/><path d="M34 106q3 6 0 10q-3-4 0-10z"/></g>',
  lemon: '<circle cx="60" cy="84" r="54" fill="#ffd93b"/><circle cx="60" cy="84" r="47" fill="#fffbe2"/><circle cx="60" cy="84" r="43" fill="#ffec7a"/><g stroke="#fffbe2" stroke-width="4" stroke-linecap="round"><path d="M60 84V43M60 84V125M60 84H17M60 84H103M60 84L30 54M60 84L90 114M60 84L90 54M60 84L30 114"/></g><circle cx="60" cy="84" r="6" fill="#fffbe2"/>',
  cheese: '<path d="M10 84L92 46l20 20z" fill="#ffe58a"/><path d="M10 84l102-18v62L10 140z" fill="#ffcf3f"/><g fill="#f2b72a"><circle cx="34" cy="106" r="9"/><circle cx="64" cy="98" r="6"/><circle cx="90" cy="112" r="10"/><circle cx="52" cy="128" r="5"/><circle cx="100" cy="84" r="4.5"/></g><ellipse cx="66" cy="64" rx="5" ry="2.5" fill="#f5c84a"/>',
  button: '<circle cx="60" cy="84" r="52" fill="COL"/><circle cx="60" cy="84" r="50" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="4"/><circle cx="60" cy="84" r="38" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/><g fill="#000" fill-opacity=".28"><circle cx="48" cy="72" r="6"/><circle cx="72" cy="72" r="6"/><circle cx="48" cy="96" r="6"/><circle cx="72" cy="96" r="6"/></g><path d="M48 72l24 24M72 72L48 96" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/><path d="M26 64a40 40 0 0 1 20-22" stroke="#fff" stroke-opacity=".45" stroke-width="5" fill="none" stroke-linecap="round"/>',
  icecream: '<clipPath id="cn"><path d="M34 80l26 74 26-74z"/></clipPath><path d="M34 80l26 74 26-74z" fill="#f3c27e"/><g clip-path="url(#cn)" stroke="#dca35b" stroke-width="2.5"><path d="M20 70l80 80M20 94l80 80M20 46l80 80M100 70l-80 80M100 94l-80 80M100 46l-80 80"/></g><circle cx="60" cy="74" r="28" fill="#bfead7"/><circle cx="60" cy="44" r="24" fill="#ffc1d6"/><g stroke-width="4" stroke-linecap="round"><path d="M50 34l4-3" stroke="#ffe08a"/><path d="M66 30l4 2" stroke="#a9d4fb"/><path d="M58 48l3 3" stroke="#fff"/><path d="M70 44l3-3" stroke="#ffe08a"/><path d="M46 50l3 2" stroke="#a9d4fb"/></g><circle cx="60" cy="18" r="7" fill="#ff5d73"/><path d="M60 12q3-8 9-10" stroke="#5fb85a" stroke-width="2.5" fill="none"/>',
  ade: '<defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a1"/><stop offset=".55" stop-color="#bfe6ff"/><stop offset="1" stop-color="#7cc4f2"/></linearGradient></defs><path d="M28 38h64l-6 110q-26 8-52 0z" fill="#f2faff" stroke="#cfe6f7" stroke-width="3"/><path d="M31 66h58l-4 80q-25 7-50 0z" fill="url(#ag)"/><rect x="38" y="72" width="17" height="17" rx="3" fill="#fff" opacity=".75" transform="rotate(-12 46 80)"/><rect x="58" y="90" width="16" height="16" rx="3" fill="#fff" opacity=".7" transform="rotate(14 66 98)"/><g fill="#fff" opacity=".85"><circle cx="46" cy="124" r="2.5"/><circle cx="70" cy="130" r="2"/><circle cx="58" cy="114" r="2"/><circle cx="74" cy="118" r="1.6"/></g><path d="M72 16l-8 112" stroke="#9fd3f5" stroke-width="6" stroke-linecap="round"/><circle cx="88" cy="40" r="15" fill="#ffd93b"/><circle cx="88" cy="40" r="11" fill="#fff4a8"/><path d="M88 40v-11M88 40h11M88 40l-8-8M88 40l8 8M88 40v11M88 40h-11" stroke="#ffd93b" stroke-width="1.5"/>',
  cake: '<path d="M12 70l60-22 36 24z" fill="#fffaf2"/><path d="M12 70l96 2v62l-96-4z" fill="#fff3e0"/><path d="M12 80l96 3v15l-96-3z" fill="#ffd98a"/><path d="M12 95l96 3v6l-96-3z" fill="#ff9fb5"/><path d="M12 101l96 3v18l-96-3z" fill="#ffd98a"/><circle cx="26" cy="96" r="3" fill="#ff5a6e"/><circle cx="62" cy="98" r="3" fill="#ff5a6e"/><circle cx="94" cy="100" r="3" fill="#ff5a6e"/><path d="M50 62q0-18 18-18t18 18q-18 6-36 0z" fill="#fff" stroke="#f3e6d3" stroke-width="2"/><g transform="translate(0 8)"><path d="M68 24c-10 2-14 14-8 22 4 4 12 4 16 0 6-8 2-20-8-22z" fill="#ff5a6e"/><path d="M62 26l6-7 6 7z" fill="#5fb85a"/><g fill="#ffe7a3"><circle cx="64" cy="34" r="1.3"/><circle cx="72" cy="34" r="1.3"/><circle cx="68" cy="41" r="1.3"/></g></g>',
  // 마카롱 두 개: 뒤(초록, 왼쪽 위) · 앞(노랑, 오른쪽 아래) — 접시 위에 놓인 느낌
  macaron: [['#c4e8b8', '#a6d89a', 46, 84, .8], ['#ffe39a', '#f6cc5c', 72, 114, .86]].map(([c1, c2, cx, cy, k]) =>
    `<g transform="translate(${cx - 60 * k} ${cy - 109 * k}) scale(${k})"><ellipse cx="60" cy="142" rx="44" ry="6" fill="#000" opacity=".08"/><path d="M14 104q0-26 46-26t46 26z" fill="${c1}"/><path d="M16 105h88" stroke="${c2}" stroke-width="5" stroke-dasharray="3 3"/><rect x="16" y="106" width="88" height="9" rx="4.5" fill="#fffaf0"/><path d="M16 117h88" stroke="${c2}" stroke-width="5" stroke-dasharray="3 3"/><path d="M14 118h92q0 22-46 22t-46-22z" fill="${c1}"/><path d="M30 92q8-6 18-7" stroke="#fff" stroke-opacity=".6" stroke-width="4" fill="none" stroke-linecap="round"/></g>`).join(''),
  mcice: '<clipPath id="cm"><path d="M34 82l26 72 26-72z"/></clipPath><path d="M34 82l26 72 26-72z" fill="#e9b877"/><g clip-path="url(#cm)" stroke="#c99550" stroke-width="2.5"><path d="M20 70l80 80M20 94l80 80M20 46l80 80M100 70l-80 80M100 94l-80 80M100 46l-80 80"/></g><circle cx="60" cy="62" r="32" fill="#a8e6cf"/><g fill="#5c3d2e"><rect x="42" y="64" width="7" height="5" rx="1.5" transform="rotate(20 45 66)"/><rect x="64" y="68" width="7" height="5" rx="1.5" transform="rotate(-15 67 70)"/><rect x="52" y="80" width="7" height="5" rx="1.5" transform="rotate(35 55 82)"/><rect x="74" y="78" width="6" height="5" rx="1.5"/><rect x="36" y="78" width="6" height="5" rx="1.5" transform="rotate(-25 39 80)"/></g><path d="M31 49A32 32 0 0 1 89 49C90 55 85 57 83 53 81 62 73 64 72 55 70 52 67 52 65 56 63 68 53 68 53 57 51 52 47 52 45 56 43 63 36 61 37 55 35 54 31 54 31 49z" fill="#6b4433"/><path d="M44 38q7-6 15-7" stroke="#fff" stroke-opacity=".35" stroke-width="4" fill="none" stroke-linecap="round"/>',
  pumpkin: '<path d="M59 56q-1-12 7-19" stroke="#5a7a2e" stroke-width="7" fill="none" stroke-linecap="round"/><ellipse cx="38" cy="98" rx="27" ry="44" fill="#ee8424"/><ellipse cx="82" cy="98" rx="27" ry="44" fill="#ee8424"/><ellipse cx="60" cy="98" rx="27" ry="47" fill="#ff9a35"/><g fill="#ffd84a"><ellipse cx="46" cy="88" rx="6" ry="8"/><ellipse cx="74" cy="88" rx="6" ry="8"/><path d="M44 104q16 14 32 0-16 7-32 0z"/></g><g fill="#fff" opacity=".7"><circle cx="44" cy="85" r="2"/><circle cx="72" cy="85" r="2"/></g><g fill="#ff6f61" opacity=".45"><ellipse cx="34" cy="100" rx="5" ry="3"/><ellipse cx="86" cy="100" rx="5" ry="3"/></g>',
  ghost: '<path d="M24 142V74a36 36 0 0 1 72 0v68l-12-10-12 10-12-10-12 10-12-10z" fill="#fbfbff" stroke="#d9dcef" stroke-width="3"/><g fill="#3b3a48"><ellipse cx="47" cy="78" rx="5" ry="7"/><ellipse cx="73" cy="78" rx="5" ry="7"/><ellipse cx="60" cy="98" rx="6" ry="8"/></g><g fill="#ffc1d6" opacity=".8"><ellipse cx="38" cy="90" rx="6" ry="3.5"/><ellipse cx="82" cy="90" rx="6" ry="3.5"/></g>',
  web: (() => {
    const cx = 60, cy = 66, R = [14, 26, 38, 50], n = 8, pt = (a, r) => [cx + r * Math.cos(a), cy + r * Math.sin(a)].map(v => v.toFixed(1));
    let d = '';
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 - Math.PI / 2; d += `M${cx} ${cy}L${pt(a, 54).join(' ')}`; }
    for (const r of R) for (let i = 0; i < n; i++) {
      const a1 = i / n * Math.PI * 2 - Math.PI / 2, a2 = (i + 1) / n * Math.PI * 2 - Math.PI / 2, mid = (a1 + a2) / 2;
      d += `M${pt(a1, r).join(' ')}Q${pt(mid, r * .82).join(' ')} ${pt(a2, r).join(' ')}`;
    }
    return `<path d="${d}" stroke="#c9c4d6" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M60 66V122" stroke="#c9c4d6" stroke-width="1.5"/><g stroke="#7a6a96" stroke-width="2.5" stroke-linecap="round" fill="none"><path d="M52 126l-10-6M52 131l-12 0M52 136l-10 6M68 126l10-6M68 131l12 0M68 136l10 6"/></g><ellipse cx="60" cy="131" rx="9" ry="10" fill="#7a6a96"/><circle cx="56.5" cy="128" r="1.8" fill="#fff"/><circle cx="63.5" cy="128" r="1.8" fill="#fff"/>`;
  })(),
  blood: '<path d="M58 26S24 78 24 102a34 34 0 0 0 68 0C92 78 58 26 58 26z" fill="#c8102e"/><path d="M40 98q0-14 8-24" stroke="#ff6b7d" stroke-width="5" fill="none" stroke-linecap="round" opacity=".75"/><path d="M96 118s-8 12-8 17a8 8 0 0 0 16 0c0-5-8-17-8-17z" fill="#a50d26"/>',
  cloud: '<path transform="translate(0 22) scale(.79)" d="M30 132c-18 0-26-16-20-30 4-10 14-14 22-12-2-22 16-40 38-36 10-16 36-16 46 4 14 2 20 14 16 26 12 4 16 18 10 30-4 10-12 18-26 18z" fill="#ffffff" stroke="#cfe3fb" stroke-width="4"/>',
};
// 고르는 목록은 묶음(세트) 위주. 세트에 든 개별 모양은 목록에서 뺐음 (예전에 골라둔 건 그대로 보임)
const COVER_SHAPES = [['book', '책'], ['button', '단추'], ['cloud', '구름'],
  ['picnic', '피크닉 (식빵·계란·토마토·치즈)'], ['mintchoco', '민트초코 (민트잎·초콜릿·아이스크림)'], ['fruit', '과일 (메론·딸기·수박·레몬)'],
  ['dessert', '디저트 (아이스크림·에이드·케이크·마카롱)'], ['halloween', '할로윈 (호박·유령·거미줄·핏방울)'], ['photo', '내 사진 추가']];
const SHAPE_MIX = { picnic: ['bread', 'egg', 'tomato', 'cheese'], mintchoco: ['leaf', 'choco', 'mcice'], halloween: ['pumpkin', 'ghost', 'web', 'blood'], fruit: ['melon', 'strawberry', 'watermelon', 'lemon'], dessert: ['icecream', 'ade', 'cake', 'macaron'] };
const shapeOf = (key, i) => SHAPE_MIX[key] ? SHAPE_MIX[key][i % SHAPE_MIX[key].length] : (SHAPE_SVG[key] ? key : null);
// 단추처럼 수업 색을 쓰는 모양은 COL 자리에 색을 넣음
const shapeUrl = (k, col) => svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">${SHAPE_SVG[k].replace(/COL/g, col || COURSE_COLORS[0])}</svg>`);
// 설정 미리보기: 묶음 모양은 2~4개를 한 칸에 모아서
function mixPreview(k, sk) {
  const mix = SHAPE_MIX[k];
  if (!mix) return { backgroundImage: shapeUrl(sk) };
  const pos = { 2: ['0 50%', '100% 50%'], 3: ['0 20%', '100% 20%', '50% 100%'], 4: ['0 0', '100% 0', '0 100%', '100% 100%'] }[mix.length];
  return { backgroundImage: mix.map(shapeUrl).join(','), backgroundSize: mix.map(() => '52% auto').join(','), backgroundPosition: pos.join(',') };
}
// 수업 표지 꾸미기: 사진(수업별) > 모양(전체 설정) > 책
function coverStyle(c, i) {
  const img = c.coverImg || (S.coverShape === 'photo' ? S.coverAll : null);
  if (img) return { cls: ' photo', art: true, style: { backgroundImage: `url("${img}")` } };
  const k = shapeOf(S.coverShape, i);
  if (k) return { cls: ' shaped', art: true, style: { backgroundImage: shapeUrl(k, c.color) } };
  return { cls: '', style: { background: c.color, color: inkOn(c.color) } };
}
// 사진을 줄여서 dataURL로 (표지·배경용)
async function shrinkImage(file, max, q = .82, type = 'image/jpeg') {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = h('canvas');
    cv.width = Math.round(img.naturalWidth * k);
    cv.height = Math.round(img.naturalHeight * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL(type, q);
  } finally { URL.revokeObjectURL(url); }
}
// 밝은 표지엔 진한 글씨
function inkOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return null;
  const n = parseInt(m[1], 16), [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return .2126 * r + .7152 * g + .0722 * b > .45 ? '#3b3a48' : null;
}

// 보기 서식: 언어 보기(공부 모드) · 영어 글자 서식 · 블록 간격(공부 모드)
function viewMenu(anchor, study) {
  const st = S.enStyle, cur = st.color || EN_COLORS[0], size = st.size || 0.92;
  const save = () => { applyLook(); savePrefs(); };
  const re = fn => { fn(); save(); closePop(); viewMenu(anchor, study); };
  const label = t => h('div', { class: 'menu-label' }, t);
  const gapVal = h('b', null, S.gap + 'px');
  popover(anchor, h('div', { class: 'view-menu' },
    study ? [label('언어 보기'), LANGS.map(([v, t]) => h('button', {
      class: 'menu-item check' + (S.lang === v ? ' on' : ''),
      onclick: () => { closePop(); S.lang = v; savePrefs(); App.renderToolbar(); Study.render(); },
    }, t))] : null,
    label('영어 글자 색 (모든 노트)'),
    h('div', { class: 'swatches' },
      EN_COLORS.map(c => h('button', {
        class: 'swatch' + (c === cur ? ' on' : ''), style: { background: c }, title: c === EN_COLORS[0] ? '기본 (남색)' : c,
        onclick: () => re(() => { st.color = c === EN_COLORS[0] ? null : c; }),
      })),
      h('label', { class: 'swatch custom' + (EN_COLORS.includes(cur) ? '' : ' on'), title: '직접 고르기', style: { background: EN_COLORS.includes(cur) ? '' : cur } },
        h('input', { type: 'color', value: cur, oninput: e => { st.color = e.target.value; e.target.parentElement.style.background = st.color; save(); } }))),
    label('영어 글자 크기 (한국어와 같이 보일 때)'),
    h('div', { class: 'seg pop-seg' }, EN_SIZES.map(([v, t]) => h('button', { class: v === size ? 'on' : '', onclick: () => re(() => { st.size = v === 0.92 ? null : v; }) }, t))),
    h('div', { class: 'pop-row' },
      h('button', { class: 'tb outlined' + (st.italic ? ' on' : ''), onclick: () => re(() => { st.italic = !st.italic; }) }, h('i', null, '기울임')),
      h('button', { class: 'tb outlined' + (st.bold ? ' on' : ''), onclick: () => re(() => { st.bold = !st.bold; }) }, h('b', null, '굵게'))),
    study ? [label('블록 사이 간격'),
      h('div', { class: 'pop-range' },
        h('input', { type: 'range', min: 0, max: 200, step: 2, value: S.gap, oninput: e => { S.gap = +e.target.value; gapVal.textContent = S.gap + 'px'; save(); } }),
        gapVal)] : null,
    h('button', { class: 'menu-item', onclick: () => re(() => { S.enStyle = {}; S.gap = DEFAULT_GAP; }) }, '기본값으로')));
}

// 노트 데이터 용량을 직접 계산 (글 + 이미지, 수업별 상위 3개)
async function dataUsage() {
  await Editor.flush();
  const MB = n => (n / 1048576).toFixed(1) + 'MB';
  const sizes = new Map();
  for (const rec of await DB.getAll('images')) sizes.set(rec.id, rec.blob ? rec.blob.size : 0);
  const textBytes = o => new Blob([JSON.stringify(o)]).size;
  const coverBytes = S.courses.reduce((a, c) => a + (c.coverImg ? c.coverImg.length : 0), 0);
  let total = textBytes(S.courses) - coverBytes;
  const per = S.courses.map(c => {
    const notes = App.notesOf(c.id), imgs = new Set();
    notes.forEach(n => n.blocks.forEach(b => b.image && imgs.add(b.image)));
    let n = textBytes(notes);
    imgs.forEach(id => { n += sizes.get(id) || 0; });
    return { name: c.name, n };
  });
  total += per.reduce((a, x) => a + x.n, 0);
  // 시스템 데이터: 노트 말고 꾸미기·설정·기록 (localStorage 글자 수는 대략 그대로 바이트로 셈)
  const ls = k => { try { const v = localStorage.getItem(k); return v ? new Blob([v]).size : 0; } catch (e) { return 0; } };
  const sys = [
    ['수업 표지 사진', coverBytes],
    ['전체 표지 사진', ls('sn-coverall')],
    ['배경 사진', ls('sn-bgphoto')],
    ['스터디 버디 이미지', sizes.get('buddy-img') || 0],
    ['스터디 버디 대사·설정', ls('sn-buddy')],
    ['캘린더 기록', ls('sn-cal')],
    ['AI 프롬프트 프리셋', ls('sn-prompts')],
    ['화면·타이머 설정', ls('sn-prefs') + ls('sn-timer') + ls('sn-prompt-last')],
  ].map(([name, n]) => ({ name, n }));
  const sysTotal = sys.reduce((a, x) => a + x.n, 0);
  return { total, sysTotal, notes: S.notes.length, images: [...sizes.keys()].filter(k => !String(k).startsWith('buddy-')).length,
    per: per.sort((a, b) => b.n - a.n), sys };
}
const fmtBytes = n => n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB';
// 용량 표: 전체 한 줄 + 수업별 막대
function usageEl() {
  const box = h('div', { class: 'usage' }, h('div', { class: 'hint' }, '계산 중…'));
  dataUsage().then(u => {
    const max = Math.max(1, ...u.per.map(x => x.n), ...u.sys.map(x => x.n));
    const row = x => h('div', { class: 'u-row' + (x.n ? '' : ' none') },
      h('span', { class: 'nm' }, x.name), h('span', { class: 'bar' }, h('i', { style: { width: (x.n ? Math.max(2, x.n / max * 100) : 0) + '%' } })),
      h('span', { class: 'sz' }, x.n ? fmtBytes(x.n) : '없음'));
    box.replaceChildren(
      h('div', { class: 'u-total' }, h('span', null, '이 사이트에 저장된 데이터'), h('b', null, '약 ' + fmtBytes(u.total + u.sysTotal))),
      h('div', { class: 'u-group' }, h('b', null, '노트 데이터'), h('span', { class: 'hint' }, `${fmtBytes(u.total)} · 노트 ${u.notes}개 · 이미지 ${u.images}개`)),
      ...(u.per.length ? u.per.slice(0, 8).map(row) : [h('div', { class: 'hint' }, '아직 수업 없음')]),
      u.per.length > 8 ? h('div', { class: 'hint' }, `외 ${u.per.length - 8}개 수업`) : '',
      h('div', { class: 'u-group' }, h('b', null, '시스템 데이터'), h('span', { class: 'hint' }, `${fmtBytes(u.sysTotal)} · 꾸미기 사진·버디·캘린더·설정`)),
      ...u.sys.map(row));
  }).catch(() => { box.replaceChildren(h('div', { class: 'hint' }, '확인 불가')); });
  return box;
}

/* ---------- 화면·타이머 설정을 전체 백업에 넣고 빼기 (버디·캘린더는 각자 따로) ---------- */
const TIMER_KEEP = ['place', 'mode', 'look', 'theme', 'custom', 'userThemes', 'scale', 'timerMin', 'focusMin', 'breakMin', 'x', 'y', 'min'];
function exportSettings() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem('sn-prefs') || '{}'); } catch (e) { /* ignore */ }
  delete p.mode;
  delete p.sbOpen;
  const timer = {};
  TIMER_KEEP.forEach(k => { if (Timer.st[k] !== undefined) timer[k] = Timer.st[k]; });
  return { prefs: p, bgPhoto: S.bgPhoto || null, coverAll: S.coverAll || null, timer };
}
function importSettings(d) {
  if (!d || typeof d !== 'object') return;
  const p = d.prefs || {};
  ['lang', 'showEn', 'bg', 'panel', 'dark', 'coverShape', 'calIcon', 'calSync', 'calCustom', 'userPresets', 'calPresets', 'pattern', 'patColor', 'coverPalette', 'gap', 'zoom'].forEach(k => { if (k in p) S[k] = p[k]; });
  if (p.logo) S.logo = Object.assign({}, p.logo);
  if (p.enStyle) S.enStyle = Object.assign({}, p.enStyle);
  if (p.laserColor) Laser.color = p.laserColor;
  if (p.laserWidth) Laser.width = p.laserWidth;
  if ('laserFinger' in p) Laser.finger = !!p.laserFinger;
  const keep = (key, val, field) => { if (!val) return; try { localStorage.setItem(key, val); } catch (e) { /* 용량 초과 시 이번 세션만 */ } S[field] = val; };
  keep('sn-bgphoto', d.bgPhoto, 'bgPhoto');
  keep('sn-coverall', d.coverAll, 'coverAll');
  if (d.timer) { TIMER_KEEP.forEach(k => { if (k in d.timer) Timer.st[k] = d.timer[k]; }); Timer.save(); Timer.place(); }
  savePrefs();
  applyLook();
}

// 설정 → 주의사항 · 문의
function infoPane() {
  const sec = (title, items) => [h('h4', { class: 'info-h' }, title), h('ul', { class: 'info-box' }, items.map(t => h('li', null, t)))];
  const link = (icon, name, url, shown) => h('a', { class: 'contact', href: url, target: '_blank', rel: 'noopener' },
    h('span', { class: 'ic' }, icon), h('span', { class: 'tx' }, h('b', null, name), h('span', null, shown)), h('span', { class: 'go' }, '↗'));
  return [
    sec('데이터 저장', [
      '모든 수업·노트·이미지는 서버가 아니라 지금 쓰는 브라우저 저장소(IndexedDB)에만 저장됩니다.',
      '브라우저의 방문 기록·웹사이트 데이터를 지우거나, 저장 공간이 부족해 브라우저가 정리하면 노트도 함께 날아갈 수 있습니다. 시크릿(사생활 보호) 창에서는 창을 닫으면 사라집니다.',
      '다른 기기·다른 브라우저와는 자동으로 공유되지 않습니다. 옮기려면 백업 파일을 쓰세요.']),
    sec('용량과 속도', [
      '이미지가 많은 노트가 쌓이면 사이트가 느려지거나 버벅일 수 있습니다.',
      '끝난 과목은 "수업 파일로 저장"으로 따로 보관한 뒤 사이트에서 지우고, 필요할 때 다시 불러오는 방식을 권장합니다.']),
    usageEl(),
    sec('백업', [
      '"전체 백업"은 모든 수업·노트·이미지·AI 프롬프트 프리셋에 화면 설정·타이머 설정·스터디 버디·캘린더 기록까지 .snote.json 파일 하나로 저장합니다.',
      '수업 하나만: 편집 모드에서 수업 옆 ⋯ → "수업 파일로 저장". 노트 하나만: 노트 옆 ⋯ → "프로젝트 파일로 저장".',
      '정기적으로 백업해서 iCloud·구글 드라이브 등 다른 곳에도 보관하세요. 수업·노트 파일(일부만 저장)에는 화면 설정과 캘린더가 들어가지 않습니다.',
      'PDF는 다시 불러와 편집할 수 없습니다. 이어서 편집하려면 .snote.json 파일로 저장하세요.']),
    sec('파일 열기', [
      '.snote.json 파일(노트·수업·전체 백업)을 여러 개 한 번에 열 수 있습니다.',
      '합치기: 같은 노트는 파일 내용으로 덮어쓰고, 없는 노트는 추가합니다. 파일에 없는 기존 노트는 그대로 둡니다.',
      '교체: 파일 단위로 바꿉니다. 전체 백업 파일로 교체하면 지금 있는 수업·노트가 모두 지워지고 파일 내용만 남습니다.',
      'AI가 정리한 HTML은 편집 모드의 "AI 정리 불러오기"로 넣습니다.']),
    sec('안내사항', [
      '업데이트 기록 등은 포스타입 및 트위터 참고.',
      '문의 및 제보는 포스타입 메시지 혹은 트위터(@shoongtbdp)로 부탁드립니다.',
      '취미 생활인지라 답장이 느릴 수 있습니다.']),
    h('h4', { class: 'info-h' }, '연락망'),
    link('📮', '포스타입', 'https://www.postype.com/@shoongtbdp', 'postype.com/@shoongtbdp'),
    link('🐦', '트위터', 'https://x.com/shoongtbdp', 'x.com/shoongtbdp'),
  ].flat();
}

// 타이머 색감: [키, 이름, 미리보기 색]
// 직접 고르기를 누르면 지금 색감의 이 네 가지 색에서 시작
const TIMER_BASE = {
  pastel: { main: '#f3b4c8', accent: '#f39ab5', paper: '#fffafc', ink: '#9a7bbf' }, mint: { main: '#9fd8c4', accent: '#6cc5a5', paper: '#fbfffd', ink: '#3f9a80' },
  lemon: { main: '#ecd57a', accent: '#f2c94c', paper: '#fffef6', ink: '#b08a22' }, sky: { main: '#a9c8ec', accent: '#7fa9df', paper: '#fafcff', ink: '#5b84b8' },
  mono: { main: '#bdbdbd', accent: '#777777', paper: '#ffffff', ink: '#555555' }, night: { main: '#4b4f80', accent: '#a7b0ff', paper: '#1d2040', ink: '#d6d9ff' },
};
const TIMER_THEMES = [['pastel', '파스텔', ['#f6b6ca', '#f39ab5', '#b9d2ec']], ['mint', '민트', ['#a8e6cf', '#6cc5a5', '#b5d8ef']],
  ['lemon', '레몬', ['#ffe27a', '#f2c94c', '#a9d6ec']], ['sky', '하늘', ['#a9c8ec', '#7fa9df', '#f3b2c6']],
  ['mono', '모노', ['#9e9e9e', '#777777', '#d6d6d6']], ['night', '밤', ['#1d2040', '#6b5fb5', '#a7b0ff']]];

const COURSE_COLORS = ['#4f5bd5', '#e0663c', '#2f8f6b', '#c2459a', '#3a8ec9', '#b8862b', '#7a56c2', '#52606d'];
// 표지 색 고르기용 (새 수업 자동 배정은 위 8색)
const COVER_COLORS = [...COURSE_COLORS, '#d93025', '#e8a33d', '#7cb342', '#00897b', '#1e88e5', '#5c6bc0', '#8d6e63', '#37474f',
  '#f28b82', '#fbbc04', '#81c995', '#78d9ec', '#a7c7fa', '#d7aefb', '#fdcfe8', '#c5b9a8'];

const App = {
  async init() {
    if (prefs.laserColor) Laser.color = prefs.laserColor;
    Laser.finger = !!prefs.laserFinger;
    if (prefs.laserWidth) Laser.width = prefs.laserWidth;
    applyLook();
    document.body.classList.toggle('sb-open', innerWidth > 900 && prefs.sbOpen !== false);
    try {
      [S.courses, S.notes] = await Promise.all([DB.getAll('courses'), DB.getAll('notes')]);
    } catch (err) {
      $('#page').append(h('div', { class: 'empty' }, '저장소(IndexedDB)를 열 수 없음. 사생활 보호 모드라면 일반 창에서 열어주세요.'));
      console.error(err);
      return;
    }
    S.courses.sort((a, b) => a.order - b.order);
    Editor.init();
    Laser.init();
    $('#page').addEventListener('click', e => Study.onClick(e));
    $('#sb-dim').addEventListener('click', () => this.toggleSidebar(false));
    // 크게 보기: Esc 또는 전체 화면이 풀리면 같이 끝
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.focus && !$('#modal-root').children.length) this.setFocus(false); });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && S.focus) this.setFocus(false); });
    addEventListener('hashchange', () => this.route());
    this.route();
    Cal.init();
    Timer.init();
    Buddy.init();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
    Images.gc(S.notes).catch(() => { });
  },

  /* ---------- 라우팅: #/c/<수업id>, #/n/<노트id> ---------- */
  route() {
    Editor.flush();
    const m = location.hash.match(/^#\/(c|n)\/(.+)$/);
    S.courseId = S.noteId = S.note = S.activeBlock = null;
    S.view = location.hash === '#/cal' ? 'cal' : null;
    if (m && m[1] === 'n') {
      const n = S.notes.find(x => x.id === m[2]);
      if (n) { S.note = n; S.noteId = n.id; S.courseId = n.courseId; }
    } else if (m && S.courses.some(c => c.id === m[2])) S.courseId = m[2];
    Editor.resetHistory();
    this.render();
    $('#scroller').scrollTop = 0;
    if (innerWidth <= 900) this.toggleSidebar(false);
  },
  go(kind, id) {
    const hash = kind ? `#/${kind}/${id}` : '#/';
    if (location.hash === hash) this.route(); else location.hash = hash;
  },
  // 크게 보기: 사이드바·상단바·플로팅·배경 무늬를 숨기고 공부 툴바와 노트만 (되면 전체 화면도)
  setFocus(on, quiet) {
    S.focus = !!on;
    document.body.classList.toggle('focus', S.focus);
    try {
      if (S.focus && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => { });
      if (!S.focus && document.fullscreenElement) document.exitFullscreen().catch(() => { });
    } catch (e) { /* 전체 화면이 안 되는 브라우저는 창 안에서만 */ }
    if (!quiet) this.renderToolbar();
  },
  setMode(mode) {
    Editor.flush();
    S.mode = mode;
    if (mode !== 'study' && Laser.on) Laser.toggle(false);
    savePrefs();
    this.render();
  },
  /* ---------- 설정 (화면 설정 · 주의사항) ---------- */
  openSettings(tab = 'look') {
    const tabs = h('div', { class: 'set-tabs' }), pane = h('div', { class: 'set-pane' });
    const show = t => {
      tab = t;
      tabs.replaceChildren(...[['look', '배경'], ['cal', '캘린더'], ['float', '플로팅'], ['info', '주의사항 · 문의']].map(([k, l]) =>
        h('button', { class: 'set-tab' + (k === tab ? ' on' : ''), onclick: () => show(k) }, l)));
      pane.replaceChildren(...(t === 'look' ? this.lookPane(() => show('look')) : t === 'float' ? this.floatPane(() => show('float')) : t === 'cal' ? this.calPane(() => show('cal')) : infoPane()).flat().filter(Boolean));
    };
    show(tab);
    openModal({ title: '설정', wide: true, body: h('div', null, tabs, pane), actions: [{ label: '닫기', kind: 'primary', onclick: close => close() }] });
  },
  lookPane(redraw) {
    const save = again => { applyLook(); savePrefs(); this.renderSidebar(); if (again) redraw(); };
    const head = (title, desc) => h('div', { class: 'set-row-head bar' }, h('b', null, title), desc ? h('span', { class: 'hint' }, desc) : null);
    // 색 고르기 줄: list 첫 색 = 기본(null로 저장)
    const swatchRow = (list, cur, set) => [
      list.map(c => h('button', { class: 'swatch' + (c === cur ? ' on' : ''), style: { background: c }, title: c === list[0] ? '기본' : c, onclick: () => set(c, true) })),
      h('label', { class: 'swatch custom' + (list.includes(cur) ? '' : ' on'), title: '직접 고르기', style: { background: list.includes(cur) ? '' : cur } },
        h('input', { type: 'color', value: cur, oninput: e => { e.target.parentElement.style.background = e.target.value; set(e.target.value); } }))];
    const row = (title, desc, list, key) => {
      const set = (c, again) => { S[key] = c && c !== list[0] ? c : null; save(again); };
      return h('div', { class: 'set-row' }, head(title, desc),
        h('div', { class: 'swatches' }, swatchRow(list, S[key] || list[0], set), h('button', { class: 'btn ghost', onclick: () => set(null, true) }, '기본값')));
    };
    const recolor = h('input', { type: 'checkbox', checked: true });
    const lg = S.logo;
    return [
      h('div', { class: 'set-row' }, head('무드 프리셋', '배경·무늬·사이드바·표식·수업 표지 색을 한 번에'),
        h('div', { class: 'presets' }, [...LOOK_PRESETS, ...S.userPresets].map(p => h('button', { class: 'preset' + (p.id ? ' mine' : ''), onclick: () => this.applyPreset(p, recolor.checked).then(() => redraw()) },
          h('span', { class: 'pv', style: Object.assign({ backgroundColor: p.bg }, patternStyle(p.pattern, p.patColor)) },
            h('span', { class: 'pv-side', style: { background: p.panel } }, h('i', { style: { background: p.logo } })),
            h('span', { class: 'pv-covers' }, (p.covers || COURSE_COLORS).slice(0, 3).map(c => h('i', { style: { background: c } })))),
          h('span', { class: 'nm' }, p.name),
          p.id ? h('span', { class: 'del', role: 'button', title: '이 프리셋 삭제', onclick: async e => {
            e.stopPropagation();
            if (!await askConfirm('프리셋 삭제', `"${p.name}" 프리셋을 삭제함.`, '삭제', true)) return;
            S.userPresets = S.userPresets.filter(x => x !== p);
            savePrefs();
            redraw();
          } }, '×') : null)),
          h('button', { class: 'preset add', title: '지금 화면 모양(색상·무늬·표지·표식 색·캘린더 아이콘)을 프리셋으로 저장', onclick: async () => {
            const name = await askText('현재 상태를 프리셋으로 저장', '', '프리셋 이름 (예: 시험기간)');
            if (!name) return;
            S.userPresets.push(this.currentPreset(name));
            savePrefs();
            toast(`"${name}" 프리셋 저장됨`);
            redraw();
          } }, h('span', { class: 'pv plus' }, '+'), h('span', { class: 'nm' }, '현재 상태 저장'))),
        h('label', { class: 'check' }, recolor, '수업 표지 색도 함께 바꾸기')),
      row('색상 1 · 배경', '노트 종이 뒤 바탕', BG_COLORS, 'bg'),
      row('색상 2 · 사이드바 · 상단바', '왼쪽 목록, 위쪽 막대와 툴바', PANEL_COLORS, 'panel'),
      h('label', { class: 'check set-dark' }, h('input', { type: 'checkbox', checked: S.dark, onchange: e => { S.dark = e.target.checked; save(true); } }),
        '어두운 화면 — 사이드바·상단바 글씨를 밝게 (색상 1·2를 어두운 색으로 쓸 때)'),
      h('div', { class: 'set-row' }, head('배경 무늬', '색상 1 위에 깔리는 무늬'),
        h('div', { class: 'pat-list' }, PATTERNS.map(([k, name]) => h('button', {
          class: 'pat' + ((S.pattern || 'none') === k ? ' on' : ''), title: name,
          style: Object.assign({ backgroundColor: S.bg || BG_COLORS[0] }, patternStyle(k, S.patColor)),
          onclick: async () => {
            if (k === 'photo' && !S.bgPhoto && !await this.pickBgPhoto()) return;
            S.pattern = k === 'none' ? null : k;
            save(true);
          },
        }, h('span', null, name)))),
        S.pattern === 'photo' ? h('div', { class: 'pop-row', style: { padding: '8px 0 0' } },
          h('button', { class: 'btn', onclick: async () => { if (await this.pickBgPhoto()) save(true); } }, '사진 바꾸기'),
          h('span', { class: 'hint' }, '화면 크기에 맞춰 꽉 차게 깔림. 이 기기에만 저장됨.')) : null,
        S.pattern && !FIXED_PATTERNS.includes(S.pattern) ? h('div', { class: 'swatches', style: { marginTop: '10px' } }, h('span', { class: 'hint' }, '무늬 색'),
          swatchRow(PAT_COLORS, S.patColor || PAT_COLORS[0], (c, again) => { S.patColor = c && c !== PAT_COLORS[0] ? c : null; save(again); })) : null),
      h('div', { class: 'set-row' }, head('수업 표지 모양', '책 대신 귀여운 모양으로. 수업 하나에만 사진을 넣으려면 수업 옆 ⋯ → 표지 꾸미기'),
        h('div', { class: 'shape-list' }, COVER_SHAPES.map(([k, name], i) => {
          const sk = shapeOf(k, 0);
          const sv = k === 'photo' ? h('span', { class: 'sv photo', style: S.coverAll ? { backgroundImage: `url("${S.coverAll}")` } : null }, S.coverAll ? '' : '📷')
            : h('span', { class: 'sv' + (sk ? '' : ' book'), style: sk ? mixPreview(k, sk) : { background: COURSE_COLORS[i % 8] } });
          return h('button', { class: 'shape' + (S.coverShape === k ? ' on' : ''), title: name, onclick: async () => {
            if (k === 'photo' && !S.coverAll && !await this.pickCoverAll()) return;
            S.coverShape = k; save(true); this.render();
          } }, sv, h('span', { class: 'nm' }, name.replace(/ \(.*\)/, '')));
        })),
        S.coverShape === 'photo' ? h('div', { class: 'pop-row', style: { padding: '8px 0 0' } },
          h('button', { class: 'btn', onclick: async () => { if (await this.pickCoverAll()) { save(true); this.render(); } } }, '사진 바꾸기'),
          h('span', { class: 'hint' }, '모든 수업 표지에 같은 사진. 수업마다 따로 넣은 사진이 있으면 그게 먼저.')) : null),
      h('div', { class: 'set-row' }, head('왼쪽 위 표식', '사이드바 맨 위 아이콘과 이름'),
        h('div', { class: 'logo-opts' },
          LOGO_ICONS.map(ic => h('button', { class: 'logo-opt' + ((lg.icon || 'book') === ic ? ' on' : ''), onclick: () => { lg.icon = ic === 'book' ? null : ic; save(true); } },
            ic === 'book' ? h('span', { class: 'logo-mark', style: { background: lg.color || 'var(--accent)' } }) : ic)),
          h('input', { class: 'inp logo-emoji', type: 'text', maxlength: 4, placeholder: '직접', value: lg.icon && !LOGO_ICONS.includes(lg.icon) ? lg.icon : '',
            title: '이모지나 글자 하나를 직접 입력', oninput: e => { lg.icon = [...e.target.value.trim()].slice(0, 2).join('') || null; save(); } })),
        !lg.icon ? h('div', { class: 'swatches', style: { marginTop: '10px' } }, h('span', { class: 'hint' }, '책 색'),
          swatchRow(LOGO_COLORS, lg.color || LOGO_COLORS[0], (c, again) => { lg.color = c && c !== LOGO_COLORS[0] ? c : null; save(again); })) : null,
        h('label', { class: 'field' }, h('span', null, '이름'),
          h('input', { type: 'text', value: lg.name || '', placeholder: '슝터디', maxlength: 20, oninput: e => { lg.name = e.target.value.trim() || null; save(); } }))),
      h('p', { class: 'hint' }, '무지개 칸을 누르면 원하는 색을 직접 고를 수 있음. 화면 설정은 "전체 백업" 파일에 함께 저장되고, 불러오면 그대로 돌아옴.'),
      h('p', { class: 'hint' }, '영어 글자 색·크기, 블록 사이 간격은 노트를 열었을 때 툴바의 "보기" 메뉴에서 바꿀 수 있음.'),
    ];
  },
  calPane(redraw) {
    const head = (title, desc) => h('div', { class: 'set-row-head bar' }, h('b', null, title), desc ? h('span', { class: 'hint' }, desc) : null);
    const save = () => { savePrefs(); if (S.view === 'cal') Cal.render(); redraw(); };
    const cc = S.calCustom, st = Cal.style();
    const swatchRow = (list, cur, set) => h('div', { class: 'swatches' },
      list.map(c => h('button', { class: 'swatch' + (c === cur ? ' on' : ''), style: { background: c }, onclick: () => set(c) })),
      h('label', { class: 'swatch custom' + (cur && !list.includes(cur) ? ' on' : ''), title: '직접 고르기', style: { background: cur && !list.includes(cur) ? cur : '' } },
        h('input', { type: 'color', value: cur || '#4f5bd5', onchange: e => set(e.target.value) })));
    // 미리보기: 공부 시간이 다른 7일
    const preview = h('div', { class: 'cal-card cal-preview', style: st.card ? { background: st.card, color: inkOn(st.card) ? '#2b2b2b' : '#f2f2f7' } : null },
      h('div', { class: 'cal-grid' }, [0, 20, 50, 90, 140, 200, 0].map((m, i) => h('div', {
        class: 'cal-cell' + (m ? ' has' : '') + (i === 3 ? ' today' : ''), style: m ? { background: hexA(st.heat, .12 + .55 * Math.min(1, m / 240)) } : null,
      }, h('span', { class: 'dn' }, i + 1), m ? h('span', { class: 'ic' }, st.icon) : null, m ? h('span', { class: 'tm' }, Cal.fmtShort(m * 60000)) : null))));
    const CAL_ICONS = ['✏️', '●', '✎', '📖', '⭐', '🍰', '🧺', '🍫', '🎃', '🌸', '🔥', '💯', '🐰', '☕'];
    return [
      h('div', { class: 'set-row' }, head('미리보기'), preview,
        h('button', { class: 'btn', style: { marginTop: '10px' }, title: '지금 보이는 캘린더 모양(색·아이콘·바탕색)을 저장', onclick: async () => {
          const name = await askText('현재 캘린더 모양 저장', '', '캘린더 프리셋 이름');
          if (!name) return;
          const cur = Cal.style();
          S.calPresets.push({ id: uid(), name, heat: cur.heat, icon: cur.icon, card: cur.card });
          // 저장한 프리셋을 바로 고를 수 있게 따로 설정으로
          if (S.calSync !== false) { S.calSync = false; Object.assign(cc, { heat: cur.heat, icon: cur.icon, card: cur.card }); }
          save();
          toast(`"${name}" 캘린더 프리셋 저장됨`);
        } }, '+ 현재 캘린더 모양을 프리셋으로 저장')),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: S.calSync !== false, onchange: e => {
        S.calSync = e.target.checked;
        // 처음 따로 설정할 때는 지금 모양에서 시작
        if (!S.calSync && !cc.heat) Object.assign(cc, { heat: S.logo.color || '#4f5bd5', icon: S.calIcon == null ? '✏️' : S.calIcon });
        save();
      } }), '배경(무드 프리셋)과 연동 — 프리셋을 바꾸면 캘린더 색·아이콘도 같이 바뀜'),
      S.calSync !== false ? h('p', { class: 'hint' }, '지금은 배경 탭의 무드 프리셋을 따라감. 체크를 끄면 캘린더만 따로 꾸밀 수 있음.') : [
        h('div', { class: 'set-row' }, head('프리셋에서 가져오기', '캘린더에만 적용'),
          h('div', { class: 'pt-themes' }, LOOK_PRESETS.map(p => h('button', { class: 'pt-theme', onclick: () => {
            Object.assign(cc, { heat: p.logo, icon: p.calIcon, card: p.dark ? p.panel : null });
            save();
          } }, h('span', { class: 'chips' }, h('i', { style: { background: p.logo } })), (p.calIcon || '') + ' ' + p.name))),
          S.calPresets.length ? h('div', { class: 'hint', style: { margin: '10px 0 4px' } }, '내 캘린더 프리셋') : '',
          S.calPresets.length ? h('div', { class: 'pt-themes' }, S.calPresets.map(p => h('button', { class: 'pt-theme', onclick: () => {
            Object.assign(cc, { heat: p.heat, icon: p.icon, card: p.card || null });
            save();
          } }, h('span', { class: 'chips' }, h('i', { style: { background: p.heat } }), p.card ? h('i', { style: { background: p.card } }) : ''), (p.icon || '') + ' ' + p.name,
            h('span', { class: 'del', role: 'button', title: '삭제', onclick: async e => {
              e.stopPropagation();
              if (!await askConfirm('캘린더 프리셋 삭제', `"${p.name}" 캘린더 프리셋을 삭제함.`, '삭제', true)) return;
              S.calPresets = S.calPresets.filter(x => x !== p);
              save();
            } }, '×')))) : ''),
        h('div', { class: 'set-row' }, head('칠하는 색', '공부한 날 칸 색 (오래 할수록 진하게)'),
          swatchRow(LOGO_COLORS, cc.heat || '#4f5bd5', c => { cc.heat = c; save(); })),
        h('div', { class: 'set-row' }, head('공부한 날 아이콘'),
          h('div', { class: 'logo-opts' },
            CAL_ICONS.map(ic => h('button', { class: 'logo-opt' + ((cc.icon == null ? '✏️' : cc.icon) === ic ? ' on' : ''), onclick: () => { cc.icon = ic; save(); } }, ic)),
            h('button', { class: 'logo-opt' + (cc.icon === '' ? ' on' : ''), title: '아이콘 없음', onclick: () => { cc.icon = ''; save(); } }, '✕'),
            h('input', { class: 'inp logo-emoji', type: 'text', maxlength: 4, placeholder: '직접', value: cc.icon && !CAL_ICONS.includes(cc.icon) ? cc.icon : '',
              onchange: e => { const v = [...e.target.value.trim()].slice(0, 2).join(''); if (v) { cc.icon = v; save(); } } }))),
        h('div', { class: 'set-row' }, head('달력 바탕색'),
          h('div', { class: 'swatches' },
            h('button', { class: 'swatch' + (!cc.card ? ' on' : ''), title: '기본 (사이드바 색)', style: { background: 'var(--panel)' }, onclick: () => { cc.card = null; save(); } }),
            swatchRow(['#ffffff', '#fff6fa', '#f2f8ff', '#f4fbef', '#fff9e6', '#f5f0ff', '#2b2238', '#1d2340'], cc.card || '', c => { cc.card = c; save(); })))],
    ];
  },
  floatPane(redraw) {
    const head = (title, desc) => h('div', { class: 'set-row-head' }, h('b', null, title), desc ? h('span', { class: 'hint' }, desc) : null);
    const st = Timer.st, set = (k, v) => { st[k] = v; Timer.save(); Timer.place(); redraw(); };
    return [
      h('h4', { class: 'info-h' }, '공부 타이머'),
      h('div', { class: 'set-row' }, head('표시 위치', '뽀모도로 · 타이머 · 스톱워치'),
        h('div', { class: 'seg' }, [['off', '끄기'], ['dock', '사이드바 아래'], ['float', '떠 있는 창']].map(([v, t]) =>
          h('button', { class: Timer.st.place === v ? 'on' : '', onclick: () => { Timer.setPlace(v); if (v === 'dock' && !document.body.classList.contains('sb-open')) this.toggleSidebar(true); redraw(); } }, t))),
        h('div', { class: 'hint', style: { marginTop: '6px' } }, '떠 있는 창은 제목 줄을 잡고 끌어서 옮길 수 있음. ⚙ 로 뽀모도로·타이머 시간 설정, − 로 접고, × 로 닫기.')),
      h('div', { class: 'set-row' }, head('크기', '타이머 오른쪽 아래 모서리를 끌어도 됨'),
        h('div', { class: 'pop-range', style: { padding: 0, maxWidth: '360px' } },
          h('input', { type: 'range', min: 60, max: 150, step: 5, value: Math.round((st.scale || 1) * 100), oninput: e => { Timer.setScale(+e.target.value / 100); e.target.nextSibling.textContent = e.target.value + '%'; Timer.save(); } }),
          h('b', null, Math.round((st.scale || 1) * 100) + '%'))),
      h('div', { class: 'set-row' }, head('모양'),
        h('div', { class: 'seg' }, [['pixel', '도트 (귀엽게)'], ['simple', '심플']].map(([v, t]) =>
          h('button', { class: (st.look || 'pixel') === v ? 'on' : '', onclick: () => set('look', v) }, t)))),
      h('div', { class: 'set-row' }, head('색감'),
        h('div', { class: 'pt-themes' }, TIMER_THEMES.map(([k, name, cols]) => h('button', {
          class: 'pt-theme' + ((st.theme || 'pastel') === k ? ' on' : ''), onclick: () => set('theme', k),
        }, h('span', { class: 'chips' }, cols.map(c => h('i', { style: { background: c } }))), name)),
          ...(st.userThemes || []).map(u => h('button', { class: 'pt-theme' + (st.theme === 'custom' && st.custom && st.custom.id === u.id ? ' on' : ''), onclick: () => {
            st.custom = Object.assign({}, u);
            set('theme', 'custom');
          } }, h('span', { class: 'chips' }, [u.main, u.accent, u.ink].map(c => h('i', { style: { background: c } }))), '★ ' + u.name,
            h('span', { class: 'del', role: 'button', title: '삭제', onclick: async e => {
              e.stopPropagation();
              if (!await askConfirm('타이머 색감 삭제', `"${u.name}" 색감을 삭제함.`, '삭제', true)) return;
              st.userThemes = st.userThemes.filter(x => x !== u);
              Timer.save();
              redraw();
            } }, '×'))),
          h('button', { class: 'pt-theme' + (st.theme === 'custom' && !(st.custom && st.custom.id) ? ' on' : ''), onclick: () => {
            // 지금 보고 있는 색감에서 시작해서 고침
            const from = st.theme === 'custom' && st.custom ? st.custom : TIMER_BASE[st.theme || 'pastel'] || TIMER_BASE.pastel;
            st.custom = { main: from.main, accent: from.accent, paper: from.paper, ink: from.ink };
            set('theme', 'custom');
          } }, h('span', { class: 'chips' }, h('i', { class: 'rainbow' })), '직접 고르기')),
        st.theme === 'custom' ? h('div', { class: 'pt-custom' }, [['main', '테두리 · 제목줄'], ['accent', '진행 막대 · 시작 버튼'], ['paper', '바탕'], ['ink', '글자']].map(([k, label]) =>
          h('label', { class: 'pt-pick' }, h('input', { type: 'color', value: st.custom[k], oninput: e => { st.custom[k] = e.target.value; delete st.custom.id; Timer.draw(); }, onchange: () => Timer.save() }), label))) : '',
        h('button', { class: 'btn', style: { marginTop: '10px' }, title: '지금 타이머 색감을 내 색감으로 저장', onclick: async () => {
          const name = await askText('현재 타이머 색감 저장', '', '색감 이름 (예: 딸기우유)');
          if (!name) return;
          const cur = st.theme === 'custom' && st.custom ? st.custom : TIMER_BASE[st.theme || 'pastel'] || TIMER_BASE.pastel;
          const u = { id: uid(), name, main: cur.main, accent: cur.accent, paper: cur.paper, ink: cur.ink };
          st.userThemes = [...(st.userThemes || []), u];
          st.custom = Object.assign({}, u);
          set('theme', 'custom');
          toast(`"${name}" 타이머 색감 저장됨`);
        } }, '+ 현재 색감을 프리셋으로 저장')),
      h('div', { class: 'set-row' }, head('오늘 공부한 시간', '타이머가 돌아간 시간 (뽀모도로 휴식 제외), 날짜가 바뀌면 자동으로 0부터'),
        h('div', { class: 'pop-row', style: { padding: 0, alignItems: 'center' } },
          h('b', { class: 'study-today' }, Timer.fmtStudy(Timer.studyMs())),
          h('button', { class: 'btn', onclick: async () => {
            if (!await askConfirm('오늘 공부 시간 초기화', '오늘 쌓인 공부 시간을 0으로 되돌림. 타이머는 그대로 둠.', '초기화', true)) return;
            Timer.resetStudy();
            Buddy.lastSayStudy = 0;
            redraw();
          } }, '초기화'))),
      h('h4', { class: 'info-h' }, '스터디 버디'),
      Buddy.settings(redraw),
    ];
  },
  async pickCoverAll() {
    const [f] = await pickFile('image/*');
    if (!f) return false;
    try {
      const url = await shrinkImage(f, 600, .82);
      localStorage.setItem('sn-coverall', url);
      S.coverAll = url;
      return true;
    } catch (e) { toast('사진을 저장할 수 없음 (용량이 너무 큼?)'); return false; }
  },
  async pickBgPhoto() {
    const [f] = await pickFile('image/*');
    if (!f) return false;
    try {
      const url = await shrinkImage(f, 1800, .8);
      localStorage.setItem('sn-bgphoto', url);
      S.bgPhoto = url;
      return true;
    } catch (e) { toast('사진을 저장할 수 없음 (용량이 너무 큼?)'); return false; }
  },
  // 지금 화면 모양을 무드 프리셋 형태로
  currentPreset(name) {
    const covers = S.courses.length ? S.courses.map(c => c.color) : S.coverPalette;
    return {
      id: uid(), name, bg: S.bg || BG_COLORS[0], panel: S.panel || PANEL_COLORS[0], pattern: S.pattern, patColor: S.patColor,
      logo: S.logo.color || LOGO_COLORS[0], dark: S.dark, shape: S.coverShape, calIcon: S.calIcon, covers: covers && covers.length ? covers.slice(0, 12) : null,
    };
  },
  async applyPreset(p, recolor) {
    Object.assign(S, { dark: !!p.dark, bg: p.bg === BG_COLORS[0] ? null : p.bg, panel: p.panel === PANEL_COLORS[0] ? null : p.panel, pattern: p.pattern, patColor: p.patColor, coverPalette: p.covers });
    S.logo.color = p.logo === LOGO_COLORS[0] ? null : p.logo;
    S.coverShape = p.shape || 'book';
    S.calIcon = p.calIcon;
    applyLook();
    savePrefs();
    if (recolor && S.courses.length) {
      const pal = p.covers || COURSE_COLORS;
      S.courses.forEach((c, i) => { c.color = pal[i % pal.length]; });
      await DB.putMany('courses', S.courses);
    }
    this.render();
    toast(`"${p.name}" 프리셋 적용됨`);
  },
  toggleSidebar(v) {
    document.body.classList.toggle('sb-open', v);
    savePrefs();
  },

  /* ---------- 데이터 ---------- */
  notesOf(courseId) { return S.notes.filter(n => n.courseId === courseId).sort((a, b) => a.order - b.order); },
  async ensureCourse(name, color) {
    let c = S.courses.find(x => x.name === name);
    if (c) return c;
    const pal = S.coverPalette || COURSE_COLORS;
    c = { id: uid(), name, color: color || pal[S.courses.length % pal.length], order: S.courses.length };
    S.courses.push(c);
    await DB.put('courses', c);
    return c;
  },
  async createNote(courseId, title, blocks = []) {
    const note = { id: uid(), courseId, title, order: this.notesOf(courseId).length, blocks, createdAt: Date.now(), updatedAt: Date.now() };
    S.notes.push(note);
    await DB.put('notes', note);
    return note;
  },
  async reorder(list, item, d, store) {
    const i = list.indexOf(item), j = i + d;
    if (j < 0 || j >= list.length) return;
    list.splice(i, 1);
    list.splice(j, 0, item);
    list.forEach((x, k) => { x.order = k; });
    await DB.putMany(store, list);
    if (store === 'courses') S.courses.sort((a, b) => a.order - b.order);
    this.render();
  },

  async addCourse() {
    const name = await askText('새 수업', '', '수업명 (예: 세포생물학)');
    if (!name) return;
    const c = await this.ensureCourse(name);
    this.go('c', c.id);
  },
  async addNote(courseId) {
    const title = await askText('새 노트', '', '챕터 제목 (예: Ch.1 Introduction)');
    if (!title) return;
    const note = await this.createNote(courseId, title, [newBlock('text')]);
    S.mode = 'edit';
    this.go('n', note.id);
  },
  async addSample() {
    const p = parseAIHtml(SAMPLE_HTML);
    const c = await this.ensureCourse(p.course);
    const note = await this.createNote(c.id, p.title, p.blocks);
    this.go('n', note.id);
  },

  courseMenu(anchor, c) {
    popMenu(anchor, [
      { label: '이름 변경', fn: async () => { const v = await askText('수업 이름 변경', c.name); if (v) { c.name = v; await DB.put('courses', c); this.render(); } } },
      { label: '표지 꾸미기 (색 · 사진)…', fn: () => setTimeout(() => this.coverColorMenu(anchor, c), 0) },
      { label: '수업 파일로 저장', fn: () => exportCourse(c) },
      { label: '위로', fn: () => this.reorder(S.courses, c, -1, 'courses') },
      { label: '아래로', fn: () => this.reorder(S.courses, c, 1, 'courses') },
      { label: '수업 삭제', danger: true, fn: async () => {
        const notes = this.notesOf(c.id);
        if (!await askConfirm('수업 삭제', `"${c.name}" 수업과 그 안의 노트 ${notes.length}개를 모두 삭제함. 되돌릴 수 없음.`, '삭제', true)) return;
        for (const n of notes) await DB.del('notes', n.id);
        await DB.del('courses', c.id);
        S.notes = S.notes.filter(n => n.courseId !== c.id);
        S.courses = S.courses.filter(x => x !== c);
        Images.gc(S.notes).catch(() => { });
        if (S.courseId === c.id) this.go(); else this.render();
      } },
    ]);
  },
  // 수업 표지 색: 고르면 바로 바뀌고, 무지개 칸으로 직접 지정
  coverColorMenu(anchor, c) {
    if (!document.contains(anchor)) anchor = $('#sidebar .sb-head');
    const save = async col => { c.color = col; await DB.put('courses', c); this.renderSidebar(); if (!S.noteId) this.renderHome(); };
    const known = COVER_COLORS.includes(c.color);
    const photo = async () => {
      closePop();
      const [f] = await pickFile('image/*');
      if (!f) return;
      c.coverImg = await shrinkImage(f, 520, .82);
      await DB.put('courses', c);
      this.render();
    };
    popover(anchor, [
      h('div', { class: 'menu-label' }, `"${c.name}" 표지 꾸미기`),
      h('div', { class: 'pop-row' },
        h('button', { class: 'tb outlined', onclick: photo }, c.coverImg ? '사진 바꾸기' : '📷 사진 넣기'),
        c.coverImg ? h('button', { class: 'tb outlined', onclick: async () => { closePop(); delete c.coverImg; await DB.put('courses', c); this.render(); } }, '사진 빼기') : null),
      h('div', { class: 'menu-label' }, '색 (사이드바 점 · 책 모양 표지)'),
      h('div', { class: 'swatches cover-swatches' },
        COVER_COLORS.map(col => h('button', { class: 'swatch' + (col === c.color ? ' on' : ''), style: { background: col }, onclick: () => { closePop(); save(col); } })),
        h('label', { class: 'swatch custom' + (known ? '' : ' on'), title: '직접 고르기', style: { background: known ? '' : c.color } },
          h('input', { type: 'color', value: c.color, oninput: e => { e.target.parentElement.style.background = e.target.value; save(e.target.value); } }))),
    ]);
  },
  noteMenu(anchor, n) {
    const list = this.notesOf(n.courseId);
    popMenu(anchor, [
      { label: '이름 변경', fn: async () => { const v = await askText('노트 이름 변경', n.title); if (v) { n.title = v; await DB.put('notes', n); this.render(); } } },
      { label: '위로', fn: () => this.reorder(list, n, -1, 'notes') },
      { label: '아래로', fn: () => this.reorder(list, n, 1, 'notes') },
      S.courses.length > 1 && { label: '다른 수업으로 이동…', fn: () => popMenuLater(anchor, S.courses.filter(c => c.id !== n.courseId).map(c => ({
        label: c.name, fn: async () => { n.courseId = c.id; n.order = this.notesOf(c.id).length; await DB.put('notes', n); this.render(); },
      }))) },
      { label: '복제', fn: async () => {
        await Editor.flush();
        const copy = JSON.parse(JSON.stringify(n));
        copy.blocks.forEach(b => { b.id = uid(); });
        const made = await this.createNote(n.courseId, n.title + ' (사본)', copy.blocks);
        made.page = copy.page;
        await DB.put('notes', made);
        this.render();
      } },
      { label: '프로젝트 파일로 저장', fn: () => exportProject(n) },
      { label: '노트 삭제', danger: true, fn: async () => {
        if (!await askConfirm('노트 삭제', `"${n.title}" 노트를 삭제함. 되돌릴 수 없음.`, '삭제', true)) return;
        await DB.del('notes', n.id);
        S.notes = S.notes.filter(x => x !== n);
        Images.gc(S.notes).catch(() => { });
        if (S.noteId === n.id) this.go('c', n.courseId); else this.render();
      } },
    ]);
  },

  /* ---------- 렌더 ---------- */
  render() {
    if (S.focus && !(S.note && S.mode === 'study')) this.setFocus(false, true); // 노트 공부 화면에서만
    document.body.dataset.mode = S.mode;
    $('#page').style.zoom = '';
    this.renderSidebar();
    this.renderTopbar();
    this.renderToolbar();
    if (S.note) (S.mode === 'edit' ? Editor : Study).render();
    else if (S.view === 'cal') Cal.render();
    else this.renderHome();
  },

  renderSidebar() {
    const sb = $('#sidebar'), edit = S.mode === 'edit';
    const more = fn => edit ? h('span', { class: 'more', role: 'button', onclick: e => { e.stopPropagation(); fn(e.currentTarget); } }, '⋯') : null;
    const tree = h('nav', { class: 'tree' },
      h('button', { class: 'tree-row' + (!S.courseId ? ' cur' : ''), onclick: () => this.go() }, h('span', { class: 'nm' }, '전체 수업')),
      S.courses.map(c => {
        const notes = this.notesOf(c.id), open = S.courseId === c.id;
        return [
          h('button', { class: 'tree-row' + (open && !S.noteId ? ' cur' : ''), onclick: () => this.go('c', c.id) },
            h('span', { class: 'dot', style: { background: c.color } }), h('span', { class: 'nm' }, c.name),
            h('span', { class: 'cnt' }, notes.length), more(a => this.courseMenu(a, c))),
          open ? notes.map(n => h('button', { class: 'tree-row tree-note' + (S.noteId === n.id ? ' cur' : ''), onclick: () => this.go('n', n.id) },
            h('span', { class: 'nm' }, n.title || '제목 없음'), more(a => this.noteMenu(a, n)))) : null,
          open && !notes.length ? h('div', { class: 'tree-empty' }, '노트 없음') : null,
        ];
      }));
    const y = sb.querySelector('.tree') ? sb.querySelector('.tree').scrollTop : 0;
    sb.innerHTML = '';
    const lg = S.logo;
    sb.append(h('div', { class: 'sb-head' },
      lg.icon ? h('span', { class: 'logo-icon' }, lg.icon) : h('span', { class: 'logo-mark', style: { background: lg.color || null } }),
      lg.name || '슝터디'), tree,
      // 전체 백업·파일 열기는 편집 모드에서만 (빈 칸은 남겨 둠: 사이드바 타이머·버디 자리 기준)
      h('div', { class: 'sb-foot' }, edit ? [
        h('button', { class: 'btn', title: '모든 수업·노트·이미지를 파일 하나로 저장', onclick: exportBackup }, '전체 백업'),
        h('button', { class: 'btn', title: '전체 백업·수업·노트 파일 열기 (여러 개 동시 선택 가능)', onclick: importProjectFile }, '파일 열기')] : null));
    tree.scrollTop = y;
    if (Buddy.el) Buddy.place();
    if (Timer.el) Timer.place();
  },

  renderTopbar() {
    const c = S.courses.find(x => x.id === S.courseId);
    const crumbs = [h('button', { onclick: () => this.go() }, '전체 수업')];
    if (c) crumbs.push(h('span', { class: 'sep' }, '›'), h('button', { onclick: () => this.go('c', c.id) }, c.name));
    if (S.note) crumbs.push(h('span', { class: 'sep' }, '›'), h('button', null, S.note.title || '제목 없음'));
    if (S.view === 'cal') crumbs.push(h('span', { class: 'sep' }, '›'), h('button', null, '캘린더'));
    const tb = $('#topbar');
    tb.innerHTML = '';
    tb.append(
      h('button', { class: 'icon-btn', title: '목록 열기/닫기', onclick: () => this.toggleSidebar() }, '☰'),
      h('div', { class: 'crumbs' }, crumbs),
      h('div', { class: 'seg' },
        h('button', { class: S.mode === 'study' ? 'on' : '', onclick: () => this.setMode('study') }, '공부'),
        h('button', { class: S.mode === 'edit' ? 'on' : '', onclick: () => this.setMode('edit') }, '편집')),
      h('button', { class: 'btn set-btn' + (S.view === 'cal' ? ' on' : ''), title: '공부 캘린더', onclick: () => (S.view === 'cal' ? this.go() : (location.hash = '#/cal')) }, '캘린더'),
      h('button', { class: 'btn set-btn', title: '설정 (화면 · 플로팅 · 주의사항)', onclick: () => this.openSettings() }, '⚙', h('span', null, ' 설정')));
  },

  renderToolbar() {
    const t = $('#toolbar');
    const keep = $('#save-status') ? $('#save-status').textContent : null;
    t.innerHTML = '';
    if (!S.note) return;
    t.append(...(S.mode === 'edit' ? Editor.toolbar() : Study.toolbar()).flat(Infinity).filter(Boolean));
    if (keep && $('#save-status')) $('#save-status').textContent = keep;
  },

  renderHome() {
    const page = $('#page'), edit = S.mode === 'edit';
    page.className = 'home';
    page.innerHTML = '';
    const importBtns = edit ? [
      h('button', { class: 'btn primary', onclick: openImportAI }, 'AI 정리 불러오기'),
      h('button', { class: 'btn', onclick: openPromptModal }, 'AI 프롬프트 복사'),
      h('button', { class: 'btn', onclick: importProjectFile }, '프로젝트 파일 열기')] : [];
    const c = S.courses.find(x => x.id === S.courseId);

    if (!c) {
      page.append(h('div', { class: 'home-head' }, h('h1', null, '내 수업'), importBtns));
      if (!S.courses.length) {
        page.append(h('div', { class: 'empty' },
          h('p', null, '아직 수업이 없음.'),
          h('p', null, edit ? 'AI로 정리한 HTML을 불러오거나, 새 수업을 만들어 시작하세요.' : '오른쪽 위에서 "편집" 모드로 바꾸면 자료를 불러오거나 새로 만들 수 있음.'),
          h('button', { class: 'btn', onclick: () => this.addSample() }, '샘플 노트로 둘러보기'),
          edit ? h('button', { class: 'btn primary', onclick: () => this.addCourse() }, '+ 새 수업') : null));
        return;
      }
      page.append(h('div', { class: 'grid' },
        S.courses.map((x, i) => {
          const cv = coverStyle(x, i), cnt = `노트 ${this.notesOf(x.id).length}개`;
          // 모양·사진 표지는 그림을 가리지 않게 이름을 아래에
          if (cv.art) return h('button', { class: 'cover' + cv.cls, onclick: () => this.go('c', x.id) },
            h('span', { class: 'art', style: cv.style }), h('span', { class: 'nm' }, x.name), h('span', { class: 'cnt' }, cnt));
          return h('button', { class: 'cover', style: cv.style, onclick: () => this.go('c', x.id) }, h('span', { class: 'nm' }, x.name), h('span', { class: 'cnt' }, cnt));
        }),
        edit ? h('button', { class: 'cover add', onclick: () => this.addCourse() }, '+ 새 수업') : null));
      return;
    }

    const notes = this.notesOf(c.id);
    page.append(h('div', { class: 'home-head' }, h('h1', null, c.name),
      edit ? h('button', { class: 'btn', onclick: () => this.addNote(c.id) }, '+ 빈 노트') : null, importBtns));
    if (!notes.length) {
      page.append(h('div', { class: 'empty' }, edit ? '노트 없음. 위 버튼으로 추가하세요.' : '노트 없음. "편집" 모드에서 추가할 수 있음.'));
      return;
    }
    page.append(h('div', { class: 'chapters' }, notes.map((n, i) => {
      const figs = n.blocks.filter(b => b.type === 'image'), missing = figs.filter(b => !b.image).length;
      return h('button', { class: 'chapter', onclick: () => this.go('n', n.id) },
        h('span', { class: 'no', style: { background: c.color, color: inkOn(c.color) } }, i + 1),
        h('span', { class: 'nm' }, n.title || '제목 없음',
          h('div', { class: 'meta' }, `블록 ${n.blocks.length}개 · 수정 ${fmtDate(n.updatedAt || n.createdAt)}` + (missing ? ` · 이미지 안 넣은 figure ${missing}개` : ''))),
        edit ? h('span', { class: 'icon-btn', role: 'button', onclick: e => { e.stopPropagation(); this.noteMenu(e.currentTarget, n); } }, '⋯') : null);
    })));
  },
};

// 메뉴 항목에서 다시 메뉴를 여는 경우 (닫힘 처리 뒤에 열리도록)
function popMenuLater(anchor, items) { setTimeout(() => popMenu(anchor, items), 0); }

const SAMPLE_HTML = `<article data-studynote="1" data-course="샘플: 세포생물학" data-chapter="Ch.3 막 수송 (Membrane transport)">
<section data-block="text"><div data-lang="ko"><h2>1. 수동 수송(Passive transport)</h2></div><div data-lang="en"><h2>1. Passive transport</h2></div></section>
<section data-block="text">
<div data-lang="ko"><h3>확산(Diffusion)</h3><ul>
<li><b>확산(diffusion)</b>: 농도 높은 곳 → 낮은 곳으로 분자 이동</li>
<li>에너지(ATP) 소모 없음 = <mark>수동 수송(passive transport)</mark></li>
<li>농도 기울기(concentration gradient)가 클수록 속도 증가</li></ul></div>
<div data-lang="en"><h3>Diffusion</h3><ul>
<li>Diffusion is the movement of molecules from an area of higher concentration to an area of lower concentration.</li>
<li>It requires no energy (ATP) and is therefore a form of passive transport.</li>
<li>The steeper the concentration gradient, the faster the rate of diffusion.</li></ul></div>
</section>
<section data-block="text">
<div data-lang="ko"><h3>삼투(Osmosis)</h3><ul>
<li><b>삼투(osmosis)</b>: 선택적 투과막(selectively permeable membrane)을 통한 물의 확산</li>
<li>물 이동 방향: <mark>저장액(hypotonic) → 고장액(hypertonic)</mark></li>
<li>등장액(isotonic): 물의 순이동(net movement) 없음</li></ul></div>
<div data-lang="en"><h3>Osmosis</h3><ul>
<li>Osmosis is the diffusion of water across a selectively permeable membrane.</li>
<li>Water moves from a hypotonic solution to a hypertonic solution.</li>
<li>In an isotonic solution there is no net movement of water.</li></ul></div>
</section>
<section data-block="figure" data-caption="Figure 3.4 (슬라이드 12) 용액 농도에 따른 적혈구 변화">
<div data-lang="ko"><ul><li>고장액: 물 유출 → 세포 수축(crenation)</li><li>저장액: 물 유입 → 용혈(lysis)</li></ul></div>
<div data-lang="en"><ul><li>Hypertonic: water leaves the cell, which shrivels (crenation).</li><li>Hypotonic: water enters the cell, which bursts (lysis).</li></ul></div>
</section>
<section data-block="text" data-fold="예시: 식물 세포">
<div data-lang="ko"><ul><li>저장액: 팽압(turgor pressure) 발생 → 정상 상태(turgid)</li><li>고장액: 원형질 분리(plasmolysis)</li></ul></div>
<div data-lang="en"><ul><li>In a hypotonic solution, turgor pressure builds up and the cell is turgid, which is the normal state.</li><li>In a hypertonic solution, plasmolysis occurs.</li></ul></div>
</section>
<section data-block="space" data-height="140"></section>
</article>`;

App.init();
