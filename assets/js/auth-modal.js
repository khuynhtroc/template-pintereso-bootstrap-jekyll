// assets/js/auth-modal.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);

  // Phần tử UI
  const backdrop   = $('#auth-backdrop');
  const modal      = backdrop?.querySelector('.fv-modal');
  const avatar     = $('#user-avatar');
  const btnClose   = $('#auth-close');

  const tabLogin   = $('#tab-login');
  const tabSignup  = $('#tab-signup');
  const panelLogin = $('#panel-login');
  const panelSignup= $('#panel-signup');

  const formLogin  = $('#auth-email-login');
  const formSignup = $('#auth-email-signup');
  const btnGoogle  = $('#auth-google');

  // Mở/đóng modal
  const openModal  = () => { backdrop?.classList.add('is-open'); (modal?.querySelector('input,button'))?.focus(); };
  const closeModal = () => { backdrop?.classList.remove('is-open'); avatar?.focus?.(); };

  avatar?.addEventListener('click', (e)=>{ e.preventDefault(); openModal(); });
  btnClose?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', (e)=>{ if (e.target === backdrop) closeModal(); });
  window.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && backdrop?.classList.contains('is-open')) closeModal(); });

  // Tabs ARIA: chuyển panel và cập nhật aria-selected/tabindex
  function activate(which){
    const isLogin = which === 'login';
    tabLogin?.setAttribute('aria-selected', String(isLogin));
    tabSignup?.setAttribute('aria-selected', String(!isLogin));
    if (tabLogin)  tabLogin.tabIndex  = isLogin ? 0 : -1;
    if (tabSignup) tabSignup.tabIndex = isLogin ? -1 : 0;

    tabLogin?.classList.toggle('is-active', isLogin);
    tabSignup?.classList.toggle('is-active', !isLogin);

    if (panelLogin)  panelLogin.hidden  = !isLogin;
    if (panelSignup) panelSignup.hidden =  isLogin;

    (isLogin ? panelLogin : panelSignup)?.querySelector('input')?.focus();
  }
  tabLogin?.addEventListener('click',  ()=> activate('login'));
  tabSignup?.addEventListener('click', ()=> activate('signup'));
  activate('login'); // mặc định mở tab Đăng nhập

  // Đăng nhập (email/password)
  formLogin?.addEventListener('submit', async (e)=>{
    e.preventDefault(); // chặn reload
    const fd = new FormData(e.currentTarget);
    const email = fd.get('email'); const password = fd.get('password');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { alert(error.message); return; } // hiển thị thông điệp chuẩn
    await syncProfile();
    closeModal();
  });

  // Đăng ký (email/password)
  formSignup?.addEventListener('submit', async (e)=>{
    e.preventDefault(); // chặn reload
    const fd = new FormData(e.currentTarget);
    const email = fd.get('email'); const password = fd.get('password');
    const username = fd.get('username') || null;

    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { username } }
    });
    if (error) { alert(error.message); return; } // ví dụ: User already registered / password policy
    alert('Đăng ký thành công, kiểm tra email nếu được yêu cầu xác minh'); // nếu bật confirm email
    activate('login'); // chuyển sang tab đăng nhập
  });

  // Google OAuth
  btnGoogle?.addEventListener('click', async ()=>{
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) alert(error.message);
  });

  // Đồng bộ profile sau khi đã có user
  async function syncProfile(){
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null
    });
  }
});
