import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function RevenueDashboard() {
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [ordersByProduct, setOrdersByProduct] = useState([]);

    const fetchRevenueData = async () => {
        // Lấy tổng doanh thu của các đơn hàng có status là 'completed'
        const { data, error } = await supabase
            .from('orders')
            .select('amount')
            .eq('status', 'completed');

        if (data) {
            const total = data.reduce((sum, order) => sum + order.amount, 0);
            setTotalRevenue(total);
        }

        // Lấy dữ liệu để vẽ biểu đồ (ví dụ: doanh thu theo sản phẩm)
        const { data: productRevenue, error: productError } = await supabase
            .rpc('calculate_revenue_by_product'); // Giả sử bạn có một RPC function

        if (productRevenue) {
            setOrdersByProduct(productRevenue);
        }
    };

    useEffect(() => {
        fetchRevenueData();

        // Lắng nghe sự kiện realtime trên bảng 'orders'
        const channel = supabase.channel('public:orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
                console.log('Thay đổi được ghi nhận!', payload);
                // Khi có thay đổi, fetch lại toàn bộ dữ liệu
                fetchRevenueData();
            })
            .subscribe();

        // Dọn dẹp listener khi component unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const chartData = {
        labels: ordersByProduct.map(p => p.product_name),
        datasets: [
            {
                label: 'Doanh thu',
                data: ordersByProduct.map(p => p.total_revenue),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
            },
        ],
    };

    return (
        <div>
            <h1>Thống kê Doanh thu</h1>
            <h2>Tổng doanh thu: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue)}</h2>
            <div style={{ width: '80%', margin: 'auto' }}>
                <h3>Doanh thu theo sản phẩm</h3>
                <Bar data={chartData} />
            </div>
        </div>
    );
}
