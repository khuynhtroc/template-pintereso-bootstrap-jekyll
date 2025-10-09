document.addEventListener('DOMContentLoaded', async () => {
    // --- LẤY CÁC PHẦN TỬ DOM CẦN THIẾT ---
    const orderSummary = document.getElementById('order-summary');
    const userLoggedInDiv = document.getElementById('user-logged-in');
    const userLoggedOutDiv = document.getElementById('user-logged-out');
    const userEmailSpan = document.getElementById('user-email');
    const checkoutForm = document.getElementById('checkout-form');
    const placeOrderBtn = document.getElementById('place-order-btn');
    const loginLink = document.getElementById('user-profile-link'); // Đã có sẵn trong file HTML của bạn

    if (!orderSummary || !checkoutForm || !loginLink) {
        console.error('Lỗi: Thiếu các thành phần HTML cần thiết cho trang checkout.');
        return;
    }

    const supabase = window.supabaseClient;

    // --- STEP 1: LẤY THÔNG TIN SẢN PHẨM/GÓI VIP TỪ SESSIONSTORAGE ---
    const checkoutItemString = sessionStorage.getItem('checkoutItem');

    if (!checkoutItemString) {
        orderSummary.innerHTML = '<p class="text-danger">Không có sản phẩm hoặc gói nào được chọn. Vui lòng quay lại.</p>';
        placeOrderBtn.disabled = true;
        return;
    }

    const item = JSON.parse(checkoutItemString);

    // --- STEP 2: HIỂN THỊ TÓM TẮT ĐƠN HÀNG ---
    orderSummary.innerHTML = `
        <ul class="list-group mb-3">
            <li class="list-group-item d-flex justify-content-between lh-sm">
                <div>
                    <h6 class="my-0">Sản phẩm</h6>
                    <small class="text-muted">${item.name || 'Sản phẩm không tên'}</small>
                </div>
                <span class="text-muted">${parseInt(item.price).toLocaleString('vi-VN')}đ</span>
            </li>
            <li class="list-group-item d-flex justify-content-between">
                <span>Tổng cộng (VND)</span>
                <strong>${parseInt(item.price).toLocaleString('vi-VN')}đ</strong>
            </li>
        </ul>
    `;

    // --- STEP 3: TÍCH HỢP MODAL ĐĂNG NHẬP ---
    // Gắn sự kiện click vào đúng link "Đăng nhập"
    loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        try {
            // Giả sử modal đăng nhập có ID là 'authModal' và đã được file auth-modal.js tạo sẵn
            const authModalInstance = new bootstrap.Modal(document.getElementById('authModal'));
            authModalInstance.show();
        } catch (error) {
            console.error("Lỗi khi mở modal đăng nhập. Bạn đã nhúng file auth-modal.js chưa?", error);
            alert("Đã xảy ra lỗi khi mở form đăng nhập. Vui lòng thử lại.");
        }
    });

    // --- STEP 4: KIỂM TRA VÀ HIỂN THỊ TRẠNG THÁI ĐĂNG NHẬP ---
    const updateUserStatus = (user) => {
        if (user) {
            userLoggedInDiv.style.display = 'block';
            userLoggedOutDiv.style.display = 'none';
            if (userEmailSpan) userEmailSpan.textContent = user.email;
        } else {
            userLoggedInDiv.style.display = 'none';
            userLoggedOutDiv.style.display = 'block';
        }
    };
    
    // Lắng nghe sự kiện đăng nhập/đăng xuất thành công từ auth-modal.js
    supabase.auth.onAuthStateChange((_event, session) => {
        updateUserStatus(session?.user);
        // Nếu người dùng vừa đăng nhập thành công, không cần tải lại trang
        // Giao diện sẽ tự cập nhật
    });

    // Kiểm tra trạng thái ban đầu khi tải trang
    const { data: { user } } = await supabase.auth.getUser();
    updateUserStatus(user);


    // --- STEP 5: XỬ LÝ VIỆC ĐẶT HÀNG ---
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        placeOrderBtn.disabled = true;
        placeOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang xử lý...';
        
        // Lấy lại thông tin user lần nữa để chắc chắn là đã đăng nhập
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser) {
             alert('Bạn cần đăng nhập hoặc tạo tài khoản để hoàn tất đơn hàng.');
             placeOrderBtn.disabled = false;
             placeOrderBtn.textContent = 'Đặt hàng';
             // Mở modal đăng nhập cho người dùng
             const authModal = new bootstrap.Modal(document.getElementById('authModal'));
             authModal.show();
             return;
        }
        
        // Chuẩn bị dữ liệu để chèn vào bảng `orders`
        const orderPayload = {
            user_id: currentUser.id,
            total_price: item.price,
            status: 'pending',
            plan_id: null,
            product_id: null
        };

        if (item.type === 'plan') {
            orderPayload.plan_id = item.id;
        } else if (item.type === 'product') {
            orderPayload.product_id = item.id;
        }

        // Chèn đơn hàng vào database
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert(orderPayload)
            .select('id')
            .single();

        if (orderError) {
            alert('Lỗi khi tạo đơn hàng: ' + orderError.message);
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = 'Đặt hàng';
        } else {
            sessionStorage.removeItem('checkoutItem');
            window.location.href = `/thankyou/?order_id=${orderData.id}`;
        }
    });

    // --- STEP 6: XỬ LÝ NÚT ĐĂNG XUẤT ---
    const logoutButton = document.getElementById('logout-button');
    if(logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload(); // Tải lại trang checkout để hiển thị form đăng ký
        });
    }
});
