import { useState } from 'react';
import { supabase } from '../supabaseClient';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
        // Sau khi đăng nhập thành công, React sẽ tự động render lại các trang được bảo vệ
    };

    return (
        <form onSubmit={handleLogin}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
            <button type="submit">Đăng nhập</button>
        </form>
    );
}
export default Login;
