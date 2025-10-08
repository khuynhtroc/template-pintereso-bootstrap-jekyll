import { sb } from '/assets/js/sb-client.js';
const $=(s)=>document.querySelector(s);
const fmt=(n,cur='VND')=>new Intl.NumberFormat(cur==='USD'?'en-US':'vi-VN',{style:'currency',currency:cur,maximumFractionDigits:0}).format(n||0); // [web:307]
const BANK={ bankCode:'VCB', accountNo:'0691000301445', accountName:'PHAM QUANG NINH' };
const vietQR=({bankCode,accountNo,amount,content})=>`https://img.vietqr.io/image/${bankCode}-${accountNo}-qr_only.png?`+new URLSearchParams({ amount:String(amount||0), addInfo:content }).toString();

async function loadOrder(){
  const id=new URLSearchParams(location.search).get('order_id'); if(!id){ location.assign('/'); return; }
  const { data: order, error } = await sb.from('orders').select('id, created_at, email, total, status, plan_id').eq('id',id).maybeSingle(); // [web:293]
  if (error || !order){ $('#ty-error').hidden=false; $('#ty-error').textContent=error?.message||'Không tìm thấy đơn hàng.'; return; }
  $('#ty-order').textContent=`#${order.id}`;
  $('#ty-date').textContent=new Date(order.created_at).toLocaleDateString('vi-VN');
  $('#ty-email').textContent=order.email||'';
  $('#ty-total').textContent=fmt(order.total||0);
  $('#ty-total2').textContent=fmt(order.total||0);
  const content=`CAMON${order.id}`; $('#ty-content').textContent=content;
  $('#qr-img').src=vietQR({bankCode:BANK.bankCode, accountNo:BANK.accountNo, amount:order.total||0, content});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',loadOrder):loadOrder();
