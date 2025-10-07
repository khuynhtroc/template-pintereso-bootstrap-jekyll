// assets/js/auth-modal.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);
  const backdrop = $('#auth-backdrop');
  const modal = backdrop?.querySelector('.fv-modal');
  const avatar = $('#user-avatar');
  const btnClose = $('#auth-close');

  const openModal  = () => {
    backdrop?.classList.add('is-open');
    modal?.querySelector('input,button')?.focus();
  };
  const closeModal = () => {
    backdrop?.classList.remove('is-open');
    avatar?.focus?.();
  };

  // Mở/đóng modal
  avatar?.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  btnClose?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop?.classList.contains('is-open')) closeModal(); });

  // Đăng ký email
  $('#auth-email-signup')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signUp({
      email: fd.get('email'),
      password: fd.get('password'),
      options: { data: { username: fd.get('username') || null } }
    });
    if (error) return alert(error.message);
    alert('Đăng ký thành công, kiểm tra email nếu được yêu cầu xác minh');
    closeModal();
  });

  // Đăng nhập email
  $('#auth-email-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: fd.get('email'),
      password: fd.get('password')
    });
    if (error) return alert(error.message);
    await syncProfile();
    closeModal();
  });

  // Google OAuth
  $('#auth-google')?.addEventListener('click', async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) alert(error.message);
  });

  // Đồng bộ profile sau đăng nhập (id = auth.users.id)
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
