import { PassportModule } from "@cinema-platform/passport";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { getPassportConfig } from "@/config";

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
	providers: [AuthService, AuthRepository],
})
export class AuthModule {}
