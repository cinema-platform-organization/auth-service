import { RpcStatus } from "@cinema-platform/common";
import type {
	SendOtpRequest,
	VerifyOtpRequest,
} from "@cinema-platform/contracts/gen/auth";
import { Account } from "@generated/client";
import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";

import { OtpService } from "../otp/otp.service";

import { AuthRepository } from "./auth.repository";

@Injectable()
export class AuthService {
	public constructor(
		private readonly authRepository: AuthRepository,
		private readonly otpService: OtpService,
	) {}

	public async sendOtp(data: SendOtpRequest) {
		const { identifier, type } = data;

		let account: Account | null;

		if (type === "phone") {
			account = await this.authRepository.findByPhone(identifier);
		} else {
			account = await this.authRepository.findByEmail(identifier);
		}
		if (!account) {
			account = await this.authRepository.create({
				phone: type === "phone" ? identifier : undefined,
				email: type === "email" ? identifier : undefined,
			});
		}

		const code = await this.otpService.send(
			identifier,
			type as "phone" | "email",
		);

		console.log(code);

		return { ok: true };
	}

	public async verifyOtp(data: VerifyOtpRequest) {
		const { identifier, code, type } = data;

		await this.otpService.verify(
			identifier,
			code,
			type as "phone" | "email",
		);

		let account: Account | null;

		if (type === "phone") {
			account = await this.authRepository.findByPhone(identifier);
		} else {
			account = await this.authRepository.findByEmail(identifier);
		}
		if (!account) {
			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				details: "Account not found",
			});
		}

		if (type === "phone" && !account.isPhoneVerified) {
			await this.authRepository.update(account.id, {
				isPhoneVerified: true,
			});
		}
		if (type === "email" && !account.isEmailVerified) {
			await this.authRepository.update(account.id, {
				isEmailVerified: true,
			});
		}

		return { accessToken: "123456", refreshToken: "123456" };
	}
}
