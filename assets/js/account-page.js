document.addEventListener('DOMContentLoaded', async () => {
  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error('Supabase client not found on window.');
    return;
  }
 
  // 1. Xác thực người dùng và lấy thông tin
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    document.body.innerHTML = '<div class="container py-5 text-center"><p>Vui lòng đăng nhập để xem trang tài khoản. Đang chuyển hướng...</p></div>';
    setTimeout(() => { window.location.href = '/'; }, 2000);
    return;
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  // 2. Cập nhật giao diện chung
  const accName = document.getElementById('acc-name');
  const accAvatar = document.getElementById('acc-avatar');
  if (accName) accName.textContent = profile?.full_name || user.email;
  if (accAvatar && profile?.avatar_url) accAvatar.src = profile.avatar_url;

  // 3. Xử lý sự kiện (Đăng xuất, chuyển tab)
  const signOutBtn = document.getElementById('acc-signout');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = '/';
    });
  }

  const menuLinks = document.querySelectorAll('.acc-menu a');
  const tabPanes = document.querySelectorAll('.acc-content .tab-pane');
  menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.getAttribute('data-tab');
      menuLinks.forEach(l => l.parentElement.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('is-active'));
      document.querySelector(`.acc-menu a[data-tab="${tabId}"`)?.parentElement.classList.add('active');
      document.getElementById(`tab-${tabId}`)?.classList.add('is-active');
      loadTabData(tabId, user, profile);
    });
  });

  const initialTab = document.querySelector('.acc-menu li.active a')?.getAttribute('data-tab') || 'dashboard';
  loadTabData(initialTab, user, profile);

  // 4. Hàm tải dữ liệu cho từng tab
  async function loadTabData(tabId, currentUser, currentProfile) {
    const pane = document.getElementById(`tab-${tabId}`);
    if (!pane) return;
    pane.innerHTML = '<p>Đang tải dữ liệu...</p>';

    switch (tabId) {
      case 'dashboard': {
        const isVip = currentProfile?.user_tier && currentProfile.user_tier !== 'Free';
        pane.innerHTML = `
          <h2 class="acc-title">Bảng điều khiển</h2>
          <div class="acc-alert" style="display:${isVip ? 'none' : 'block'}">
            <h4>Nâng cấp tài khoản!</h4>
            <p>Bạn hiện là thành viên thường. Hãy nâng cấp lên VIP để nhận được nhiều lượt tải mỗi ngày và truy cập không giới hạn vào toàn bộ tài nguyên của chúng tôi.</p>
            <button class="btn btn-primary" id="btn-upgrade-now">Nâng cấp ngay</button>
          </div>
          <p>Xin chào <strong>${currentProfile?.full_name || currentUser.email}</strong>.</p>
          <p>Từ bảng điều khiển tài khoản, có thể xem các đơn hàng gần đây, quản lý các gói thành viên, và chỉnh sửa mật khẩu cũng chi tiết tài khoản.</p>
        `;
        pane.querySelector('#btn-upgrade-now')?.addEventListener('click', () => window.location.href = '/pricing/');
        break;
      }

      case 'orders': {
        const { data, error } = await supabase.from('orders').select('*, membership_plans(name), products(name)').eq('user_id', currentUser.id).order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
          pane.innerHTML = '<h2 class="acc-title">Đơn hàng của bạn</h2><p>Bạn chưa có đơn hàng nào.</p>';
          break;
        }

        let tableHtml = `<h2 class="acc-title">Đơn hàng của bạn</h2><table class="table"><thead><tr><th>Mã ĐH</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ngày tạo</th></tr></thead><tbody>`;
        data.forEach(order => {
          const itemName = order.membership_plans?.name || order.products?.name || 'Sản phẩm lẻ';
          const statusBadge = order.status === 'completed' ? '<span class="badge bg-success">Hoàn thành</span>' : '<span class="badge bg-danger">Thất bại</span>';
          tableHtml += `<tr><td>#${order.id}</td><td>${itemName}</td><td>${new Intl.NumberFormat('vi-VN').format(order.amount || 0)}đ</td><td>${statusBadge}</td><td>${new Date(order.created_at).toLocaleDateString('vi-VN')}</td></tr>`;
        });
        pane.innerHTML = tableHtml + '</tbody></table>';
        break;
      }
      
      case 'vip': {
        const { data: vipOrders, error } = await supabase.from('orders').select('*, membership_plans(name, duration_days)').eq('user_id', currentUser.id).not('plan_id', 'is', null).order('created_at', { ascending: false });

        let vipHtml = '<h2 class="acc-title">Các gói thành viên của bạn</h2>';
        if (error || !vipOrders || vipOrders.length === 0) {
          vipHtml += '<p>Bạn chưa từng đăng ký gói VIP nào.</p>';
        } else {
          vipHtml += `<table class="table"><thead><tr><th>Gói thành viên</th><th>Ngày bắt đầu</th><th>Ngày hết hạn</th><th>Trạng thái</th></tr></thead><tbody>`;
          vipOrders.forEach(pkg => {
            const planName = pkg.membership_plans?.name || 'Gói không xác định';
            const startDate = new Date(pkg.created_at);
            let expiryDate = 'Vĩnh viễn';
            if (pkg.membership_plans?.duration_days) {
              const expiry = new Date(startDate);
              expiry.setDate(expiry.getDate() + pkg.membership_plans.duration_days);
              expiryDate = expiry.toLocaleDateString('vi-VN');
            }
            const statusBadge = pkg.status === 'completed' ? '<span class="badge bg-success">Hoạt động</span>' : '<span class="badge bg-warning text-dark">Chờ xử lý</span>';
            vipHtml += `<tr><td>${planName}</td><td>${startDate.toLocaleDateString('vi-VN')}</td><td>${expiryDate}</td><td>${statusBadge}</td></tr>`;
          });
          vipHtml += '</tbody></table>';
        }
        vipHtml += '<button class="btn btn-primary mt-3" onclick="window.location.href=\'/pricing/\'">Nâng cấp hoặc Gia hạn gói</button>';
        pane.innerHTML = vipHtml;
        break;
      }

      case 'downloads': {
        const { data, error, count } = await supabase.from('downloads').select('product_name, downloaded_at, product_sku', { count: 'exact' }).eq('user_id', currentUser.id).order('downloaded_at', { ascending: false }).limit(200);

        if (error || !data || data.length === 0) {
          pane.innerHTML = '<h2 class="acc-title">Lịch sử tải</h2><p>Bạn chưa có lượt tải nào.</p>';
          break;
        }

        let dlHtml = `<h2 class="acc-title">Lịch sử tải <small class="text-muted">(Tổng số: ${count})</small></h2><div class="table-responsive"><table class="table"><thead><tr><th>Sản phẩm</th><th>SKU</th><th>Thời gian</th></tr></thead><tbody>`;
        data.forEach(dl => {
          dlHtml += `<tr><td>${dl.product_name || 'Không rõ tên'}</td><td>${dl.product_sku || '—'}</td><td>${new Date(dl.downloaded_at).toLocaleString('vi-VN')}</td></tr>`;
        });
        pane.innerHTML = dlHtml + '</tbody></table></div>';
        break;
      }

      case 'profile': {
        pane.innerHTML = `
          <h2 class="acc-title">Chỉnh sửa hồ sơ</h2>
          <form id="profile-update-form">
            <div class="mb-3"><label class="form-label">Tên người dùng</label><input type="text" class="form-control" value="${currentProfile?.username || ''}" disabled><div class="form-text">Tên người dùng không thể thay đổi.</div></div>
            <div class="mb-3"><label for="full_name" class="form-label">Tên hiển thị</label><input type="text" id="full_name" class="form-control" value="${currentProfile?.full_name || ''}"></div>
            <div class="mb-3"><label class="form-label">Email</label><input type="email" class="form-control" value="${currentUser.email}" disabled></div>
            <div class="mb-3"><label for="phone" class="form-label">Số điện thoại</label><input type="text" id="phone" class="form-control" value="${currentProfile?.phone || ''}"></div>
            <hr>
            <h4 class="mt-4">Thay đổi mật khẩu</h4>
            <div class="mb-3"><label for="new_password" class="form-label">Mật khẩu mới</label><input type="password" id="new_password" class="form-control" placeholder="Để trống nếu không đổi"></div>
            <div class="mb-3"><label for="confirm_password" class="form-label">Xác nhận mật khẩu mới</label><input type="password" id="confirm_password" class="form-control"></div>
            <button type="submit" class="btn btn-primary">Cập nhật hồ sơ</button>
          </form>
        `;

        pane.querySelector('#profile-update-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = e.target.querySelector('button');
          btn.disabled = true;
          btn.textContent = 'Đang xử lý...';

          const fullName = document.getElementById('full_name').value.trim();
          const phone = document.getElementById('phone').value.trim();
          const newPassword = document.getElementById('new_password').value;
          
          const { error: profErr } = await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', currentUser.id);

          if (profErr) {
            alert('Lỗi cập nhật profile: ' + profErr.message);
          } else if (newPassword) {
            if (newPassword !== document.getElementById('confirm_password').value) {
              alert('Mật khẩu xác nhận không khớp!');
            } else {
              const { error: passErr } = await supabase.auth.updateUser({ password: newPassword });
              if (passErr) alert('Lỗi đổi mật khẩu: ' + passErr.message);
              else alert('Cập nhật thành công!');
            }
          } else {
            alert('Cập nhật thành công!');
            if (accName) accName.textContent = fullName;
          }
          btn.disabled = false;
          btn.textContent = 'Cập nhật hồ sơ';
        });
        break;
      }

      default:
        pane.innerHTML = '<p>Nội dung đang được cập nhật...</p>';
    }
  }
});
