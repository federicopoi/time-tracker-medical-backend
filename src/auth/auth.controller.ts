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
    
    // Set JWT as HttpOnly, Secure cookie with proper cross-origin settings
    res.cookie('auth_token', result.access_token, {
      httpOnly: true,
      secure: true, // Always use secure in both dev and prod since we're using HTTPS
      sameSite: 'none', // Required for cross-origin cookies
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: '/',
    });
    
    // Return user info only (no token)
    res.json({ user: result.user });
  }

  @Post("logout")
  async logout(@Response() res): Promise<void> {
    // Clear the cookie with the same settings used to set it
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
    res.status(200).json({ message: 'Logged out' });
  }

  @UseGuards(AuthGuard)
  @Get("profile")
  getProfile(@Request() req) {
    return req.user;
  }
}
