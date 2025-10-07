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

    <button class="plan-cta" data-plan="${p.slug || p.id}">MUA GÓI NÀY</button>
  </article>`;
}

async function fetchPlans() {
  const grid = $('#plans');
  const errorBox = $('#plans-error');

  try {
    // Lọc is_active = true, sắp xếp sort_order tăng dần, rồi price tăng dần
    const { data, error } = await supabase
      .from('membership_plans')
      .select('id, slug, name, subtitle, duration_months, price, compare_at_price, daily_downloads, features, is_popular, badge_text, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('price', { ascending: true });
    if (error) throw error;

    grid.innerHTML = (data || []).map(planCardHTML).join('') || '<p>Chưa có gói nào.</p>';

    // Gắn hành vi cho CTA: nếu chưa đăng nhập thì mở modal, nếu đã đăng nhập thì chuyển tới /checkout
    $$('.plan-cta').forEach(btn => {
      btn.addEventListener('click', async () => {
        const planKey = btn.getAttribute('data-plan');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.fvOpenAuth?.(); return; }
        window.location.href = `/checkout/?plan=${encodeURIComponent(planKey)}`;
      });
    });
  } catch (e) {
    errorBox.hidden = false;
    errorBox.textContent = e.message || 'Không thể tải dữ liệu gói.';
  }
}

document.addEventListener('DOMContentLoaded', fetchPlans);
