document.addEventListener('DOMContentLoaded', async () => {
    // --- LẤY CÁC PHẦN TỬ DOM ---
    const orderSummaryContainer = document.getElementById('order-summary-container');
    const userLoggedInDiv = document.getElementById('user-logged-in');
    const userLoggedOutDiv = document.getElementById('user-logged-out');
    const userEmailDisplay = document.getElementById('user-email-display');
    const checkoutForm = document.getElementById('checkout-form');
    const placeOrderBtn = document.getElementById('place-order-btn');
    const loginLink = document.getElementById('checkout-login-link');
    const logoutButton = document.getElementById('logout-button');
    const voucherInput = document.getElementById('voucher-code');
    const applyVoucherBtn = document.getElementById('apply-voucher-btn');
    const voucherMessage = document.getElementById('voucher-message');
    const paymentMethodsContainer = document.getElementById('payment-methods-container');
    const paymentDetails = document.getElementById('payment-details');

    const supabase = window.supabaseClient;

    // --- STATE QUẢN LÝ TRẠNG THÁI THANH TOÁN ---
    let checkoutItem = null;
    let originalPrice = 0;
    let finalPrice = 0;
    let discountAmount = 0;
    let appliedVoucher = null;

    // --- HÀM CẬP NHẬT GIAO DIỆN ---
    const updateUI = () => {
        if (!checkoutItem) {
            orderSummaryContainer.innerHTML = '<p class="text-danger">Không có sản phẩm nào trong giỏ.</p>';
            placeOrderBtn.disabled = true;
            return;
        }

        // Cập nhật tóm tắt đơn hàng
        orderSummaryContainer.innerHTML = `
            <ul class="list-group mb-3">
                <li class="list-group-item d-flex justify-content-between lh-sm">
                    <div>
                        <h6 class="my-0">Sản phẩm</h6>
                        <small class="text-muted">${checkoutItem.name}</small>
                    </div>
                    <span class="text-muted">${originalPrice.toLocaleString('vi-VN')}đ</span>
                </li>
                ${discountAmount > 0 ? `
                <li class="list-group-item d-flex justify-content-between bg-light">
                    <div class="text-success">
                        <h6 class="my-0">Mã giảm giá</h6>
                        <small>${appliedVoucher.toUpperCase()}</small>
                    </div>
                    <span class="text-success">-${discountAmount.toLocaleString('vi-VN')}đ</span>
                </li>` : ''}
                <li class="list-group-item d-flex justify-content-between fs-5">
                    <span>Tổng cộng (VND)</span>
                    <strong>${finalPrice.toLocaleString('vi-VN')}đ</strong>
                </li>
            </ul>
        `;

        // Xử lý phần phương thức thanh toán
        if (finalPrice === 0) {
            paymentMethodsContainer.style.opacity = '0.5';
            paymentMethodsContainer.querySelectorAll('input').forEach(input => input.disabled = true);
            paymentDetails.innerHTML = 'Đơn hàng miễn phí, không cần thanh toán.';
            placeOrderBtn.textContent = "Nhận sản phẩm";
        } else {
            paymentMethodsContainer.style.opacity = '1';
            paymentMethodsContainer.querySelectorAll('input').forEach(input => input.disabled = false);
            placeOrderBtn.textContent = "Đặt hàng";
        }
    };
    
    // --- HÀM XỬ LÝ VOUCHER ---
    applyVoucherBtn.addEventListener('click', async () => {
        const code = voucherInput.value.trim().toUpperCase();
        if (!code) return;

        applyVoucherBtn.disabled = true;
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
            appliedVoucher = null;
        } else {
            discountAmount = Math.round((voucher.discount_percent / 100) * originalPrice);
            voucherMessage.textContent = `Áp dụng thành công! Bạn được giảm ${discountAmount.toLocaleString('vi-VN')}đ.`;
            voucherMessage.className = 'mt-2 small text-success';
            appliedVoucher = voucher.code;
        }
        
        finalPrice = originalPrice - discountAmount;
        if (finalPrice < 0) finalPrice = 0;

        updateUI();
        applyVoucherBtn.disabled = false;
    });

    // --- HÀM XỬ LÝ ĐẶT HÀNG ---
    placeOrderBtn.addEventListener('click', async () => {
        placeOrderBtn.disabled = true;
        placeOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang xử lý...';

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Bạn cần đăng nhập để đặt hàng.');
            new bootstrap.Modal(document.getElementById('authModal')).show();
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = 'Đặt hàng';
            return;
        }

        const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
        if (finalPrice > 0 && !selectedPaymentMethod) {
            alert('Vui lòng chọn một phương thức thanh toán.');
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = 'Đặt hàng';
            return;
        }

        const orderPayload = {
            user_id: user.id,
            total_price: finalPrice,
            original_price: originalPrice,
            discount_amount: discountAmount,
            voucher_code: appliedVoucher,
            status: finalPrice === 0 ? 'completed' : 'pending',
            payment_method: finalPrice > 0 ? selectedPaymentMethod : 'free',
            plan_id: checkoutItem.type === 'plan' ? checkoutItem.id : null,
            product_id: checkoutItem.type === 'product' ? checkoutItem.id : null,
        };

        const { data: orderData, error: orderError } = await supabase.from('orders').insert(orderPayload).select('id').single();
        
        if (orderError) {
            alert('Lỗi khi tạo đơn hàng: ' + orderError.message);
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = 'Đặt hàng';
        } else {
            sessionStorage.removeItem('checkoutItem');
            window.location.href = `/thankyou/?order_id=${orderData.id}`;
        }
    });

    // --- HÀM KHỞI TẠO TRANG ---
    const initializePage = async () => {
        // Lấy sản phẩm từ sessionStorage
        const itemString = sessionStorage.getItem('checkoutItem');
        if (!itemString) {
            updateUI();
            return;
        }
        checkoutItem = JSON.parse(itemString);
        originalPrice = parseInt(checkoutItem.price, 10);
        finalPrice = originalPrice;

        // Kiểm tra trạng thái đăng nhập
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            userLoggedInDiv.style.display = 'block';
            userLoggedOutDiv.style.display = 'none';
            userEmailDisplay.textContent = user.email;
        } else {
            userLoggedInDiv.style.display = 'none';
            userLoggedOutDiv.style.display = 'block';
        }
        
        updateUI();
    };

    // --- GẮN CÁC SỰ KIỆN KHÁC ---
    loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        new bootstrap.Modal(document.getElementById('authModal')).show();
    });
    logoutButton.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
    });
    supabase.auth.onAuthStateChange(() => {
        // Tải lại trang để cập nhật đúng trạng thái
        window.location.reload();
    });

    // --- CHẠY HÀM KHỞI TẠO ---
    initializePage();
});
