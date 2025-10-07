---
layout: default
title: Tài khoản
permalink: /account/
---

<link rel="stylesheet" href="{{ '/assets/css/account.css' | relative_url }}">

<section class="account-container">
  <nav class="breadcrumb">
    <a href="{{ '/' | relative_url }}">Trang chủ</a>
    <span>/</span>
    <span>Tài khoản</span>
  </nav>

  <div class="account-grid">
    <!-- Sidebar -->
    <aside class="acc-sidebar">
      <div class="acc-card acc-user">
        <img id="acc-avatar" class="acc-avatar" src="{{ '/assets/images/sal.jpg' | relative_url }}" alt="avatar">
        <div class="acc-user-info">
          <div id="acc-name" class="acc-name">Đang tải...</div>
          <a id="acc-signout" href="#" class="acc-signout">Đăng xuất</a>
        </div>
      </div>

      <ul class="acc-menu">
        <li class="active"><a href="#" data-tab="dashboard"><i class="i i-dashboard"></i> Bảng điều khiển</a></li>
        <li><a href="#" data-tab="orders"><i class="i i-orders"></i> Đơn hàng</a></li>
        <li><a href="#" data-tab="vip"><i class="i i-vip"></i> Gói VIP của tôi</a></li>
        <li><a href="#" data-tab="downloads"><i class="i i-downloads"></i> Lịch sử tải</a></li>
        <li><a href="#" data-tab="devices"><i class="i i-devices"></i> Quản lý thiết bị</a></li>
        <li><a href="#" data-tab="profile"><i class="i i-profile"></i> Chi tiết tài khoản</a></li>
      </ul>
    </aside>

    <!-- Content -->
    <main class="acc-content">
      <!-- Dashboard -->
      <section id="tab-dashboard" class="tab-pane is-active">
        <h2 class="acc-title">Bảng điều khiển</h2>

        <div class="acc-alert">
          <h3>Nâng cấp tài khoản!</h3>
          <p>Bạn hiện là thành viên thường. Hãy nâng cấp lên VIP để nhận được nhiều lượt tải mỗi ngày và truy cập không giới hạn vào toàn bộ tài nguyên của chúng tôi.</p>
          <button class="btn btn-primary">Nâng cấp ngay</button>
        </div>

        <p class="mt-2">Xin chào <strong id="acc-hello">...</strong>.</p>
        <p>Từ bảng điều khiển tài khoản, có thể xem các đơn hàng gần đây, quản lý các gói thành viên, và chỉnh sửa mật khẩu cùng chi tiết tài khoản.</p>
      </section>

      <!-- Orders -->
      <section id="tab-orders" class="tab-pane">
        <h2 class="acc-title">Đơn hàng</h2>
        <p>Chưa có dữ liệu đơn hàng.</p>
      </section>

      <!-- VIP -->
      <section id="tab-vip" class="tab-pane">
        <h2 class="acc-title">Gói VIP của tôi</h2>
        <p>Trạng thái gói sẽ hiển thị tại đây.</p>
      </section>

      <!-- Downloads -->
      <section id="tab-downloads" class="tab-pane">
        <h2 class="acc-title">Lịch sử tải</h2>
        <p>Danh sách tải gần đây.</p>
      </section>

      <!-- Devices -->
      <section id="tab-devices" class="tab-pane">
        <h2 class="acc-title">Quản lý thiết bị</h2>
        <p>Thiết bị đăng nhập sẽ hiển thị tại đây.</p>
      </section>

      <!-- Profile -->
      <section id="tab-profile" class="tab-pane">
        <h2 class="acc-title">Chi tiết tài khoản</h2>

        <form id="acc-form" class="acc-form">
          <label class="acc-label">Email</label>
          <input id="acc-email" class="acc-input" type="email" disabled>

          <label class="acc-label">Họ và tên</label>
          <input id="acc-fullname" class="acc-input" type="text" placeholder="Nhập họ tên">

          <label class="acc-label">Avatar URL</label>
          <input id="acc-avatar-url" class="acc-input" type="url" placeholder="https://...">

          <button type="submit" class="btn btn-primary">Lưu</button>
        </form>
      </section>
    </main>
  </div>
</section>

<script src="{{ '/assets/js/config.supabase.js' | relative_url }}"></script>
<script type="module" src="{{ '/assets/js/account-page.js' | relative_url }}"></script>
