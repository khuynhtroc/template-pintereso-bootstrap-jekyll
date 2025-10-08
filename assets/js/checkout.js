document.addEventListener('DOMContentLoaded', async () => {
    const orderSummary = document.getElementById('order-summary');
    const userLoggedInDiv = document.getElementById('user-logged-in');
    const userLoggedOutDiv = document.getElementById('user-logged-out');
    const userEmailSpan = document.getElementById('user-email');
    const checkoutForm = document.getElementById('checkout-form');
    const placeOrderBtn = document.getElementById('place-order-btn');

    if (!orderSummary) return; // Chỉ chạy trên trang checkout

    // Lấy plan_id từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get('plan_id');

    if (!planId) {
        orderSummary.innerHTML = '<p class="text-danger">Gói không hợp lệ.</p>';
        return;
    }

    const supabase = window.supabaseClient;

    // Lấy thông tin gói VIP và hiển thị
    const { data: plan, error: planError } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('id', planId)
        .single();

    if (planError || !plan) {
        orderSummary.innerHTML = '<p class="text-danger">Không tìm thấy thông tin gói.</p>';
        return;
    }

    orderSummary.innerHTML = `
        <ul class="list-group mb-3">
            <li class="list-group-item d-flex justify-content-between lh-sm">
                <div>
                    <h6 class="my-0">Sản phẩm</h6>
                    <small class="text-muted">${plan.name}</small>
                </div>
                <span class="text-muted">${new Intl.NumberFormat('vi-VN').format(plan.price)}đ</span>
            </li>
            <li class="list-group-item d-flex justify-content-between">
                <span>Tổng cộng (VND)</span>
                <strong>${new Intl.NumberFormat('vi-VN').format(plan.price)}đ</strong>
            </li>
        </ul>
    `;

    // Kiểm tra trạng thái đăng nhập của người dùng
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // Nếu đã đăng nhập
        userLoggedInDiv.style.display = 'block';
        userLoggedOutDiv.style.display = 'none';
        userEmailSpan.textContent = user.email;
    } else {
        // Nếu chưa đăng nhập
        userLoggedInDiv.style.display = 'none';
        userLoggedOutDiv.style.display = 'block';
    }

    // Xử lý sự kiện click "Đặt hàng"
    // Dán đè lên hàm có sẵn trong assets/js/checkout.js
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        placeOrderBtn.disabled = true;
        placeOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...';
    
        let currentUser = user;
    
        if (!currentUser) {
            // Nếu chưa đăng nhập, tiến hành đăng ký tài khoản mới
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
    
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: `${firstName} ${lastName}`
                    }
                }
            });
    
            if (signUpError) {
                alert('Lỗi đăng ký: ' + signUpError.message);
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = 'Đặt hàng';
                return;
            }
            
            // Sau khi đăng ký thành công, user object đã có sẵn
            currentUser = signUpData.user;
        }
    
        // Tạo đơn hàng và lấy lại ID của đơn hàng vừa tạo
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: currentUser.id,
                plan_id: plan.id,
                total_price: plan.price
            })
            .select('id') // <-- Lấy lại cột 'id'
            .single();   // <-- Vì chúng ta chỉ tạo 1 đơn hàng
    
        if (orderError) {
            alert('Lỗi khi tạo đơn hàng: ' + orderError.message);
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = 'Đặt hàng';
        } else {
            // Chuyển hướng đến trang cảm ơn với ID đơn hàng
            window.location.href = `/thankyou/?order_id=${orderData.id}`;
        }
    });


    // Xử lý đăng xuất
    document.getElementById('logout-button').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.reload();
    });
    
    // Xử lý link đăng nhập (bạn có thể trỏ tới modal đăng nhập đã có)
    document.getElementById('login-link').addEventListener('click', () => {
      // Gọi modal đăng nhập của bạn ở đây
      // Ví dụ: $('#loginModal').modal('show');
      alert('Vui lòng tích hợp modal đăng nhập của bạn tại đây.');
    });
});
