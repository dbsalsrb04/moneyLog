import {test,expect} from '@playwright/test';
const backup={moneyTrackTable:[
{id:1,part:'E',category:'식비/편의점',amount:7200,tags:['간식','식비'],dateKey:'2026-08-01'},
{id:2,part:'E',category:'식비',amount:13200,tags:['PC방에서','식비'],dateKey:'2026-08-02'},
{id:3,part:'E',category:'교통비/지쿠',amount:978,tags:['교통비'],dateKey:'2026-07-01'},
{id:4,part:'R',category:'수입',amount:100000,tags:[],dateKey:'2026-08-20'},
{id:5,part:'D',category:'저축',amount:50000,tags:[],dateKey:'2026-08-01'},
{id:6,part:'O',category:'식비',amount:1,tags:[],dateKey:'2026-08-01'}],categoryInfoTable:[{categoryName:'식비/외식'}],tagInfoTable:[{tagName:'여행'}]};
async function upload(page:import('@playwright/test').Page,data:unknown=backup,name='backup.json'){await page.getByLabel('JSON 파일 선택',{exact:true}).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});}
test('파일 업로드, 다중 필터, 기간 유지, 재업로드 및 오류 복구',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.getByText('JSON 파일을 선택하면 분석 결과가 표시됩니다.')).toBeVisible();
 await upload(page);await expect(page.getByTestId('monthly-total')).toContainText('21,378원');await expect(page.getByTestId('daily-total')).toContainText('20,400원');
 const c=page.getByRole('region',{name:'카테고리 필터'}),t=page.getByRole('region',{name:'태그 필터'});
 await c.getByRole('button',{name:'식비',exact:true}).click();await expect(c.getByRole('button',{name:'전체',exact:true})).toHaveAttribute('aria-pressed','false');await expect(page.getByTestId('monthly-total')).toContainText('20,400원');
 await t.getByRole('button',{name:'간식',exact:true}).click();await expect(page.getByTestId('monthly-total')).toContainText('7,200원');await expect(page.getByTestId('daily-total')).toContainText('7,200원');
 await t.getByRole('button',{name:'식비',exact:true}).click();await expect(page.getByTestId('monthly-total')).toContainText('20,400원');
 await page.getByRole('button',{name:'3개월',exact:true}).click();await page.getByLabel('일별 조회 월').selectOption('2026-07');
 await t.getByRole('button',{name:'교통비',exact:true}).click();await t.getByRole('button',{name:'식비',exact:true}).click();await t.getByRole('button',{name:'간식',exact:true}).click();await expect(page.getByTestId('monthly-total')).toContainText('0원');await expect(page.getByTestId('daily-total')).toContainText('0원');await expect(page.getByRole('button',{name:'3개월',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByLabel('일별 조회 월')).toHaveValue('2026-07');
 await t.getByRole('button',{name:'교통비',exact:true}).click();await expect(t.getByRole('button',{name:'전체',exact:true})).toHaveAttribute('aria-pressed','true');
 await c.getByRole('button',{name:'전체',exact:true}).click();await expect(page.getByTestId('monthly-total')).toContainText('21,378원');
 await page.getByRole('region',{name:'월별 지출',exact:true}).locator('.recharts-bar-rectangle').first().click();await expect(page.getByLabel('일별 조회 월')).toHaveValue('2026-07');
 await page.getByRole('region',{name:'월별 지출',exact:true}).locator('summary').click();await page.getByRole('button',{name:'2026-08',exact:true}).click();await expect(page.getByLabel('일별 조회 월')).toHaveValue('2026-08');
 await upload(page,{moneyTrackTable:[{id:9,part:'E',category:'생활',amount:900,tags:[],dateKey:'2024-02-29'}]},'next.json');await expect(page.getByTestId('monthly-total')).toContainText('900원');await expect(page.getByLabel('일별 조회 월')).toHaveValue('2024-02');await expect(page.getByRole('button',{name:'12개월',exact:true})).toHaveAttribute('aria-pressed','true');await expect(c.getByRole('button',{name:'식비',exact:true})).toHaveCount(0);
 await upload(page,{});await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByTestId('daily-total')).toContainText('900원');expect(errors).toEqual([]);
});
test('모바일에서 가로 넘침 없이 표시한다',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/');await upload(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await expect(page.getByRole('region',{name:'태그 필터'})).toBeVisible();});

test('미사용 항목 숨김, 다단계 접기·펼치기와 선택 유지',async({page})=>{
 await page.goto('/');
 const data={moneyTrackTable:[
  {id:1,part:'E',category:'식비/편의점/간편식',amount:7200,tags:['간식'],dateKey:'2026-08-01'},
  {id:2,part:'E',category:'식비/카페',amount:5000,tags:['음료'],dateKey:'2026-08-02'},
  {id:3,part:'E',category:'교통비',amount:1000,tags:['이동'],dateKey:'2026-08-03'},
  {id:4,part:'R',category:'수입/월급',amount:100000,tags:['수입전용'],dateKey:'2026-08-01'},
  {id:5,part:'O',category:'기록전용',amount:1,tags:['기록전용'],dateKey:'2026-08-01'}
 ],categoryInfoTable:[{categoryName:'미사용/분류'}],tagInfoTable:[{tagName:'미사용태그'}]};
 await upload(page,data);
 const c=page.getByRole('region',{name:'카테고리 필터'}),tags=page.getByRole('region',{name:'태그 필터'});
 await expect(c.getByRole('button',{name:'식비/편의점',exact:true})).toBeHidden();
 await expect(c.getByRole('button',{name:'수입',exact:true})).toHaveCount(0);
 await expect(c.getByRole('button',{name:'미사용',exact:true})).toHaveCount(0);
 await expect(c.getByRole('button',{name:'기록전용',exact:true})).toHaveCount(0);
 await expect(tags.getByRole('button',{name:'미사용태그',exact:true})).toHaveCount(0);
 await expect(tags.getByRole('button',{name:'수입전용',exact:true})).toHaveCount(0);
 await c.getByRole('button',{name:'식비 펼치기',exact:true}).click();
 await expect(page.getByTestId('monthly-total')).toContainText('13,200원');
 await expect(c.getByRole('button',{name:'식비/편의점',exact:true})).toBeVisible();
 await expect(c.getByRole('button',{name:'식비/편의점/간편식',exact:true})).toBeHidden();
 await c.getByRole('button',{name:'식비/편의점 펼치기',exact:true}).focus();await page.keyboard.press('Enter');
 await c.getByRole('button',{name:'식비/편의점/간편식',exact:true}).click();
 await expect(page.getByTestId('monthly-total')).toContainText('7,200원');
 await c.getByRole('button',{name:'식비 접기',exact:true}).click();
 await expect(page.getByTestId('monthly-total')).toContainText('7,200원');
 await expect(page.getByTestId('daily-total')).toContainText('7,200원');
 await c.getByRole('button',{name:'식비 펼치기',exact:true}).click();
 await expect(c.getByRole('button',{name:'식비/편의점/간편식',exact:true})).toHaveAttribute('aria-pressed','true');
 await c.getByRole('button',{name:'전체',exact:true}).click();
 await c.getByRole('button',{name:'식비',exact:true}).click();
 await expect(page.getByTestId('monthly-total')).toContainText('12,200원');
 await expect(tags.getByRole('button',{name:'이동',exact:true})).toBeVisible();
});

test('수입·지출·저축·기록 전환 시 두 차트와 필터가 함께 변경된다',async({page})=>{
 await page.goto('/');await upload(page);
 const parts=page.getByRole('group',{name:'거래 유형'});
 const c=page.getByRole('region',{name:'카테고리 필터'}),tags=page.getByRole('region',{name:'태그 필터'});
 await c.getByRole('button',{name:'식비',exact:true}).click();await tags.getByRole('button',{name:'간식',exact:true}).click();
 await page.getByRole('button',{name:'3개월',exact:true}).click();await page.getByLabel('일별 조회 월').selectOption('2026-07');
 await parts.getByRole('button',{name:'수입',exact:true}).click();
 await expect(parts.getByRole('button',{name:'수입',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByTestId('monthly-total')).toContainText('100,000원');await expect(page.getByTestId('daily-total')).toContainText('0원');
 await expect(page.getByRole('region',{name:'월별 수입',exact:true})).toBeVisible();
 await expect(c.getByRole('button',{name:'전체',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(tags.getByRole('button',{name:'전체',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(c.getByRole('button',{name:'식비',exact:true})).toHaveCount(0);
 await expect(page.getByLabel('일별 조회 월')).toHaveValue('2026-07');
 await expect(page.getByRole('button',{name:'3개월',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('일별 조회 월').selectOption('2026-08');
 for(const [name,total] of [['수입','100,000원'],['저축','50,000원'],['기록','1원'],['지출','20,400원']]){
  await parts.getByRole('button',{name,exact:true}).click();await expect(page.getByTestId('daily-total')).toContainText(total);
  await expect(page.getByRole('region',{name:`일별 ${name}`,exact:true})).toBeVisible();
 }
 await upload(page,{moneyTrackTable:[{id:99,part:'R',category:'수입/이자',amount:300,tags:['이자'],dateKey:'2026-09-01'}]});
 await expect(page.getByTestId('monthly-total')).toContainText('0원');await expect(c.getByRole('button',{name:'수입',exact:true})).toHaveCount(0);
 await parts.getByRole('button',{name:'수입',exact:true}).click();await expect(page.getByTestId('daily-total')).toContainText('300원');
 await expect(tags.getByRole('button',{name:'이자',exact:true})).toBeVisible();
});

test('드래그 앤 드롭 업로드·교체·잘못된 파일 및 다중 파일 복구',async({page})=>{
 await page.goto('/');
 const area=page.getByRole('region',{name:'JSON 파일 업로드'});
 async function drop(files:{name:string;content:string}[]){
  const dataTransfer=await page.evaluateHandle(items=>{
   const transfer=new DataTransfer();items.forEach(item=>transfer.items.add(new File([item.content],item.name,{type:'application/json'})));return transfer;
  },files);
  await area.dispatchEvent('dragenter',{dataTransfer});await expect(area).toHaveClass(/dragging/);
  await area.dispatchEvent('dragover',{dataTransfer});await area.dispatchEvent('drop',{dataTransfer});
  await expect(area).not.toHaveClass(/dragging/);await dataTransfer.dispose();
 }
 await drop([{name:'dropped.json',content:JSON.stringify(backup)}]);
 await expect(page.getByTestId('monthly-total')).toContainText('21,378원');await expect(area.getByText('dropped.json')).toBeVisible();
 await drop([{name:'bad.json',content:'{'}]);await expect(page.getByRole('alert')).toContainText('올바른 JSON');await expect(page.getByTestId('monthly-total')).toContainText('21,378원');
 await drop([{name:'notes.txt',content:'text'}]);await expect(page.getByRole('alert')).toContainText('.json');
 await drop([{name:'one.json',content:'{}'},{name:'two.json',content:'{}'}]);await expect(page.getByRole('alert')).toContainText('하나만');await expect(page.getByTestId('monthly-total')).toContainText('21,378원');
 await drop([{name:'replacement.JSON',content:JSON.stringify({moneyTrackTable:[{id:9,part:'E',category:'생활',amount:900,tags:[],dateKey:'2024-02-29'}]})}]);
 await expect(page.getByRole('alert')).toHaveCount(0);await expect(page.getByTestId('monthly-total')).toContainText('900원');await expect(page.getByLabel('일별 조회 월')).toHaveValue('2024-02');
});

test('금액 표는 날짜 열을 유지하고 가장 긴 금액의 1.3배 너비를 사용한다',async({page})=>{
 await page.goto('/');await upload(page);
 for(const regionName of ['월별 지출','일별 지출']){
  const chart=page.getByRole('region',{name:regionName,exact:true});
  await chart.locator('summary').click();
  const container=chart.locator('.amount-table-container');
  await expect.poll(async()=>container.evaluate(element=>{
   const cells=[...element.querySelectorAll<HTMLElement>('td.amount-cell')];
   const maxText=Math.max(...[...element.querySelectorAll<HTMLElement>('.amount-text')].map(text=>text.getBoundingClientRect().width));
   const amountWidth=cells[0].getBoundingClientRect().width;
   const dateWidth=element.querySelector('tbody th')!.getBoundingClientRect().width;
   return Math.abs(amountWidth-maxText*1.3)<2 && Math.abs(dateWidth-element.clientWidth*.5)<2;
  })).toBe(true);
 }
 await page.getByRole('region',{name:'태그 필터'}).getByRole('button',{name:'간식',exact:true}).click();
 await expect.poll(async()=>page.getByRole('region',{name:'월별 지출',exact:true}).locator('.amount-table-container').evaluate(element=>{
  const maxText=Math.max(...[...element.querySelectorAll<HTMLElement>('.amount-text')].map(text=>text.getBoundingClientRect().width));
  return Math.abs(element.querySelector('td.amount-cell')!.getBoundingClientRect().width-maxText*1.3)<2;
 })).toBe(true);
});

test('세부 내역은 하루씩 넘기며 필터·유형·월과 연동된다',async({page})=>{
 await page.goto('/');
 await upload(page,{...backup,moneyTrackTable:backup.moneyTrackTable.map(t=>({...t,memo:t.id===1?'편의점\n간식 구매':`메모 ${t.id}`}))});
 const detail=page.getByRole('region',{name:'세부 지출',exact:true});
 await expect(detail.getByRole('button',{name:'이전 날짜',exact:true})).toBeDisabled();
 await expect(detail.locator('time')).toHaveText('2026-08-01');
 await expect(detail.getByRole('group',{name:'2026-08-01 세부 내역'})).toContainText('편의점');
 await expect(detail.locator('.detail-entry')).toHaveCount(1);
 await expect(detail.locator('.detail-entry')).toContainText('7,200원');
 await detail.getByRole('button',{name:'다음 날짜',exact:true}).click();
 await expect(detail.locator('time')).toHaveText('2026-08-02');
 await expect(detail.locator('.detail-entry')).toContainText('13,200원');
 const tagFilter=page.getByRole('region',{name:'태그 필터'});
 await tagFilter.getByRole('button',{name:'간식',exact:true}).click();
 await expect(detail.locator('time')).toHaveText('2026-08-02');
 await expect(detail.locator('.detail-empty')).toBeVisible();
 await detail.getByRole('button',{name:'이전 날짜',exact:true}).click();
 await expect(detail.locator('.detail-entry')).toContainText('7,200원');
 await page.getByRole('region',{name:'카테고리 필터'}).getByRole('button',{name:'교통비',exact:true}).click();
 await expect(detail.locator('.detail-empty')).toBeVisible();
 await page.getByRole('button',{name:'초기화',exact:true}).click();
 await page.getByLabel('세부 내역 조회 월').selectOption('2026-07');
 await expect(page.getByLabel('일별 조회 월')).toHaveValue('2026-07');
 await expect(detail.locator('time')).toHaveText('2026-07-01');
 await expect(detail.locator('.detail-entry')).toContainText('978원');
 await page.getByRole('group',{name:'거래 유형'}).getByRole('button',{name:'저축',exact:true}).click();
 await expect(page.getByRole('region',{name:'세부 저축',exact:true}).locator('.detail-empty')).toBeVisible();
 await page.getByLabel('일별 조회 월').selectOption('2026-08');
 await expect(page.getByLabel('세부 내역 조회 월')).toHaveValue('2026-08');
 await expect(page.getByRole('region',{name:'세부 저축',exact:true}).locator('.detail-entry')).toContainText('50,000원');
});

test('윤년 월말과 파일 교체, 모바일에서도 세부 내역이 한 날짜로 제한된다',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await upload(page,{moneyTrackTable:[{id:1,part:'E',category:'매우긴카테고리/하위분류',amount:1000,memo:'아주긴메모'.repeat(20),tags:['태그'.repeat(30)],dateKey:'2024-02-29'}]});
 const detail=page.getByRole('region',{name:'세부 지출',exact:true});
 for(let day=1;day<29;day++)await detail.getByRole('button',{name:'다음 날짜',exact:true}).click();
 await expect(detail.locator('time')).toHaveText('2024-02-29');
 await expect(detail.getByRole('button',{name:'다음 날짜',exact:true})).toBeDisabled();
 await expect(detail.locator('.detail-entry')).toHaveCount(1);
 expect(await detail.locator('.detail-body').evaluate(element=>element.getBoundingClientRect().height)).toBeLessThanOrEqual(360);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await upload(page,{moneyTrackTable:[{id:2,part:'E',category:'식비',amount:2500,tags:[],dateKey:'2026-02-01'}]});
 await expect(detail.locator('time')).toHaveText('2026-02-01');
 await expect(detail.locator('.detail-entry')).toContainText('2,500원');
 await expect(detail.getByRole('button',{name:'이전 날짜',exact:true})).toBeDisabled();
});

test('캘린더에서 월말로 바로 이동하고 네 유형의 합계·필터·선택 날짜가 연동된다',async({page})=>{
 await page.goto('/');
 await upload(page,{moneyTrackTable:[
  {id:1,part:'E',category:'식비/편의점',amount:7200,memo:'간식 1',tags:['공통','간식'],dateKey:'2026-08-01'},
  {id:2,part:'E',category:'식비/편의점',amount:2800,memo:'간식 2',tags:['공통','간식'],dateKey:'2026-08-01'},
  {id:3,part:'R',category:'수입',amount:100000,tags:['공통'],dateKey:'2026-08-01'},
  {id:4,part:'D',category:'저축',amount:50000,tags:['공통'],dateKey:'2026-08-01'},
  {id:5,part:'O',category:'기록',amount:1,tags:['공통'],dateKey:'2026-08-01'},
  {id:6,part:'E',category:'식비',amount:1234,memo:'월말',tags:['공통'],dateKey:'2026-08-31'},
 ]});
 const calendar=page.getByRole('group',{name:'월간 거래 캘린더'});
 const first=calendar.getByRole('button',{name:'2026-08-01 선택',exact:true});
 await expect(first).toHaveAttribute('aria-pressed','true');
 for(const [part,text,color] of [['R','+100,000원','rgb(37, 99, 206)'],['E','-10,000원','rgb(200, 63, 72)'],['D','50,000원','rgb(35, 134, 74)'],['O','1원','rgb(126, 132, 144)']]){
  await expect(first.locator(`.calendar-part-${part}`)).toHaveText(text);
  await expect(first.locator(`.calendar-part-${part}`)).toHaveCSS('color',color);
 }
 await expect(calendar.getByRole('button',{name:'2026-08-15 선택',exact:true}).locator('.calendar-part-E')).toHaveText('-0원');
 await expect(calendar.locator('.calendar-grid>div,.calendar-grid>button')).toHaveCount(42);
 expect(await calendar.locator('.calendar-day').first().evaluate(element=>[...element.parentElement!.children].indexOf(element))).toBe(6);
 await calendar.getByRole('button',{name:'2026-08-31 선택',exact:true}).click();
 const detail=page.getByRole('region',{name:'세부 지출',exact:true});
 await expect(detail.locator('time')).toHaveText('2026-08-31');
 await expect(detail.locator('.detail-entry')).toContainText('월말');
 await expect(detail.getByRole('button',{name:'다음 날짜',exact:true})).toBeDisabled();
 await detail.getByRole('button',{name:'이전 날짜',exact:true}).click();
 await expect(calendar.getByRole('button',{name:'2026-08-30 선택',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('region',{name:'태그 필터'}).getByRole('button',{name:'간식',exact:true}).click();
 await expect(first.locator('.calendar-part-E')).toHaveText('-10,000원');
 await expect(first.locator('.calendar-part-R')).toHaveText('+0원');
 await expect(first.locator('.calendar-part-D')).toHaveText('0원');
 await expect(first.locator('.calendar-part-O')).toHaveText('0원');
 await expect(calendar.getByRole('button',{name:'2026-08-30 선택',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('group',{name:'거래 유형'}).getByRole('button',{name:'수입',exact:true}).click();
 await expect(first.locator('.calendar-part-R')).toHaveText('+100,000원');
 await expect(first.locator('.calendar-part-E')).toHaveText('-10,000원');
 await first.click();
 await expect(page.getByRole('region',{name:'세부 수입',exact:true}).locator('.detail-entry')).toContainText('100,000원');
});

test('모바일 캘린더는 큰 금액도 한 줄로 맞추고 윤년 날짜를 바로 선택한다',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await upload(page,{moneyTrackTable:[
  {id:1,part:'R',category:'수입',amount:1234567890,tags:[],dateKey:'2024-02-29'},
  {id:2,part:'E',category:'식비',amount:1234567,tags:[],dateKey:'2024-02-29'},
 ]});
 const calendar=page.getByRole('group',{name:'월간 거래 캘린더'});
 await expect(calendar.locator('.calendar-day')).toHaveCount(29);
 const last=calendar.getByRole('button',{name:'2024-02-29 선택',exact:true});
 await last.click();
 await expect(page.getByRole('region',{name:'세부 지출',exact:true}).locator('time')).toHaveText('2024-02-29');
 await expect(last.locator('.calendar-part-R')).toHaveText('+1,234,567,890원');
 expect(await last.locator('.calendar-amount').evaluateAll(elements=>elements.every(element=>element.scrollWidth<=element.clientWidth+1))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByLabel('세부 내역 조회 월').selectOption('2024-01');
 await expect(calendar.locator('.calendar-day')).toHaveCount(31);
 await expect(calendar.getByRole('button',{name:'2024-01-01 선택',exact:true})).toHaveAttribute('aria-pressed','true');
});
