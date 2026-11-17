import { api } from './api.ts';
import type {
  Container,
  ContainerInput,
  ContainerType,
  Dashboard,
  MovementPage,
  MovementType,
  Product,
  ProductInput,
  SectorInput,
  Warehouse,
  WarehouseInput,
  WarehouseMap,
} from '@/types/inventory.ts';

function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const dashboardService = {
  get: (signal?: AbortSignal) => api.get<Dashboard>('/dashboard', { signal }),
};

export const productService = {
  list: (params: { search?: string; category?: string; include_archived?: boolean } = {}, signal?: AbortSignal) =>
    api.get<Product[]>(`/products${query(params)}`, { signal }),
  categories: (signal?: AbortSignal) => api.get<string[]>('/products/categories', { signal }),
  create: (data: ProductInput) => api.post<Product>('/products', data),
  update: (id: string, data: Partial<ProductInput>) => api.patch<Product>(`/products/${id}`, data),
  remove: (id: string) => api.delete<{ result: 'deleted' | 'archived'; message: string }>(`/products/${id}`),
  restore: (id: string) => api.post<Product>(`/products/${id}/restore`),
};

export const warehouseService = {
  list: (signal?: AbortSignal) => api.get<Warehouse[]>('/warehouses', { signal }),
  map: (id: string, signal?: AbortSignal) => api.get<WarehouseMap>(`/warehouses/${id}/map`, { signal }),
  create: (data: WarehouseInput) => api.post<Warehouse>('/warehouses', data),
  update: (id: string, data: Partial<WarehouseInput>) => api.patch<Warehouse>(`/warehouses/${id}`, data),
  remove: (id: string) => api.delete<void>(`/warehouses/${id}`),
  createSector: (warehouseId: string, data: SectorInput) =>
    api.post<Warehouse>(`/warehouses/${warehouseId}/sectors`, data),
  updateSector: (sectorId: string, data: Partial<SectorInput>) => api.patch<Warehouse>(`/sectors/${sectorId}`, data),
  removeSector: (sectorId: string) => api.delete<Warehouse>(`/sectors/${sectorId}`),
};

export const containerService = {
  list: (params: { search?: string; product_id?: string; warehouse_id?: string } = {}, signal?: AbortSignal) =>
    api.get<Container[]>(`/containers${query(params)}`, { signal }),
  types: (signal?: AbortSignal) => api.get<ContainerType[]>('/container-types', { signal }),
  create: (data: ContainerInput) => api.post<Container>('/containers', data),
  update: (id: string, data: Partial<Pick<Container, 'lot' | 'manufacture_date' | 'expiry_date' | 'notes'>>) =>
    api.patch<Container>(`/containers/${id}`, data),
  entry: (id: string, data: { volume_l: number; performed_by: string; notes?: string | null }) =>
    api.post<Container>(`/containers/${id}/entry`, data),
  withdraw: (id: string, data: { volume_l: number; performed_by: string; notes?: string | null }) =>
    api.post<Container>(`/containers/${id}/withdraw`, data),
  move: (id: string, data: { sector_id: string; row: number; col: number; performed_by: string; notes?: string | null }) =>
    api.post<Container>(`/containers/${id}/move`, data),
  remove: (id: string, data: { performed_by: string; notes?: string | null }) =>
    api.post<Container>(`/containers/${id}/remove`, data),
};

export const movementService = {
  list: (
    params: { type?: MovementType; container_id?: string; product_id?: string; limit?: number; skip?: number } = {},
    signal?: AbortSignal,
  ) => api.get<MovementPage>(`/movements${query(params)}`, { signal }),
};

export const setupService = {
  createDemo: () =>
    api.post<{ warehouses: number; sectors: number; products: number; containers: number }>('/setup/demo', undefined, {
      timeoutMs: 60_000,
    }),
};
