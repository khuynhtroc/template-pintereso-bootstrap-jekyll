document.addEventListener('DOMContentLoaded', () => {
    const buyButton = document.getElementById('buy-product-btn');
    if (!buyButton) return;

    // Khởi tạo Supabase client
    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error('Supabase client is not initialized.');
        return;
    }

    buyButton.addEventListener('click', async () => {
        buyButton.disabled = true;
        buyButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...';

        const productSku = buyButton.getAttribute('data-product-sku');
        const productName = buyButton.getAttribute('data-product-name');
        const productPrice = buyButton.getAttribute('data-product-price');

        if (!productSku) {
            alert('Lỗi: Không tìm thấy mã SKU của sản phẩm.');
            buyButton.disabled = false;
            buyButton.innerHTML = '<i class="fas fa-shopping-cart me-2"></i> Mua ngay';
            return;
        }
        
        try {
            // Dùng SKU để tìm product_id trong bảng 'products'
            const { data: productData, error: productError } = await supabase
                .from('products')
                .select('id')
                .eq('sku', productSku)
                .single();

            if (productError || !productData) {
                throw new Error('Không tìm thấy sản phẩm trong cơ sở dữ liệu. Vui lòng thử lại sau.');
            }

            const productId = productData.id;

            // Lưu thông tin vào sessionStorage để trang checkout sử dụng
            sessionStorage.setItem('checkoutItem', JSON.stringify({
                type: 'product',
                id: productId,
                name: productName,
                price: productPrice
            }));

            // Chuyển hướng đến trang checkout
            window.location.href = '/checkout/';

        } catch (error) {
            alert('Đã xảy ra lỗi: ' + error.message);
            buyButton.disabled = false;
            buyButton.innerHTML = '<i class="fas fa-shopping-cart me-2"></i> Mua ngay';
        }
    });
});
