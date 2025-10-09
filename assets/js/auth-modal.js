document.addEventListener('DOMContentLoaded', () => {
    // --- STEP 1 & 2: KIỂM TRA THƯ VIỆN & TẠO HTML MODAL ---
    // ... (toàn bộ phần này giữ nguyên như file của bạn)

    if (!window.supabaseClient) { return; }
    const supabase = window.supabaseClient;
    if (typeof bootstrap === 'undefined') { return; }

    const modalHTML = `...`; // Giữ nguyên modalHTML của bạn
    if (!document.getElementById('authModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    // --- STEP 3: LẤY CÁC PHẦN TỬ DOM ---
    const authModalEl = document.getElementById('authModal');
    const authModalInstance = new bootstrap.Modal(authModalEl);
    
    // Tìm cả 2 link đăng nhập
    const headerLoginLink = document.getElementById('user-profile-link');
    const checkoutLoginLink = document.getElementById('checkout-login-link'); // Link mới
    
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    // ... các phần tử khác

    // *** HÀM DỌN DẸP MODAL (QUAN TRỌNG NHẤT) ***
    function forceCloseModal() {
        authModalInstance.hide();
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    // --- STEP 4: GẮN CÁC SỰ KIỆN ---

    // Hàm chung để mở modal
    const openLoginModal = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser(); 
        if (!user) {
            authModalInstance.show();
        } else {
            // Nếu đã đăng nhập, cho phép chuyển đến trang account
            window.location.href = '/account/';
        }
    };
    
    // Gán sự kiện cho cả 2 link
    if (headerLoginLink) {
        headerLoginLink.addEventListener('click', openLoginModal);
    }
    if (checkoutLoginLink) {
        checkoutLoginLink.addEventListener('click', openLoginModal);
    }

    // Chuyển đổi form
    document.getElementById('show-register-form').addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; });
    document.getElementById('show-login-form').addEventListener('click', (e) => { e.preventDefault(); registerForm.style.display = 'none'; loginForm.style.display = 'block'; });

    // Đăng nhập Google
    document.getElementById('google-signin-btn').addEventListener('click', async () => { await supabase.auth.signInWithOAuth({ provider: 'google' }); });

    // Xử lý submit form đăng nhập (ĐÃ TÍCH HỢP forceCloseModal)
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signInWithPassword({
            email: loginForm.querySelector('#login-email').value,
            password: loginForm.querySelector('#login-password').value,
        });
        if (error) {
            alert(error.message);
        } else {
            forceCloseModal();
        }
    });

    // Xử lý submit form đăng ký (ĐÃ TÍCH HỢP forceCloseModal)
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signUp({
            email: registerForm.querySelector('#register-email').value,
            password: registerForm.querySelector('#register-password').value,
        });
        if (error) {
            alert(error.message);
        } else { 
            alert('Đăng ký thành công! Vui lòng kiểm tra email để xác thực.');
            forceCloseModal();
        }
    });

    // --- STEP 5: CẬP NHẬT GIAO DIỆN (giữ nguyên) ---
    // ... (phần updateUserDisplay và onAuthStateChange giữ nguyên như file của bạn)
});
