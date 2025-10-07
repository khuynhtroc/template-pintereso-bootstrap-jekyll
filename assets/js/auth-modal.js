import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);
  const backdrop = $('#auth-backdrop');
  const modal    = backdrop?.querySelector('.fv-modal');
  const avatar   = $('#user-avatar');
  const btnClose = $('#auth-close');

  const tabLogin  = $('#tab-login');
  const tabSignup = $('#tab-signup');
  const panelLogin  = $('#panel-login');
  const panelSignup = $('#panel-signup');

  const openModal  = () => { backdrop.classList.add('is-open'); (modal?.querySelector('input,button'))?.focus(); };
  const closeModal = () => { backdrop.classList.remove('is-open'); avatar?.focus?.(); };

  avatar?.addEventListener('click', (e)=>{ e.preventDefault(); openModal(); });
  btnClose?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', (e)=>{ if (e.target === backdrop) closeModal(); });
  window.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal(); });

  // Tabs: theo mẫu ARIA, cập nhật aria-selected, tabindex và hidden
  function activate(which){
    const isLogin = which === 'login';
    tabLogin.setAttribute('aria-selected', String(isLogin));
    tabSignup.setAttribute('aria-selected', String(!isLogin));
    tabLogin.tabIndex  = isLogin ? 0 : -1;
    tabSignup.tabIndex = isLogin ? -1 : 0;

    tabLogin.classList.toggle('is-active', isLogin);
    tabSignup.classList.toggle('is-active', !isLogin);

    panelLogin.hidden  = !isLogin;
    panelSignup.hidden =  isLogin;

    // focus field đầu tiên của panel hiện hành
    (isLogin ? panelLogin : panelSignup).querySelector('input')?.focus();
  }
  tabLogin?.addEventListener('click', ()=> activate('login'));
  tabSignup?.addEventListener('click', ()=> activate('signup'));
  activate('login'); // mặc định gọn nhất

  // Email login
  $('#auth-email-login')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: fd.get('email'), password: fd.get('password')
    });
    if (error) return alert(error.message);
    await syncProfile(); closeModal();
  });

  // Email signup
  $('#auth-email-signup')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signUp({
      email: fd.get('email'),
      password: fd.get('password'),
      options: { data: { username: fd.get('username') || null } }
    });
    if (error) return alert(error.message);
    alert('Đăng ký thành công, kiểm tra email nếu cần xác minh');
    activate('login'); // chuyển qua tab Đăng nhập
  });

  // Google OAuth
  $('#auth-google')?.addEventListener('click', async ()=>{
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) alert(error.message);
  });

  async function syncProfile(){
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').upsert({
      id: user.id, email: user.email,
      full_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null
    });
  }
});
