import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "src/user/users.service";
import { AuthResponse } from "./types/auth.types";

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(email: string, pass: string): Promise<AuthResponse> {
    const result = await this.userService.findOne(email, pass);

    if (result === "user_not_found") {
      throw new NotFoundException("No account found with this email address");
    }

    if (result === "invalid_password") {
      throw new UnauthorizedException("Incorrect password");
    }

    const payload = {
      sub: result.id,
      email: result.email,
      name: `${result.first_name} ${result.last_name}`,
      role: result.role,
      assignedsites_ids: result.assignedsites_ids,
      primarysite_id: result.primarysite_id,
    };

    // Create response without password
    const { password, ...userWithoutPassword } = result;

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: userWithoutPassword,
    };
  }

  async getProfile(userId: number) {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    
    return {
      id: user.id,
      first_name: user.name.split(' ')[0], // Extract first name from name field
      last_name: user.name.split(' ').slice(1).join(' '), // Extract last name from name field
      email: user.email,
      role: user.role,
      primarysite: user.primary_site,
      assignedsites: user.assigned_sites || [],
      created_at: new Date(), // This will be set by the database
    };
  }
}
