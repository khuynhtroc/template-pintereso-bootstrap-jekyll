import { supabase } from '../supabaseClient';

export default function Dashboard() {
    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div>
            <h1>Welcome to Admin Dashboard</h1>
            <p>Đây là khu vực được bảo vệ.</p>
            <button onClick={handleLogout}>Đăng xuất</button>
        </div>
    );
}
