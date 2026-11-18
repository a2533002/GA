const {elements,rng}=require('./ga.js');
function generateBase(seed){
  if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw Error('シードは0〜4294967295の整数にしてください');
  const rand=rng(seed), output=[], seen=new Set();
  const shuffle=values=>{
    const result=[...values];
    for(let i=result.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
    return result;
  };
  // Include every Au partner in the first seven samples; all G0 samples have at least four elements.
  const partners=shuffle([0,1,2,3,4,5,6]);
  for(let index=0;index<14;index++){
    const withAu=index<10;
    let genes;
    do{
      const otherCount=withAu?3+Math.floor(rand()*5):4+Math.floor(rand()*4);
      const pool=[0,1,2,3,4,5,6];
      const others=withAu&&index<7
        ?[partners[index],...shuffle(pool.filter(j=>j!==partners[index])).slice(0,otherCount-1)]
        :shuffle(pool).slice(0,otherCount);
      const support=withAu?[7,...others]:others;
      const budget=support.length+Math.floor(rand()*(16-support.length));
      const cuts=shuffle(Array.from({length:budget-1},(_,i)=>i+1)).slice(0,support.length-1).sort((a,b)=>a-b);
      const edges=[0,...cuts,budget];
      genes=elements.map(()=>0);
      support.forEach((position,j)=>genes[position]=edges[j+1]-edges[j]);
    }while(seen.has(genes.join(',')));
    seen.add(genes.join(','));
    output.push({Sample:`G0-${index+1}`,Type:'Random',...Object.fromEntries(elements.map((e,j)=>[e,genes[j]])),Score:''});
  }
  return output;
}

function generateInitial(seed){
  // Keep the four Au-free compositions identical to the previous G0 design.
  const rows=generateBase(seed),rand=rng((seed^0x41554730)>>>0),seen=new Set();
  const shuffle=values=>{
    const result=[...values];
    for(let i=result.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
    return result;
  };
  for(let index=0;index<10;index++){
    let genes;
    do{
      // At least three positive partner genes leave a feasible Au range of 5..12.
      const au=5+Math.floor(rand()*8);
      const partnerBudget=3+Math.floor(rand()*(13-au));
      const count=3+Math.floor(rand()*(Math.min(7,partnerBudget)-2));
      const pool=[0,1,2,3,4,5,6];
      const support=index<7?[index,...shuffle(pool.filter(j=>j!==index)).slice(0,count-1)]:shuffle(pool).slice(0,count);
      const cuts=shuffle(Array.from({length:partnerBudget-1},(_,i)=>i+1)).slice(0,count-1).sort((a,b)=>a-b);
      const edges=[0,...cuts,partnerBudget];
      genes=elements.map(()=>0);genes[7]=au;
      support.forEach((position,j)=>genes[position]=edges[j+1]-edges[j]);
    }while(seen.has(genes.join(',')));
    seen.add(genes.join(','));
    elements.forEach((e,j)=>rows[index][e]=genes[j]);
  }
  return rows;
}

module.exports={generateInitial};
