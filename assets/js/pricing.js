import { sb } from '/assets/js/sb-client.js';

const $  = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));
const money=(a,c='VND')=>new Intl.NumberFormat(c==='USD'?'en-US':'vi-VN',{style:'currency',currency:c,maximumFractionDigits:0}).format(a||0); // [web:307]
const toArray=(f)=>Array.isArray(f)?f:(f?(()=>{try{return typeof f==='string'?JSON.parse(f):f}catch{return []}})():[]);

function card(p){
  const cur=p.currency||'VND';
  const feats=[p.daily_downloads?`Tải xuống ${p.daily_downloads} file mỗi ngày`:null, ...toArray(p.features)].filter(Boolean);
  return `
  <article class="plan ${p.is_popular?'popular':''}">
    ${p.badge_text||p.is_popular?`<div class="plan-badge">${p.badge_text||'Tiết kiệm'}</div>`:''}
    <h3 class="plan-title">${p.name||'Gói thành viên'}</h3>
    <div class="plan-sub">${p.subtitle || (p.duration_months?`${p.duration_months} tháng`:'')}</div>
    ${p.compare_at_price>(p.price||0)?`<div class="plan-compare">${money(p.compare_at_price,cur)}</div>`:''}
    <div class="plan-price">${money(p.price,cur)}</div>
    <ul class="plan-features">${feats.map(x=>`<li>✅ <span>${x}</span></li>`).join('')}</ul>
    <button type="button" class="plan-cta" data-slug="${p.slug||''}" data-id="${p.id}">MUA GÓI NÀY</button>
  </article>`;
}

async function fetchPlans(){
  const grid=$('#plans'), err=$('#plans-error');
  try{
    const { data, error } = await sb
      .from('membership_plans')
      .select('id, slug, name, subtitle, duration_months, price, compare_at_price, currency, daily_downloads, features, is_popular, badge_text, sort_order, is_active')
      .eq('is_active', true).order('sort_order',{ascending:true}).order('price',{ascending:true}); // [web:293][web:311]
    if (error) throw error;
    grid.innerHTML=(data||[]).map(card).join('')||'<p>Chưa có gói nào.</p>';
    $$('.plan-cta').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        e.preventDefault(); e.stopPropagation();
        const slug=btn.dataset.slug, id=btn.dataset.id;
        const { data:{ user } } = await sb.auth.getUser(); if (!user){ window.fvOpenAuth?.(); return; } // [web:293]
        const sel='id, slug, name, subtitle, duration_months, price, currency, compare_at_price';
        const { data:plan, error:e1 } = slug
          ? await sb.from('membership_plans').select(sel).eq('slug',slug).maybeSingle()
          : await sb.from('membership_plans').select(sel).eq('id',id).maybeSingle();
        if (e1){ alert(e1.message); return; } if (!plan){ alert('Gói không tồn tại.'); return; }
        const qs=new URLSearchParams({ plan:plan.slug||plan.id, price:String(plan.price??''), currency:plan.currency||'VND', name:plan.name||'', duration:String(plan.duration_months??'') }).toString();
        location.assign(`${location.origin}/checkout/?${qs}`); // [web:344]
      });
    });
  }catch(e){ if (grid) grid.innerHTML=''; if (err){ err.hidden=false; err.textContent=e.message||'Không thể tải dữ liệu gói.'; } }
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fetchPlans):fetchPlans();
