document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error('Supabase client not found. Make sure config.supabase.js is loaded.');
        return;
    }

    // --- 1. LẤY THÔNG TIN NGƯỜI DÙNG & PROFILE ---
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        document.body.innerHTML = '<div class="container py-5 text-center"><p>Vui lòng đăng nhập để xem trang tài khoản. Đang chuyển hướng...</p></div>';
        setTimeout(() => { window.location.href = '/'; }, 2000);
        return;
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

    // --- 2. CẬP NHẬT GIAO DIỆN CHUNG ---
    const accName = document.getElementById('acc-name');
    const accAvatar = document.getElementById('acc-avatar');
    const accHello = document.getElementById('acc-hello');
    const accEmailInput = document.getElementById('acc-email');
    const accFullnameInput = document.getElementById('acc-fullname');
    const accAvatarUrlInput = document.getElementById('acc-avatar-url');

    const displayName = (profile && profile.full_name) ? profile.full_name : user.email;
    accName.textContent = displayName;
    accHello.textContent = displayName;
    accEmailInput.value = user.email;
    if (profile) {
        accFullnameInput.value = profile.full_name || '';
        if (profile.avatar_url) {
            accAvatar.src = profile.avatar_url;
            accAvatarUrlInput.value = profile.avatar_url;
        }
    }
    
    // --- 3. XỬ LÝ CÁC TƯƠNG TÁC ---

    // Đăng xuất
    document.getElementById('acc-signout').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = '/';
    });

    // Cập nhật profile
    document.getElementById('acc-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = e.target.querySelector('button');
        button.textContent = 'Đang lưu...';
        button.disabled = true;

        const { error } = await supabase.from('profiles').update({
            full_name: accFullnameInput.value,
            avatar_url: accAvatarUrlInput.value
        }).eq('id', user.id);

        if (error) {
            alert('Lỗi cập nhật: ' + error.message);
        } else {
            alert('Cập nhật thành công!');
            // Cập nhật lại giao diện ngay lập tức
            accName.textContent = accFullnameInput.value || user.email;
            accHello.textContent = accFullnameInput.value || user.email;
            if (accAvatarUrlInput.value) accAvatar.src = accAvatarUrlInput.value;
        }
        button.textContent = 'Lưu';
        button.disabled = false;
    });

    // Chuyển tab
    const menuLinks = document.querySelectorAll('.acc-menu a');
    const tabPanes = document.querySelectorAll('.acc-content .tab-pane');
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            menuLinks.forEach(l => l.parentElement.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('is-active'));
            link.parentElement.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('is-active');
            loadTabData(tabId, user);
        });
    });

    // --- 4. HÀM TẢI DỮ LIỆU CHO TỪNG TAB ---
    async function loadTabData(tabId, currentUser) {
        const pane = document.getElementById(`tab-${tabId}`);
        pane.innerHTML = '<p>Đang tải dữ liệu...</p>'; // Placeholder

        switch (tabId) {
            case 'orders': {
                const ordersPane = document.getElementById('tab-orders');
                ordersPane.innerHTML = '<h2 class="acc-title">Đơn hàng của bạn</h2><p>Đang tải đơn hàng...</p>';
                
                // Thêm 'status' vào danh sách các cột cần lấy
                const { data, error } = await supabase
                    .from('orders')
                    .select(`
                        id,
                        created_at,
                        total_price,
                        status, 
                        membership_plans (name)
                    `)
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false });

                if (error || data.length === 0) {
                    ordersPane.innerHTML = '<h2 class="acc-title">Đơn hàng của bạn</h2><p>Bạn chưa có đơn hàng nào.</p>';
                } else {
                    // Thêm cột 'Trạng thái' vào header của bảng
                    let table = `
                        <h2 class="acc-title">Đơn hàng của bạn</h2>
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Mã ĐH</th>
                                    <th>Sản phẩm đã mua</th>
                                    <th>Tổng tiền</th>
                                    <th>Trạng thái</th>
                                    <th>Ngày tạo</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    
                    data.forEach(order => {
                        // Logic để hiển thị tag màu cho trạng thái
                        let statusBadge;
                        switch (order.status) {
                            case 'completed':
                                statusBadge = '<span class="badge bg-success">Hoàn thành</span>';
                                break;
                            case 'failed':
                                statusBadge = '<span class="badge bg-danger">Thất bại</span>';
                                break;
                            default:
                                statusBadge = '<span class="badge bg-warning text-dark">Chờ xử lý</span>';
                        }

                        // Thêm cột 'status' vào mỗi dòng
                        table += `
                            <tr>
                                <td>#${order.id}</td>
                                <td>${order.membership_plans.name}</td>
                                <td>${new Intl.NumberFormat('vi-VN').format(order.total_price)}đ</td>
                                <td>${statusBadge}</td>
                                <td>${new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                            </tr>
                        `;
                    });

                    ordersPane.innerHTML = table + '</tbody></table>';
                }
                break;
            }

            case 'vip': {
                const { data, error } = await supabase.from('orders').select(`created_at, membership_plans (name, duration_months)`).eq('user_id', currentUser.id).eq('status', 'completed').order('created_at', { ascending: false }).limit(1);
                if (error || data.length === 0) {
                    pane.innerHTML = '<h2 class="acc-title">Gói VIP của tôi</h2><p>Bạn hiện chưa có gói VIP nào đang hoạt động.</p>';
                } else {
                    const latestVip = data[0];
                    const purchaseDate = new Date(latestVip.created_at);
                    const duration = latestVip.membership_plans.duration_months;
                    let expiryDate = 'Vĩnh viễn';
                    if (duration) {
                        const expiry = new Date(purchaseDate.setMonth(purchaseDate.getMonth() + duration));
                        expiryDate = expiry.toLocaleDateString('vi-VN');
                    }
                    pane.innerHTML = `<h2 class="acc-title">Gói VIP của tôi</h2><p><strong>Gói hiện tại:</strong> ${latestVip.membership_plans.name}</p><p><strong>Ngày hết hạn:</strong> ${expiryDate}</p>`;
                }
                break;
            }
            case 'downloads': {
                const { data, error } = await supabase.from('downloads').select('product_name, downloaded_at').eq('user_id', currentUser.id).order('downloaded_at', { ascending: false }).limit(50);
                if (error || data.length === 0) {
                    pane.innerHTML = '<h2 class="acc-title">Lịch sử tải</h2><p>Bạn chưa có lượt tải nào.</p>';
                } else {
                    let list = '<h2 class="acc-title">Lịch sử tải</h2><ul class="list-group">';
                    data.forEach(dl => {
                        list += `<li class="list-group-item">${dl.product_name} - <span class="text-muted">${new Date(dl.downloaded_at).toLocaleString('vi-VN')}</span></li>`;
                    });
                    pane.innerHTML = list + '</ul>';
                }
                break;
            }
            case 'devices': {
                pane.innerHTML = '<h2 class="acc-title">Quản lý thiết bị</h2><p>Chức năng này hiện đang được phát triển.</p>';
                break;
            }
        }
    }
});
