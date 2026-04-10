import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SessionGuard } from "./session.guard.js";
import { SsoService } from "@gaqno-development/backcore/services/sso.service";

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [SessionGuard, SsoService],
  exports: [SessionGuard, SsoService],
})
export class AuthModule {}
