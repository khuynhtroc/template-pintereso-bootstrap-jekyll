document.addEventListener('DOMContentLoaded', async () => {
    const orderSummary = document.getElementById('order-summary');
    const userLoggedInDiv = document.getElementById('user-logged-in');
    const userLoggedOutDiv = document.getElementById('user-logged-out');
    const userEmailSpan = document.getElementById('user-email');
    const checkoutForm = document.getElementById('checkout-form');
    const placeOrderBtn = document.getElementById('place-order-btn');

    if (!orderSummary) return;

    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get('plan_id');
    const supabase = window.supabaseClient;

    if (!planId) {
        orderSummary.innerHTML = '<p class="text-danger">Gói không hợp lệ.</p>';
        return;
    }

    const { data: plan, error: planError } = await supabase.from('membership_plans').select('*').eq('id', planId).single();

    if (planError || !plan) {
        orderSummary.innerHTML = '<p class="text-danger">Không tìm thấy thông tin gói.</p>';
        return;
    }

    orderSummary.innerHTML = `
        <ul class="list-group mb-3">
            <li class="list-group-item d-flex justify-content-between lh-sm">
                <div><h6 class="my-0">Sản phẩm</h6><small class="text-muted">${plan.name}</small></div>
                <span class="text-muted">${new Intl.NumberFormat('vi-VN').format(plan.price)}đ</span>
            </li>
            <li class="list-group-item d-flex justify-content-between">
                <span>Tổng cộng (VND)</span><strong>${new Intl.NumberFormat('vi-VN').format(plan.price)}đ</strong>
            </li>
        </ul>
    `;

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        userLoggedInDiv.style.display = 'block';
        userLoggedOutDiv.style.display = 'none';
        userEmailSpan.textContent = user.email;
    } else {
        userLoggedInDiv.style.display = 'none';
        userLoggedOutDiv.style.display = 'block';
    }

    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        placeOrderBtn.disabled = true;
        placeOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang xử lý...';
        
        let currentUser = user;

        if (!currentUser) {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Vì đã tắt "Confirm email", lệnh signUp sẽ tự động đăng nhập cho người dùng
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: { data: { full_name: `${document.getElementById('firstName').value} ${document.getElementById('lastName').value}` } }
            });

            if (signUpError) {
                alert('Lỗi đăng ký: ' + signUpError.message);
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = 'Đặt hàng';
                return;
            }
            currentUser = signUpData.user;
        }

        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({ user_id: currentUser.id, plan_id: plan.id, total_price: plan.price })
            .select('id')
            .single();

        if (orderError) {
            alert('Lỗi khi tạo đơn hàng: ' + orderError.message);
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = 'Đặt hàng';
        } else {
            window.location.href = `/thankyou/?order_id=${orderData.id}`;
        }
    });

    document.getElementById('logout-button').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.reload();
    });
    
    document.getElementById('login-link').addEventListener('click', () => {
        alert('Vui lòng tích hợp modal đăng nhập của bạn tại đây.');
    });
});
