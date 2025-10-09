document.addEventListener('DOMContentLoaded', async () => {
    // LOG 1: Báo hiệu script đã bắt đầu chạy
    console.log('Bắt đầu chạy script thankyou.js...'); 

    const summaryContainer = document.getElementById('order-summary-container');
    if (!summaryContainer) {
        console.error('LỖI NGHIÊM TRỌNG: Không tìm thấy thẻ div#order-summary-container trong HTML.');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');

    if (!orderId) {
        console.error('Lỗi: Không có order_id trong địa chỉ URL.');
        summaryContainer.innerHTML = '<p class="text-danger text-center">Mã đơn hàng không hợp lệ.</p>';
        return;
    }
    // LOG 2: In ra order_id tìm thấy
    console.log(`Bước 1: Tìm thấy order_id = ${orderId}`); 

    if (!window.supabaseClient) {
        console.error('LỖI NGHIÊM TRỌNG: Supabase client chưa được khởi tạo. Kiểm tra lại file config.supabase.js.');
        summaryContainer.innerHTML = '<p class="text-danger text-center">Lỗi kết nối, không thể tải dữ liệu.</p>';
        return;
    }
    const supabase = window.supabaseClient;
    // LOG 3: Xác nhận Supabase đã sẵn sàng
    console.log('Bước 2: Supabase client đã sẵn sàng.'); 

    // LOG 4: Kiểm tra phiên đăng nhập của người dùng (bước quan trọng nhất)
    console.log('Bước 3: Đang kiểm tra phiên đăng nhập người dùng...'); 
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        console.error('LỖI QUAN TRỌNG: Không lấy được thông tin người dùng hoặc chưa có ai đăng nhập.', { userError, user });
        summaryContainer.innerHTML = '<p class="text-danger text-center">Không thể xác thực người dùng. Vui lòng đăng nhập lại và thử lại.</p>';
        return;
    }
    // LOG 5: In ra thông tin người dùng nếu thành công
    console.log(`Bước 4: Xác thực người dùng thành công. Email: ${user.email}, ID: ${user.id}`);

    // LOG 6: Bắt đầu truy vấn đơn hàng
    console.log(`Bước 5: Đang lấy thông tin đơn hàng #${orderId} cho người dùng ${user.id}...`); 
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, created_at, total_price, user_id')
        .eq('id', orderId)
        .eq('user_id', user.id) // Đảm bảo chỉ lấy đơn hàng của chính người dùng này
        .single();

    if (orderError || !order) {
        console.error('LỖI QUAN TRỌNG: Không lấy được thông tin đơn hàng.', { orderError });
        summaryContainer.innerHTML = `<p class="text-danger text-center">Không tìm thấy thông tin đơn hàng #${orderId}. Đơn hàng có thể không tồn tại hoặc bạn không có quyền xem.</p>`;
        return;
    }
    // LOG 7: In ra thông tin đơn hàng nếu thành công
    console.log('Bước 6: Lấy thông tin đơn hàng thành công:', order); 

    // LOG 8: Bắt đầu cập nhật giao diện
    console.log('Bước 7: Đang cập nhật giao diện...'); 
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
                    <td>${user.email}</td>
                    <th scope="row">Tổng cộng:</th>
                    <td>${orderTotal}</td>
                    <th scope="row">Phương thức thanh toán:</th>
                    <td>Chuyển khoản</td>
                </tr>
            </tbody>
        </table>
    `;
    
    summaryContainer.innerHTML = summaryTableHTML;
    document.getElementById('order-amount').textContent = orderTotal;
    document.getElementById('order-content').textContent = `CAMON${order.id}`;

    // LOG 9: Hoàn tất
    console.log('Bước 8: Cập nhật giao diện hoàn tất.'); 
});
