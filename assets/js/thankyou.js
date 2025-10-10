document.addEventListener('DOMContentLoaded', async () => {
    console.log("Bắt đầu PHIÊN BẢN GỠ RỐI của thankyou.js");

    const summaryContainer = document.getElementById('order-summary-container');
    const notifyBtn = document.getElementById('notify-payment-btn');
    
    if (!summaryContainer || !notifyBtn) {
        console.error('Lỗi Giao Diện: Thiếu thẻ HTML #order-summary-container hoặc #notify-payment-btn.');
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
        console.log("Xác thực người dùng thành công:", user.email);

        // --- BƯỚC 1: LẤY ĐƠN HÀNG (CHỈ BẢNG ORDERS) ---
        console.log(`Bước 1: Đang lấy thông tin cơ bản của đơn hàng #${orderId}`);
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*') // Lấy TẤT CẢ các cột của chính bảng orders
            .eq('id', orderId)
            .eq('user_id', user.id)
            .single();
        
        if (orderError) {
            console.error("LỖI ở Bước 1 khi lấy đơn hàng:", orderError);
            throw new Error("Không thể lấy thông tin đơn hàng từ database.");
        }
        if (!order) throw new Error('Không tìm thấy đơn hàng hoặc bạn không có quyền xem.');

        console.log(">> Bước 1 THÀNH CÔNG. Dữ liệu đơn hàng nhận được:", order);

        let itemName = 'Sản phẩm không xác định';

        // --- BƯỚC 2: LẤY TÊN SẢN PHẨM (TRUY VẤN RIÊNG BIỆT) ---
        if (order.product_id) {
            console.log(`Bước 2: Đơn hàng có product_id=${order.product_id}. Đang lấy tên sản phẩm...`);
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('*') // Lấy TẤT CẢ các cột của sản phẩm để kiểm tra
                .eq('id', order.product_id)
                .single();
            
            if (productError) {
                console.error("LỖI ở Bước 2 khi lấy sản phẩm:", productError);
                throw new Error("Không thể lấy thông tin sản phẩm liên quan.");
            }

            console.log(">> Bước 2 THÀNH CÔNG. Dữ liệu sản phẩm nhận được:", product);
            
            // *** ĐÂY LÀ ĐOẠN QUAN TRỌNG NHẤT ***
            // Hãy nhìn vào log "Dữ liệu sản phẩm nhận được" trong Console và tìm đúng tên cột chứa tên sản phẩm
            // Nó có thể là 'title', 'name', 'product_name', v.v...
            itemName = product.title; // Tạm thời vẫn dùng 'title', bạn hãy sửa lại nếu cần
            if (!itemName) {
                console.warn("CẢNH BÁO: Không tìm thấy 'product.title'. Hãy kiểm tra log ở trên để tìm đúng tên cột nhé!");
            }

        } else if (order.plan_id) {
            console.log(`Bước 2: Đơn hàng có plan_id=${order.plan_id}. Đang lấy tên gói...`);
            const { data: plan, error: planError } = await supabase
                .from('membership_plans')
                .select('name')
                .eq('id', order.plan_id)
                .single();
            
            if(planError) {
                 console.error("LỖI ở Bước 2 khi lấy gói VIP:", planError);
                 throw new Error("Không thể lấy thông tin gói VIP liên quan.");
            }
            if (plan) itemName = plan.name;
        }

        // --- BƯỚC 3: HIỂN THỊ GIAO DIỆN ---
        console.log("Bước 3: Đang cập nhật giao diện...");
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

        // --- BƯỚC 4: GẮN SỰ KIỆN CHO NÚT BẤM ---
        console.log("Bước 4: Đang gắn sự kiện cho nút bấm...");
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
        console.log("Hoàn tất!");

    } catch (error) {
        console.error("LỖI CHÍNH KHI TẢI TRANG:", error);
        summaryContainer.innerHTML = `<p class="text-danger text-center">${error.message}</p>`;
        notifyBtn.disabled = true;
    }
});
