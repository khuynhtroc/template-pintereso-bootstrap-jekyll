// --- PHIÊN BẢN GỠ LỖI ---
console.log('--- BẮT ĐẦU GỠ LỖI: auth-modal.js ---');

document.addEventListener('DOMContentLoaded', () => {
    console.log('LOG 1: DOM đã tải xong. Bắt đầu thực thi script.');

    // Kiểm tra Supabase client
    if (!window.supabaseClient) {
        console.error('LỖI NGHIÊM TRỌNG: window.supabaseClient không tồn tại!');
        return;
    }
    const supabase = window.supabaseClient;
    console.log('LOG 2: Supabase client đã sẵn sàng.');

    // Kiểm tra Bootstrap
    if (typeof bootstrap === 'undefined' || typeof bootstrap.Modal === 'undefined') {
        console.error('LỖI NGHIÊM TRỌNG: Thư viện Bootstrap JS chưa được tải!');
        alert('Lỗi: Trang web chưa tải xong thư viện cần thiết (Bootstrap). Vui lòng thử lại.');
        return;
    }
    console.log('LOG 3: Thư viện Bootstrap đã sẵn sàng.');

    // --- HTML CỦA MODAL (không thay đổi) ---
    const modalHTML = `
        <div class="modal fade" id="authModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">Đăng nhập / Đăng ký</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body"><button id="google-signin-btn" class="btn btn-outline-danger w-100 mb-3">Tiếp tục với Google</button><div class="text-center my-2">hoặc</div><form id="login-form"><div class="mb-3"><input type="email" id="login-email" class="form-control" placeholder="Email" required></div><div class="mb-3"><input type="password" id="login-password" class="form-control" placeholder="Mật khẩu" required></div><button type="submit" class="btn btn-primary w-100">Đăng nhập</button><p class="text-center mt-2 small">Chưa có tài khoản? <a href="#" id="show-register-form">Đăng ký</a></p></form><form id="register-form" style="display:none;"><div class="mb-3"><input type="email" id="register-email" class="form-control" placeholder="Email" required></div><div class="mb-3"><input type="password" id="register-password" class="form-control" placeholder="Mật khẩu" required></div><button type="submit" class="btn btn-success w-100">Tạo tài khoản</button><p class="text-center mt-2 small">Đã có tài khoản? <a href="#" id="show-login-form">Đăng nhập</a></p></form></div></div></div></div>
    `;
    if (!document.getElementById('authModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        console.log('LOG 4: Đã thêm HTML của modal vào trang.');
    }
    
    // --- LẤY CÁC PHẦN TỬ DOM ---
    console.log('LOG 5: Đang tìm các phần tử DOM...');
    const authModalEl = document.getElementById('authModal');
    const userProfileLink = document.getElementById('user-profile-link');

    if (!authModalEl) return console.error('LỖI: Không tìm thấy #authModal');
    if (!userProfileLink) return console.error('LỖI NGHIÊM TRỌNG: Không tìm thấy thẻ <a> với id="user-profile-link" trong header!');

    console.log('LOG 6: Tìm thấy các phần tử DOM cần thiết.');
    const authModal = new bootstrap.Modal(authModalEl);

    // --- GẮN SỰ KIỆN CLICK ---
    console.log('LOG 7: Đang gắn sự kiện click cho #user-profile-link...');
    userProfileLink.addEventListener('click', async (e) => {
        console.log('EVENT: Đã click vào #user-profile-link.');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            console.log('EVENT: Chưa đăng nhập. Mở modal...');
            e.preventDefault();
            authModal.show();
        } else {
            console.log('EVENT: Đã đăng nhập. Cho phép chuyển đến /account/.');
        }
    });

    // Các sự kiện khác (chuyển form, đăng nhập, đăng ký...)
    // ... (phần code này giữ nguyên) ...

    console.log('--- KẾT THÚC GỠ LỖI: Script đã được thiết lập. ---');
});
