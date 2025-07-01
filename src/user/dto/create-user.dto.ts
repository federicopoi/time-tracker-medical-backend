export class CreateUserDto {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: "admin" | "nurse" | "pharmacist";
  primarysite_id: number;
  assignedsites_ids: number[];
}
