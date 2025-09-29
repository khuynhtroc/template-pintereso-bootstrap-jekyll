import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/Auth';
import { Navigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { user, isAdmin } = useAuth();

    // Nếu đã đăng nhập và là admin, tự động chuyển hướng vào dashboard
    if (user && isAdmin) {
        return <Navigate to="/" />;
    }
    
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setError('Email hoặc mật khẩu không đúng.');
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto' }}>
            <h2>Admin Dashboard Login</h2>
            <form onSubmit={handleLogin}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
                />
                <button type="submit" style={{ width: '100%', padding: '10px' }}>Login</button>
                {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
            </form>
        </div>
    );
}
