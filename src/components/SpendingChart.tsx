import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { won, type Point } from '../data';
type Props={ points:Point[]; daily?:boolean; selectedMonth?:string; onSelect?:(month:string)=>void };
export default function SpendingChart({points,daily,selectedMonth,onSelect}:Props) {
 return <><div className="axis-caption">금액 (원)</div><div className="chart" role="img" aria-label={`${daily?'일별':'월별'} 지출 막대그래프`}><ResponsiveContainer width="100%" height="100%"><BarChart data={points} margin={{top:12,right:12,left:0,bottom:8}} accessibilityLayer>
 <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e9edf3"/>
 <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#8490a3'}} tickMargin={12} interval={daily?2:'preserveStartEnd'} minTickGap={8}/>
 <YAxis width={65} axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#8490a3'}} tickFormatter={n=>Math.abs(n)>=10000?`${Number((n/10000).toFixed(1))}만`:Number(n).toLocaleString('ko-KR')}/>
 <Tooltip cursor={{fill:'#f0f4ff',radius:5}} content={({active,payload})=>{const p=payload?.[0]?.payload as Point|undefined; return active&&p?<div className="chart-tooltip"><span>{p.key}{daily?'':'월'}</span><strong>{won(p.amount)}</strong></div>:null;}}/>
 <Bar dataKey="amount" name="지출" radius={[5,5,0,0]} maxBarSize={daily?18:42} isAnimationActive={false} onClick={data=>{if(onSelect&&typeof data.key==='string')onSelect(data.key);}} style={{cursor:onSelect?'pointer':'default'}}>{points.map(p=><Cell key={p.key} fill={daily?'#8297f3':p.key===selectedMonth?'#4768e8':'#a9b8f5'}/>)}</Bar>
 </BarChart></ResponsiveContainer></div>
 <details className="chart-data"><summary>{daily?'일별':'월별'} 금액 표로 보기{onSelect?' · 월을 선택할 수 있어요':''}</summary><div className="table-scroll"><table><thead><tr><th scope="col">{daily?'날짜':'연월'}</th><th scope="col">지출 금액</th></tr></thead><tbody>{points.map(p=><tr key={p.key}><th scope="row">{onSelect?<button onClick={()=>onSelect(p.key)} aria-pressed={p.key===selectedMonth}>{p.key}</button>:p.key}</th><td>{won(p.amount)}</td></tr>)}</tbody></table></div></details></>;
}
