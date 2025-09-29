---
title: "Account"
permalink: "/account/"
image: "/assets/images/screenshot.jpg"
---

<h3>Tạo tài khoản</h3>
<input type="email" id="signup-email" placeholder="Email">
<input type="password" id="signup-password" placeholder="Mật khẩu">
<button onclick="signUp()">Đăng ký</button>

<hr>

<h3>Đăng nhập</h3>
<input type="email" id="signin-email" placeholder="Email">
<input type="password" id="signin-password" placeholder="Mật khẩu">
<button onclick="signIn()">Đăng nhập</button>

<hr>

<button onclick="signOut()">Đăng xuất</button>


<script>
	async function signUp() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
        console.error('Lỗi đăng ký:', error.message);
        alert('Lỗi đăng ký: ' + error.message);
    } else {
        alert('Đăng ký thành công! Vui lòng kiểm tra email để xác thực.');
        console.log('Đăng ký thành công:', data);
    }
}

async function signIn() {
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        console.error('Lỗi đăng nhập:', error.message);
        alert('Lỗi đăng nhập: ' + error.message);
    } else {
        alert('Đăng nhập thành công!');
        console.log('Đăng nhập thành công:', data);
        // Chuyển hướng người dùng đến trang chính hoặc trang tài khoản
        // window.location.href = '/';
    }
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Lỗi đăng xuất:', error.message);
    } else {
        alert('Đăng xuất thành công!');
        // Chuyển hướng người dùng về trang chủ
        // window.location.href = '/';
    }
}

</script>