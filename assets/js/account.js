// assets/js/account.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
const sec   = $('#acct-secure');
const guest = $('#acct-guest');
const emailEl = $('#acct-email');
const fullEl  = $('#acct-fullname');
const avEl    = $('#acct-avatar');

async function requireAuth() {
  // Lấy user hiện tại; nếu chưa đăng nhập thì hiển thị trạng thái khách
  const { data: { user } } = await supabase.auth.getUser(); // getUser
  if (!user) {
    guest.hidden = false; sec.hidden = true;                 // bảo vệ trang
    return null;
  }
  guest.hidden = true; sec.hidden = false;                   // cho xem trang
  return user;
}

async function loadProfile(user) {
  // Đọc profile từ bảng profiles (id trùng auth.users.id)
  const { data, error } = await supabase
    .from('profiles')
    .select('email, full_name, avatar_url, created_at')
    .eq('id', user.id)
    .maybeSingle();                                         // truy vấn 1 hàng
  if (error) { alert(error.message); return; }
  emailEl.textContent = data?.email || user.email || '';
  fullEl.value = data?.full_name || user.user_metadata?.full_name || '';
  avEl.value   = data?.avatar_url || user.user_metadata?.avatar_url || '';
}

async function saveProfile(user) {
  // Ghi lại full_name, avatar_url vào profiles; RLS cho phép user update own
  const updates = {
    full_name: fullEl.value || null,
    avatar_url: avEl.value || null,
    // id làm điều kiện where
  };
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);                                     // UPDATE theo id
  if (error) { alert(error.message); return; }
  alert('Saved');
}

async function init() {
  const user = await requireAuth();                         // bảo vệ trang
  if (!user) return;
  await loadProfile(user);                                  // nạp dữ liệu

  // Lưu form
  $('#acct-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    await saveProfile(user);                                // UPDATE
  });

  // Đăng xuất
  $('#acct-signout')?.addEventListener('click', async ()=>{
    const { error } = await supabase.auth.signOut();        // signOut
    if (error) alert(error.message);
    await requireAuth();                                    // cập nhật UI
  });

  // Lắng nghe thay đổi Auth để cập nhật UI nếu phiên thay đổi
  supabase.auth.onAuthStateChange(() => { requireAuth(); }); // onAuthStateChange
}

// Mở modal đăng nhập (nếu có) khi là khách
$('#acct-open-auth')?.addEventListener('click', (e)=>{
  e.preventDefault();
  window.fvOpenAuth?.(); // dùng hàm mở modal đã khai báo trong auth-modal.js nếu có
});

init();
