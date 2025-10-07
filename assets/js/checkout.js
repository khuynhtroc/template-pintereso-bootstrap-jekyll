import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $ = (s)=>document.querySelector(s);
const fmt = (amt, cur='VND') => new Intl.NumberFormat(cur === 'USD' ? 'en-US' : 'vi-VN', { style:'currency', currency: cur, maximumFractionDigits: 0 }).format(amt || 0);

let planRec = null;

const isUUID = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v) || /^[0-9a-f-]{36}$/i.test(v);

async function loadPlan() {
  const params = new URLSearchParams(location.search);
  const raw = params.get('plan') || params.get('plan_id'); // hỗ trợ cả mới và cũ
  if (!raw) { $('#co-error').hidden=false; $('#co-error').textContent='Thiếu tham số gói (plan).'; return; }

  const sel = 'id, slug, name, subtitle, duration_months, price, currency, is_active';
  let data=null, error=null;

  // Ưu tiên tra slug nếu không giống UUID, fallback sang id
  if (!isUUID(raw)) {
    ({ data, error } = await supabase.from('membership_plans').select(sel).eq('slug', raw).maybeSingle());
    if (!data && !error) ({ data, error } = await supabase.from('membership_plans').select(sel).eq('id', raw).maybeSingle());
  } else {
    ({ data, error } = await supabase.from('membership_plans').select(sel).eq('id', raw).maybeSingle());
    if (!data && !error) ({ data, error } = await supabase.from('membership_plans').select(sel).eq('slug', raw).maybeSingle());
  }
  if (error) { $('#co-error').hidden=false; $('#co-error').textContent = error.message; return; }
  if (!data || data.is_active === false) { $('#co-error').hidden=false; $('#co-error').textContent='Gói không khả dụng.'; return; }

  planRec = data;
  const cur = data.currency || 'VND';
  $('#co-item').textContent    = `${data.name} × 1`;
  $('#co-subtotal').textContent= fmt(data.price, cur);
  $('#co-total').textContent   = fmt(data.price, cur);

  // Điền sẵn tên gói vào hidden nếu muốn gửi kèm
  // $('#co-plan-name').value = data.name;
}

async function createOrder(e){
  e.preventDefault();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { window.fvOpenAuth?.(); return; }
  if (!planRec) { alert('Gói không hợp lệ'); return; }

  const fullName = `${$('#co-first').value.trim()} ${$('#co-last').value.trim()}`.trim();
  const email = $('#co-email').value.trim();
  const phone = $('#co-phone').value.trim();

  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      plan_id: planRec.id,
      email, full_name: fullName, phone,
      total: planRec.price || 0,
      status: 'pending',
      payment_method: 'bank_transfer'
    })
    .select('id')
    .maybeSingle();

  if (error || !data) { $('#co-error').hidden=false; $('#co-error').textContent = error?.message || 'Không thể tạo đơn hàng.'; return; }
  location.href = `/cam-on/?order_id=${encodeURIComponent(data.id)}`;
}

function boot(){
  loadPlan();
  $('#co-form')?.addEventListener('submit', createOrder);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
