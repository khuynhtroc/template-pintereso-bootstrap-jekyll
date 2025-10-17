document.addEventListener('DOMContentLoaded', async () => {
    // --- PHẦN 1: LẤY CÁC PHẦN TỬ DOM (GIỮ NGUYÊN VÀ BỔ SUNG) ---
    const orderSummary = document.getElementById('order-summary');
    const userLoggedInDiv = document.getElementById('user-logged-in');
    const userLoggedOutDiv = document.getElementById('user-logged-out');
    const userEmailSpan = document.getElementById('user-email');
    const checkoutForm = document.getElementById('checkout-form');
    const placeOrderBtnLoggedOut = document.getElementById('place-order-btn');
    const loginLink = document.getElementById('checkout-login-link'); 
    const loggedInActions = document.getElementById('logged-in-checkout-action');
    const placeOrderBtnLoggedIn = document.getElementById('place-order-btn-loggedin');
    const logoutButton = document.getElementById('logout-button');

    // Các phần tử DOM mới
    const voucherInput = document.getElementById('voucher-code-input');
    const applyVoucherBtn = document.getElementById('apply-voucher-btn');
    const voucherMessage = document.getElementById('voucher-message');
    const paymentMethodsWrapper = document.getElementById('payment-methods-wrapper');
    const paymentRadioButtons = document.querySelectorAll('input[name="paymentMethod"]');
    
    // --- PHẦN 2: KHỞI TẠO SUPABASE VÀ BIẾN TRẠNG THÁI ---
    const supabase = window.supabaseClient;
    let originalPrice = 0, finalPrice = 0, discountAmount = 0;
    let appliedVoucherCode = null, item = null;
    let qrModalInstance = null;

    // --- PHẦN 3: CÁC HÀM XỬ LÝ LOGIC CHÍNH ---

    /**
     * Cập nhật toàn bộ giao diện tóm tắt đơn hàng và trạng thái mục thanh toán.
     */
    const updateDisplay = () => {
        if (!item) {
            orderSummary.innerHTML = '<div class="alert alert-warning">Không có sản phẩm nào được chọn.</div>';
            return;
        }

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
                <li class="list-group-item d-flex justify-content-between fs-5 fw-bold">
                    <span>Tổng cộng (VND)</span>
                    <span>${finalPrice.toLocaleString('vi-VN')}đ</span>
                </li>
            </ul>`;

        if (finalPrice === 0) {
            paymentMethodsWrapper.style.opacity = '0.5';
            paymentMethodsWrapper.style.pointerEvents = 'none';
            placeOrderBtnLoggedIn.textContent = "Nhận sản phẩm miễn phí";
            placeOrderBtnLoggedOut.textContent = "Nhận sản phẩm miễn phí";
        } else {
            paymentMethodsWrapper.style.opacity = '1';
            paymentMethodsWrapper.style.pointerEvents = 'auto';
            placeOrderBtnLoggedIn.textContent = "Đặt hàng";
            placeOrderBtnLoggedOut.textContent = "Đặt hàng";
        }
    };
    
    /**
     * Hiển thị modal chứa mã QR và lắng nghe thanh toán thành công.
     */
    const showQrModal = (qrData, orderId) => {
        let modalEl = document.getElementById('qr-payment-modal');
        if (!modalEl) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal fade" id="qr-payment-modal" tabindex="-1">
                  <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
                    <div class="modal-header"><h5 class="modal-title">Quét mã để thanh toán</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                    <div class="modal-body text-center">
                      <img id="qr-code-image" class="img-fluid mb-3" style="max-width: 250px;">
                      <p>Số tiền: <strong id="qr-amount"></strong></p>
                      <p>Nội dung: <strong id="qr-content"></strong></p>
                      <p class="text-muted small mt-3">Sau khi chuyển khoản thành công, trang sẽ tự động chuyển hướng. Vui lòng không tắt cửa sổ này.</p>
                      <div class="spinner-border text-primary mt-2"></div>
                    </div>
                  </div></div>
                </div>`);
            modalEl = document.getElementById('qr-payment-modal');
        }
        modalEl.querySelector('#qr-code-image').src = qrData.qr_code_url;
        modalEl.querySelector('#qr-amount').textContent = `${qrData.amount.toLocaleString('vi-VN')}đ`;
        modalEl.querySelector('#qr-content').textContent = qrData.description;
        
        qrModalInstance = new bootstrap.Modal(modalEl);
        qrModalInstance.show();

        const channel = supabase.channel(`order_status_${orderId}`);
        channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}`}, 
            (payload) => {
                if (payload.new.status === 'completed') {
                    channel.unsubscribe();
                    window.location.href = `/thankyou/?order_id=${orderId}`;
                }
            }
        ).subscribe();
    };

    /**
     * Hàm xử lý chính khi người dùng nhấn nút Đặt hàng.
     */
    const processCheckout = async (button) => {
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang tạo đơn...';

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Bạn cần đăng nhập để đặt hàng.');
            new bootstrap.Modal(document.getElementById('authModal')).show();
            button.disabled = false; button.innerHTML = 'Đặt hàng';
            return;
        }

        const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
        if (finalPrice > 0 && !selectedPaymentMethod) {
            alert('Vui lòng chọn phương thức thanh toán.');
            button.disabled = false; button.innerHTML = 'Đặt hàng';
            return;
        }

        const orderPayload = {
            user_id: user.id, total_price: finalPrice, original_price: originalPrice,
            discount_amount: discountAmount, voucher_code: appliedVoucherCode,
            status: 'pending',
            payment_method: finalPrice > 0 ? selectedPaymentMethod : 'free',
            plan_id: item.type === 'plan' ? item.id : null,
            product_id: item.type === 'product' ? item.id : null,
        };
        if (finalPrice === 0) orderPayload.status = 'completed';

        const { data: orderData, error: orderError } = await supabase.from('orders').insert(orderPayload).select('id').single();

        if (orderError) {
            alert('Lỗi khi tạo đơn hàng: ' + orderError.message);
            button.disabled = false; button.innerHTML = 'Đặt hàng';
            return;
        }
        const orderId = orderData.id;
        sessionStorage.removeItem('checkoutItem');

        // Phân luồng xử lý thanh toán
        if (finalPrice === 0) {
            window.location.href = `/thankyou/?order_id=${orderId}`;
        } else if (selectedPaymentMethod === 'bank_transfer') {
            button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang tạo mã QR...';
            try {
                const { data: qrData, error } = await supabase.functions.invoke('create-sepay-qr', {
                    body: { orderId, amount: finalPrice },
                });
                if (error) throw error;
                showQrModal(qrData, orderId);
            } catch (e) {
                alert('Lỗi khi tạo mã QR: ' + e.message);
                button.disabled = false; button.innerHTML = 'Đặt hàng';
            }
        } else if (selectedPaymentMethod === 'paypal' || selectedPaymentMethod === 'stripe') {
            alert('Chức năng đang được phát triển.');
            button.disabled = false; button.innerHTML = 'Đặt hàng';
        }
    };

    /**
     * Cập nhật giao diện dựa trên trạng thái đăng nhập của người dùng.
     */
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
    
    // --- PHẦN 4: KHỞI TẠO TRANG VÀ GẮN SỰ KIỆN ---

    // 1. Lấy thông tin sản phẩm và hiển thị
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
    
    // 2. Gắn sự kiện cho nút áp dụng voucher
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

    // 3. Gắn sự kiện cho các nút Đặt hàng
    checkoutForm.addEventListener('submit', (e) => e.preventDefault()); // Chặn submit form
    placeOrderBtnLoggedOut.addEventListener('click', () => processCheckout(placeOrderBtnLoggedOut));
    placeOrderBtnLoggedIn.addEventListener('click', () => processCheckout(placeOrderBtnLoggedIn));

    // 4. Xử lý đăng nhập / đăng xuất
    loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        try { new bootstrap.Modal(document.getElementById('authModal')).show(); } 
        catch (error) { console.error("Lỗi khi mở modal đăng nhập.", error); }
    });
    logoutButton.addEventListener('click', async () => { await supabase.auth.signOut(); });

    // 5. Lắng nghe thay đổi trạng thái đăng nhập
    supabase.auth.onAuthStateChange((_event, session) => updateUserStatus(session?.user));
    const { data: { user } } = await supabase.auth.getUser();
    updateUserStatus(user);

    // 6. Hiển thị chi tiết phương thức thanh toán khi chọn
    paymentRadioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
            document.querySelectorAll('.payment-details-content').forEach(el => el.style.display = 'none');
            const detailEl = document.getElementById(`${radio.id}_details`);
            if(detailEl) detailEl.style.display = 'block';
        });
    });
});
