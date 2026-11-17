// Tipos espelhando os schemas da API (backend/app/schemas)

export interface Sector {
  id: string;
  warehouse_id: string;
  code: string;
  name: string | null;
  rows: number;
  cols: number;
  positions_total: number;
  positions_used: number;
  created_at: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sectors: Sector[];
  positions_total: number;
  positions_used: number;
  total_volume_l: number;
  created_at: string;
  updated_at: string;
}

export interface WarehouseInput {
  code: string;
  name: string;
  description?: string | null;
}

export interface SectorInput {
  code?: string;
  name?: string | null;
  rows: number;
  cols: number;
}

export interface ContainerType {
  id: string;
  code: string;
  name: string;
  capacity_l: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
  manufacturer: string | null;
  composition: string | null;
  density_kg_l: number | null;
  ph: number | null;
  hazard_class: string | null;
  storage_instructions: string | null;
  min_stock_l: number;
  color: string;
  active: boolean;
  total_volume_l: number;
  containers_count: number;
  low_stock: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductInput = Pick<Product, 'code' | 'name' | 'category' | 'min_stock_l'> &
  Partial<
    Pick<
      Product,
      | 'description'
      | 'manufacturer'
      | 'composition'
      | 'density_kg_l'
      | 'ph'
      | 'hazard_class'
      | 'storage_instructions'
      | 'color'
    >
  >;

export interface Container {
  id: string;
  code: string;
  status: 'active' | 'removed';
  type_id: string;
  type_code: string;
  type_name: string;
  capacity_l: number;
  volume_l: number;
  fill_pct: number;
  product_id: string;
  product_code: string;
  product_name: string;
  product_category: string;
  product_color: string;
  warehouse_id: string | null;
  warehouse_code: string;
  warehouse_name: string;
  sector_id: string;
  sector_code: string;
  row: number;
  col: number;
  position_number: number;
  location_code: string;
  location_label: string;
  lot: string | null;
  manufacture_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContainerInput {
  code?: string | null;
  type_id: string;
  product_id: string;
  sector_id: string;
  row: number;
  col: number;
  volume_l: number;
  capacity_l?: number | null;
  lot?: string | null;
  manufacture_date?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  performed_by: string;
}

export interface SectorMap extends Sector {
  containers: Container[];
}

export interface WarehouseMap {
  warehouse: Warehouse;
  sectors: SectorMap[];
}

export type MovementType = 'entrada' | 'saida' | 'transferencia' | 'remocao';

export interface Movement {
  id: string;
  type: MovementType;
  container_id: string;
  container_code: string;
  product_id: string;
  product_code: string;
  product_name: string;
  volume_l: number;
  from_location: string | null;
  to_location: string | null;
  performed_by: string;
  notes: string | null;
  created_at: string;
}

export interface MovementPage {
  items: Movement[];
  total: number;
}

export interface Dashboard {
  totals: {
    products: number;
    containers: number;
    warehouses: number;
    sectors: number;
    positions_total: number;
    positions_used: number;
    occupancy_pct: number;
    total_volume_l: number;
    total_capacity_l: number;
    low_stock_count: number;
    expiring_count: number;
  };
  low_stock: { product_id: string; code: string; name: string; color: string; total_volume_l: number; min_stock_l: number }[];
  volume_by_product: { product_id: string; code: string; name: string; color: string; volume_l: number; containers: number }[];
  occupancy_by_warehouse: {
    warehouse_id: string;
    code: string;
    name: string;
    positions_total: number;
    positions_used: number;
    volume_l: number;
  }[];
  expiring_soon: {
    container_id: string;
    container_code: string;
    product_name: string;
    location_code: string;
    expiry_date: string | null;
    days_left: number;
  }[];
  recent_movements: Movement[];
  generated_at: string;
}
