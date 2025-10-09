document.addEventListener('DOMContentLoaded', () => {
    // --- STEP 1: KIỂM TRA CÁC THƯ VIỆN CẦN THIẾT ---
    if (!window.supabaseClient) {
        console.error('Lỗi: Supabase client chưa được khởi tạo.');
        return;
    }
    const supabase = window.supabaseClient;

    if (typeof bootstrap === 'undefined' || typeof bootstrap.Modal === 'undefined') {
        console.error('Lỗi: Thư viện Bootstrap JS chưa được tải.');
        return;
    }

    // --- STEP 2: TẠO VÀ THÊM HTML CỦA MODAL VÀO TRANG ---
    const modalHTML = `
        <div class="modal fade" id="authModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="authModalLabel">Đăng nhập / Đăng ký</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <button id="google-signin-btn" class="btn btn-outline-danger w-100 mb-3"><i class="fab fa-google me-2"></i>Tiếp tục với Google</button>
                        <div class="text-center my-2">hoặc</div>
                        <form id="login-form">
                            <div class="mb-3"><input type="email" id="login-email" class="form-control" placeholder="Email" required></div>
                            <div class="mb-3"><input type="password" id="login-password" class="form-control" placeholder="Mật khẩu" required></div>
                            <button type="submit" class="btn btn-primary w-100">Đăng nhập</button>
                            <p class="text-center mt-2 small">Chưa có tài khoản? <a href="#" id="show-register-form">Đăng ký</a></p>
                        </form>
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
    
    // --- STEP 3: LẤY CÁC PHẦN TỬ DOM ---
    const authModal = new bootstrap.Modal(document.getElementById('authModal'));
    const userProfileLink = document.getElementById('user-profile-link');
    const headerAvatar = document.getElementById('header-avatar');
    const headerAuthText = document.getElementById('header-auth-text');
    
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // --- STEP 4: GẮN CÁC SỰ KIỆN ---

    // *** SỬA LỖI QUAN TRỌNG NHẤT ***
    // Gắn sự kiện click để luôn luôn kiểm tra trạng thái trước khi quyết định
    userProfileLink.addEventListener('click', async (e) => {
        // Luôn dùng getUser() để có kết quả chính xác nhất
        const { data: { user } } = await supabase.auth.getUser(); 
        
        // Nếu không có user, tức là chưa đăng nhập
        if (!user) {
            e.preventDefault(); // Ngăn thẻ <a> chuyển trang
            authModal.show();   // Mở modal
        }
        // Nếu có user, không làm gì cả, để thẻ <a> tự động chuyển đến /account/
    });

    // Chuyển đổi giữa các form
    document.getElementById('show-register-form').addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; });
    document.getElementById('show-login-form').addEventListener('click', (e) => { e.preventDefault(); registerForm.style.display = 'none'; loginForm.style.display = 'block'; });

    // Đăng nhập Google
    document.getElementById('google-signin-btn').addEventListener('click', async () => {
        await supabase.auth.signInWithOAuth({ provider: 'google' });
    });

    // Xử lý form đăng nhập email
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signInWithPassword({
            email: loginForm.querySelector('#login-email').value,
            password: loginForm.querySelector('#login-password').value,
        });
        if (error) alert(error.message); else authModal.hide();
    });

    // Xử lý form đăng ký email
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signUp({
            email: registerForm.querySelector('#register-email').value,
            password: registerForm.querySelector('#register-password').value,
        });
        if (error) alert(error.message); else { alert('Đăng ký thành công! Vui lòng kiểm tra email để xác thực.'); authModal.hide(); }
    });

    // --- STEP 5: CẬP NHẬT GIAO DIỆN DỰA TRÊN TRẠNG THÁI ĐĂNG NHẬP ---
    const updateUserDisplay = (user) => {
        if (!headerAuthText || !userProfileLink) return;

        if (user) {
            const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0];
            headerAuthText.textContent = displayName;
            if(headerAvatar) headerAvatar.src = user.user_metadata?.avatar_url || '/assets/images/sal.jpg';
            userProfileLink.href = '/account/';
        } else {
            headerAuthText.textContent = 'Đăng nhập';
            if(headerAvatar) headerAvatar.src = '/assets/images/sal.jpg';
            userProfileLink.href = '#';
        }
    };

    // Lắng nghe sự thay đổi trạng thái đăng nhập
    supabase.auth.onAuthStateChange((_event, session) => {
        updateUserDisplay(session?.user);
    });

    // Cập nhật giao diện lần đầu tiên khi tải trang
    (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        updateUserDisplay(user);
    })();
});
