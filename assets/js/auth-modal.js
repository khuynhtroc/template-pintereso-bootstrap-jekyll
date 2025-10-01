// assets/js/auth-modal.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'; // ESM CDN ổn định cho browser
const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY); // publishable key
const $ = (s) => document.querySelector(s);

const ui = {
  avatar: $('#user-avatar'),
  backdrop: $('#auth-backdrop'),
  close: $('#auth-close'),
  emailSignup: $('#auth-email-signup'),
  emailLogin: $('#auth-email-login'),
  phoneSend: $('#auth-phone-send'),
  phoneVerify: $('#auth-phone-verify'),
  googleBtn: $('#auth-google'),
  panelEmail: $('#auth-panel-email'),
  panelPhone: $('#auth-panel-phone')
};

function openModal(){ ui.backdrop.classList.remove('auth-hide'); }
function closeModal(){ ui.backdrop.classList.add('auth-hide'); }

ui.avatar?.addEventListener('click', openModal);
ui.close?.addEventListener('click', closeModal);
ui.backdrop?.addEventListener('click', (e)=>{ if(e.target===ui.backdrop) closeModal(); });

// Email signup
ui.emailSignup?.addEventListener('submit', async (e)=>{
  e.preventDefault(); // chặn submit mặc định
  const fd = new FormData(e.currentTarget);
  const { error } = await supabase.auth.signUp({
    email: fd.get('email'),
    password: fd.get('password'),
    options: { data: { username: fd.get('username') || null } }
  });
  if(error) return alert(error.message);
  alert('Đăng ký thành công, kiểm tra email nếu cần xác minh');
});

// Email login
ui.emailLogin?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const { error } = await supabase.auth.signInWithPassword({
    email: fd.get('email'), password: fd.get('password')
  });
  if(error) return alert(error.message);
  await syncProfile(); closeModal();
});

// Phone OTP
ui.phoneSend?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const phone = new FormData(e.currentTarget).get('phone');
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if(error) return alert(error.message);
  alert('Đã gửi mã OTP');
});
ui.phoneVerify?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const { error } = await supabase.auth.verifyOtp({
    phone: fd.get('phone'), token: fd.get('token'), type: 'sms'
  });
  if(error) return alert(error.message);
  await syncProfile(); closeModal();
});

// Google
ui.googleBtn?.addEventListener('click', async ()=>{
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if(error) alert(error.message);
});

// Đồng bộ profile
async function syncProfile(){
  const { data: { user } } = await supabase.auth.getUser();
  if(!user) return;
  await supabase.from('profiles').upsert({
    id: user.id, email: user.email,
    full_name: user.user_metadata?.full_name || null,
    avatar_url: user.user_metadata?.avatar_url || null
  });
}

// Theo dõi phiên
supabase.auth.onAuthStateChange(async ()=>{ await syncProfile(); });

console.log('auth-modal loaded');
