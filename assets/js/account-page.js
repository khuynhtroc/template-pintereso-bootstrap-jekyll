document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error('Supabase client not found.');
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
        .select('*') // Lấy tất cả thông tin
        .eq('id', user.id)
        .single();

    // --- 2. CẬP NHẬT GIAO DIỆN CHUNG ---
    const accName = document.getElementById('acc-name');
    const accAvatar = document.getElementById('acc-avatar');
    // ... và các phần tử khác trong giao diện chung

    if (profile) {
        accName.textContent = profile.full_name || user.email;
        if (profile.avatar_url) accAvatar.src = profile.avatar_url;
    }

    // --- 3. XỬ LÝ CÁC TƯƠNG TÁC (ĐĂNG XUẤT, CHUYỂN TAB) ---
    // Đăng xuất
    document.getElementById('acc-signout').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = '/';
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
            
            const activeLink = document.querySelector(`.acc-menu a[data-tab="${tabId}"]`);
            if (activeLink) activeLink.parentElement.classList.add('active');
            
            const activePane = document.getElementById(`tab-${tabId}`);
            if (activePane) activePane.classList.add('is-active');

            loadTabData(tabId, user, profile);
        });
    });

    // Tải dữ liệu cho tab đang active mặc định
    const initialActiveTab = document.querySelector('.acc-menu li.active a')?.getAttribute('data-tab') || 'dashboard';
    loadTabData(initialActiveTab, user, profile);


    // --- 4. HÀM TẢI DỮ LIỆU CHO TỪNG TAB ---
    async function loadTabData(tabId, currentUser, currentProfile) {
        const pane = document.getElementById(`tab-${tabId}`);
        if (!pane) return;
        pane.innerHTML = '<p>Đang tải dữ liệu...</p>';

        switch (tabId) {
            // --- CASE: BẢNG ĐIỀU KHIỂN ---
            case 'dashboard': {
                const { data: vipOrder, error } = await supabase
                    .from('orders')
                    .select('id')
                    .eq('user_id', currentUser.id)
                    .eq('status', 'completed')
                    .limit(1)
                    .single();

                const isVip = vipOrder && !error;
                
                pane.innerHTML = `
                    <h2 class="acc-title">Bảng điều khiển</h2>
                    <div class="acc-alert" style="display: ${isVip ? 'none' : 'block'};">
                        <h4>Nâng cấp tài khoản!</h4>
                        <p>Bạn hiện là thành viên thường. Hãy nâng cấp lên VIP để nhận được nhiều lượt tải mỗi ngày và truy cập không giới hạn vào toàn bộ tài nguyên của chúng tôi.</p>
                        <button class="btn btn-primary" id="btn-upgrade-now">Nâng cấp ngay</button>
                    </div>
                    <p>Xin chào <strong>${currentProfile?.full_name || currentUser.email}</strong>.</p>
                    <p>Từ bảng điều khiển tài khoản, có thể xem các đơn hàng gần đây, quản lý các gói thành viên, và chỉnh sửa mật khẩu cũng chi tiết tài khoản.</p>
                `;
                
                const upgradeButton = pane.querySelector('#btn-upgrade-now');
                if (upgradeButton) {
                    upgradeButton.addEventListener('click', () => window.location.href = '/pricing/');
                }
                break;
            }

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

            
            // --- CASE: GÓI VIP CỦA TÔI ---
            case 'vip': {
                const { data: vipPackages, error } = await supabase
                    .from('orders')
                    .select(`created_at, status, membership_plans (name, duration_months)`)
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false });

                let contentHTML = '<h2 class="acc-title">Các gói thành viên của bạn</h2>';
                if (error || vipPackages.length === 0) {
                    contentHTML += '<p>Bạn chưa từng đăng ký gói VIP nào.</p>';
                } else {
                    contentHTML += `
                        <table class="table">
                            <thead><tr><th>Gói thành viên</th><th>Ngày bắt đầu</th><th>Ngày hết hạn</th><th>Trạng thái</th></tr></thead>
                            <tbody>
                    `;
                    vipPackages.forEach(pkg => {
                        const startDate = new Date(pkg.created_at);
                        let expiryDate = 'Vĩnh viễn';
                        if (pkg.membership_plans.duration_months) {
                            const expiry = new Date(startDate);
                            expiry.setMonth(expiry.getMonth() + pkg.membership_plans.duration_months);
                            expiryDate = expiry.toLocaleDateString('vi-VN');
                        }
                        const statusBadge = pkg.status === 'completed' ? '<span class="badge bg-success">Hoạt động</span>' : '<span class="badge bg-warning text-dark">Chờ xử lý</span>';
                        
                        contentHTML += `
                            <tr>
                                <td>${pkg.membership_plans.name}</td>
                                <td>${startDate.toLocaleDateString('vi-VN')}</td>
                                <td>${expiryDate}</td>
                                <td>${statusBadge}</td>
                            </tr>
                        `;
                    });
                    contentHTML += '</tbody></table>';
                }
                contentHTML += '<button class="btn btn-primary mt-3" onclick="window.location.href=\'/pricing/\'">Nâng cấp hoặc Gia hạn gói</button>';
                pane.innerHTML = contentHTML;
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

            // --- CASE: QUẢN LÝ THIẾT BỊ ---
            case 'devices': {
                // Đây là tính năng nâng cao, tạm thời hiển thị thông tin thiết bị hiện tại
                pane.innerHTML = `
                    <h2 class="acc-title">Quản lý thiết bị</h2>
                    <p>Danh sách các thiết bị bạn đã dùng để đăng nhập.</p>
                    <div class="device-list">
                         <div class="device-item">
                            <div>
                                <i class="fas fa-desktop"></i>
                                <strong>Hệ điều hành:</strong> Windows 10 <br>
                                <strong>Trình duyệt:</strong> Chrome 130
                            </div>
                            <div class="text-end">
                                <strong>Đăng nhập cuối:</strong> ${new Date().toLocaleString('vi-VN')} <br>
                                <span class="badge bg-success">Thiết bị này</span>
                            </div>
                         </div>
                    </div>
                    <p class="mt-3 small text-muted">Nếu bạn đạt giới hạn 3 thiết bị, bạn cần xóa một thiết bị cũ trước khi có thể đăng nhập từ một thiết bị mới.</p>
                `;
                break;
            }

            // --- CASE: CHI TIẾT TÀI KHOẢN ---
            case 'profile': {
                pane.innerHTML = `
                    <h2 class="acc-title">Chỉnh sửa hồ sơ</h2>
                    <form id="profile-update-form">
                        <div class="mb-3">
                            <label class="form-label">Tên người dùng</label>
                            <input type="text" class="form-control" value="${currentProfile?.username || ''}" disabled>
                            <div class="form-text">Tên người dùng không thể thay đổi.</div>
                        </div>
                        <div class="mb-3">
                            <label for="full_name" class="form-label">Tên hiển thị</label>
                            <input type="text" id="full_name" class="form-control" value="${currentProfile?.full_name || ''}">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-control" value="${currentUser.email}" disabled>
                        </div>
                        <div class="mb-3">
                            <label for="phone" class="form-label">Số điện thoại</label>
                            <input type="text" id="phone" class="form-control" value="${currentProfile?.phone || ''}">
                        </div>
                        <hr>
                        <h4 class="mt-4">Thay đổi mật khẩu</h4>
                        <div class="mb-3">
                            <label for="new_password" class="form-label">Mật khẩu mới</label>
                            <input type="password" id="new_password" class="form-control" placeholder="Để trống nếu không đổi">
                        </div>
                         <div class="mb-3">
                            <label for="confirm_password" class="form-label">Xác nhận mật khẩu mới</label>
                            <input type="password" id="confirm_password" class="form-control">
                        </div>
                        <button type="submit" class="btn btn-primary">Cập nhật hồ sơ</button>
                    </form>
                `;

                // Gắn sự kiện submit cho form
                pane.querySelector('#profile-update-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const button = e.target.querySelector('button');
                    button.disabled = true;
                    button.textContent = 'Đang xử lý...';

                    const fullName = document.getElementById('full_name').value;
                    const phone = document.getElementById('phone').value;
                    const newPassword = document.getElementById('new_password').value;
                    const confirmPassword = document.getElementById('confirm_password').value;

                    // 1. Cập nhật profile (tên, số điện thoại)
                    const { error: profileUpdateError } = await supabase
                        .from('profiles')
                        .update({ full_name: fullName, phone: phone })
                        .eq('id', currentUser.id);

                    if (profileUpdateError) {
                        alert('Lỗi cập nhật profile: ' + profileUpdateError.message);
                        button.disabled = false;
                        button.textContent = 'Cập nhật hồ sơ';
                        return;
                    }

                    // 2. Cập nhật mật khẩu (nếu có)
                    if (newPassword) {
                        if (newPassword !== confirmPassword) {
                            alert('Mật khẩu xác nhận không khớp!');
                            button.disabled = false;
                            button.textContent = 'Cập nhật hồ sơ';
                            return;
                        }
                        const { error: passwordUpdateError } = await supabase.auth.updateUser({ password: newPassword });
                        if (passwordUpdateError) {
                            alert('Lỗi đổi mật khẩu: ' + passwordUpdateError.message);
                            button.disabled = false;
                            button.textContent = 'Cập nhật hồ sơ';
                            return;
                        }
                    }
                    
                    alert('Cập nhật thành công!');
                    button.disabled = false;
                    button.textContent = 'Cập nhật hồ sơ';
                    // Cập nhật lại tên hiển thị trên menu trái
                    if (accName) accName.textContent = fullName;
                });
                break;
            }
        }
    }
});
