import{describe,it,expect}from'vitest';import{checklistCompletion,validQuizAnswers,emptyData,parseBackup,completion,advanceStatus,migrateData,searchEntries}from'../../src/lib/model';import{uniqueFiles,validOfflineUrl}from'../../src/lib/offline';
describe('progress dan migrasi',()=>{it('membaca tidak menaikkan kompetensi',()=>{const d=emptyData();d.progress.a={status:'read',updatedAt:new Date().toISOString()};expect(completion(d,['a','b'])).toBe(0);d.progress.a.status='completed';expect(completion(d,['a','b'])).toBe(50);expect(completion(d,[])).toBe(0);expect(advanceStatus('completed','read')).toBe('completed');});it('membuat schema awal tanpa kehilangan data valid',()=>{expect(migrateData(undefined).version).toBe(1);const d=emptyData();d.notes.push({lessonId:'bab-01',text:'Pemahaman saya',updatedAt:new Date().toISOString()});expect(migrateData(d).notes).toEqual(d.notes);expect(()=>migrateData({version:2})).toThrow();});});
describe('backup',()=>{it('roundtrip seluruh data',()=>{const d=emptyData();d.checkpoints['bab-01:0']=true;d.milestones['week-1:0']=true;d.exercises['bab-01:0']=true;d.quizzes.orientasi={answers:[1,0],score:50,updatedAt:new Date().toISOString()};expect(parseBackup(JSON.stringify(d))).toEqual(d);});it('menolak payload rusak dan URL eksternal',()=>{expect(()=>parseBackup('{')).toThrow();const d=emptyData();d.bookmarks.push({id:'a',lessonId:'a',title:'test',url:'//evil.test',type:'materi',updatedAt:new Date().toISOString()});expect(()=>parseBackup(JSON.stringify(d))).toThrow();const encoded=emptyData();encoded.bookmarks.push({id:'b',lessonId:'b',title:'encoded',url:'/aman/%2e%2e/private',type:'materi',updatedAt:new Date().toISOString()});expect(()=>parseBackup(JSON.stringify(encoded))).toThrow();});it('menolak duplicate notes dan unknown field',()=>{const d=emptyData();const n={lessonId:'a',text:'x',updatedAt:new Date().toISOString()};d.notes=[n,n];expect(()=>parseBackup(JSON.stringify(d))).toThrow();expect(()=>parseBackup(JSON.stringify({...emptyData(),secret:'x'}))).toThrow();});});
describe('search dan offline',()=>{it('memprioritaskan judul dan menuntut seluruh kata',()=>{const entries=[{id:'a',title:'HTTP',url:'/a/',part:'web',type:'Materi',text:'Authorization request'},{id:'b',title:'Authorization',url:'/b/',part:'web',type:'Materi',text:'HTTP request'}];expect(searchEntries(entries,'authorization')[0]?.id).toBe('b');expect(searchEntries(entries,'HTTP tidakada')).toHaveLength(0);expect(searchEntries(entries,'')).toHaveLength(0);});it('manifest deduplicated dan tidak mengunduh private API',()=>{const f={url:'/a/',bytes:20,hash:'a'.repeat(64)};expect(uniqueFiles([f,f])).toHaveLength(1);expect(validOfflineUrl('//evil.test')).toBe(false);expect(validOfflineUrl('/api/private')).toBe(false);expect(validOfflineUrl('/safe/%2e%2e/private')).toBe(false);expect(()=>uniqueFiles([{...f,url:'/../private'}])).toThrow();});});

describe('data belajar setelah import',()=>{
 it('menghitung hanya milestone yang dikenal dan unik',()=>{
  expect(checklistCompletion({'week-1:0':true,'week-1:999':true,'level-999:0':true},['week-1:0','week-1:1','week-1:0'])).toBe(50);
  expect(checklistCompletion({'week-1:0':true},[])).toBe(0);
 });
 it('memulihkan hanya jawaban yang cocok dengan pilihan quiz saat ini',()=>{
  expect(validQuizAnswers([0,2],[3,3])).toBe(true);
  expect(validQuizAnswers([0,9],[3,3])).toBe(false);
  expect(validQuizAnswers([0],[3,3])).toBe(false);
  expect(validQuizAnswers([-1,0],[3,3])).toBe(false);
  expect(validQuizAnswers([0.5,0],[3,3])).toBe(false);
 });
});
