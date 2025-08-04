import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { jwtConstants } from "./constants";
import { Request } from "express";

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  assignedsites_ids: number[];
  primarysite_id: number;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromCookieOrHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: jwtConstants.secret,
      });
      request["user"] = payload; // ✅ this includes the role now
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromCookieOrHeader(request: Request): string | undefined {
    // Debug Safari cookie issues
    const userAgent = request.headers['user-agent'] || '';
    const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
    
    console.log('🔍 Auth Guard Debug:', {
      url: request.url,
      method: request.method,
      userAgent: userAgent,
      isSafari: isSafari,
      cookies: request.cookies,
      hasAuthToken: request.cookies && request.cookies['auth_token'],
      cookieHeader: request.headers.cookie,
      authorizationHeader: request.headers.authorization,
      origin: request.headers.origin,
      referer: request.headers.referer,
    });
    
    // Prefer cookie
    if (request.cookies && request.cookies['auth_token']) {
      console.log('✅ Found auth_token in cookies');
      return request.cookies['auth_token'];
    }
    
    // Check raw cookie header for Safari
    if (request.headers.cookie) {
      const cookies = request.headers.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      if (cookies.auth_token) {
        console.log('✅ Found auth_token in raw cookie header');
        return cookies.auth_token;
      }
    }
    
    // Fallback to Authorization header (for sessionStorage tokens)
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    if (type === "Bearer" && token) {
      console.log('✅ Using Bearer token from Authorization header');
      return token;
    }
    
    console.log('❌ No authentication token found');
    return undefined;
  }
}
