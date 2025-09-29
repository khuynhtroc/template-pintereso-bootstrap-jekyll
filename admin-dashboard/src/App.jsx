// Trong App.jsx
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProductManager from './pages/ProductManager'; // Import
import RevenueDashboard from './pages/RevenueDashboard'; // Import
import { ProtectedRoute } from './auth/Auth';

function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<ProductManager />} /> {/* Thêm route quản lý sản phẩm */}
        <Route path="/revenue" element={<RevenueDashboard />} /> {/* Thêm route thống kê */}
      </Route>
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;
