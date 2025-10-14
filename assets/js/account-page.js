document.addEventListener('DOMContentLoaded', async () => {
  // Lấy Supabase client từ window (đã khởi tạo ở supabaseClient.js)
  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error('Supabase client not found on window.');
    return;
  }

  // 1) Xác thực và load profile
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr) console.warn('auth.getUser error:', authErr);

  if (!user) {
    document.body.innerHTML = '<div class="container py-5 text-center"><p>[translate:Vui lòng đăng nhập để xem trang tài khoản. Đang chuyển hướng...]</p></div>';
    setTimeout(() => { window.location.href = '/'; }, 2000);
    return;
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileErr) console.warn('Load profile error:', profileErr);

  // 2) Cập nhật giao diện chung
  const accName = document.getElementById('acc-name');
  const accAvatar = document.getElementById('acc-avatar');
  if (accName) accName.textContent = (profile && profile.full_name) ? profile.full_name : (user.email || '[translate:Tài khoản]');
  if (accAvatar && profile?.avatar_url) accAvatar.src = profile.avatar_url;

  // 3) Sự kiện đăng xuất
  const signOutBtn = document.getElementById('acc-signout');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = '/';
    });
  }

  // 4) Điều hướng tab
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

      loadTabData(tabId);
    });
  });

  // Tải tab mặc định
  const initialTab = document.querySelector('.acc-menu li.active a')?.getAttribute('data-tab') || 'dashboard';
  loadTabData(initialTab);

  // 5) Hàm tải dữ liệu từng tab
  async function loadTabData(tabId) {
    const pane = document.getElementById(`tab-${tabId}`);
    if (!pane) return;
    pane.innerHTML = '<p>[translate:Đang tải dữ liệu...]</p>';

    switch (tabId) {
      // Bảng điều khiển
      case 'dashboard': {
        const isVip = !!(profile?.user_tier && profile.user_tier !== 'Free');
        pane.innerHTML = `
          <h2 class="acc-title">[translate:Bảng điều khiển]</h2>
          <div class="acc-alert" style="display:${isVip ? 'none' : 'block'}">
            <h4>[translate:Nâng cấp tài khoản!]</h4>
            <p>[translate:Bạn hiện là thành viên thường. Hãy nâng cấp lên VIP để nhận được nhiều lượt tải mỗi ngày và truy cập không giới hạn vào toàn bộ tài nguyên của chúng tôi.]</p>
            <button class="btn btn-primary" id="btn-upgrade-now">[translate:Nâng cấp ngay]</button>
          </div>
          <p>[translate:Xin chào] <strong>${profile?.full_name || user.email}</strong>.</p>
          <p>[translate:Từ bảng điều khiển tài khoản, có thể xem các đơn hàng gần đây, quản lý các gói thành viên, và chỉnh sửa mật khẩu cũng chi tiết tài khoản.]</p>
        `;
        const upgradeBtn = pane.querySelector('#btn-upgrade-now');
        if (upgradeBtn) upgradeBtn.addEventListener('click', () => window.location.href = '/pricing/');
        break;
      }

      // Đơn hàng
      case 'orders': {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            created_at,
            amount,
            status,
            membership_plans (name),
            products (name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
          pane.innerHTML = '<h2 class="acc-title">[translate:Đơn hàng của bạn]</h2><p>[translate:Bạn chưa có đơn hàng nào.]</p>';
          break;
        }

        let html = `
          <h2 class="acc-title">[translate:Đơn hàng của bạn]</h2>
          <table class="table">
            <thead>
              <tr>
                <th>[translate:Mã ĐH]</th>
                <th>[translate:Sản phẩm đã mua]</th>
                <th>[translate:Tổng tiền]</th>
                <th>[translate:Trạng thái]</th>
                <th>[translate:Ngày tạo]</th>
              </tr>
            </thead>
            <tbody>
        `;

        data.forEach(o => {
          const itemName = o.membership_plans?.name || o.products?.name || '[translate:Sản phẩm lẻ]';
          const money = new Intl.NumberFormat('vi-VN').format(o.amount || 0) + 'đ';
          const statusBadge =
            o.status === 'completed'
              ? '<span class="badge bg-success">[translate:Hoàn thành]</span>'
              : o.status === 'failed'
                ? '<span class="badge bg-danger">[translate:Thất bại]</span>'
                : '<span class="badge bg-warning text-dark">[translate:Chờ xử lý]</span>';

          html += `
            <tr>
              <td>#${o.id}</td>
              <td>${itemName}</td>
              <td>${money}</td>
              <td>${statusBadge}</td>
              <td>${o.created_at ? new Date(o.created_at).toLocaleDateString('vi-VN') : '—'}</td>
            </tr>
          `;
        });

        pane.innerHTML = html + '</tbody></table>';
        break;
      }

      // Gói VIP của tôi
      case 'vip': {
        // Chỉ lấy đơn hàng có plan_id (đơn mua gói VIP)
        const { data: vipOrders, error } = await supabase
          .from('orders')
          .select(`
            created_at,
            status,
            membership_plans (name, duration_days)
          `)
          .eq('user_id', user.id)
          .not('plan_id', 'is', null)
          .order('created_at', { ascending: false });

        let html = '<h2 class="acc-title">[translate:Các gói thành viên của bạn]</h2>';
        if (error || !vipOrders || vipOrders.length === 0) {
          html += '<p>[translate:Bạn chưa từng đăng ký gói VIP nào.]</p>';
          html += '<button class="btn btn-primary mt-3" onclick="window.location.href=\'/pricing/\'">[translate:Nâng cấp hoặc Gia hạn gói]</button>';
          pane.innerHTML = html;
          break;
        }

        html += `
          <table class="table">
            <thead>
              <tr>
                <th>[translate:Gói thành viên]</th>
                <th>[translate:Ngày bắt đầu]</th>
                <th>[translate:Ngày hết hạn]</th>
                <th>[translate:Trạng thái]</th>
              </tr>
            </thead>
            <tbody>
        `;

        vipOrders.forEach(v => {
          const planName = v.membership_plans?.name || '[translate:Không xác định]';
          const days = v.membership_plans?.duration_days ?? null;
          const start = v.created_at ? new Date(v.created_at) : null;

          let expiryText = '[translate:Vĩnh viễn]';
          if (start && Number.isFinite(days) && days > 0) {
            const exp = new Date(start);
            exp.setDate(exp.getDate() + days);
            expiryText = exp.toLocaleDateString('vi-VN');
          }

          const statusBadge = v.status === 'completed'
            ? '<span class="badge bg-success">[translate:Hoạt động]</span>'
            : '<span class="badge bg-warning text-dark">[translate:Chờ xử lý]</span>';

          html += `
            <tr>
              <td>${planName}</td>
              <td>${start ? start.toLocaleDateString('vi-VN') : '—'}</td>
              <td>${expiryText}</td>
              <td>${statusBadge}</td>
            </tr>
          `;
        });

        html += '</tbody></table>';
        html += '<button class="btn btn-primary mt-3" onclick="window.location.href=\'/pricing/\'">[translate:Nâng cấp hoặc Gia hạn gói]</button>';
        pane.innerHTML = html;
        break;
      }

      // Lịch sử tải
      case 'downloads': {
        // Lấy 200 bản ghi gần nhất (tùy ý)
        const { data, error } = await supabase
          .from('downloads')
          .select('product_name, downloaded_at, product_sku, product_id')
          .eq('user_id', user.id)
          .order('downloaded_at', { ascending: false })
          .limit(200);

        if (error || !data || data.length === 0) {
          pane.innerHTML = '<h2 class="acc-title">[translate:Lịch sử tải]</h2><p>[translate:Bạn chưa có lượt tải nào.]</p>';
          break;
        }

        const total = data.length;
        let html = `<h2 class="acc-title">[translate:Lịch sử tải] <small class="text-muted">([translate:Tổng số]: ${total})</small></h2>`;
        html += '<div class="table-responsive"><table class="table"><thead><tr><th>[translate:Sản phẩm]</th><th>SKU</th><th>[translate:Thời gian]</th></tr></thead><tbody>';

        data.forEach(dl => {
          const name = dl.product_name || '[translate:Không rõ tên]';
          const sku = dl.product_sku || '—';
          const time = dl.downloaded_at ? new Date(dl.downloaded_at).toLocaleString('vi-VN') : '—';
          html += `<tr><td>${name}</td><td>${sku}</td><td>${time}</td></tr>`;
        });

        html += '</tbody></table></div>';
        pane.innerHTML = html;
        break;
      }

      // Quản lý thiết bị (demo hiển thị)
      case 'devices': {
        pane.innerHTML = `
          <h2 class="acc-title">[translate:Quản lý thiết bị]</h2>
          <p>[translate:Danh sách các thiết bị bạn đã dùng để đăng nhập.]</p>
          <div class="device-list">
            <div class="device-item d-flex justify-content-between align-items-center border rounded p-3">
              <div>
                <i class="fas fa-desktop"></i>
                <strong>[translate:Hệ điều hành]:</strong> Windows <br>
                <strong>[translate:Trình duyệt]:</strong> Chrome
              </div>
              <div class="text-end">
                <strong>[translate:Đăng nhập cuối]:</strong> ${new Date().toLocaleString('vi-VN')} <br>
                <span class="badge bg-success">[translate:Thiết bị này]</span>
              </div>
            </div>
          </div>
          <p class="mt-3 small text-muted">[translate:Nếu bạn đạt giới hạn 3 thiết bị, bạn cần xóa một thiết bị cũ trước khi có thể đăng nhập từ một thiết bị mới.]</p>
        `;
        break;
      }

      // Chỉnh sửa hồ sơ
      case 'profile': {
        pane.innerHTML = `
          <h2 class="acc-title">[translate:Chỉnh sửa hồ sơ]</h2>
          <form id="profile-update-form">
            <div class="mb-3">
              <label class="form-label">[translate:Tên người dùng]</label>
              <input type="text" class="form-control" value="${profile?.username || ''}" disabled>
              <div class="form-text">[translate:Tên người dùng không thể thay đổi.]</div>
            </div>
            <div class="mb-3">
              <label for="full_name" class="form-label">[translate:Tên hiển thị]</label>
              <input type="text" id="full_name" class="form-control" value="${profile?.full_name || ''}">
            </div>
            <div class="mb-3">
              <label class="form-label">Email</label>
              <input type="email" class="form-control" value="${user.email}" disabled>
            </div>
            <div class="mb-3">
              <label for="phone" class="form-label">[translate:Số điện thoại]</label>
              <input type="text" id="phone" class="form-control" value="${profile?.phone || ''}">
            </div>
            <hr>
            <h4 class="mt-4">[translate:Thay đổi mật khẩu]</h4>
            <div class="mb-3">
              <label for="new_password" class="form-label">[translate:Mật khẩu mới]</label>
              <input type="password" id="new_password" class="form-control" placeholder="[translate:Để trống nếu không đổi]">
            </div>
            <div class="mb-3">
              <label for="confirm_password" class="form-label">[translate:Xác nhận mật khẩu mới]</label>
              <input type="password" id="confirm_password" class="form-control">
            </div>
            <button type="submit" class="btn btn-primary">[translate:Cập nhật hồ sơ]</button>
          </form>
        `;

        pane.querySelector('#profile-update-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const button = e.target.querySelector('button');
          button.disabled = true;
          button.textContent = '[translate:Đang xử lý...]';

          const fullName = document.getElementById('full_name').value.trim();
          const phone = document.getElementById('phone').value.trim();
          const newPassword = document.getElementById('new_password').value;
          const confirmPassword = document.getElementById('confirm_password').value;

          // Cập nhật profile
          const { error: profErr } = await supabase
            .from('profiles')
            .update({ full_name: fullName, phone })
            .eq('id', user.id);

          if (profErr) {
            alert('[translate:Lỗi cập nhật profile]: ' + profErr.message);
            button.disabled = false;
            button.textContent = '[translate:Cập nhật hồ sơ]';
            return;
          }

          // Cập nhật mật khẩu nếu có
          if (newPassword) {
            if (newPassword !== confirmPassword) {
              alert('[translate:Mật khẩu xác nhận không khớp!]');
              button.disabled = false;
              button.textContent = '[translate:Cập nhật hồ sơ]';
              return;
            }
            const { error: passErr } = await supabase.auth.updateUser({ password: newPassword });
            if (passErr) {
              alert('[translate:Lỗi đổi mật khẩu]: ' + passErr.message);
              button.disabled = false;
              button.textContent = '[translate:Cập nhật hồ sơ]';
              return;
            }
          }

          alert('[translate:Cập nhật thành công!]');
          button.disabled = false;
          button.textContent = '[translate:Cập nhật hồ sơ]';
          if (accName && fullName) accName.textContent = fullName;
        });
        break;
      }

      default:
        pane.innerHTML = '<p>[translate:Nội dung đang được cập nhật...]</p>';
    }
  }
});
