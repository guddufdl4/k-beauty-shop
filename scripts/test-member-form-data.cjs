const fs=require('fs'), vm=require('vm'), ts=require('typescript'), assert=require('assert/strict');
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/admin/member-form-data.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsObject});
const normalize=exportsObject.normalizeMemberDecision;
const single=new FormData();single.append('member_id','selected-one');single.append('member_id','selected-two');single.set('single_approve','detail-member');assert.equal(normalize(single),'detail-member');assert.deepEqual(single.getAll('member_id'),['detail-member']);assert.equal(single.get('decision'),'approve');
const mobile=new FormData();mobile.append('member_id','selected-one');mobile.append('member_id','selected-two');mobile.set('decision','mobile-grade');mobile.set('grade','normal');mobile.set('mobile_grade','vip');assert.equal(normalize(mobile),null);assert.equal(mobile.get('decision'),'grade');assert.equal(mobile.get('grade'),'vip');assert.deepEqual(mobile.getAll('member_id'),['selected-one','selected-two']);
const desktop=new FormData();desktop.set('decision','grade');desktop.set('grade','members');desktop.set('mobile_grade','vip');normalize(desktop);assert.equal(desktop.get('grade'),'members');
console.log('PASS detail approval targets one member only, mobile grade preserves bulk selection, desktop grade stays independent');
