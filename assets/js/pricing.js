import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// Định dạng tiền tệ theo currency/locale
const money = (amt, cur = 'VND') =>
  new Intl.NumberFormat(cur === 'USD' ? 'en-US' : 'vi-VN', {
    style: 'currency', currency: cur, maximumFractionDigits: 0
  }).format(amt || 0);

// Ép features về mảng chuỗi
function toArray(f) {
  if (!f) return [];
  if (Array.isArray(f)) return f;
  try {
    const v = typeof f === 'string' ? JSON.parse(f) : f;
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

function planCardHTML(p) {
  const cur      = p.currency || 'VND';
  const price    = typeof p.price === 'number' ? money(p.price, cur) : '';
  const compare  = (typeof p.compare_at_price === 'number' && p.compare_at_price > (p.price || 0))
                    ? money(p.compare_at_price, cur) : null;
  const badge    = p.badge_text || (p.is_popular ? 'Tiết kiệm' : null);
  const features = toArray(p.features);
  const subTitle = p.subtitle || (p.duration_months ? `${p.duration_months} tháng` : '');
  const title    = p.name || 'Gói thành viên';
  const dl       = p.daily_downloads ? `Tải xuống ${p.daily_downloads} file mỗi ngày` : null;

  const feats = [dl, ...features].filter(Boolean);

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

    <button class="plan-cta" data-plan-slug="${p.slug || ''}" data-plan-id="${p.id}">MUA GÓI NÀY</button>
  </article>`;
}

async function fetchPlans() {
  const grid = $('#plans');
  const errorBox = $('#plans-error');

  try {
    const { data, error } = await supabase
      .from('membership_plans')
      .select('id, slug, name, subtitle, duration_months, price, compare_at_price, currency, daily_downloads, features, is_popular, badge_text, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('price', { ascending: true });
    if (error) throw error;

    grid.innerHTML = (data || []).map(planCardHTML).join('') || '<p>Chưa có gói nào.</p>';

    // CTA handler (ưu tiên slug; fallback id)
    $$('.plan-cta').forEach(btn => {
      btn.addEventListener('click', async () => {
        const slug = btn.getAttribute('data-plan-slug');
        const id   = btn.getAttribute('data-plan-id');

        // 1) Kiểm tra đăng nhập
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.fvOpenAuth?.(); return; }

        // 2) Lấy lại thông tin gói bằng slug (nếu có), nếu không thì theo id
        const sel = 'id, slug, name, subtitle, duration_months, price, currency, compare_at_price';
        let plan = null, ePlan = null;
        if (slug) {
          ({ data: plan, error: ePlan } = await supabase
            .from('membership_plans').select(sel).eq('slug', slug).maybeSingle());
        } else {
          ({ data: plan, error: ePlan } = await supabase
            .from('membership_plans').select(sel).eq('id', id).maybeSingle());
        }
        if (ePlan) { alert(ePlan.message); return; }
        if (!plan) { alert('Gói không tồn tại.'); return; }

        // 3) Chuyển tới checkout kèm slug/id và thông tin hiển thị
        const qs = new URLSearchParams({
          plan: plan.slug || plan.id,
          price: String(plan.price ?? ''),
          currency: plan.currency || 'VND',
          name: plan.name || '',
          duration: String(plan.duration_months ?? '')
        }).toString();
        window.location.href = `/checkout/?${qs}`;
      });
    });
  } catch (e) {
    if (grid) grid.innerHTML = '';
    if (errorBox) { errorBox.hidden = false; errorBox.textContent = e.message || 'Không thể tải dữ liệu gói.'; }
  }
}

document.addEventListener('DOMContentLoaded', fetch
