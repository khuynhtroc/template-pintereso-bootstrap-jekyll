document.addEventListener('DOMContentLoaded', async () => {
    const summaryContainer = document.getElementById('order-summary-container');
    if (!summaryContainer) {
        console.error('Lỗi: Không tìm thấy thẻ div "order-summary-container".');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');

    if (!orderId) {
        summaryContainer.innerHTML = '<p class="text-danger text-center">Mã đơn hàng không hợp lệ.</p>';
        return;
    }

    // Đảm bảo Supabase client đã sẵn sàng
    if (!window.supabaseClient) {
        console.error('Lỗi: Supabase client chưa được khởi tạo.');
        summaryContainer.innerHTML = '<p class="text-danger text-center">Lỗi kết nối, không thể tải dữ liệu.</p>';
        return;
    }
    const supabase = window.supabaseClient;

    // --- BẮT ĐẦU SỬA LỖI ---

    // 1. Lấy thông tin đơn hàng
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, created_at, total_price, user_id')
        .eq('id', orderId)
        .single();

    if (orderError || !order) {
        console.error('Lỗi khi lấy thông tin đơn hàng:', orderError);
        summaryContainer.innerHTML = '<p class="text-danger text-center">Không tìm thấy thông tin đơn hàng. Vui lòng kiểm tra lại.</p>';
        return;
    }

    // 2. Dùng user_id từ đơn hàng để lấy thông tin email từ bảng profiles
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', order.user_id)
        .single();

    if (profileError || !profile) {
        console.error('Lỗi khi lấy thông tin người dùng:', profileError);
        summaryContainer.innerHTML = '<p class="text-danger text-center">Không thể tải thông tin người dùng của đơn hàng.</p>';
        return;
    }

    // --- KẾT THÚC SỬA LỖI ---

    // 3. Hiển thị dữ liệu khi đã có đủ thông tin
    const orderDate = new Date(order.created_at).toLocaleDateString('vi-VN');
    const orderTotal = new Intl.NumberFormat('vi-VN').format(order.total_price) + 'đ';

    const summaryTableHTML = `
        <table class="table table-bordered mx-auto mb-3" style="max-width: 1000px;">
            <tbody>
                <tr>
                    <th scope="row">Mã đơn hàng:</th>
                    <td>#${order.id}</td>
                    <th scope="row">Ngày:</th>
                    <td>${orderDate}</td>
                    <th scope="row">Email:</th>
                    <td>${profile.email}</td>
                    <th scope="row">Tổng cộng:</th>
                    <td>${orderTotal}</td>
                    <th scope="row">Phương thức thanh toán:</th>
                    <td>Chuyển khoản</td>
                </tr>
            </tbody>
        </table>
    `;
    
    // Cập nhật giao diện
    summaryContainer.innerHTML = summaryTableHTML;
    document.getElementById('order-amount').textContent = orderTotal;
    document.getElementById('order-content').textContent = `CAMON${order.id}`;
});
