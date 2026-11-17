const $=id=>document.getElementById(id);let rows=[],output=[],history=[];
const fields=[['generation','次世代番号',1],['random','ランダム',6],['crossover','交叉',18],['mutation','突然変異',6],['elite','エリート',8],['min','担持量の最小値',0],['max','担持量の最大値',10],['pressure','進化圧',5],['seed','乱数シード',42]];
const settingRows=[['generation'],['random','crossover','mutation','elite'],['min','max'],['pressure','seed']];
const rowTargets={};settingRows.forEach(ids=>{let row=document.createElement('div');row.className='setting-row';row.style.setProperty('--columns',ids.length);$('settings').append(row);ids.forEach(id=>rowTargets[id]=row);});
fields.forEach(([id,label,value])=>{let l=document.createElement('label');l.textContent=label;let input=document.createElement('input');input.type='number';input.id=id;input.value=value;input.step=id==='pressure'?'0.1':'1';l.append(input);rowTargets[id].append(l);});
const options=()=>Object.fromEntries([...fields.map(([id])=>[id,Number($(id).value)]),['mode',$('mode').value]]);
function save(name,text,type){let u=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function table(data){let t=$('table');t.replaceChildren();if(!data.length)return;let cols=['Sample','Type',...GA.elements,'Score','Parent1','Parent2','Mutation_Positions'];let tr=document.createElement('tr');for(let c of cols){let th=document.createElement('th');th.textContent=c;tr.append(th);}t.append(tr);for(let r of data){tr=document.createElement('tr');for(let c of cols){let td=document.createElement('td');td.textContent=r[c]??'';tr.append(td);}t.append(tr);}}
function showHistory(){$('history').replaceChildren();for(let h of history){let p=document.createElement('p');p.textContent=`${h.name} ｜ ${h.count}個体 ｜ 平均 ${h.avg.toPrecision(4)} ｜ 最高 ${h.max.toPrecision(4)}`;$('history').append(p);}}
function load(data,name){GA.validate(data,Number($('min').value),Number($('max').value),$('mode').value);rows=data;output=[];$('export').disabled=true;refreshDispense();let s=data.map(r=>Number(r.Score));history.push({name,count:s.length,avg:s.reduce((a,b)=>a+b,0)/s.length,max:Math.max(...s)});showHistory();$('info').textContent=`${name}：${rows.length}個体を読み込みました`;let gens=rows.map(r=>/^G(\d+)-/.exec(r.Sample)).filter(Boolean).map(m=>Number(m[1]));if(gens.length)$('generation').value=Math.max(...gens)+1;table(rows);$('status').textContent='';}
function error(e){$('status').textContent=e.message;}
$('file').onchange=async e=>{try{let f=e.target.files[0];if(f)load(GA.csv(await f.text()),f.name);}catch(e){error(e);}};
$('demo').onclick=()=>{let r=GA.rng(17);let data=Array.from({length:38},(_,i)=>Object.fromEntries([['Sample',`G0-${i+1}`],...GA.elements.map(e=>[e,Math.floor(r()*11)]),['Score',(0.2+r()*2).toFixed(5)]]));try{load(data,'デモ（実験値ではありません）');}catch(e){error(e);}};
$('template').onclick=()=>save('G0_template.csv',GA.stringify(Array.from({length:38},(_,i)=>({Sample:`G0-${i+1}`,...Object.fromEntries(GA.elements.map(e=>[e,0])),Score:''}))),'text/csv;charset=utf-8');
$('run').onclick=()=>{output=[];$('export').disabled=true;refreshDispense();try{let o=options();output=GA.generate(rows,o);refreshDispense();table(output);$('export').disabled=false;$('status').textContent=`${output.length}個体を生成しました。新規候補のScoreは実験後に入力してください。`;}catch(e){error(e);}};
$('export').onclick=()=>save(`G${$('generation').value}_list.csv`,GA.stringify(output),'text/csv;charset=utf-8');
$('backup').onclick=()=>save('ga_project.json',JSON.stringify({version:1,options:options(),rows,output,history},null,2),'application/json');
$('restore').onchange=async e=>{try{let f=e.target.files[0];if(!f)return;let p=JSON.parse(await f.text());if(p.version!==1||!Array.isArray(p.rows)||!Array.isArray(p.output)||!Array.isArray(p.history))throw Error('作業ファイルの形式が違います');for(let [id,,v]of fields)$(id).value=p.options?.[id]??v;$('mode').value=p.options?.mode==='fitness'?'fitness':'score';if(p.rows.length)GA.validate(p.rows,Number($('min').value),Number($('max').value),$('mode').value);rows=p.rows;output=p.output;history=p.history;refreshDispense();table(output.length?output:rows);showHistory();$('export').disabled=!output.length;$('info').textContent=`復元：${rows.length}個体`;$('status').textContent='作業データを復元しました';}catch(e){error(e);}};

const tubeCapacity = 30;
const maxCommandVolume = 100000;

function refreshDispense() {
  const select = $('dispenseBatch');
  const batchCount = Math.ceil(output.length / tubeCapacity);
  select.replaceChildren();
  for (let batch = 0; batch < batchCount; batch++) {
    const start = batch * tubeCapacity;
    const end = Math.min(start + tubeCapacity, output.length);
    select.add(new Option(`バッチ ${batch + 1}：配合表の ${start + 1}〜${end} 行（tube1〜tube${end - start}）`, batch));
  }
  select.disabled = !batchCount;
  $('exportDispense').disabled = !batchCount;
  $('dispenseStatus').textContent = '';
}

function buildDispenseCommand(samples, step, total) {
  if (!Number.isSafeInteger(step) || step < 1 || step > maxCommandVolume) {
    throw Error('遺伝子1あたりの前駆体量を1〜100000 µLの整数で入力してください。');
  }
  if (total !== null && (!Number.isSafeInteger(total) || total < 1 || total > maxCommandVolume)) {
    throw Error('添加液合計を1〜100000 µLの整数で入力してください。');
  }
  const bySource = new Map(GA.elements.map(element => [element, []]));
  const water = [];
  const emptyTubes = [];
  for (const [index, sample] of samples.entries()) {
    const tube = `tube${index + 1}`;
    let precursor = 0;
    for (const [element, commands] of bySource) {
      const gene = sample[element];
      const volume = gene * step;
      if (!Number.isSafeInteger(gene) || gene < 0 || volume > maxCommandVolume) {
        throw Error(`${sample.Sample}（${tube}）の ${element} の遺伝子または分注量を確認してください。`);
      }
      if (volume > 0) commands.push(`${element},${tube},${volume}`);
      precursor += volume;
    }
    if (total !== null && precursor > total) {
      throw Error(`${sample.Sample}（${tube}）の前駆体合計 ${precursor} µL が添加液合計 ${total} µL を超えています。`);
    }
    if (total !== null && total > precursor) water.push(`water_vial,${tube},${total - precursor}`);
    if (!precursor && total === null) emptyTubes.push(tube);
  }
  const lines = [...bySource.values()].flat().concat(water);
  if (!lines.length) throw Error('このバッチに分注する液がありません。純水を入れる場合は添加液合計を設定してください。');
  return {csv: ['source,destination,volume_ul', ...lines, ''].join('\r\n'), emptyTubes};
}

$('exportDispense').onclick = () => {
  try {
    const batch = Number($('dispenseBatch').value);
    const start = batch * tubeCapacity;
    const samples = output.slice(start, start + tubeCapacity);
    const step = $('dispenseStep').valueAsNumber;
    const totalInput = $('dispenseTotal');
    const total = totalInput.value === '' && !totalInput.validity.badInput ? null : totalInput.valueAsNumber;
    const {csv, emptyTubes} = buildDispenseCommand(samples, step, total);
    const firstNew = output.find(sample => sample.Type !== 'Elite');
    const generation = /^G(\d+)-/.exec(firstNew?.Sample ?? '')?.[1];
    const name = `${generation ? 'G' + generation + '_' : ''}dispense_batch${batch + 1}.csv`;
    save(name, csv, 'text/csv;charset=utf-8');
    $('dispenseStatus').textContent = `${name} を保存しました。` +
      (emptyTubes.length ? ` 分注量が0の試験管：${emptyTubes.join('、')}。` : '');
  } catch (error) {
    $('dispenseStatus').textContent = error.message;
  }
};
