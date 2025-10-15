document.addEventListener('DOMContentLoaded', async () => {
  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error('Supabase client not found.');
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    document.body.innerHTML = '<div class="container py-5 text-center"><p>Vui lòng đăng nhập để xem trang tài khoản. Đang chuyển hướng...</p></div>';
    setTimeout(() => { window.location.href = '/'; }, 2000);
    return;
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  const accName = document.getElementById('acc-name');
  if (accName) accName.textContent = profile?.full_name || user.email;
  const accAvatar = document.getElementById('acc-avatar');
  if (accAvatar && profile?.avatar_url) accAvatar.src = profile.avatar_url;

  const signOutBtn = document.getElementById('acc-signout');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = '/';
    });
  }

  const menuLinks = document.querySelectorAll('.acc-menu a');
  menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.getAttribute('data-tab');
      document.querySelectorAll('.acc-menu li').forEach(li => li.classList.remove('active'));
      document.querySelectorAll('.acc-content .tab-pane').forEach(p => p.classList.remove('is-active'));
      link.parentElement.classList.add('active');
      document.getElementById(`tab-${tabId}`)?.classList.add('is-active');
      loadTabData(tabId, user, profile);
    });
  });

  const initialTab = document.querySelector('.acc-menu li.active a')?.getAttribute('data-tab') || 'dashboard';
  loadTabData(initialTab, user, profile);

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
        const uid = (await supabase.auth.getUser()).data.user.id;
      
        // 1) lấy orders tối giản
        let q = supabase.from('orders').select('*').eq('user_id', uid);
        // thử order theo created_at, nếu 400 thì bỏ order
        let res = await q.order('created_at', { ascending: false });
        if (res.error) res = await q; // fallback bỏ order
      
        const { data: orders, error } = res;
        if (error || !orders || orders.length === 0) {
          pane.innerHTML = '<h2 class="acc-title">Đơn hàng của bạn</h2><p>Bạn chưa có đơn hàng nào.</p>';
          if (error) console.error('[orders]', error);
          break;
        }
      
        // 2) map tên từ bảng liên quan bằng 2 truy vấn riêng, tránh nested
        const planIds = [...new Set(orders.map(o => o.plan_id).filter(Boolean))];
        const productIds = [...new Set(orders.map(o => o.product_id).filter(Boolean))];
      
        const planMap = new Map();
        if (planIds.length) {
          const { data: plans, error: pe } = await supabase.from('membership_plans').select('id,name').in('id', planIds);
          if (pe) console.warn('[plans]', pe); else plans.forEach(p => planMap.set(p.id, p.name));
        }
      
        const productMap = new Map();
        if (productIds.length) {
          const { data: products, error: pr } = await supabase.from('products').select('id,name').in('id', productIds);
          if (pr) console.warn('[products]', pr); else products.forEach(p => productMap.set(p.id, p.name));
        }
      
        // 3) render, tự động dùng amount hoặc total_price (cột nào có)
        let html = `<h2 class="acc-title">Đơn hàng của bạn</h2>
          <div class="table-responsive"><table class="table">
            <thead><tr>
              <th>Mã ĐH</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ngày tạo</th>
            </tr></thead><tbody>`;
      
        orders.forEach(o => {
          const itemName = planMap.get(o.plan_id) || productMap.get(o.product_id) || 'Sản phẩm lẻ';
          const total = (o.amount ?? o.total_price ?? 0);
          const statusBadge = o.status === 'completed'
            ? '<span class="badge bg-success">Hoàn thành</span>'
            : o.status === 'failed'
              ? '<span class="badge bg-danger">Thất bại</span>'
              : '<span class="badge bg-warning text-dark">Chờ xử lý</span>';
          const created = o.created_at ? new Date(o.created_at).toLocaleDateString('vi-VN') : '—';
      
          html += `<tr>
            <td>#${o.id}</td>
            <td>${itemName}</td>
            <td>${new Intl.NumberFormat('vi-VN').format(total)}đ</td>
            <td>${statusBadge}</td>
            <td>${created}</td>
          </tr>`;
        });
      
        pane.innerHTML = html + '</tbody></table></div>';
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
        const uid = (await supabase.auth.getUser()).data.user.id;
      
        // base query + count
        let q = supabase.from('downloads')
          .select('product_name, product_sku, downloaded_at, product_id, download_url', { count: 'exact' })
          .eq('user_id', uid);
      
        // thử order theo downloaded_at; nếu lỗi -> thử created_at; nếu vẫn lỗi -> bỏ order
        let resp = await q.order('downloaded_at', { ascending: false }).limit(300);
        if (resp.error) resp = await q.order('created_at', { ascending: false }).limit(300);
        if (resp.error) resp = await q.limit(300);
      
        const { data, error, count } = resp;
        if (error || !data || data.length === 0) {
          pane.innerHTML = '<h2 class="acc-title">Lịch sử tải <small class="text-muted">(Tổng số: 0)</small></h2><p>Bạn chưa có lượt tải nào.</p>';
          if (error) console.error('[downloads]', error);
          break;
        }
      
        // fallback tên + link: nếu không có download_url trên downloads, cố lấy từ products
        const missingLinkIds = [...new Set(data.filter(x => !x.download_url && x.product_id).map(x => x.product_id))];
        const productLinkMap = new Map();
        if (missingLinkIds.length) {
          const { data: p2, error: p2e } = await supabase.from('products').select('id, download_url').in('id', missingLinkIds);
          if (p2e) console.warn('[products for links]', p2e); else p2.forEach(p => productLinkMap.set(p.id, p.download_url));
        }
      
        let html = `<h2 class="acc-title">Lịch sử tải <small class="text-muted">(Tổng số: ${Number.isFinite(count) ? count : data.length})</small></h2>
          <div class="table-responsive"><table class="table">
            <thead><tr><th>Sản phẩm</th><th>SKU</th><th>Thời gian</th><th>Tải lại</th></tr></thead><tbody>`;
      
        data.forEach(dl => {
          const name = dl.product_name || 'Không rõ tên';
          const sku = dl.product_sku || '—';
          const time = dl.downloaded_at ? new Date(dl.downloaded_at).toLocaleString('vi-VN') : '—';
          const link = dl.download_url || (dl.product_id ? productLinkMap.get(dl.product_id) : null);
          const btn = link ? `<a class="btn btn-sm btn-success" href="${link}" target="_blank" rel="noopener">Tải lại</a>` : '<span class="text-muted">Không có link</span>';
          html += `<tr><td>${name}</td><td>${sku}</td><td>${time}</td><td>${btn}</td></tr>`;
        });
      
        pane.innerHTML = html + '</tbody></table></div>';
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
