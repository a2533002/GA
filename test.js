const assert=require('node:assert/strict'),GA=require('./ga.js');
let random=GA.rng(18);let sample=GA.randomSampler(0,GA.elements.map(()=>10),random);let rows=Array.from({length:38},(_,i)=>({Sample:`G0-${i+1}`,Score:i,...Object.fromEntries(sample().map((gene,j)=>[GA.elements[j],gene]))}));let o={min:0,max:10,random:6,crossover:18,mutation:6,elite:8,generation:1,pressure:5,seed:42,mode:'score'};
let out=GA.generate(rows,o);assert.equal(out.length,38);assert.deepEqual(out,GA.generate(rows,o));assert.equal(new Set(out.map(r=>r.Sample)).size,38);
for(const row of out)assert(GA.isEligible(GA.elements.map(e=>row[e]),0,10));
assert.equal(GA.isEligible([2,2,2,2,2,2,2,1],0,2),true);
assert.equal(GA.isEligible([2,2,2,2,2,2,2,2],0,2),false);
assert.equal(GA.isEligible([0,0,0,0,0,0,0,3],0,2),false);
assert.throws(()=>GA.validate([{...rows[0],Au:11}],0,10,'score'),/Au：遺伝子の範囲外/);
let old=new Set(rows.map(r=>GA.elements.map(e=>r[e]).join(','))),novel=out.filter(r=>r.Type!=='Elite');assert.equal(new Set(novel.map(r=>GA.elements.map(e=>r[e]).join(','))).size,30);for(let r of novel)assert(!old.has(GA.elements.map(e=>r[e]).join(',')));
for(let r of out.filter(r=>r.Type==='Crossover')){let a=rows.find(p=>p.Sample===r.Parent1),b=rows.find(p=>p.Sample===r.Parent2);for(let e of GA.elements)assert([a[e],b[e]].includes(r[e]));}
for(let r of out.filter(r=>r.Type==='Mutation')){let p=rows.find(p=>p.Sample===r.Parent1),changed=GA.elements.filter(e=>p[e]!==r[e]);assert.equal(changed.length,r.Mutation_Rate===`${100/GA.elements.length}%`?1:2);}
assert.deepEqual(out.filter(r=>r.Type==='Elite').map(r=>r.Score),[37,36,35,34,33,32,31,30]);assert.equal(GA.csv(GA.stringify(out)).length,38);
assert.throws(()=>GA.generate(rows.map(r=>({...r,Score:''})),o));assert.throws(()=>GA.generate(rows.map(r=>({...r,Fitness:-1})),{...o,mode:'fitness'}));assert.equal(GA.generate(rows.map(r=>({...r,Score:1})),o).length,38);
assert.throws(()=>GA.generate([rows[0]],{...o,random:0,mutation:0,elite:0,crossover:1}));console.log('GA checks passed: counts, uniqueness, deterministic seed, crossover, mutation, elites, CSV, invalid inputs, equal scores, impossible crossover');
