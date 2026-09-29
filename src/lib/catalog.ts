import catalog from '../data/catalog.json';
import parts from '../data/parts.json';
export {catalog,parts};
export const summaries=catalog.map(({id,title,url,part,chapter})=>({id,title,url,part,chapter}));
export const checkpoints=['Saya bisa menjelaskan konsep tanpa catatan.','Saya bisa membuat contoh dari nol.','Saya bisa membaca error dan menemukan lapisannya.','Saya bisa mengubah requirement.','Saya bisa menguji hasil dan kasus gagal.','Saya bisa menjelaskan trade-off.','Project tersimpan di Git.','README dapat digunakan orang lain.'];
