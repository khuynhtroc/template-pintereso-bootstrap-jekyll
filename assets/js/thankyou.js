document.addEventListener('DOMContentLoaded', async () => {
    // --- LẤY CÁC THÀNH PHẦN GIAO DIỆN ---
    const summaryContainer = document.getElementById('order-summary-container');
    const notifyBtn = document.getElementById('notify-payment-btn');
    
    if (!summaryContainer || !notifyBtn) {
        console.error('Lỗi: Thiếu thẻ div#order-summary-container hoặc button#notify-payment-btn.');
        if (summaryContainer) summaryContainer.innerHTML = '<p class="text-danger">Lỗi giao diện trang.</p>';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');

    if (!orderId) {
        summaryContainer.innerHTML = '<p class="text-danger text-center">Mã đơn hàng không hợp lệ.</p>';
        notifyBtn.disabled = true;
        return;
    }

    if (!window.supabaseClient) {
        summaryContainer.innerHTML = '<p class="text-danger text-center">Lỗi kết nối.</p>';
        notifyBtn.disabled = true;
        return;
    }
    const supabase = window.supabaseClient;

    // --- HIỂN THỊ THÔNG TIN ĐƠN HÀNG ---
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Không thể xác thực người dùng. Vui lòng đăng nhập lại.');

        // *** ĐOẠN CODE SỬA LỖI CUỐI CÙNG ***
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select(`
                id, created_at, total_price, user_id,
                product:products!orders_product_id_fkey(title),
                plan:membership_plans!orders_plan_id_fkey(name)
            `)
            .eq('id', orderId)
            .eq('user_id', user.id)
            .single();
        
        if (orderError) throw orderError;
        if (!order) throw new Error('Không tìm thấy đơn hàng hoặc bạn không có quyền xem.');

        const orderDate = new Date(order.created_at).toLocaleDateString('vi-VN');
        const orderTotal = new Intl.NumberFormat('vi-VN').format(order.total_price) + 'đ';
        const itemName = order.product?.title || order.plan?.name || 'Sản phẩm không xác định';

        // Cập nhật bảng tóm tắt
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

        // Cập nhật thông tin thanh toán
        document.getElementById('order-amount').textContent = orderTotal;
        document.getElementById('order-content').textContent = `CAMON${order.id}`;

        // --- GẮN SỰ KIỆN CHO NÚT "TÔI ĐÃ THANH TOÁN" ---
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
                alert('Đã có lỗi xảy ra khi gửi thông báo. Vui lòng thử lại sau.');
                notifyBtn.disabled = false;
                notifyBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Tôi đã hoàn tất thanh toán';
            }
        });

    } catch (error) {
        console.error("Lỗi khi tải trang Thank You:", error);
        summaryContainer.innerHTML = `<p class="text-danger text-center">${error.message}</p>`;
        notifyBtn.disabled = true;
    }
});
