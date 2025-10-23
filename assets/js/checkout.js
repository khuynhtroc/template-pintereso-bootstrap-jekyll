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
    const voucherInput = document.getElementById('voucher-code-input');
    const applyVoucherBtn = document.getElementById('apply-voucher-btn');
    const voucherMessage = document.getElementById('voucher-message');
    const paymentMethodInputs = document.getElementsByName('paymentMethod');
    const paymentMethodsWrapper = document.getElementById('payment-methods-wrapper');
    
    if (!orderSummary || !checkoutForm || !loginLink || !loggedInActions) {
        console.error('Lỗi: Thiếu các thành phần HTML cần thiết cho trang checkout.');
        return;
    }

    const supabase = window.supabaseClient;

    // --- BIẾN TRẠNG THÁI GIÁ VÀ VOUCHER ---
    let originalPrice = 0;
    let finalPrice = 0;
    let discountAmount = 0;
    let appliedVoucherCode = null;
    let item = null;

    // --- HÀM CẬP NHẬT HIỂN THỊ ĐƠN HÀNG ---
    const updateOrderDisplay = () => {
        if (!item) return;
        
        orderSummary.innerHTML = `
            <ul class="list-group mb-3">
                <li class="list-group-item d-flex justify-content-between lh-sm">
                    <div>
                        <h6 class="my-0">Sản phẩm</h6>
                        <small class="text-muted">${item.name}</small>
                    </div>
                    <span class="text-muted">${originalPrice.toLocaleString('vi-VN')}đ</span>
                </li>
                ${discountAmount > 0 ? `
                <li class="list-group-item d-flex justify-content-between bg-light">
                    <div class="text-success">
                        <h6 class="my-0">Mã giảm giá</h6>
                        <small>${appliedVoucherCode.toUpperCase()}</small>
                    </div>
                    <span class="text-success">-${discountAmount.toLocaleString('vi-VN')}đ</span>
                </li>` : ''}
                <li class="list-group-item d-flex justify-content-between">
                    <span>Tổng cộng (VND)</span>
                    <strong>${finalPrice.toLocaleString('vi-VN')}đ</strong>
                </li>
            </ul>
        `;

        // Nếu đơn hàng 0đ thì làm mờ phần chọn phương thức thanh toán
        if (finalPrice === 0 && paymentMethodsWrapper) {
            paymentMethodsWrapper.style.opacity = '0.5';
            paymentMethodsWrapper.style.pointerEvents = 'none';
        } else if (paymentMethodsWrapper) {
            paymentMethodsWrapper.style.opacity = '1';
            paymentMethodsWrapper.style.pointerEvents = 'auto';
        }
    };

    // --- LẤY THÔNG TIN ĐƠN HÀNG TỪ SESSIONSTORAGE ---
    const checkoutItemString = sessionStorage.getItem('checkoutItem');
    if (!checkoutItemString) {
        orderSummary.innerHTML = '<p class="text-danger">Không có sản phẩm/gói nào được chọn.</p>';
        if(placeOrderBtnLoggedOut) placeOrderBtnLoggedOut.disabled = true;
        if(placeOrderBtnLoggedIn) placeOrderBtnLoggedIn.disabled = true;
        return;
    }
    
    item = JSON.parse(checkoutItemString);
    originalPrice = parseInt(item.price, 10);
    finalPrice = originalPrice;
    updateOrderDisplay();

    // --- XỬ LÝ ÁP DỤNG VOUCHER ---
    if (applyVoucherBtn) {
        applyVoucherBtn.addEventListener('click', async () => {
            const code = voucherInput.value.trim().toUpperCase();
            if (!code) return;
            
            applyVoucherBtn.disabled = true;
            applyVoucherBtn.textContent = 'Đang kiểm tra...';
            
            const { data: voucher, error } = await supabase
                .from('vouchers')
                .select('code, discount_percent')
                .eq('code', code)
                .eq('is_active', true)
                .single();
            
            if (error || !voucher) {
                voucherMessage.textContent = 'Mã không hợp lệ hoặc đã hết hạn.';
                voucherMessage.className = 'mt-2 small text-danger';
                discountAmount = 0;
                appliedVoucherCode = null;
            } else {
                discountAmount = Math.round((voucher.discount_percent / 100) * originalPrice);
                appliedVoucherCode = voucher.code;
                voucherMessage.textContent = `✓ Áp dụng thành công! Giảm ${discountAmount.toLocaleString('vi-VN')}đ`;
                voucherMessage.className = 'mt-2 small text-success';
            }
            
            finalPrice = Math.max(0, originalPrice - discountAmount);
            updateOrderDisplay();
            
            applyVoucherBtn.disabled = false;
            applyVoucherBtn.textContent = 'Áp dụng';
        });
    }

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

    // --- HÀM XỬ LÝ ĐẶT HÀNG (THEO PHƯƠNG THỨC THANH TOÁN) ---
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

        // Lấy phương thức thanh toán được chọn
        let selectedPaymentMethod = 'bank_transfer';
        for (let i = 0; i < paymentMethodInputs.length; i++) {
            if (paymentMethodInputs[i].checked) {
                selectedPaymentMethod = paymentMethodInputs[i].value;
                break;
            }
        }

        // Tạo payload đơn hàng với đầy đủ thông tin voucher
        const orderPayload = { 
            user_id: user.id, 
            total_price: finalPrice,
            original_price: originalPrice,
            discount_amount: discountAmount,
            voucher_code: appliedVoucherCode,
            status: finalPrice === 0 ? 'completed' : 'pending',
            plan_id: null, 
            product_id: null,
            payment_method: selectedPaymentMethod,
        };
        
        if (item.type === 'plan') orderPayload.plan_id = item.id;
        else if (item.type === 'product') orderPayload.product_id = item.id;

        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert(orderPayload)
            .select('id')
            .single();
        
        if (orderError) {
            alert('Lỗi khi tạo đơn hàng: ' + orderError.message);
            button.disabled = false;
            button.innerHTML = 'Đặt hàng';
            return;
        }
        
        sessionStorage.removeItem('checkoutItem');
        const orderId = orderData.id;

        // Xử lý theo từng phương thức thanh toán
        if (selectedPaymentMethod === 'stripe') {
            // Mở tab mới cho Stripe
            window.open(`/payments/stripe?order_id=${orderId}&amount=${finalPrice}`, '_blank');
            alert('Vui lòng hoàn tất thanh toán Stripe ở cửa sổ mới. Sau khi thành công, bạn sẽ nhận được xác nhận!');
            button.disabled = false;
            button.innerHTML = 'Đặt hàng';
        } else if (selectedPaymentMethod === 'paypal') {
            // Mở tab mới cho PayPal
            window.open(`/payments/paypal?order_id=${orderId}&amount=${finalPrice}`, '_blank');
            alert('Vui lòng hoàn tất thanh toán PayPal ở cửa sổ mới. Sau khi thành công, bạn sẽ nhận được xác nhận!');
            button.disabled = false;
            button.innerHTML = 'Đặt hàng';
        } else {
            // Chuyển khoản ngân hàng hoặc đơn 0đ: chuyển sang trang thankyou
            window.location.href = `/thankyou/?order_id=${orderId}`;
        }
    };
    
    // Ngắt sự kiện submit mặc định của form và gán hàm handlePlaceOrder
    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handlePlaceOrder(placeOrderBtnLoggedOut);
    });
    
    if (placeOrderBtnLoggedIn) {
        placeOrderBtnLoggedIn.addEventListener('click', () => handlePlaceOrder(placeOrderBtnLoggedIn));
    }

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
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
        });
    }

    // --- HIỂN THI CHI TIẾT PHƯƠNG THỨC THANH TOÁN ---
    for (let i = 0; i < paymentMethodInputs.length; i++) {
        paymentMethodInputs[i].addEventListener('change', () => {
            document.querySelectorAll('.payment-details-content').forEach(el => el.style.display = 'none');
            const detailEl = document.getElementById(`${paymentMethodInputs[i].id}_details`);
            if (detailEl) detailEl.style.display = 'block';
        });
    }
});
