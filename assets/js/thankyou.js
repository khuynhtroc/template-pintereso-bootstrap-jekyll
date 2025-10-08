document.addEventListener('DOMContentLoaded', async () => {
    const detailsPlaceholder = document.getElementById('order-details-placeholder');
    if (!detailsPlaceholder) return;

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');

    if (!orderId) {
        detailsPlaceholder.innerHTML = '<p class="text-danger">[translate:Mã đơn hàng không hợp lệ.]</p>';
        return;
    }

    const supabase = window.supabaseClient;

    // Lấy thông tin đơn hàng
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
        console.error(error);
        detailsPlaceholder.innerHTML = '<p class="text-danger">[translate:Không tìm thấy thông tin đơn hàng.]</p>';
        return;
    }

    // Hiển thị thông tin đơn hàng
    const orderDate = new Date(order.created_at).toLocaleDateString('vi-VN');
    const orderTotal = new Intl.NumberFormat('vi-VN').format(order.total_price) + 'đ';

    detailsPlaceholder.innerHTML = `
        <div class="row text-center">
            <div class="col"><strong>[translate:Mã đơn hàng:]</strong> #${order.id}</div>
            <div class="col"><strong>[translate:Ngày:]</strong> ${orderDate}</div>
            <div class="col"><strong>Email:</strong> ${order.users.email}</div>
            <div class="col"><strong>[translate:Tổng cộng:]</strong> ${orderTotal}</div>
            <div class="col"><strong>[translate:Phương thức thanh toán:]</strong> [translate:Chuyển khoản]</div>
        </div>
    `;

    // Cập nhật thông tin chuyển khoản
    document.getElementById('order-amount').textContent = orderTotal;
    document.getElementById('order-content').textContent = `CAMON${order.id}`;
});
