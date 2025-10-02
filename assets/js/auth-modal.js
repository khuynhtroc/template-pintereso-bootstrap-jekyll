// assets/js/auth-modal.js (đoạn xử lý sign up / sign in)
ui.emailSignup?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const { error } = await supabase.auth.signUp({
    email: fd.get('email'),
    password: fd.get('password'),
    options: { data: { username: fd.get('username') || null } }
  });
  if (error) return alert(error.message); // sẽ thấy lỗi chi tiết từ Supabase
  alert('Đăng ký thành công, kiểm tra email nếu được yêu cầu xác minh');
  closeModal();
});

ui.emailLogin?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const { error } = await supabase.auth.signInWithPassword({
    email: fd.get('email'), password: fd.get('password')
  });
  if (error) return alert(error.message);
  await syncProfile();
  closeModal();
});
