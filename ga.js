(function(root){
const elements=['Co','Ni','Cu','Pd','Ag','Ir','Pt','Au'];
const totalGeneLimit=15;
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function csv(text){text=text.replace(/^\uFEFF/,'');let rows=[],row=[],s='',quoted=false;for(let i=0;i<text.length;i++){let c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){s+='"';i++;}else if(quoted||s==='')quoted=!quoted;else throw Error('CSVの引用符が不正です');}else if(c===','&&!quoted){row.push(s);s='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(s);if(row.some(x=>x.trim()))rows.push(row);row=[];s='';}else s+=c;}if(quoted)throw Error('CSVの引用符が閉じていません');row.push(s);if(row.some(x=>x.trim()))rows.push(row);if(rows.length<2)throw Error('CSVにデータ行が必要です');let h=rows.shift().map(x=>x.replace(/^\uFEFF/,'').trim());if(new Set(h).size!==h.length)throw Error('CSVの列名が重複しています');return rows.map((r,i)=>{if(r.length!==h.length)throw Error(`CSV ${i+2}行目の列数が不一致です`);return Object.fromEntries(h.map((k,j)=>[k,r[j].trim()]));});}
function number(v,label){if(v===undefined||String(v).trim()===''||!Number.isFinite(Number(v)))throw Error(label+'に数値が必要です');return Number(v);}
function validate(rows,min,max,mode,auMax=max){if(!rows.length)throw Error('実験結果を読み込んでください');let names=new Set();return rows.map((r,i)=>{if(!r.Sample||names.has(r.Sample))throw Error('Sampleは空欄不可・重複不可です');names.add(r.Sample);let genes=elements.map(e=>{let v=number(r[e],`${r.Sample} ${e}`);if(!Number.isInteger(v)||v<min||v>(e==='Au'?auMax:max))throw Error(`${r.Sample} ${e}：遺伝子の範囲外です`);return v;});let score=number(r.Score,`${r.Sample} Score`);let fitness=mode==='fitness'?number(r.Fitness,`${r.Sample} Fitness`):null;if(fitness!==null&&fitness<0)throw Error('Fitnessは0以上にしてください');return {...r,genes,Score:score,Fitness:fitness};});}
function isEligible(genes,min,max,auMax=max){
  return genes.length===elements.length &&
    genes.every((gene,index)=>Number.isSafeInteger(gene)&&gene>=min&&gene<=(elements[index]==='Au'?auMax:max)) &&
    genes.reduce((sum,gene)=>sum+gene,0)<=totalGeneLimit;
}

function randomSampler(min, caps, rand){
  // counts[index][budget] counts all suffixes whose sum is at most budget.
  const counts=Array.from({length:caps.length+1},()=>Array(totalGeneLimit+1).fill(0));
  counts[caps.length].fill(1);
  for(let index=caps.length-1;index>=0;index--){
    for(let budget=0;budget<=totalGeneLimit;budget++){
      for(let value=min;value<=Math.min(caps[index],budget);value++){
        counts[index][budget]+=counts[index+1][budget-value];
      }
    }
  }
  return ()=>{
    const genes=[];
    let budget=totalGeneLimit;
    for(const [index,cap] of caps.entries()){
      let draw=Math.floor(rand()*counts[index][budget]);
      let value=min;
      for(;value<=Math.min(cap,budget);value++){
        draw-=counts[index+1][budget-value];
        if(draw<0)break;
      }
      genes.push(value);
      budget-=value;
    }
    return genes;
  };
}

function generate(rows,o){
  const auMax=o.auMax??o.max;
  for(const key of ['min','max','random','crossover','mutation','elite','generation','seed']){
    if(!Number.isSafeInteger(o[key]))throw Error(key+'は整数にしてください');
  }
  if(o.min<0||o.max<=o.min||o.max>1000000)throw Error('遺伝子範囲は0以上、最大値は最小値より大きくしてください');
  if(!Number.isSafeInteger(auMax)||auMax<o.min||auMax>1000000)throw Error('Auの最大値は最小値以上の整数にしてください');
  if(o.min*elements.length>totalGeneLimit)throw Error('各元素の最小値だけで遺伝子合計15を超えます');
  for(const key of ['random','crossover','mutation','elite']){
    if(o[key]<0)throw Error('個体数は0以上にしてください');
  }
  if(o.generation<1||o.seed<0||o.seed>4294967295)throw Error('世代番号またはシードの範囲が不正です');
  if(!Number.isFinite(o.pressure)||o.pressure<0||o.pressure>100)throw Error('選択の強さは0〜100です');
  const n=o.random+o.crossover+o.mutation+o.elite;
  if(n<1||n>500)throw Error('合計個体数は1〜500です');

  const population=validate(rows,o.min,o.max,o.mode,auMax);
  const eligible=genes=>isEligible(genes,o.min,o.max,auMax);
  const elites=population.filter(p=>eligible(p.genes));
  if(o.elite>elites.length)throw Error('合計15以下の親がエリート指定数より少なくなっています。エリート数を下げてください');
  const scores=population.map(p=>p.Score);
  const lo=Math.min(...scores), hi=Math.max(...scores);
  let weights=population.map(p=>o.mode==='fitness'?p.Fitness:Math.exp(o.pressure*(hi===lo?0:(p.Score-lo)/(hi-lo))));
  const maxWeight=Math.max(...weights);
  weights=maxWeight?weights.map(w=>w/maxWeight):weights.map(()=>1);
  const total=weights.reduce((a,b)=>a+b,0);
  const rand=rng(o.seed);
  const pick=()=>{
    let draw=rand()*total;
    for(let i=0;i<population.length;i++){
      draw-=weights[i];
      if(draw<0)return population[i];
    }
    return population.at(-1);
  };
  const caps=elements.map(e=>e==='Au'?auMax:o.max);
  const sampleRandom=randomSampler(o.min,caps,rand);
  const mutable=caps.flatMap((cap,index)=>cap>o.min?[index]:[]);
  const seen=new Set(population.map(p=>p.genes.join(',')));
  const usedNames=new Set(population.map(p=>p.Sample));
  const output=[];

  function add(type,make,count){
    for(let i=0;i<count;i++){
      let result;
      for(let attempt=0;attempt<10000;attempt++){
        const candidate=make();
        if(eligible(candidate.genes)&&!seen.has(candidate.genes.join(','))){
          result=candidate;
          break;
        }
      }
      if(!result)throw Error(type+'：遺伝子合計15以下の未測定配合を指定数生成できません。個体数または親の構成を見直してください。');
      seen.add(result.genes.join(','));
      let serial=output.length+1;
      let name=`G${o.generation}-${serial}`;
      while(usedNames.has(name))name=`G${o.generation}-${++serial}`;
      usedNames.add(name);
      const {genes,...details}=result;
      const row={Sample:name,Type:type,Parent1:'',Parent2:'',Score:'',N_score:'',Fitness:'',Sum_fitness:'',Mutation_Rate:'',Mutation_Positions:'',Mutated_Gene_Numbers:'',Common_Genes:'',Non_Common_Genes:'',...details};
      elements.forEach((e,j)=>row[e]=genes[j]);
      output.push(row);
    }
  }

  add('Random',()=>({genes:sampleRandom()}),o.random);
  add('Crossover',()=>{
    const a=pick(), b=pick(), common=[], different=[];
    const genes=a.genes.map((value,j)=>{
      (value===b.genes[j]?common:different).push(elements[j]);
      return value===b.genes[j]||rand()<.5?value:b.genes[j];
    });
    return {genes,Parent1:a.Sample,Parent2:b.Sample,Common_Genes:common.join(';'),Non_Common_Genes:different.join(';')};
  },o.crossover);
  add('Mutation',()=>{
    const parent=pick();
    const genes=[...parent.genes], positions=[], values=[];
    const count=Math.min(mutable.length,rand()<.5?1:2);
    while(positions.length<count){
      const j=mutable[Math.floor(rand()*mutable.length)];
      if(!positions.includes(j))positions.push(j);
    }
    for(const j of positions){
      // Draw from the range with the old gene removed.
      let value=o.min+Math.floor(rand()*(caps[j]-o.min));
      if(value>=genes[j])value++;
      genes[j]=value;
      values.push(value);
    }
    return {genes,Parent1:parent.Sample,Mutation_Rate:(100*count/elements.length)+'%',Mutation_Positions:positions.map(j=>j+1).join(';'),Mutated_Gene_Numbers:values.join(';')};
  },o.mutation);
  elites.sort((a,b)=>b.Score-a.Score).sort((a,b)=>o.mode==='fitness'?b.Fitness-a.Fitness:b.Score-a.Score)
    .slice(0,o.elite).forEach(p=>{
      const row={Sample:p.Sample,Type:'Elite',Parent1:'',Parent2:'',Score:p.Score,N_score:'',Fitness:'',Sum_fitness:''};
      elements.forEach((e,j)=>row[e]=p.genes[j]);
      output.push(row);
    });
  return output;
}
function stringify(rows){let h=['Sample','Type','Parent1','Parent2',...elements,'Score','N_score','Fitness','Sum_fitness','Mutation_Rate','Mutation_Positions','Mutated_Gene_Numbers','Common_Genes','Non_Common_Genes'];let esc=v=>'"'+String(v??'').replaceAll('"','""')+'"';return '\uFEFF'+[h,...rows.map(r=>h.map(k=>r[k]??''))].map(r=>r.map(esc).join(',')).join('\r\n');}
const api={elements,totalGeneLimit,randomSampler,isEligible,rng,csv,generate,stringify,validate};if(typeof module!=='undefined')module.exports=api;else root.GA=api;
})(globalThis);
