import { sb } from '/assets/js/sb-client.js';

const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);

  // Elements
  const backdrop = $('#auth-backdrop');
  const modal = backdrop?.querySelector('.fv-modal');
  const userNameSpan = $('#user-name');     // tên cạnh avatar
  const accountLink  = $('#user-menu');     // <a> bao avatar + tên
  const btnClose     = $('#auth-close');

  const tabLogin   = $('#tab-login');
  const tabSignup  = $('#tab-signup');
  const panelLogin = $('#panel-login');
  const panelSignup= $('#panel-signup');
  const formLogin  = $('#auth-email-login');
  const formSignup = $('#auth-email-signup');
  const btnGoogle  = $('#auth-google');

  // Modal open/close
  const openModal  = () => { backdrop?.classList.add('is-open'); (modal?.querySelector('input,button'))?.focus(); };
  const closeModal = () => { backdrop?.classList.remove('is-open'); accountLink?.focus?.(); };

  // Chỉ xử lý click trên anchor tổng; kiểm tra phiên rồi quyết định
  accountLink?.addEventListener('click', async (e) => {
    const { data: { user } } = await supabase.auth.getUser(); // kiểm tra phiên realtime
    if (!user) { e.preventDefault(); openModal(); }            // chưa đăng nhập -> mở modal
    // có user -> giữ nguyên href=/account/ để điều hướng
  });

  // Loại bỏ mọi listener cũ trên ảnh để tránh mở modal vô điều kiện
  const avatarBtn = $('#user-avatar');
  if (avatarBtn) avatarBtn.replaceWith(avatarBtn.cloneNode(true));

  btnClose?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop?.classList.contains('is-open')) closeModal(); });

  // Tabs
  function activate(which){
    const isLogin = which === 'login';
    tabLogin?.setAttribute('aria-selected', String(isLogin));
    tabSignup?.setAttribute('aria-selected', String(!isLogin));
    if (tabLogin)  tabLogin.tabIndex  = isLogin ? 0 : -1;
    if (tabSignup) tabSignup.tabIndex = isLogin ? -1 : 0;
    panelLogin.hidden  = !isLogin;
    panelSignup.hidden =  isLogin;
    (isLogin ? panelLogin : panelSignup).querySelector('input')?.focus();
  }
  tabLogin?.addEventListener('click',  () => activate('login'));
  tabSignup?.addEventListener('click', () => activate('signup'));
  activate('login');

  // Sign in (email/password)
  formLogin?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: fd.get('email'),
      password: fd.get('password')
    });
    if (error) { alert(error.message); return; }
    await renderHeader(); closeModal();
  });

  // Sign up (email/password)
  formSignup?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signUp({
      email: fd.get('email'),
      password: fd.get('password'),
      options: { data: { username: fd.get('username') || null } }
    });
    if (error) { alert(error.message); return; }
    alert('Đăng ký thành công, hãy kiểm tra email nếu bật xác minh rồi đăng nhập');
    activate('login');
  });

  // Google OAuth
  btnGoogle?.addEventListener('click', async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) alert(error.message);
  });

  // Cập nhật tên và href cạnh avatar
  async function renderHeader(){
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (userNameSpan) userNameSpan.textContent = 'Đăng nhập';
      if (accountLink)  accountLink.href = '#';
      return;
    }
    let displayName = user.user_metadata?.username || user.user_metadata?.full_name || (user.email?.split('@')[0] ?? 'Tài khoản');
    try {
      const { data: p } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle();
      if (p?.full_name) displayName = p.full_name;
      // (tuỳ chọn) cập nhật ảnh nếu có
      if (p?.avatar_url) { const img = document.querySelector('#user-avatar'); if (img) img.src = p.avatar_url; }
    } catch {}
    if (userNameSpan) userNameSpan.textContent = displayName;
    if (accountLink)  accountLink.href = '/account/'; // đã đăng nhập -> điều hướng
  }

  // Lắng nghe sự kiện Auth để cập nhật UI
  supabase.auth.onAuthStateChange(() => { renderHeader(); });

  // Khởi tạo
  renderHeader();

  // Hàm đăng xuất (nếu dùng trong menu)
  window.supabaseSignOut = async () => { await supabase.auth.signOut(); renderHeader(); };
});
