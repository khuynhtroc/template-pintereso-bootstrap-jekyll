document.addEventListener('DOMContentLoaded', async () => {
    // --- LẤY CÁC PHẦN TỬ DOM ---
    const orderSummary = document.getElementById('order-summary');
    const userLoggedInDiv = document.getElementById('user-logged-in');
    const userLoggedOutDiv = document.getElementById('user-logged-out');
    const userEmailSpan = document.getElementById('user-email');
    const checkoutForm = document.getElementById('checkout-form');
    const placeOrderBtnLoggedOut = document.getElementById('place-order-btn');
    const loginLink = document.getElementById('checkout-login-link'); 
    const loggedInActions = document.getElementById('logged-in-checkout-action');
    const placeOrderBtnLoggedIn = document.getElementById('place-order-btn-loggedin');

    if (!orderSummary || !checkoutForm || !loginLink || !loggedInActions) {
        console.error('Lỗi: Thiếu các thành phần HTML cần thiết cho trang checkout.');
        return;
    }

    const supabase = window.supabaseClient;

    // --- LẤY THÔNG TIN ĐƠN HÀNG TỪ SESSIONSTORAGE ---
    const checkoutItemString = sessionStorage.getItem('checkoutItem');
    if (!checkoutItemString) {
        orderSummary.innerHTML = '<p class="text-danger">Không có sản phẩm/gói nào được chọn.</p>';
        if(placeOrderBtnLoggedOut) placeOrderBtnLoggedOut.disabled = true;
        if(placeOrderBtnLoggedIn) placeOrderBtnLoggedIn.disabled = true;
        return;
    }
    const item = JSON.parse(checkoutItemString);
    orderSummary.innerHTML = `
        <ul class="list-group mb-3">
            <li class="list-group-item d-flex justify-content-between lh-sm">
                <div><h6 class="my-0">Sản phẩm</h6><small class="text-muted">${item.name}</small></div>
                <span class="text-muted">${parseInt(item.price).toLocaleString('vi-VN')}đ</span>
            </li>
            <li class="list-group-item d-flex justify-content-between">
                <span>Tổng cộng (VND)</span><strong>${parseInt(item.price).toLocaleString('vi-VN')}đ</strong>
            </li>
        </ul>
    `;

    // --- TÍCH HỢP MODAL ĐĂNG NHẬP ---
    loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        try {
            const authModalInstance = new bootstrap.Modal(document.getElementById('authModal'));
            authModalInstance.show();
        } catch (error) {
            console.error("Lỗi khi mở modal đăng nhập.", error);
        }
    });

    // --- HÀM XỬ LÝ ĐẶT HÀNG (DÙNG CHUNG) ---
    const handlePlaceOrder = async (button) => {
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang xử lý...';

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Bạn cần đăng nhập để đặt hàng.');
            const authModalInstance = new bootstrap.Modal(document.getElementById('authModal'));
            authModalInstance.show();
            button.disabled = false;
            button.innerHTML = 'Đặt hàng';
            return;
        }

        const orderPayload = { user_id: user.id, total_price: item.price, status: 'pending', plan_id: null, product_id: null };
        if (item.type === 'plan') orderPayload.plan_id = item.id;
        else if (item.type === 'product') orderPayload.product_id = item.id;

        const { data: orderData, error: orderError } = await supabase.from('orders').insert(orderPayload).select('id').single();
        
        if (orderError) {
            alert('Lỗi khi tạo đơn hàng: ' + orderError.message);
            button.disabled = false;
            button.innerHTML = 'Đặt hàng';
        } else {
            sessionStorage.removeItem('checkoutItem');
            window.location.href = `/thankyou/?order_id=${orderData.id}`;
        }
    };
    
    // Ngắt sự kiện submit mặc định của form và gán hàm handlePlaceOrder
    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handlePlaceOrder(placeOrderBtnLoggedOut);
    });
    placeOrderBtnLoggedIn.addEventListener('click', () => handlePlaceOrder(placeOrderBtnLoggedIn));


    // --- CẬP NHẬT GIAO DIỆN THEO TRẠNG THÁI ĐĂNG NHẬP ---
    const updateUserStatus = (user) => {
        if (user) {
            userLoggedInDiv.style.display = 'block';
            loggedInActions.style.display = 'block';
            userLoggedOutDiv.style.display = 'none';
            if (userEmailSpan) userEmailSpan.textContent = user.email;
        } else {
            userLoggedInDiv.style.display = 'none';
            loggedInActions.style.display = 'none';
            userLoggedOutDiv.style.display = 'block';
        }
    };

    supabase.auth.onAuthStateChange((_event, session) => {
        updateUserStatus(session?.user);
    });

    const { data: { user } } = await supabase.auth.getUser();
    updateUserStatus(user);

    // --- XỬ LÝ ĐĂNG XUẤT ---
    document.getElementById('logout-button').addEventListener('click', async () => {
        await supabase.auth.signOut();
    });
});
