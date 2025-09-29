import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../supabaseClient'; // Đảm bảo đường dẫn này đúng
import { Navigate, Outlet } from 'react-router-dom';

// Tạo một Context để chứa thông tin xác thực
const AuthContext = createContext(null);

// Component chính cung cấp thông tin Auth cho toàn bộ ứng dụng
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Hàm kiểm tra vai trò admin từ bảng 'profiles'
        const checkAdminRole = async (currentUser) => {
            if (!currentUser) {
                setIsAdmin(false);
                return;
            }
            const { data, error } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', currentUser.id)
                .single();
            
            if (data) {
                setIsAdmin(data.is_admin);
            } else {
                setIsAdmin(false);
            }
        };

        // Lắng nghe sự thay đổi trạng thái đăng nhập (đăng nhập, đăng xuất)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            await checkAdminRole(currentUser);
            setLoading(false);
        });

        // Kiểm tra session hiện tại khi tải lại trang
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            await checkAdminRole(currentUser);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);
    
    const value = { user, isAdmin, loading };

    // Chỉ render children sau khi đã kiểm tra xong trạng thái đăng nhập
    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

// Hook tùy chỉnh để dễ dàng truy cập thông tin auth
export const useAuth = () => {
    return useContext(AuthContext);
};

// Component bảo vệ route
export const ProtectedRoute = () => {
    const { user, isAdmin } = useAuth();
    
    // Nếu chưa đăng nhập hoặc không phải admin, chuyển hướng về trang login
    if (!user || !isAdmin) {
        return <Navigate to="/login" />;
    }

    // Nếu hợp lệ, hiển thị nội dung của route
    return <Outlet />;
};
