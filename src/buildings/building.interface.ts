export interface Building {
  id?: number;
  name: string;
  site_id: number;
  is_active: boolean;
  created_at?: Date;
}

export interface CreateBuildingDto {
  name: string;
  site_id: number;
  is_active?: boolean;
}

export interface UpdateBuildingDto {
  name?: string;
  site_id?: number;
  is_active?: boolean;
} 