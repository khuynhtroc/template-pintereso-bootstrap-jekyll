// assets/js/checkout.js
import { sb } from '/assets/js/sb-client.js';

const $=(s)=>document.querySelector(s);
const fmt=(n,cur='VND')=>new Intl.NumberFormat(cur==='USD'?'en-US':'vi-VN',{style:'currency',currency:cur,maximumFractionDigits:0}).format(n||0); // [web:307]
let planRec=null;
const isUUID=(v)=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)||/^[0-9a-f-]{36}$/i.test(v);

async function loadPlan(){
  const raw = new URLSearchParams(location.search).get('plan') || new URLSearchParams(location.search).get('plan_id');
  if (!raw){ $('#co-error').hidden=false; $('#co-error').textContent='Thiếu tham số gói (plan).'; return; } // [web:344]
  const sel='id, slug, name, subtitle, duration_months, price, currency, is_active';
  let data=null,error=null;
  if (!isUUID(raw)){ ({data,error}=await sb.from('membership_plans').select(sel).eq('slug',raw).maybeSingle());
    if(!data && !error){ ({data,error}=await sb.from('membership_plans').select(sel).eq('id',raw).maybeSingle()); } }
  else { ({data,error}=await sb.from('membership_plans').select(sel).eq('id',raw).maybeSingle());
    if(!data && !error){ ({data,error}=await sb.from('membership_plans').select(sel).eq('slug',raw).maybeSingle()); } } // [web:293]
  if (error){ $('#co-error').hidden=false; $('#co-error').textContent=error.message; return; } // [web:330]
  if (!data || data.is_active===false){ $('#co-error').hidden=false; $('#co-error').textContent='Gói không khả dụng.'; return; } // [web:344]
  planRec=data; const cur=data.currency||'VND';
  $('#co-item').textContent=`${data.name} × 1`; $('#co-subtotal').textContent=fmt(data.price,cur); $('#co-total').textContent=fmt(data.price,cur); // [web:307]
}
async function createOrder(e){
  e.preventDefault(); // không rời trang do submit mặc định [web:360]
  const { data:{user} } = await sb.auth.getUser(); if (!user){ window.fvOpenAuth?.(); return; } // [web:293]
  if (!planRec){ alert('Gói không hợp lệ'); return; }
  const fullName=`${$('#co-first').value.trim()} ${$('#co-last').value.trim()}`.trim();
  const email=$('#co-email').value.trim(); const phone=$('#co-phone').value.trim();
  const { data, error } = await sb.from('orders').insert({
    user_id:user.id, plan_id:planRec.id, email, full_name:fullName, phone, total:planRec.price||0, status:'pending', payment_method:'bank_transfer'
  }).select('id').maybeSingle(); // [web:293]
  if (error || !data){ $('#co-error').hidden=false; $('#co-error').textContent=error?.message||'Không thể tạo đơn hàng.'; return; } // [web:330]
  location.assign(`${location.origin}/cam-on/?order_id=${encodeURIComponent(data.id)}`); // [web:344]
}
function boot(){ loadPlan(); $('#co-form')?.addEventListener('submit', createOrder); } // [web:357]
document.readyState==='loading'?document.addEventListener('DOMContentLoaded', boot):boot(); // [web:344]
