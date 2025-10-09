document.addEventListener('DOMContentLoaded', async () => {
  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error('Supabase client not found.');
    return;
  }

  // --- Lấy thông tin người dùng và profile ---
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Nếu chưa đăng nhập, có thể chuyển hướng về trang chủ hoặc hiển thị modal
    alert('Vui lòng đăng nhập để xem trang tài khoản.');
    window.location.href = '/'; 
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single();

  // --- Cập nhật giao diện với thông tin người dùng ---
  const accName = document.getElementById('acc-name');
  const accAvatar = document.getElementById('acc-avatar');
  const accHello = document.getElementById('acc-hello');
  
  if (profile) {
    accName.textContent = profile.full_name || user.email;
    accHello.textContent = profile.full_name || user.email;
    if (profile.avatar_url) {
      accAvatar.src = profile.avatar_url;
    }
  } else {
      accName.textContent = user.email;
      accHello.textContent = user.email;
  }

  // --- Xử lý chuyển Tab ---
  const menuLinks = document.querySelectorAll('.acc-menu a');
  const tabPanes = document.querySelectorAll('.acc-content .tab-pane');

  menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.getAttribute('data-tab');

      // Bỏ active ở tất cả link và tab
      menuLinks.forEach(l => l.parentElement.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('is-active'));

      // Thêm active cho link và tab được click
      link.parentElement.classList.add('active');
      document.getElementById(`tab-${tabId}`).classList.add('is-active');

      // Tải dữ liệu cho tab khi được chọn
      loadTabData(tabId, user);
    });
  });

  // --- Xử lý Form cập nhật Profile ---
  const profileForm = document.getElementById('acc-form');
  const accEmailInput = document.getElementById('acc-email');
  const accFullnameInput = document.getElementById('acc-fullname');
  const accAvatarUrlInput = document.getElementById('acc-avatar-url');

  accEmailInput.value = user.email;
  if (profile) {
      accFullnameInput.value = profile.full_name || '';
      accAvatarUrlInput.value = profile.avatar_url || '';
  }

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = profileForm.querySelector('button');
    button.textContent = 'Đang lưu...';
    button.disabled = true;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: accFullnameInput.value,
        avatar_url: accAvatarUrlInput.value
      })
      .eq('id', user.id);

    if (updateError) {
      alert('Lỗi cập nhật: ' + updateError.message);
    } else {
      alert('Cập nhật thành công!');
      // Cập nhật lại giao diện ngay lập tức
      accName.textContent = accFullnameInput.value;
      if (accAvatarUrlInput.value) {
        accAvatar.src = accAvatarUrlInput.value;
      }
    }
    button.textContent = 'Lưu';
    button.disabled = false;
  });

  // --- Xử lý đăng xuất ---
  document.getElementById('acc-signout').addEventListener('click', async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.href = '/';
  });

  // --- Hàm tải dữ liệu cho từng tab ---
  async function loadTabData(tabId, currentUser) {
    if (tabId === 'orders') {
      const ordersPane = document.getElementById('tab-orders');
      ordersPane.innerHTML = '<p>Đang tải đơn hàng...</p>';
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`id, created_at, total_price, membership_plans (name)`)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error || !orders || orders.length === 0) {
        ordersPane.innerHTML = '<p>Bạn chưa có đơn hàng nào.</p>';
      } else {
        let table = '<table class="table"><thead><tr><th>Mã ĐH</th><th>Ngày</th><th>Sản phẩm</th><th>Tổng tiền</th></tr></thead><tbody>';
        orders.forEach(order => {
          table += `
            <tr>
              <td>#${order.id}</td>
              <td>${new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
              <td>${order.membership_plans.name}</td>
              <td>${new Intl.NumberFormat('vi-VN').format(order.total_price)}đ</td>
            </tr>
          `;
        });
        table += '</tbody></table>';
        ordersPane.innerHTML = table;
      }
    }
    // Bạn có thể thêm logic tải dữ liệu cho các tab khác (vip, downloads...) ở đây
  }
});
