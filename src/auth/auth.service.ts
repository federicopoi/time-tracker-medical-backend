import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/user/users.service';
import { AuthResponse } from './types/auth.types';

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
