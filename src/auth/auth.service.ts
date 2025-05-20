import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/user/users.service';

interface AuthResponse {
  access_token: string;
  user: {
    id?: number;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    primarysite: string;
    assignedsites: string[];
    created_at?: Date;
  }
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService
  ) {}

  async signIn(
    email: string,
    pass: string,
  ): Promise<AuthResponse> {
    const user = await this.userService.findOne(email, pass);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
  
    const payload = {
      sub: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role
    };
  
    // Create response without password
    const { password, ...userWithoutPassword } = user;
    
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: userWithoutPassword
    };
  }
}
