import { Module } from "@nestjs/common";

import { UserRepository } from "@/shared/repositories";

import { OtpModule } from "../otp/otp.module";
import { TokenModule } from "../token/token.module";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
	imports: [OtpModule, TokenModule],
	controllers: [AuthController],
	providers: [AuthService, UserRepository],
})
export class AuthModule {}
