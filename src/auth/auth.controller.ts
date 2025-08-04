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
    
    // Safari-specific cookie handling - more permissive for cross-domain
    const cookieOptions = {
      httpOnly: true,
      secure: true, // Always true for cross-origin (required by Safari)
      sameSite: 'none' as const, // Safari needs this for cross-domain
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: '/',
      domain: isProduction ? '.railway.app' : undefined, // Set domain for cross-subdomain
    };

    // Additional Safari compatibility headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', origin || 'https://time-tracker-medical.vercel.app');

    res.cookie('auth_token', result.access_token, cookieOptions);
    
    // Return both user info and token for Safari compatibility
    res.json({ 
      user: result.user,
      access_token: result.access_token // Include token for sessionStorage
    });
  }

  @Post("logout")
  async logout(@Response() res): Promise<void> {
    // Clear the cookie with the same settings used to set it
    const isProduction = process.env.NODE_ENV === 'production';
    const origin = res.req.headers.origin;
    const isSecureContext = isProduction || (origin && origin.startsWith('https://'));
    
    const clearOptions = {
      httpOnly: true,
      secure: true, // Always true for cross-origin (required by Safari)
      sameSite: 'none' as const, // Match the login cookie settings
      path: '/',
    };

    // Additional Safari compatibility headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', origin || 'https://time-tracker-medical.vercel.app');

    res.clearCookie('auth_token', clearOptions);
    res.status(200).json({ message: 'Logged out' });
  }

  @UseGuards(AuthGuard)
  @Get("profile")
  getProfile(@Request() req) {
    return req.user;
  }
}
