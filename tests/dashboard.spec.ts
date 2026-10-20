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
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.getByText('소비를 이해하는 첫걸음')).toBeVisible();
 await upload(page);await expect(page.getByTestId('monthly-total')).toContainText('21,378원');await expect(page.getByTestId('daily-total')).toContainText('20,400원');
 const c=page.getByRole('region',{name:'카테고리 필터'}),t=page.getByRole('region',{name:'태그 필터'});
 await c.getByRole('button',{name:'식비',exact:true}).click();await expect(c.getByRole('button',{name:'전체',exact:true})).toHaveAttribute('aria-pressed','false');await expect(page.getByTestId('monthly-total')).toContainText('20,400원');
 await t.getByRole('button',{name:'간식',exact:true}).click();await expect(page.getByTestId('monthly-total')).toContainText('7,200원');await expect(page.getByTestId('daily-total')).toContainText('7,200원');
 await t.getByRole('button',{name:'식비',exact:true}).click();await expect(page.getByTestId('monthly-total')).toContainText('20,400원');
 await page.getByRole('button',{name:'3개월',exact:true}).click();await page.getByLabel('일별 조회 월').selectOption('2026-07');
 await t.getByRole('button',{name:'여행',exact:true}).click();await t.getByRole('button',{name:'식비',exact:true}).click();await t.getByRole('button',{name:'간식',exact:true}).click();await expect(page.getByTestId('monthly-total')).toContainText('0원');await expect(page.getByTestId('daily-total')).toContainText('0원');await expect(page.getByRole('button',{name:'3개월',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByLabel('일별 조회 월')).toHaveValue('2026-07');
 await t.getByRole('button',{name:'여행',exact:true}).click();await expect(t.getByRole('button',{name:'전체',exact:true})).toHaveAttribute('aria-pressed','true');
 await c.getByRole('button',{name:'전체',exact:true}).click();await expect(page.getByTestId('monthly-total')).toContainText('21,378원');
 await page.getByRole('region',{name:'월별 소비량',exact:true}).locator('.recharts-bar-rectangle').first().click();await expect(page.getByLabel('일별 조회 월')).toHaveValue('2026-07');
 await page.getByRole('region',{name:'월별 소비량',exact:true}).locator('summary').click();await page.getByRole('button',{name:'2026-08',exact:true}).click();await expect(page.getByLabel('일별 조회 월')).toHaveValue('2026-08');
 await upload(page,{moneyTrackTable:[{id:9,part:'E',category:'생활',amount:900,tags:[],dateKey:'2024-02-29'}]},'next.json');await expect(page.getByTestId('monthly-total')).toContainText('900원');await expect(page.getByLabel('일별 조회 월')).toHaveValue('2024-02');await expect(page.getByRole('button',{name:'12개월',exact:true})).toHaveAttribute('aria-pressed','true');await expect(c.getByRole('button',{name:'식비',exact:true})).toHaveCount(0);
 await upload(page,{});await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByTestId('daily-total')).toContainText('900원');expect(errors).toEqual([]);
});
test('모바일에서 가로 넘침 없이 표시한다',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/');await upload(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await expect(page.getByRole('region',{name:'태그 필터'})).toBeVisible();});
