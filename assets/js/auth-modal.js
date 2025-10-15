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
                        <div id="auth-error-message" class="alert alert-danger" style="display:none;"></div>
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
    const authModalEl = document.getElementById('authModal');
    const authModalInstance = new bootstrap.Modal(authModalEl);
    const authErrorMessage = document.getElementById('auth-error-message');
    
    const headerLoginLink = document.getElementById('user-profile-link');
    const checkoutLoginLink = document.getElementById('checkout-login-link');
    
    const headerAvatar = document.getElementById('header-avatar');
    const headerAuthText = document.getElementById('header-auth-text');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    function forceCloseModal() {
        authModalInstance.hide();
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    function showAuthError(message) {
        if(authErrorMessage) {
            authErrorMessage.textContent = message;
            authErrorMessage.style.display = 'block';
        } else {
            alert(message);
        }
    }

    // --- STEP 4: GẮN CÁC SỰ KIỆN ---

    const openLoginModal = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser(); 
        if (!user) {
            authErrorMessage.style.display = 'none';
            authModalInstance.show();
        } else {
            window.location.href = '/account/';
        }
    };
    
    if (headerLoginLink) headerLoginLink.addEventListener('click', openLoginModal);
    if (checkoutLoginLink) checkoutLoginLink.addEventListener('click', openLoginModal);

    document.getElementById('show-register-form').addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; authErrorMessage.style.display = 'none'; });
    document.getElementById('show-login-form').addEventListener('click', (e) => { e.preventDefault(); registerForm.style.display = 'none'; loginForm.style.display = 'block'; authErrorMessage.style.display = 'none'; });

    document.getElementById('google-signin-btn').addEventListener('click', async () => {
        await supabase.auth.signInWithOAuth({ provider: 'google' });
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginBtn = loginForm.querySelector('button[type="submit"]');
        loginBtn.disabled = true;
        loginBtn.textContent = 'Đang xử lý...';
        authErrorMessage.style.display = 'none';

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: loginForm.querySelector('#login-email').value,
            password: loginForm.querySelector('#login-password').value,
        });

        if (authError) {
            showAuthError('Đăng nhập thất bại: ' + authError.message);
            loginBtn.disabled = false;
            loginBtn.textContent = 'Đăng nhập';
            return;
        }

        if (authData.user) {
            try {
                // *** CẢI TIẾN LOGIC LẤY THÔNG TIN THIẾT BỊ ***
                function getDeviceInfo(ua) {
                    let os = 'Unknown OS';
                    if (/Windows/i.test(ua)) os = 'Windows';
                    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
                    else if (/Linux/i.test(ua)) os = 'Linux';
                    else if (/Android/i.test(ua)) os = 'Android';
                    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
                    
                    let browser = 'Unknown Browser';
                    let version = '';
                    let match;
                    if ((match = ua.match(/Edg\/([0-9\.]+)/))) {
                        browser = 'Edge'; version = match[1];
                    } else if ((match = ua.match(/Chrome\/([0-9\.]+)/))) {
                        browser = 'Chrome'; version = match[1];
                    } else if ((match = ua.match(/Firefox\/([0-9\.]+)/))) {
                        browser = 'Firefox'; version = match[1];
                    } else if ((match = ua.match(/Version\/([0-9\.]+).*Safari/))) {
                        browser = 'Safari'; version = match[1];
                    }
                    return { os_name: os, browser_name: browser, browser_version: version.split('.')[0] };
                }
                const deviceInfo = getDeviceInfo(navigator.userAgent);
                
                const { data: deviceData, error: deviceError } = await supabase.rpc('register_new_device', {
                    device_info: deviceInfo,
                    ip_address: null
                });

                if (deviceError) {
                    if (deviceError.message.includes('device_limit_reached')) {
                        showAuthError('Bạn đã đạt giới hạn 3 thiết bị. Vui lòng xóa một thiết bị cũ trong trang tài khoản.');
                    } else {
                        showAuthError('Lỗi đăng ký thiết bị: ' + deviceError.message);
                    }
                    await supabase.auth.signOut();
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Đăng nhập';
                    return;
                }

                if (deviceData && deviceData.session_id) {
                    localStorage.setItem('device_session_id', deviceData.session_id);
                }
                window.location.reload();

            } catch (rpcError) {
                showAuthError('Lỗi nghiêm trọng khi gọi RPC: ' + rpcError.message);
                await supabase.auth.signOut();
                loginBtn.disabled = false;
                loginBtn.textContent = 'Đăng nhập';
            }
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signUp({
            email: registerForm.querySelector('#register-email').value,
            password: registerForm.querySelector('#register-password').value,
        });
        if (error) {
            showAuthError('Lỗi đăng ký: ' + error.message);
        } else { 
            showAuthError('Đăng ký thành công! Vui lòng kiểm tra email để xác thực.');
        }
    });

    const updateUserDisplay = (user) => {
        if (!headerAuthText || !headerLoginLink) return;

        if (user) {
            const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0];
            headerAuthText.textContent = displayName;
            if(headerAvatar) headerAvatar.src = user.user_metadata?.avatar_url || '/assets/images/sal.jpg';
            headerLoginLink.href = '/account/';
        } else {
            headerAuthText.textContent = 'Đăng nhập';
            if(headerAvatar) headerAvatar.src = '/assets/images/sal.jpg';
            headerLoginLink.href = '#';
        }
    };

    supabase.auth.onAuthStateChange((_event, session) => {
        updateUserDisplay(session?.user);
    });

    (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        updateUserDisplay(user);
    })();
});
