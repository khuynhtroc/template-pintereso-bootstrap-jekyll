document.addEventListener('DOMContentLoaded', () => {
    const pricingContainer = document.getElementById('pricing-plans');
    
    // Chỉ chạy code nếu đang ở trang pricing
    if (pricingContainer) {
        // Kiểm tra xem supabaseClient đã được khởi tạo chưa
        if (window.supabaseClient) {
            fetchPlans(window.supabaseClient, pricingContainer);
        } else {
            console.error('Supabase client is not initialized.');
        }
    }
});

async function fetchPlans(supabase, container) {
    const { data: plans, error } = await supabase
        .from('membership_plans')
        .select('*')
        .order('price', { ascending: true });

    if (error) {
        console.error('Error fetching plans:', error);
        container.innerHTML = '<p class="text-danger">Lỗi khi tải dữ liệu. Vui lòng thử lại sau.</p>';
        return;
    }

    container.innerHTML = ''; // Xóa placeholder

    plans.forEach(plan => {
        const featuresHTML = plan.features.map(feature => `<li><i class="fas fa-check"></i>${feature}</li>`).join('');

        const priceHTML = plan.original_price
            ? `<span class="price-original">${new Intl.NumberFormat('vi-VN').format(plan.original_price)}đ</span>
               <span class="price">${new Intl.NumberFormat('vi-VN').format(plan.price)}đ</span>`
            : `<span class="price">${new Intl.NumberFormat('vi-VN').format(plan.price)}đ</span>`;
        
        const bestValueBadge = plan.is_best_value ? '<div class="best-value-badge">Tiết kiệm</div>' : '';

        const planCardHTML = `
            <div class="col">
                <div class="card mb-4 rounded-3 shadow-sm">
                    ${bestValueBadge}
                    <div class="card-body d-flex flex-column">
                        <h4 class="card-title">${plan.name}</h4>
                        <div class="my-3">
                            ${priceHTML}
                        </div>
                        <ul class="list-unstyled mt-3 mb-4 text-start">
                            ${featuresHTML}
                        </ul>
                        <button type="button" class="w-100 btn btn-lg btn-buy mt-auto" onclick="purchasePlan(${plan.id})">MUA GÓI NÀY</button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += planCardHTML;
    });
}

function purchasePlan(planId) {
    // Chuyển hướng đến trang /checkout/ (ĐÚNG)
    window.location.href = `/checkout/?plan_id=${planId}`;
}
