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
    const origin = res.req.headers.origin;
    
    // Safari requires secure=true when sameSite=none, regardless of environment
    const isSecureContext = isProduction || (origin && origin.startsWith('https://'));
    
    // Safari-specific cookie handling
    const cookieOptions = {
      httpOnly: true,
      secure: isSecureContext, // Must be true for sameSite=none in Safari
      sameSite: isSecureContext ? 'none' : 'lax', // Safari strict requirements
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: '/',
      domain: isProduction ? undefined : undefined, // Let browser set domain
    };

    res.cookie('auth_token', result.access_token, cookieOptions);
    
    // Return user info only (no token)
    res.json({ user: result.user });
  }

  @Post("logout")
  async logout(@Response() res): Promise<void> {
    // Clear the cookie with the same settings used to set it
    const isProduction = process.env.NODE_ENV === 'production';
    const origin = res.req.headers.origin;
    const isSecureContext = isProduction || (origin && origin.startsWith('https://'));
    
    const clearOptions = {
      httpOnly: true,
      secure: isSecureContext,
      sameSite: isSecureContext ? 'none' : 'lax',
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
