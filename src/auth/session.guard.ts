import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import type { SessionContext } from "@gaqno-development/types";
import { SsoService } from "@gaqno-development/backcore/services/sso.service";

interface RequestWithSession extends Request {
  session?: SessionContext;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly ssoService: SsoService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithSession>();

    try {
      const session = await this.ssoService.verify(request as Request);
      request.session = session;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
