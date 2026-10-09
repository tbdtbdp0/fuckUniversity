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

const Images = {
  cache: new Map(),
  async url(id) {
    if (!id) return null;
    if (this.cache.has(id)) return this.cache.get(id);
    const rec = await DB.get('images', id);
    if (!rec) return null;
    const u = URL.createObjectURL(rec.blob);
    this.cache.set(id, u);
    return u;
  },
  async add(blob, id = uid()) {
    await DB.put('images', { id, blob, type: blob.type });
    return id;
  },
  // 어떤 노트에서도 쓰지 않는 이미지 정리
  async gc(notes) {
    const used = new Set();
    notes.forEach(n => n.blocks.forEach(b => b.image && used.add(b.image)));
    // 'buddy-'로 시작하는 건 스터디 버디 이미지 (노트와 상관없이 보관)
    for (const k of await DB.keys('images')) if (!used.has(k) && !String(k).startsWith('buddy-')) await DB.del('images', k);
  },
};
