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
    
    // Set JWT as HttpOnly, Secure cookie with Safari compatibility
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Only secure in production
      sameSite: isProduction ? 'none' : 'lax', // Use 'lax' for dev, 'none' for prod
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: '/',
    };

    // Add domain for production to help Safari
    if (isProduction) {
      const origin = res.req.headers.origin;
      if (origin && (origin.includes('vercel.app') || origin.includes('netlify.app'))) {
        // For cross-origin requests, don't set domain
        cookieOptions.domain = undefined;
      }
    }

    res.cookie('auth_token', result.access_token, cookieOptions);
    
    // Return user info only (no token)
    res.json({ user: result.user });
  }

  @Post("logout")
  async logout(@Response() res): Promise<void> {
    // Clear the cookie with the same settings used to set it
    const isProduction = process.env.NODE_ENV === 'production';
    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    };

    res.clearCookie('auth_token', clearOptions);
    res.status(200).json({ message: 'Logged out' });
  }

  @UseGuards(AuthGuard)
  @Get("profile")
  getProfile(@Request() req) {
    return req.user;
  }
}
