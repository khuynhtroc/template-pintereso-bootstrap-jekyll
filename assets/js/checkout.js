document.addEventListener('DOMContentLoaded', async () => {
    // --- GIỮ NGUYÊN PHẦN LẤY DOM CỦA BẠN VÀ BỔ SUNG THÊM ---
    const orderSummary = document.getElementById('order-summary');
    const userLoggedInDiv = document.getElementById('user-logged-in');
    const userLoggedOutDiv = document.getElementById('user-logged-out');
    const userEmailSpan = document.getElementById('user-email');
    const checkoutForm = document.getElementById('checkout-form');
    const placeOrderBtnLoggedOut = document.getElementById('place-order-btn');
    const loginLink = document.getElementById('checkout-login-link'); 
    const loggedInActions = document.getElementById('logged-in-checkout-action');
    const placeOrderBtnLoggedIn = document.getElementById('place-order-btn-loggedin');

    // --- CÁC BIẾN MỚI ---
    const voucherInput = document.getElementById('voucher-code-input');
    const applyVoucherBtn = document.getElementById('apply-voucher-btn');
    const voucherMessage = document.getElementById('voucher-message');
    const paymentMethodsWrapper = document.getElementById('payment-methods-wrapper');
    const paymentRadioButtons = document.querySelectorAll('input[name="paymentMethod"]');
    const supabase = window.supabaseClient;

    // --- BIẾN STATE ĐỂ QUẢN LÝ ĐƠN HÀNG ---
    let originalPrice = 0;
    let finalPrice = 0;
    let discountAmount = 0;
    let appliedVoucherCode = null;
    let item = null;

    // --- HÀM CẬP NHẬT GIAO DIỆN (MỚI) ---
    const updateDisplay = () => {
        if (!item) return;

        // Cập nhật tóm tắt đơn hàng
        orderSummary.innerHTML = `
            <ul class="list-group mb-3">
                <li class="list-group-item d-flex justify-content-between lh-sm">
                    <div><h6 class="my-0">Sản phẩm</h6><small class="text-muted">${item.name}</small></div>
                    <span class="text-muted">${originalPrice.toLocaleString('vi-VN')}đ</span>
                </li>
                ${discountAmount > 0 ? `
                <li class="list-group-item d-flex justify-content-between bg-light">
                    <div class="text-success"><h6 class="my-0">Mã giảm giá</h6><small>${appliedVoucherCode.toUpperCase()}</small></div>
                    <span class="text-success">-${discountAmount.toLocaleString('vi-VN')}đ</span>
                </li>` : ''}
                <li class="list-group-item d-flex justify-content-between">
                    <span>Tổng cộng (VND)</span><strong>${finalPrice.toLocaleString('vi-VN')}đ</strong>
                </li>
            </ul>`;

        // Xử lý đơn hàng 0đ
        if (finalPrice === 0) {
            paymentMethodsWrapper.style.opacity = '0.5';
            paymentMethodsWrapper.style.pointerEvents = 'none';
        } else {
            paymentMethodsWrapper.style.opacity = '1';
            paymentMethodsWrapper.style.pointerEvents = 'auto';
        }
    };
    
    // --- HÀM ÁP DỤNG VOUCHER (MỚI) ---
    applyVoucherBtn.addEventListener('click', async () => {
        const code = voucherInput.value.trim().toUpperCase();
        if (!code) return;

        applyVoucherBtn.disabled = true;
        const { data: voucher, error } = await supabase.from('vouchers').select('code, discount_percent').eq('code', code).eq('is_active', true).single();

        if (error || !voucher) {
            voucherMessage.textContent = 'Mã không hợp lệ hoặc đã hết hạn.';
            voucherMessage.className = 'mt-2 small text-danger';
            discountAmount = 0;
            appliedVoucherCode = null;
        } else {
            discountAmount = Math.round((voucher.discount_percent / 100) * originalPrice);
            appliedVoucherCode = voucher.code;
            voucherMessage.textContent = `Áp dụng thành công! Giảm ${discountAmount.toLocaleString('vi-VN')}đ.`;
            voucherMessage.className = 'mt-2 small text-success';
        }
        
        finalPrice = Math.max(0, originalPrice - discountAmount);
        updateDisplay();
        applyVoucherBtn.disabled = false;
    });

    // --- CẬP NHẬT HÀM ĐẶT HÀNG CỦA BẠN ---
    const handlePlaceOrder = async (button) => {
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang xử lý...';

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            // Logic cũ của bạn đã xử lý tốt
            alert('Bạn cần đăng nhập để đặt hàng.');
            new bootstrap.Modal(document.getElementById('authModal')).show();
            button.disabled = false;
            button.innerHTML = 'Đặt hàng';
            return;
        }

        const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
        if (finalPrice > 0 && !selectedPaymentMethod) {
            alert('Vui lòng chọn một phương thức thanh toán.');
            button.disabled = false;
            button.innerHTML = 'Đặt hàng';
            return;
        }

        // Tạo payload mới với đầy đủ thông tin
        const orderPayload = {
            user_id: user.id,
            total_price: finalPrice,
            original_price: originalPrice,
            discount_amount: discountAmount,
            voucher_code: appliedVoucherCode,
            status: finalPrice === 0 ? 'completed' : 'pending',
            payment_method: finalPrice > 0 ? selectedPaymentMethod : 'free',
            plan_id: item.type === 'plan' ? item.id : null,
            product_id: item.type === 'product' ? item.id : null,
        };

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
    
    // --- KHỞI TẠO DỮ LIỆU BAN ĐẦU ---
    const checkoutItemString = sessionStorage.getItem('checkoutItem');
    if (!checkoutItemString) {
        orderSummary.innerHTML = '<p class="text-danger">Không có sản phẩm/gói nào được chọn.</p>';
        placeOrderBtnLoggedOut.disabled = true;
        placeOrderBtnLoggedIn.disabled = true;
    } else {
        item = JSON.parse(checkoutItemString);
        originalPrice = parseInt(item.price, 10);
        finalPrice = originalPrice;
        updateDisplay(); // Gọi lần đầu để hiển thị giá
    }

    // --- GIỮ NGUYÊN CÁC EVENT LISTENER CŨ CỦA BẠN ---
    loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        try { new bootstrap.Modal(document.getElementById('authModal')).show(); } 
        catch (error) { console.error("Lỗi khi mở modal đăng nhập.", error); }
    });

    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handlePlaceOrder(placeOrderBtnLoggedOut);
    });
    placeOrderBtnLoggedIn.addEventListener('click', () => handlePlaceOrder(placeOrderBtnLoggedIn));

    const updateUserStatus = (user) => {
        // Code cũ của bạn đã đúng
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

    document.getElementById('logout-button').addEventListener('click', async () => {
        await supabase.auth.signOut();
    });

    // Hiển thị chi tiết cho từng phương thức thanh toán
    paymentRadioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
            document.querySelectorAll('.payment-details-content').forEach(el => el.style.display = 'none');
            const detailEl = document.getElementById(`${radio.id}_details`);
            if(detailEl) detailEl.style.display = 'block';
        });
    });
});
