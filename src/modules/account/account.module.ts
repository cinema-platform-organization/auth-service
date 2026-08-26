import { Module } from "@nestjs/common";

import { UserRepository } from "@/shared/repositories";

import { OtpModule } from "../otp/otp.module";

import { AccountController } from "./account.controller";
import { AccountRepository } from "./account.repository";
import { AccountService } from "./account.service";

@Module({
	imports: [OtpModule],
	controllers: [AccountController],
	providers: [AccountService, AccountRepository, UserRepository],
})
export class AccountModule {}
