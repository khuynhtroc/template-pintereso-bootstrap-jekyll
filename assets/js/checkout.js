document.addEventListener('DOMContentLoaded', async () => {
    // Biến DOM
    const orderSummary = document.getElementById('order-summary');
    const checkoutForm = document.getElementById('checkout-form');
    const placeOrderBtnLoggedOut = document.getElementById('place-order-btn');
    const placeOrderBtnLoggedIn = document.getElementById('place-order-btn-loggedin');
    const voucherInput = document.getElementById('voucher-code-input');
    const applyVoucherBtn = document.getElementById('apply-voucher-btn');
    const voucherMessage = document.getElementById('voucher-message');
    const paymentRadioButtons = document.querySelectorAll('input[name="paymentMethod"]');
    const userEmailSpan = document.getElementById('user-email');
    const loginLink = document.getElementById('checkout-login-link');
    const logoutButton = document.getElementById('logout-button');
    const supabase = window.supabaseClient;

    // Trạng thái
    let originalPrice = 0, finalPrice = 0, discountAmount = 0;
    let appliedVoucherCode = null, item = null;

    // Cập nhật hiển thị
    const updateDisplay = () => {
        if (!item) {
            orderSummary.innerHTML = '<div class="alert alert-warning">Không có sản phẩm nào được chọn.</div>';
        } else {
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
                      <small>${appliedVoucherCode}</small>
                    </div>
                    <span class="text-success">-${discountAmount.toLocaleString('vi-VN')}đ</span>
                </li>` : ''}
                <li class="list-group-item d-flex justify-content-between fs-5 fw-bold">
                    <span>Tổng cộng (VND)</span>
                    <span>${finalPrice.toLocaleString('vi-VN')}đ</span>
                </li>
            </ul>`;
        }
    };

    // Quy trình ĐẶT HÀNG
    const processCheckout = async (button) => {
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang tạo đơn...';

        // Kiểm tra đăng nhập
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Bạn cần đăng nhập để đặt hàng.');
            new bootstrap.Modal(document.getElementById('authModal')).show();
            button.disabled = false; button.innerHTML = 'Đặt hàng';
            return;
        }

        // Lấy phương thức
        const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
        if (!selectedPaymentMethod) {
            alert('Vui lòng chọn phương thức thanh toán.');
            button.disabled = false; button.innerHTML = 'Đặt hàng';
            return;
        }

        // Tạo đơn hàng (pending)
        const orderPayload = {
            user_id: user.id,
            total_price: finalPrice,
            original_price: originalPrice,
            discount_amount: discountAmount,
            voucher_code: appliedVoucherCode,
            status: (finalPrice === 0) ? 'completed' : 'pending',
            payment_method: selectedPaymentMethod,
            plan_id: item.type === 'plan' ? item.id : null,
            product_id: item.type === 'product' ? item.id : null,
        };

        const { data: orderData, error: orderError } = await supabase.from('orders').insert(orderPayload).select('id').single();

        if (orderError) {
            alert('Lỗi khi tạo đơn hàng: ' + orderError.message);
            button.disabled = false; button.innerHTML = 'Đặt hàng';
            return;
        }

        const orderId = orderData.id;
        sessionStorage.removeItem('checkoutItem');

        // Xử lý chuyển hướng từng phương thức
        if (selectedPaymentMethod === 'paypal') {
            // Mở tab Paypal (giả định một URL thanh toán thực sự sẽ receive order_id)
            const paypalUrl = `/payments/paypal?order_id=${orderId}&amount=${finalPrice}`;
            window.open(paypalUrl, '_blank'); // Mở ở tab mới
            button.disabled = false; button.innerHTML = 'Đặt hàng';
            alert('Bạn đã được chuyển tới cổng Paypal. Sau khi thanh toán thành công, hệ thống sẽ tự động xác nhận đơn!');
        } else if (selectedPaymentMethod === 'stripe') {
            // Mở tab Stripe (giả định một URL thanh toán thực sự sẽ receive order_id)
            const stripeUrl = `/payments/stripe?order_id=${orderId}&amount=${finalPrice}`;
            window.open(stripeUrl, '_blank'); // Mở ở tab mới
            button.disabled = false; button.innerHTML = 'Đặt hàng';
            alert('Bạn đã được chuyển tới cổng Stripe. Sau khi thanh toán thành công, hệ thống sẽ tự động xác nhận đơn!');
        } else {
            // Tất cả phương thức khác đều chuyển thankyou
            window.location.href = `/thankyou/?order_id=${orderId}`;
        }
    };

    // Xử lý áp dụng voucher
    applyVoucherBtn.addEventListener('click', async () => {
        const code = voucherInput.value.trim().toUpperCase();
        if (!code) return;
        applyVoucherBtn.disabled = true;
        const { data: voucher, error } = await supabase.from('vouchers').select('code, discount_percent').eq('code', code).eq('is_active', true).single();
        if (error || !voucher) {
            voucherMessage.textContent = 'Mã không hợp lệ hoặc đã hết hạn.';
            voucherMessage.className = 'mt-2 small text-danger';
            discountAmount = 0; appliedVoucherCode = null;
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

    // Lấy dữ liệu sản phẩm
    const checkoutItemString = sessionStorage.getItem('checkoutItem');
    if (!checkoutItemString) {
        orderSummary.innerHTML = '<div class="alert alert-warning">Không có sản phẩm nào được chọn.</div>';
        placeOrderBtnLoggedOut.disabled = true;
        placeOrderBtnLoggedIn.disabled = true;
    } else {
        item = JSON.parse(checkoutItemString);
        originalPrice = parseInt(item.price, 10);
        finalPrice = originalPrice;
        updateDisplay();
    }

    // Gắn sự kiện cho các nút Đặt hàng
    checkoutForm.addEventListener('submit', (e) => e.preventDefault());
    placeOrderBtnLoggedOut.addEventListener('click', () => processCheckout(placeOrderBtnLoggedOut));
    placeOrderBtnLoggedIn.addEventListener('click', () => processCheckout(placeOrderBtnLoggedIn));

    // Login/Logout
    loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        try { new bootstrap.Modal(document.getElementById('authModal')).show(); }
        catch (error) { console.error("Lỗi khi mở modal đăng nhập.", error); }
    });
    logoutButton.addEventListener('click', async () => { await supabase.auth.signOut(); });

    // Lắng nghe thay đổi trạng thái đăng nhập
    supabase.auth.onAuthStateChange((_event, session) => updateUserStatus(session?.user));
    const { data: { user } } = await supabase.auth.getUser();
    updateUserStatus(user);

    // Hiển thị chi tiết phương thức thanh toán
    paymentRadioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
            document.querySelectorAll('.payment-details-content').forEach(el => el.style.display = 'none');
            const detailEl = document.getElementById(`${radio.id}_details`);
            if (detailEl) detailEl.style.display = 'block';
        });
    });

    // Hàm cập nhật UI login/logout
    function updateUserStatus(user) {
        if (user) {
            document.getElementById('user-logged-in').style.display = 'block';
            document.getElementById('user-logged-out').style.display = 'none';
            userEmailSpan.textContent = user.email;
        } else {
            document.getElementById('user-logged-in').style.display = 'none';
            document.getElementById('user-logged-out').style.display = 'block';
            userEmailSpan.textContent = '';
        }
    }
});
