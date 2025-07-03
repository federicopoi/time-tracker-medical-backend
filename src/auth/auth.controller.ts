import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Response,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { AuthResponse, SignInDto } from "./types/auth.types";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post("login")
  async signIn(@Body() signInDto: SignInDto, @Response() res): Promise<void> {
    const result = await this.authService.signIn(signInDto.email, signInDto.password);
    // Set JWT as HttpOnly, Secure cookie
    res.cookie('auth_token', result.access_token, {
      httpOnly: true,
      // Only set secure in production so cookies work on localhost (HTTP)
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Allow cookies on cross-site requests
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: '/',
    });
    // Return user info only (no token)
    res.json({ user: result.user });
  }

  @Post("logout")
  async logout(@Response() res): Promise<void> {
    res.clearCookie('auth_token', { path: '/' });
    res.status(200).json({ message: 'Logged out' });
  }

  @UseGuards(AuthGuard)
  @Get("profile")
  async getProfile(@Request() req) {
    const userId = parseInt(req.user.sub);
    return await this.authService.getProfile(userId);
  }
}
