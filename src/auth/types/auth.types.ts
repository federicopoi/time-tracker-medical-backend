export interface AuthResponse {
  access_token: string;
  user: {
    id?: number;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    primarysite_id: number;
    assignedsites_ids: number[];
    created_at?: Date;
  }
}

export interface SignInDto {
  email: string;
  password: string;
} 