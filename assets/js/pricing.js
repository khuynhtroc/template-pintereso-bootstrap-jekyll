import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const fmtVND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

function parseFeatures(f) {
  if (!f) return [];
  if (Array.isArray(f)) return f;
  return String(f).split('\n').map(x => x.trim()).filter(Boolean);
}

function planCardHTML(p) {
  const price     = typeof p.price === 'number' ? fmtVND.format(p.price) : '';
  const compare   = typeof p.compare_at_price === 'number' && p.compare_at_price > (p.price||0)
                    ? fmtVND.format(p.compare_at_price) : null;
  const badge     = p.badge_text || (p.is_popular ? 'Tiết kiệm' : null);
  const features  = parseFeatures(p.features);
  const subTitle  = p.subtitle || (p.duration_months ? `${p.duration_months} tháng` : '');
  const title     = p.name || 'Gói thành viên';
  const downloads = p.daily_downloads ? `Tải xuống ${p.daily_downloads} file mỗi ngày` : null;

  const feats = [downloads, ...features].filter(Boolean);

  return `
  <article class="plan ${p.is_popular ? 'popular' : ''}">
    ${badge ? `<div class="plan-badge">${badge}</div>` : ''}
    <h3 class="plan-title">${title}</h3>
    <div class="plan-sub">${subTitle}</div>
    ${compare ? `<div class="plan-compare">${compare}</div>` : ''}
    <div class="plan-price">${price}</div>

    <ul class="plan-features">
      ${feats.map(x => `<li>✅ <span>${x}</span></li>`).join('')}
    </ul>

    <button class="plan-cta" data-plan-id="${p.id}">MUA GÓI NÀY</button>
  </article>`;
}

async function fetchPlans() {
  const grid = $('#plans');
  const errorBox = $('#plans-error');

  try {
    const { data, error } = await supabase
      .from('membership_plans')
      .select('id, name, subtitle, duration_months, price, compare_at_price, daily_downloads, features, is_popular, badge_text, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('price', { ascending: true });
    if (error) throw error;

    grid.innerHTML = (data || []).map(planCardHTML).join('') || '<p>Chưa có gói nào.</p>';

    // CTA handler
    $$('.plan-cta').forEach(btn => {
      btn.addEventListener('click', async () => {
        const planId = btn.getAttribute('data-plan-id');

        // 1) Kiểm tra đăng nhập
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.fvOpenAuth?.(); return; }

        // 2) Lấy lại thông tin gói (đảm bảo dữ liệu mới nhất cho trang checkout)
        const { data: plan, error: ePlan } = await supabase
          .from('membership_plans')
          .select('id, name, subtitle, duration_months, price, compare_at_price')
          .eq('id', planId)
          .maybeSingle();
        if (ePlan) { alert(ePlan.message); return; }
        if (!plan) { alert('Gói không tồn tại.'); return; }

        // 3) Chuyển tới trang checkout kèm tham số
        //    Sử dụng id, name, price, duration để trang /checkout/ render đúng như ảnh.
        const qs = new URLSearchParams({
          plan_id: plan.id,
          name: plan.name || '',
          price: String(plan.price ?? ''),
          duration: String(plan.duration_months ?? ''),
        }).toString();
        window.location.href = `/checkout/?${qs}`;
      });
    });
  } catch (e) {
    const grid = $('#plans');
    const errorBox = $('#plans-error');
    if (grid) grid.innerHTML = '';
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.textContent = e.message || 'Không thể tải dữ liệu gói.';
    }
  }
}

document.addEventListener('DOMContentLoaded', fetchPlans);
