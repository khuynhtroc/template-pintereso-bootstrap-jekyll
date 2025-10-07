---
layout: default
title: Account
permalink: /account/
---

<section class="container py-4">
  <h1>Account</h1>
  <div id="acct-secure" hidden>
    <div class="mb-3">
      <strong>Email:</strong> <span id="acct-email">...</span>
    </div>
    <form id="acct-form" class="mb-3">
      <label class="d-block mb-2">Full name</label>
      <input id="acct-fullname" class="form-control mb-3" type="text" placeholder="Your name">
      <label class="d-block mb-2">Avatar URL</label>
      <input id="acct-avatar" class="form-control mb-3" type="url" placeholder="https://...">
      <button class="btn btn-primary" type="submit">Save</button>
    </form>
    <button id="acct-signout" class="btn btn-outline-secondary">Sign out</button>
  </div>

  <div id="acct-guest" hidden>
    <p>Need to sign in to view this page.</p>
    <a href="#" id="acct-open-auth" class="btn btn-primary">Open sign-in</a>
  </div>
</section>

<!-- nạp cấu hình + JS tài khoản -->
<script src="{{ '/assets/js/config.supabase.js' | relative_url }}"></script>
<script type="module" src="{{ '/assets/js/account.js' | relative_url }}"></script>
