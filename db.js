'use strict';

// IndexedDB: courses(수업) / notes(챕터 노트) / images(figure 원본 Blob)
const DB = (() => {
  let dbp;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('studynote', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore('courses', { keyPath: 'id' });
        d.createObjectStore('notes', { keyPath: 'id' }).createIndex('courseId', 'courseId');
        d.createObjectStore('images', { keyPath: 'id' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function run(store, mode, fn) {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      let out;
      const rq = fn(t.objectStore(store));
      if (rq) rq.onsuccess = () => { out = rq.result; };
      t.oncomplete = () => res(out);
      t.onerror = t.onabort = () => rej(t.error);
    });
  }
  return {
    get: (s, id) => run(s, 'readonly', o => o.get(id)),
    getAll: s => run(s, 'readonly', o => o.getAll()),
    keys: s => run(s, 'readonly', o => o.getAllKeys()),
    put: (s, v) => run(s, 'readwrite', o => o.put(v)),
    putMany: (s, arr) => run(s, 'readwrite', o => { arr.forEach(v => o.put(v)); }),
    del: (s, id) => run(s, 'readwrite', o => o.delete(id)),
    clear: s => run(s, 'readwrite', o => o.clear()),
  };
})();

// 이미지 블록의 사진 목록 (예전 노트는 image 하나). image에는 첫 장을 같이 둬서 예전 파일 형식과도 맞춤
const imgsOf = b => Array.isArray(b.images) ? b.images : (b.image ? [b.image] : []);
function setImgs(b, list) { b.images = list; b.image = list[0] || null; }

const Images = {
  cache: new Map(),
  dims: new Map(), // id → [가로, 세로]: 다시 그릴 때 자리를 미리 잡아서 화면이 안 튀게
  async url(id) {
    if (!id) return null;
    if (this.cache.has(id)) return this.cache.get(id);
    const rec = await DB.get('images', id);
    if (!rec) return null;
    const u = URL.createObjectURL(rec.blob);
    this.cache.set(id, u);
    return u;
  },
  // <img> 만들기. img._ready = 다 뜨면(또는 실패하면) 끝나는 Promise
  img(id, attrs) {
    const img = h('img', attrs), d = this.dims.get(id);
    if (d) { img.width = d[0]; img.height = d[1]; }
    img._ready = new Promise(res => {
      img.addEventListener('load', () => { this.dims.set(id, [img.naturalWidth, img.naturalHeight]); res(); }, { once: true });
      img.addEventListener('error', res, { once: true });
      this.url(id).then(u => { if (u) img.src = u; else res(); }, res);
    });
    return img;
  },
  async add(blob, id = uid()) {
    await DB.put('images', { id, blob, type: blob.type });
    return id;
  },
  // 어떤 노트에서도 쓰지 않는 이미지 정리
  async gc(notes) {
    const used = new Set();
    notes.forEach(n => n.blocks.forEach(b => imgsOf(b).forEach(id => used.add(id))));
    // 'buddy-'로 시작하는 건 스터디 버디 이미지 (노트와 상관없이 보관)
    for (const k of await DB.keys('images')) if (!used.has(k) && !String(k).startsWith('buddy-')) await DB.del('images', k);
  },
};
