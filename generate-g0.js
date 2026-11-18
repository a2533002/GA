const {elements,rng}=require('./ga.js');
function generateInitial(seed){
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

module.exports={generateInitial};
