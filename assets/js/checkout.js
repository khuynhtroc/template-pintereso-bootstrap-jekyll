import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $ = (s)=>document.querySelector(s);
const fmtVND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

let plan = null;

async function loadPlan(){
  const params = new URLSearchParams(location.search);
  const planId = params.get('plan_id');
  if (!planId) { location.href = '/pricing/'; return; }

  const { data, error } = await supabase
    .from('membership_plans')
    .select('id,name,duration_months,price,is_active')
    .eq('id', planId)
    .maybeSingle();
  if (error || !data || !data.is_active) {
    $('#co-error').hidden=false; $('#co-error').textContent = error?.message || 'Gói không khả dụng.'; return;
  }
  plan = data;

  $('#co-item').textContent = `${plan.name} × 1`;
  $('#co-subtotal').textContent = fmtVND.format(plan.price || 0);
  $('#co-total').textContent = fmtVND.format(plan.price || 0);
}

async function createOrder(e){
  e.preventDefault();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { window.fvOpenAuth?.(); return; }
  if (!plan) { alert('Gói không hợp lệ'); return; }

  const fullName = `${$('#co-first').value.trim()} ${$('#co-last').value.trim()}`.trim();
  const email = $('#co-email').value.trim();
  const phone = $('#co-phone').value.trim();

  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      email,
      full_name: fullName,
      phone,
      total: plan.price || 0,
      status: 'pending',
      payment_method: 'bank_transfer'
    })
    .select('id')
    .maybeSingle();

  if (error || !data) { $('#co-error').hidden=false; $('#co-error').textContent = error?.message || 'Không thể tạo đơn hàng.'; return; }

  const orderId = data.id;
  // chuyển đến trang cảm ơn
  location.href = `/cam-on/?order_id=${encodeURIComponent(orderId)}`;
}

document.addEventListener('DOMContentLoaded', ()=>{
  loadPlan();
  $('#co-form')?.addEventListener('submit', createOrder);
});
