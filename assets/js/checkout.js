document.addEventListener('DOMContentLoaded', async () => {
    // --- LẤY CÁC PHẦN TỬ DOM CẦN THIẾT ---
    const orderSummary = document.getElementById('order-summary');
    const userLoggedInDiv = document.getElementById('user-logged-in');
    const userLoggedOutDiv = document.getElementById('user-logged-out');
    const userEmailSpan = document.getElementById('user-email');
    const checkoutForm = document.getElementById('checkout-form');
    const placeOrderBtn = document.getElementById('place-order-btn');

    if (!orderSummary || !checkoutForm) {
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

    // --- STEP 3: KIỂM TRA VÀ HIỂN THỊ TRẠNG THÁI ĐĂNG NHẬP ---
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        userLoggedInDiv.style.display = 'block';
        userLoggedOutDiv.style.display = 'none';
        if (userEmailSpan) userEmailSpan.textContent = user.email;
    } else {
        userLoggedInDiv.style.display = 'none';
        userLoggedOutDiv.style.display = 'block';
    }

    // --- STEP 4: XỬ LÝ VIỆC ĐẶT HÀNG ---
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        placeOrderBtn.disabled = true;
        placeOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang xử lý...';
        
        let currentUser = user;

        // Nếu người dùng chưa đăng nhập, thực hiện đăng ký nhanh
        if (!currentUser) {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;

            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: { data: { full_name: `${firstName} ${lastName}` } }
            });

            if (signUpError) {
                alert('Lỗi đăng ký: ' + signUpError.message);
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = 'Đặt hàng';
                return;
            }
            currentUser = signUpData.user;
        }
        
        // Chuẩn bị dữ liệu để chèn vào bảng `orders`
        const orderPayload = {
            user_id: currentUser.id,
            total_price: item.price,
            status: 'pending', // Mặc định là đang chờ
            // Reset các trường liên quan
            plan_id: null,
            product_id: null
        };

        // Gán ID tương ứng dựa trên loại sản phẩm
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
            // Xóa item khỏi sessionStorage sau khi đã tạo đơn hàng thành công
            sessionStorage.removeItem('checkoutItem');
            // Chuyển hướng đến trang cảm ơn
            window.location.href = `/thankyou/?order_id=${orderData.id}`;
        }
    });

    // --- STEP 5: XỬ LÝ CÁC NÚT PHỤ ---
    const logoutButton = document.getElementById('logout-button');
    if(logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload();
        });
    }
    
    // Nút này nên tích hợp với modal đăng nhập chung của bạn
    const loginLink = document.getElementById('login-link');
    if(loginLink) {
        loginLink.addEventListener('click', () => {
            // Logic để mở auth-modal.js
            // Bạn có thể gọi một hàm toàn cục hoặc dispatch một event
            alert('Chức năng đăng nhập sẽ được kích hoạt tại đây.');
        });
    }
});
