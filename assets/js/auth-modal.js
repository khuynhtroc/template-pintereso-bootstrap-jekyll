import { sb } from '/assets/js/sb-client.js';

const $ = (s)=>document.querySelector(s);

function openModal(){ $('#auth-backdrop')?.classList.add('is-open'); }
function closeModal(){ $('#auth-backdrop')?.classList.remove('is-open'); }

$('#auth-open')?.addEventListener('click', (e)=>{ e.preventDefault(); openModal(); });
$('#auth-close')?.addEventListener('click', closeModal);
$('#auth-backdrop')?.addEventListener('click', (e)=>{ if(e.target.id==='auth-backdrop') closeModal(); });

$('#tab-login')?.addEventListener('click', ()=>switchTab('login'));
$('#tab-signup')?.addEventListener('click', ()=>switchTab('signup'));
function switchTab(which){
  const isLogin = which==='login';
  $('#panel-login').hidden = !isLogin;
  $('#panel-signup').hidden = isLogin;
}

$('#auth-email-login')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const { error } = await sb.auth.signInWithPassword({ email: fd.get('email'), password: fd.get('password') });
  if (error) return alert(error.message);
  closeModal(); renderHeader();
});

$('#auth-email-signup')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const { error } = await sb.auth.signUp({ email: fd.get('email'), password: fd.get('password'), options: { data: { username: fd.get('username')||null } } });
  if (error) return alert(error.message);
  alert('Đăng ký thành công, hãy kiểm tra email (nếu bật xác minh) rồi đăng nhập');
  switchTab('login');
});

$('#auth-google')?.addEventListener('click', async ()=>{
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google' });
  if (error) alert(error.message);
});

export async function renderHeader(){
  const span = document.querySelector('#user-name');
  const { data:{ user } } = await sb.auth.getUser();
  if (!user) {
    if (span) span.textContent = 'Đăng nhập';
    const link = document.querySelector('#user-menu'); if (link) link.href = '#';
    return;
  }
  let name = user.user_metadata?.username || (user.email?.split('@')[0] ?? 'Tài khoản');
  try {
    const { data: p } = await sb.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
    if (p?.full_name) name = p.full_name;
  } catch {}
  if (span) span.textContent = name;
  const link = document.querySelector('#user-menu'); if (link) link.href = '/account/';
}
sb.auth.onAuthStateChange(()=>renderHeader());
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',renderHeader):renderHeader();
