import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);

  // Elements
  const backdrop = $('#auth-backdrop');
  const modal = backdrop?.querySelector('.fv-modal');
  const avatarBtn = $('#user-avatar'); // ảnh trong menu
  const userNameSpan = $('#user-name'); // span để hiển thị tên cạnh ảnh
  const accountLink = $('#user-menu'); // thẻ <a> bao ảnh + tên, href=/account/
  const btnClose = $('#auth-close');

  const tabLogin = $('#tab-login');
  const tabSignup = $('#tab-signup');
  const panelLogin = $('#panel-login');
  const panelSignup = $('#panel-signup');
  const formLogin = $('#auth-email-login');
  const formSignup = $('#auth-email-signup');
  const btnGoogle = $('#auth-google');

  // Modal open/close
  const openModal = () => { backdrop?.classList.add('is-open'); (modal?.querySelector('input,button'))?.focus(); };
  const closeModal = () => { backdrop?.classList.remove('is-open'); accountLink?.focus?.(); };

  accountLink?.addEventListener('click', (e) => {
    // Nếu chưa đăng nhập => mở modal, nếu đã đăng nhập => đi /account/
    if (!accountLink.dataset.signedin) { e.preventDefault(); openModal(); }
  });
  avatarBtn?.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  btnClose?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop?.classList.contains('is-open')) closeModal(); });

  // Tabs
  function activate(which){
    const isLogin = which === 'login';
    tabLogin?.setAttribute('aria-selected', String(isLogin));
    tabSignup?.setAttribute('aria-selected', String(!isLogin));
    if (tabLogin) tabLogin.tabIndex = isLogin ? 0 : -1;
    if (tabSignup) tabSignup.tabIndex = isLogin ? -1 : 0;
    panelLogin.hidden = !isLogin;
    panelSignup.hidden = isLogin;
    (isLogin ? panelLogin : panelSignup).querySelector('input')?.focus();
  }
  tabLogin?.addEventListener('click', () => activate('login'));
  tabSignup?.addEventListener('click', () => activate('signup'));
  activate('login');

  // Sign in (email/password)
  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: fd.get('email'), password: fd.get('password')
    });
    if (error) { alert(error.message); return; }
    await renderHeader(); closeModal();
  });

  // Sign up (email/password)
  formSignup?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { data, error } = await supabase.auth.signUp({
      email: fd.get('email'),
      password: fd.get('password'),
      options: { data: { username: fd.get('username') || null } }
    });
    if (error) { alert(error.message); return; }
    alert('Đăng ký thành công, hãy kiểm tra email nếu bật xác minh rồi đăng nhập'); // nếu bật confirm email
    activate('login');
  });

  // Google OAuth
  btnGoogle?.addEventListener('click', async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) alert(error.message);
  });

  // Vẽ tên cạnh avatar và gắn href đến trang tài khoản
  async function renderHeader(){
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (userNameSpan) userNameSpan.textContent = 'Đăng nhập';
      if (accountLink) { accountLink.dataset.signedin = ''; accountLink.href = '#'; }
      return;
    }
    // Ưu tiên tên trong profiles, fallback username metadata/email
    let displayName = user.user_metadata?.username || user.user_metadata?.full_name || (user.email?.split('@')[0] ?? 'Tài khoản');
    try {
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      if (p?.full_name) displayName = p.full_name;
    } catch {}
    if (userNameSpan) userNameSpan.textContent = displayName;
    if (accountLink) { accountLink.dataset.signedin = '1'; accountLink.href = '/account/'; }
  }

  // Lắng nghe sự kiện Auth để cập nhật UI tức thì
  supabase.auth.onAuthStateChange((_event, _session) => { renderHeader(); });

  // Khởi tạo
  renderHeader();

  // Đăng xuất (nếu cần dùng ở menu)
  window.supabaseSignOut = async () => { await supabase.auth.signOut(); renderHeader(); };
});
