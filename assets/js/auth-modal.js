// assets/js/auth-modal.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);
  const backdrop = $('#auth-backdrop');            // phải tồn tại trong DOM
  const btnClose = $('#auth-close');
  const avatar = $('#user-avatar');

  const openModal = () => backdrop.classList.add('is-open');
  const closeModal = () => backdrop.classList.remove('is-open');

  avatar?.addEventListener('click', openModal);    // chỉ mở khi bấm avatar
  btnClose?.addEventListener('click', closeModal); // nút Đóng
  backdrop?.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); }); // click ra ngoài
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });     // phím Esc

  // KHÔNG gọi openModal() ở đây
});
