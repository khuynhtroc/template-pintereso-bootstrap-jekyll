document.addEventListener('DOMContentLoaded', async () => {
    const summaryContainer = document.getElementById('order-summary-container');
    if (!summaryContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');

    if (!orderId) {
        summaryContainer.innerHTML = '<p class="text-danger text-center">Mã đơn hàng không hợp lệ.</p>';
        return;
    }

    const supabase = window.supabaseClient;

    const { data: order, error } = await supabase
        .from('orders')
        .select(`
            id,
            created_at,
            total_price,
            users:user_id ( email )
        `)
        .eq('id', orderId)
        .single();

    if (error || !order) {
        summaryContainer.innerHTML = '<p class="text-danger text-center">Không tìm thấy thông tin đơn hàng.</p>';
        return;
    }

    // Định dạng dữ liệu để hiển thị
    const orderDate = new Date(order.created_at).toLocaleDateString('vi-VN');
    const orderTotal = new Intl.NumberFormat('vi-VN').format(order.total_price) + 'đ';

    // Tạo bảng HTML tóm tắt
    const summaryTableHTML = `
        <table class="table table-bordered mx-auto mb-3" style="max-width: 1000px;">
            <tbody>
                <tr>
                    <th scope="row">Mã đơn hàng:</th>
                    <td>#${order.id}</td>
                    <th scope="row">Ngày:</th>
                    <td>${orderDate}</td>
                    <th scope="row">Email:</th>
                    <td>${order.users.email}</td>
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
