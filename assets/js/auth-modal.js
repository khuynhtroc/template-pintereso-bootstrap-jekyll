document.addEventListener('DOMContentLoaded', () => {
    const supabase = window.supabaseClient;
    if (!supabase) return;

    // --- HTML CỦA MODAL ---
    const modalHTML = `
        <div class="modal fade" id="authModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="authModalLabel">Đăng nhập / Đăng ký</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Nút đăng nhập Google -->
                        <button id="google-signin-btn" class="btn btn-outline-danger w-100 mb-3">
                            <i class="fab fa-google"></i> Tiếp tục với Google
                        </button>
                        <div class="text-center my-2">hoặc</div>

                        <!-- Form Đăng nhập -->
                        <form id="login-form">
                            <div class="mb-3"><input type="email" id="login-email" class="form-control" placeholder="Email" required></div>
                            <div class="mb-3"><input type="password" id="login-password" class="form-control" placeholder="Mật khẩu" required></div>
                            <button type="submit" class="btn btn-primary w-100">Đăng nhập</button>
                            <p class="text-center mt-2 small">Chưa có tài khoản? <a href="#" id="show-register-form">Đăng ký</a></p>
                        </form>

                        <!-- Form Đăng ký -->
                        <form id="register-form" style="display:none;">
                            <div class="mb-3"><input type="email" id="register-email" class="form-control" placeholder="Email" required></div>
                            <div class="mb-3"><input type="password" id="register-password" class="form-control" placeholder="Mật khẩu (tối thiểu 6 ký tự)" required></div>
                            <button type="submit" class="btn btn-success w-100">Tạo tài khoản</button>
                            <p class="text-center mt-2 small">Đã có tài khoản? <a href="#" id="show-login-form">Đăng nhập</a></p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    if (!document.getElementById('authModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    // --- LẤY CÁC PHẦN TỬ DOM ---
    const authModal = new bootstrap.Modal(document.getElementById('authModal'));
    const userProfileLink = document.getElementById('user-profile-link');
    const headerAvatar = document.getElementById('header-avatar');
    const headerAuthText = document.getElementById('header-auth-text');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    // --- HÀM CẬP NHẬT GIAO DIỆN HEADER ---
    const updateUserDisplay = (user) => {
        if (user) {
            const displayName = user.user_metadata.full_name || user.user_metadata.name || user.email.split('@')[0];
            headerAuthText.textContent = displayName;
            headerAvatar.src = user.user_metadata.avatar_url || '/assets/images/default-avatar.png';
            userProfileLink.href = '/account/';
        } else {
            headerAuthText.textContent = 'Đăng nhập';
            headerAvatar.src = '/assets/images/default-avatar.png';
            userProfileLink.href = '#';
        }
    };

    // --- XỬ LÝ SỰ KIỆN ---

    // Click vào link profile/đăng nhập trên header
    userProfileLink.addEventListener('click', (e) => {
        if (!supabase.auth.getSession()) {
            e.preventDefault();
            authModal.show();
        }
    });

    // Chuyển form
    document.getElementById('show-register-form').addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; });
    document.getElementById('show-login-form').addEventListener('click', (e) => { e.preventDefault(); registerForm.style.display = 'none'; loginForm.style.display = 'block'; });

    // Đăng nhập Google
    document.getElementById('google-signin-btn').addEventListener('click', async () => {
        await supabase.auth.signInWithOAuth({ provider: 'google' });
    });

    // Đăng nhập bằng Email
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signInWithPassword({
            email: loginForm.querySelector('#login-email').value,
            password: loginForm.querySelector('#login-password').value,
        });
        if (error) alert(error.message); else authModal.hide();
    });

    // Đăng ký bằng Email
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signUp({
            email: registerForm.querySelector('#register-email').value,
            password: registerForm.querySelector('#register-password').value,
        });
        if (error) alert(error.message); else { alert('Đăng ký thành công!'); authModal.hide(); }
    });

    // --- LẮNG NGHE THAY ĐỔI TRẠNG THÁI ĐĂNG NHẬP ---
    supabase.auth.onAuthStateChange((event, session) => {
        updateUserDisplay(session?.user);
    });

    // Cập nhật giao diện lần đầu khi tải trang
    (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        updateUserDisplay(user);
    })();
});
