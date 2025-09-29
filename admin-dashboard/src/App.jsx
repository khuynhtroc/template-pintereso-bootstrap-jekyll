import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { ProtectedRoute } from './auth/Auth';

function App() {
  return (
    <Routes>
      {/* Route được bảo vệ */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        {/* Thêm các trang quản trị khác ở đây */}
      </Route>

      {/* Route công khai */}
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;
