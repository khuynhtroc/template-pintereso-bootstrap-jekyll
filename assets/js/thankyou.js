import { sb } from '/assets/js/sb-client.js';


const $ = (s)=>document.querySelector(s);
const fmtVND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

// Cấu hình ngân hàng để tạo QR
const BANK = {
  bankCode: 'VCB',
  accountNo: '0691000301445',
  accountName: 'PHAM QUANG NINH'
};

function vietQR({bankCode, accountNo, amount, content}) {
  // Dạng link phổ biến https://img.vietqr.io/image/VCB-0691000301445-qr_only.png?amount=399000&addInfo=CAMON322
  const base = `https://img.vietqr.io/image/${bankCode}-${accountNo}-qr_only.png`;
  const qs = new URLSearchParams({ amount: String(amount||0), addInfo: content }).toString();
  return `${base}?${qs}`;
}

async function loadOrder(){
  const id = new URLSearchParams(location.search).get('order_id');
  if (!id) { location.href = '/'; return; }

  const { data: order, error } = await sb
    .from('orders')
    .select('id, created_at, email, total, status, plan_id')
    .eq('id', id)
    .maybeSingle();

  if (error || !order) { $('#ty-error').hidden=false; $('#ty-error').textContent = error?.message || 'Không tìm thấy đơn hàng.'; return; }

  $('#ty-order').textContent = `#${order.id}`;
  $('#ty-date').textContent  = new Date(order.created_at).toLocaleDateString('vi-VN');
  $('#ty-email').textContent = order.email || '';
  $('#ty-total').textContent = fmtVND.format(order.total || 0);
  $('#ty-total2').textContent= fmtVND.format(order.total || 0);

  const content = `CAMON${order.id}`;
  $('#ty-content').textContent = content;

  const qrUrl = vietQR({ bankCode: BANK.bankCode, accountNo: BANK.accountNo, amount: order.total || 0, content });
  $('#qr-img').src = qrUrl;
}

document.addEventListener('DOMContentLoaded', loadOrder);
