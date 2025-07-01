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
}
