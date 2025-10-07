import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const accName    = $('#acc-name');
const accHello   = $('#acc-hello');
const accAvatar  = $('#acc-avatar');
const emailInput = $('#acc-email');
const nameInput  = $('#acc-fullname');
const avatarUrl  = $('#acc-avatar-url');

async function requireAuth(){
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Nếu chưa đăng nhập, điều hướng về trang chủ hoặc mở modal
    window.location.href = '/';
    return null;
  }
  return user;
}

async function loadProfile(user){
  const { data, error } = await supabase
    .from('profiles')
    .select('email, full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();
  if (error) { alert(error.message); return; }

  const displayName = data?.full_name || user.user_metadata?.username || (user.email?.split('@')[0] ?? 'Tài khoản');
  accName.textContent  = displayName;
  accHello.textContent = displayName;
  emailInput.value     = data?.email || user.email || '';
  nameInput.value      = data?.full_name || '';
  avatarUrl.value      = data?.avatar_url || '';
  if (data?.avatar_url) accAvatar.src = data.avatar_url;
}

async function saveProfile(user){
  const updates = {
    full_name: nameInput.value || null,
    avatar_url: avatarUrl.value || null
  };
  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
  if (error) { alert(error.message); return; }
  alert('Đã lưu');
  await loadProfile(user);
}

function initTabs(){
  $$('.acc-menu li a').forEach(a=>{
    a.addEventListener('click', (e)=>{
      e.preventDefault();
      const tab = a.dataset.tab;
      $$('.acc-menu li').forEach(li=>li.classList.remove('active'));
      a.parentElement.classList.add('active');
      $$('.tab-pane').forEach(s=>s.classList.remove('is-active'));
      $('#tab-'+tab)?.classList.add('is-active');
    });
  });
}

async function init(){
  initTabs();

  const user = await requireAuth();
  if (!user) return;

  await loadProfile(user);

  $('#acc-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    await saveProfile(user);
  });

  $('#acc-signout')?.addEventListener('click', async (e)=>{
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.href = '/';
  });

  // Đồng bộ UI khi phiên thay đổi
  supabase.auth.onAuthStateChange(async (_evt, _sess)=>{ const u = await requireAuth(); if (u) loadProfile(u); });
}

init();
