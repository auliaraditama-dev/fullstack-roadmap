import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  downloadModule,
  installed,
  removeModule,
  validateManifest,
  type OfflineFile,
} from '../../src/lib/offline';

const stores = new Map<string, Map<string, Response>>();
let quota = false;
const path = (key: string | Request): string => typeof key === 'string' ? key : new URL(key.url).pathname;

beforeEach(() => {
  stores.clear();
  quota = false;
  vi.stubGlobal('caches', {
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map());
      const items = stores.get(name)!;
      return {
        async match(key: string | Request) {
          return items.get(path(key))?.clone();
        },
        async put(key: string | Request, value: Response) {
          if (quota && name.startsWith('fs-module-')) throw new DOMException('Quota', 'QuotaExceededError');
          items.set(path(key), value.clone());
        },
        async keys() {
          return [...items.keys()].map((key) => new Request(`https://local.test${key}`));
        },
        async delete(key: string | Request) {
          return items.delete(path(key));
        },
      };
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name: string) {
      return stores.delete(name);
    },
  });
  vi.stubGlobal('fetch', vi.fn(async () => new Response('materi')));
});

afterEach(() => vi.unstubAllGlobals());

async function file(): Promise<OfflineFile> {
  const bytes = new TextEncoder().encode('materi');
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return { url: '/lesson/', bytes: bytes.length, hash };
}

it('commit hanya sesudah seluruh dependensi lengkap', async () => {
  const asset = await file();
  const progress: number[] = [];
  await downloadModule({ id: 'a', title: 'A', files: [asset] }, 'a1b2c3d4', [asset], (done) => progress.push(done));
  expect(progress).toEqual([1]);
  expect((await installed()).a).toContain('-a1b2c3d4-');
});

it('update terputus mempertahankan paket lama', async () => {
  const asset = await file();
  const module = { id: 'a', title: 'A', files: [asset] };
  await downloadModule(module, 'a1b2c3d4', [], () => {});
  const old = (await installed()).a;
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Offline'); }));
  await expect(downloadModule(module, 'b2c3d4e5', [], () => {})).rejects.toThrow('Offline');
  expect((await installed()).a).toBe(old);
  expect([...stores.keys()].some((key) => key.includes('-b2c3d4e5-'))).toBe(false);
});

it('storage penuh dan hash salah tidak membuat pointer siap', async () => {
  const asset = await file();
  quota = true;
  await expect(downloadModule({ id: 'a', title: 'A', files: [asset] }, 'a1b2c3d4', [], () => {}))
    .rejects.toMatchObject({ name: 'QuotaExceededError' });
  expect(await installed()).toEqual({});

  quota = false;
  await expect(downloadModule({ id: 'a', title: 'A', files: [{ ...asset, hash: 'b'.repeat(64) }] }, 'a1b2c3d4', [], () => {}))
    .rejects.toThrow('berubah');
  expect(await installed()).toEqual({});
});

it('pembatalan dan hapus modul hanya menyentuh cache materi', async () => {
  const asset = await file();
  const abort = new AbortController();
  abort.abort();
  await expect(downloadModule({ id: 'a', title: 'A', files: [asset] }, 'a1b2c3d4', [], () => {}, abort.signal)).rejects.toThrow();
  await downloadModule({ id: 'a', title: 'A', files: [asset] }, 'a1b2c3d4', [], () => {});
  await removeModule('a');
  expect(await installed()).toEqual({});
  expect([...stores.keys()].filter((key) => key.startsWith('fs-module-'))).toEqual([]);
});

it('cache kehilangan file tidak dinyatakan siap dan pointer dibersihkan', async () => {
  const asset = await file();
  await downloadModule({ id: 'a', title: 'A', files: [asset] }, 'a1b2c3d4', [], () => {});
  const name = (await installed()).a!;
  stores.get(name)!.delete(asset.url);
  expect(await installed()).toEqual({});
  expect(stores.get('fs-installed')?.size).toBe(0);
});

it('hanya mempertahankan generasi aktif dan satu generasi sebelumnya', async () => {
  const asset = await file();
  const module = { id: 'a', title: 'A', files: [asset] };
  await downloadModule(module, 'a1b2c3d4', [], () => {});
  await downloadModule(module, 'b2c3d4e5', [], () => {});
  await downloadModule(module, 'c3d4e5f6', [], () => {});
  const generations = [...stores.keys()].filter((key) => key.startsWith('fs-module-a-'));
  expect(generations).toHaveLength(2);
  expect(generations.some((key) => key.includes('-a1b2c3d4-'))).toBe(false);
});

it('manifest menolak versi, ID modul, hash, dan duplikasi yang tidak valid', async () => {
  const asset = await file();
  expect(() => validateManifest({ version: 'v1', shell: [], modules: [] })).toThrow();
  expect(() => validateManifest({ version: 'a1b2c3d4', shell: [], modules: [{ id: '../a', title: 'A', files: [asset] }] })).toThrow();
  expect(() => validateManifest({ version: 'a1b2c3d4', shell: [{ ...asset, hash: 'bad' }], modules: [] })).toThrow();
  expect(() => validateManifest({
    version: 'a1b2c3d4',
    shell: [],
    modules: [{ id: 'a', title: 'A', files: [asset] }, { id: 'a', title: 'B', files: [asset] }],
  })).toThrow('duplikat');
});

it('cleanup gagal tidak menghapus paket yang sudah committed', async () => {
 const asset = await file();
 const module = {id:'a',title:'A',files:[asset]};
 await downloadModule(module,'a1b2c3d4',[],()=>{});
 await downloadModule(module,'b2c3d4e5',[],()=>{});
 vi.spyOn(caches,'delete').mockRejectedValueOnce(new Error('Cache busy'));
 await downloadModule(module,'c3d4e5f6',[],()=>{});
 expect((await installed()).a).toContain('-c3d4e5f6-');
});
it('dua unduhan serentak selesai tanpa saling menghapus staging', async () => {
 const asset = await file();
 const module = {id:'a',title:'A',files:[asset]};
 await Promise.all(['a1b2c3d4','b2c3d4e5','c3d4e5f6'].map(version=>downloadModule(module,version,[],()=>{})));
 expect((await installed()).a).toBeTruthy();
 expect([...stores.keys()].filter(key=>key.startsWith('fs-module-a-'))).toHaveLength(2);
});

it('menghapus modul a tidak menghapus modul a-b',async()=>{
 const asset=await file();
 await downloadModule({id:'a',title:'A',files:[asset]},'a1b2c3d4',[],()=>{});
 await downloadModule({id:'a-b',title:'AB',files:[asset]},'a1b2c3d4',[],()=>{});
 await removeModule('a');
 expect((await installed())['a-b']).toBeTruthy();
});
