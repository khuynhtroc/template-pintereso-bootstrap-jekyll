document.addEventListener('DOMContentLoaded', async () => {
    const summaryContainer = document.getElementById('order-summary-container');
    const notifyBtn = document.getElementById('notify-payment-btn');
    
    if (!summaryContainer || !notifyBtn) {
        console.error('Lỗi Giao Diện: Thiếu thẻ HTML cần thiết.');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');

    if (!orderId || !window.supabaseClient) {
        summaryContainer.innerHTML = '<p class="text-danger text-center">Lỗi trang hoặc không tìm thấy đơn hàng.</p>';
        notifyBtn.disabled = true;
        return;
    }
    const supabase = window.supabaseClient;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Không thể xác thực người dùng. Vui lòng đăng nhập lại.');

        // BƯỚC 1: LẤY THÔNG TIN CƠ BẢN CỦA ĐƠN HÀNG
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, created_at, total_price, user_id, product_id, plan_id')
            .eq('id', orderId)
            .eq('user_id', user.id)
            .single();
        
        if (orderError) throw orderError;
        if (!order) throw new Error('Không tìm thấy đơn hàng hoặc bạn không có quyền xem.');

        let itemName = 'Sản phẩm không xác định';

        // BƯỚC 2: DỰA VÀO ID, LẤY TÊN SẢN PHẨM HOẶC GÓI VIP
        if (order.product_id) {
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('name') // SỬA 'title' THÀNH 'name'
                .eq('id', order.product_id)
                .single();
            if (product) itemName = product.name; // SỬA 'title' THÀNH 'name'
        } else if (order.plan_id) {
            const { data: plan, error: planError } = await supabase
                .from('membership_plans')
                .select('name')
                .eq('id', order.plan_id)
                .single();
            if (plan) itemName = plan.name;
        }

        // BƯỚC 3: HIỂN THỊ GIAO DIỆN
        const orderDate = new Date(order.created_at).toLocaleDateString('vi-VN');
        const orderTotal = new Intl.NumberFormat('vi-VN').format(order.total_price) + 'đ';
        
        summaryContainer.innerHTML = `
            <table class="table table-bordered mx-auto mb-3" style="max-width: 1000px;">
                <tbody>
                    <tr>
                        <th scope="row">Mã đơn hàng:</th>
                        <td>#${order.id}</td>
                        <th scope="row">Ngày:</th>
                        <td>${orderDate}</td>
                        <th scope="row">Email:</th>
                        <td>${user.email}</td>
                        <th scope="row">Tổng cộng:</th>
                        <td>${orderTotal}</td>
                        <th scope="row">Phương thức thanh toán:</th>
                        <td>Chuyển khoản</td>
                    </tr>
                </tbody>
            </table>
        `;
        document.getElementById('order-amount').textContent = orderTotal;
        document.getElementById('order-content').textContent = `CAMON${order.id}`;

        // BƯỚC 4: GẮN SỰ KIỆN CHO NÚT BẤM
        notifyBtn.addEventListener('click', async () => {
            notifyBtn.disabled = true;
            notifyBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang gửi...';

            try {
                const { error: rpcError } = await supabase.rpc('notify_telegram_on_payment', {
                    order_id_param: parseInt(orderId),
                    item_name_param: itemName,
                    customer_email_param: user.email
                });
                if (rpcError) throw rpcError;

                notifyBtn.classList.remove('btn-primary');
                notifyBtn.classList.add('btn-success');
                notifyBtn.textContent = '✔ Đã thông báo thành công!';
                alert('Chúng tôi đã nhận được thông báo của bạn và sẽ xử lý đơn hàng trong thời gian sớm nhất!');
            } catch (error) {
                console.error('Lỗi khi gửi thông báo:', error);
                alert('Đã có lỗi xảy ra khi gửi thông báo.');
                notifyBtn.disabled = false;
                notifyBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Tôi đã hoàn tất thanh toán';
            }
        });

    } catch (error) {
        console.error("LỖI CHÍNH KHI TẢI TRANG:", error);
        summaryContainer.innerHTML = `<p class="text-danger text-center">${error.message}</p>`;
        notifyBtn.disabled = true;
    }
});
