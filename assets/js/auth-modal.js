// assets/js/auth-modal.js
import { supabase } from './supabaseClient.js';

const $ = (s) => document.querySelector(s);

const ui = {
  avatar: $('#user-avatar'),
  backdrop: $('#auth-backdrop'),
  close: $('#auth-close'),
  tabEmail: '[data-auth-tab="email"]',
  tabPhone: '[data-auth-tab="phone"]',
  panelEmail: $('#auth-panel-email'),
  panelPhone: $('#auth-panel-phone'),
  emailSignup: $('#auth-email-signup'),
  emailLogin: $('#auth-email-login'),
  phoneSend: $('#auth-phone-send'),
  phoneVerify: $('#auth-phone-verify'),
  googleBtn: $('#auth-google'),
};

function openModal() { ui.backdrop.classList.remove('auth-hide'); }
function closeModal() { ui.backdrop.classList.add('auth-hide'); }

function setTab(name) {
  if (name === 'email') {
    ui.panelEmail.classList.remove('auth-hide');
    ui.panelPhone.classList.add('auth-hide');
  } else {
    ui.panelPhone.classList.remove('auth-hide');
    ui.panelEmail.classList.add('auth-hide');
  }
  document.querySelectorAll('.auth-tabs button').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-auth-tab="${name}"]`).classList.add('active');
}

// Open/close
ui.avatar?.addEventListener('click', openModal);
ui.close?.addEventListener('click', closeModal);
document.addEventListener('click', (e) => {
  if (e.target === ui.backdrop) closeModal();
});

// Tabs
document.querySelector(ui.tabEmail)?.addEventListener('click', () => setTab('email'));
document.querySelector(ui.tabPhone)?.addEventListener('click', () => setTab('phone'));

// Email sign up
ui.emailSignup?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const email = fd.get('email'); const password = fd.get('password');
  const username = fd.get('username') || null;

  const { data, error } = await supabase.auth.signUp({
    email, password, options: { data: { username } }
  });
  if (error) return alert(error.message);
  alert('Vui lòng kiểm tra email để xác minh (nếu bật)'); // optional
});

// Email login
ui.emailLogin?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const email = fd.get('email'); const password = fd.get('password');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);
  await syncProfile(); closeModal(); renderHeader();
});

// Phone OTP
ui.phoneSend?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const phone = new FormData(e.currentTarget).get('phone');
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) return alert(error.message);
  alert('Đã gửi mã OTP'); // user nhập mã ở form verify
});

ui.phoneVerify?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const phone = fd.get('phone'); const token = fd.get('token');
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) return alert(error.message);
  await syncProfile(); closeModal(); renderHeader();
});

// Google OAuth
ui.googleBtn?.addEventListener('click', async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) alert(error.message);
});

// Đồng bộ profile sau đăng nhập
async function syncProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('profiles').upsert({
    id: user.id, email: user.email, full_name: user.user_metadata?.full_name || null,
    avatar_url: user.user_metadata?.avatar_url || null
  });
  if (error) console.error(error);
}

// Hiển thị trạng thái user trên header
async function renderHeader() {
  const { data: { user } } = await supabase.auth.getUser();
  const el = document.getElementById('user-avatar');
  if (!el) return;
  el.title = user ? (user.email || 'Đã đăng nhập') : 'Đăng nhập';
}

// Theo dõi thay đổi session
supabase.auth.onAuthStateChange(async () => {
  await syncProfile(); renderHeader();
});

// Đăng xuất (ví dụ gán vào menu user)
window.supabaseSignOut = async () => {
  await supabase.auth.signOut(); renderHeader();
};

renderHeader();
