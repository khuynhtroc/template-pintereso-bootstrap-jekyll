import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'; // Đảm bảo đường dẫn đúng

export default function ProductManager() {
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({ id: null, name: '', description: '', price: 0, sku: '', image_url: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (error) {
            setError('Không thể tải danh sách sản phẩm.');
            console.error(error);
        } else {
            setProducts(data);
        }
        setLoading(false);
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.price || !form.sku) {
            setError('Tên, Giá và SKU là bắt buộc.');
            return;
        }

        let result;
        if (isEditing) {
            // Chế độ cập nhật
            result = await supabase.from('products').update({ 
                name: form.name, 
                description: form.description, 
                price: parseFloat(form.price), 
                sku: form.sku, 
                image_url: form.image_url 
            }).eq('id', form.id);
        } else {
            // Chế độ thêm mới
            result = await supabase.from('products').insert([{ 
                name: form.name, 
                description: form.description, 
                price: parseFloat(form.price), 
                sku: form.sku, 
                image_url: form.image_url 
            }]);
        }

        if (result.error) {
            setError('Có lỗi xảy ra: ' + result.error.message);
        } else {
            resetForm();
            fetchProducts();
        }
    };

    const handleEdit = (product) => {
        setIsEditing(true);
        setForm(product);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) {
                setError('Không thể xóa sản phẩm.');
            } else {
                fetchProducts();
            }
        }
    };

    const resetForm = () => {
        setIsEditing(false);
        setForm({ id: null, name: '', description: '', price: 0, sku: '', image_url: '' });
        setError('');
    };

    if (loading) return <p>Đang tải...</p>;

    return (
        <div>
            <h1>Quản lý Sản phẩm</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            
            <form onSubmit={handleSubmit} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px' }}>
                <h3>{isEditing ? 'Chỉnh sửa Sản phẩm' : 'Thêm Sản phẩm Mới'}</h3>
                <input name="name" placeholder="Tên sản phẩm" value={form.name} onChange={handleChange} required />
                <input name="price" placeholder="Giá" type="number" value={form.price} onChange={handleChange} required />
                <input name="sku" placeholder="SKU" value={form.sku} onChange={handleChange} required />
                <textarea name="description" placeholder="Mô tả" value={form.description} onChange={handleChange} />
                <input name="image_url" placeholder="URL Hình ảnh" value={form.image_url} onChange={handleChange} />
                <button type="submit">{isEditing ? 'Cập nhật' : 'Thêm mới'}</button>
                {isEditing && <button type="button" onClick={resetForm}>Hủy</button>}
            </form>

            <table>
                <thead>
                    <tr>
                        <th>Tên</th>
                        <th>Giá</th>
                        <th>SKU</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(p => (
                        <tr key={p.id}>
                            <td>{p.name}</td>
                            <td>{new Intl.NumberFormat('vi-VN').format(p.price)}</td>
                            <td>{p.sku}</td>
                            <td>
                                <button onClick={() => handleEdit(p)}>Sửa</button>
                                <button onClick={() => handleDelete(p.id)}>Xóa</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
