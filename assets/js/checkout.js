import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $ = (s)=>document.querySelector(s);
const fmt = (amt, cur='VND') => new Intl.NumberFormat(cur === 'USD' ? 'en-US' : 'vi-VN', { style:'currency', currency: cur, maximumFractionDigits: 0 }).format(amt || 0);

let planRec = null;

// 0) Trap mọi redirect để bắt thủ phạm (giữ trong dev)
(function trapRedirects(){
  try {
    const loc = window.location;
    const _assign  = loc.assign.bind(loc);
    const _replace = loc.replace.bind(loc);
    Object.defineProperty(window.location, 'href', {
      set(v){ console.warn('[redirect href->]', v, new Error().stack); _assign(v); },
      get(){ return loc.toString(); }
    });
    window.location.assign = (v)=>{ console.warn('[redirect assign->]', v, new Error().stack); _assign(v); };
    window.location.replace= (v)=>{ console.warn('[redirect replace->]', v, new Error().stack); _replace(v); };
    window.addEventListener('popstate', ()=>console.warn('[popstate]', location.href));
    window.addEventListener('hashchange', ()=>console.warn('[hashchange]', location.href));
    console.log('[checkout] loaded at', location.href);
  } catch(e) { /* ignore in prod */ }
})();

const isUUID = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v) ||
  /^[0-9a-f-]{36}$/i.test(v);

async function loadPlan() {
  const params = new URLSearchParams(location.search);
  const raw = params.get('plan') || params.get('plan_id'); // hỗ trợ cả mới và cũ
  if (!raw) { $('#co-error').hidden=false; $('#co-error').textContent='Thiếu tham số gói (plan).'; return; } // KHÔNG redirect [web:344]

  const sel = 'id, slug, name, subtitle, duration_months, price, currency, is_active';
  let data=null, error=null;

  // Ưu tiên tra slug nếu không giống UUID, fallback sang id
  if (!isUUID(raw)) {
    ({ data, error } = await supabase.from('membership_plans').select(sel).eq('slug', raw).maybeSingle()); // [web:293]
    if (!data && !error) ({ data, error } = await supabase.from('membership_plans').select(sel).eq('id', raw).maybeSingle()); // [web:293]
  } else {
    ({ data, error } = await supabase.from('membership_plans').select(sel).eq('id', raw).maybeSingle()); // [web:293]
    if (!data && !error) ({ data, error } = await supabase.from('membership_plans').select(sel).eq('slug', raw).maybeSingle()); // [web:293]
  }
  if (error) { $('#co-error').hidden=false; $('#co-error').textContent = error.message; return; } // KHÔNG redirect [web:330]
  if (!data || data.is_active === false) { $('#co-error').hidden=false; $('#co-error').textContent='Gói không khả dụng.'; return; } // [web:344]

  planRec = data;
  const cur = data.currency || 'VND';
  $('#co-item').textContent    = `${data.name} × 1`;
  $('#co-subtotal').textContent= fmt(data.price, cur);  // [web:307]
  $('#co-total').textContent   = fmt(data.price, cur);  // [web:307]
}

async function createOrder(e){
  e.preventDefault();  // chặn submit mặc định để không rời trang ngoài ý muốn [web:360]
  const { data: { user } } = await supabase.auth.getUser(); // [web:293]
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
    .maybeSingle(); // [web:293]

  if (error || !data) { $('#co-error').hidden=false; $('#co-error').textContent = error?.message || 'Không thể tạo đơn hàng.'; return; } // [web:330]

  const thanks = `${location.origin}/cam-on/?order_id=${encodeURIComponent(data.id)}`; // điều hướng tuyệt đối [web:344]
  console.log('[checkout] goto', thanks);
  location.assign(thanks); // [web:344]
}

function boot(){
  loadPlan();
  $('#co-form')?.addEventListener('submit', createOrder); // [web:357]
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot(); // [web:344]
