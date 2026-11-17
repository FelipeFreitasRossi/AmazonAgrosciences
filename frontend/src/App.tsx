import { Navigate, Route, Routes } from 'react-router';
import AppLayout from '@/components/layout/AppLayout.tsx';
import DashboardPage from '@/pages/Dashboard/DashboardPage.tsx';
import MapPage from '@/pages/Map/MapPage.tsx';
import MovementsPage from '@/pages/Movements/MovementsPage.tsx';
import ProductsPage from '@/pages/Products/ProductsPage.tsx';
import WarehousesPage from '@/pages/Warehouses/WarehousesPage.tsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="mapa" element={<MapPage />} />
        <Route path="produtos" element={<ProductsPage />} />
        <Route path="movimentacoes" element={<MovementsPage />} />
        <Route path="galpoes" element={<WarehousesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
