import { PassportModule } from "@cinema-platform/passport";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { getPassportConfig } from "@/config";
import { UserRepository } from "@/shared/repositories";

import { OtpModule } from "../otp/otp.module";

import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";

@Module({
	imports: [
		OtpModule,
		PassportModule.registerAsync({
			useFactory: getPassportConfig,
			inject: [ConfigService],
		}),
	],
	controllers: [AuthController],
	providers: [AuthService, AuthRepository, UserRepository],
})
export class AuthModule {}
