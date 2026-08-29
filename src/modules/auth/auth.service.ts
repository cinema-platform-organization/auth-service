import { RpcStatus } from "@cinema-platform/common";
import type {
	RefreshRequest,
	SendOtpRequest,
	VerifyOtpRequest,
} from "@cinema-platform/contracts/gen/auth";
import type { Account } from "@generated/client";
import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";

import { MessagingService } from "@/infrastructure/messaging/messaging.service";
import { UserRepository } from "@/shared/repositories";

import { OtpService } from "../otp/otp.service";
import { TokenService } from "../token/token.service";
import { UsersClientGrpc } from "../users/users.grpc";

@Injectable()
export class AuthService {
	public constructor(
		private readonly userRepository: UserRepository,
		private readonly otpService: OtpService,
		private readonly tokenService: TokenService,
		private readonly messagingService: MessagingService,
		private readonly usersClient: UsersClientGrpc,
	) {}

	public async sendOtp(data: SendOtpRequest) {
		const { identifier, type } = data;

		let account: Account | null;

		if (type === "phone") {
			account = await this.userRepository.findByPhone(identifier);
		} else {
			account = await this.userRepository.findByEmail(identifier);
		}
		if (!account) {
			account = await this.userRepository.create({
				phone: type === "phone" ? identifier : undefined,
				email: type === "email" ? identifier : undefined,
			});
		}

		const { code } = await this.otpService.send(
			identifier,
			type as "phone" | "email",
		);

		console.log("CODE: ", code);

		await this.messagingService.otpRequested({
			identifier,
			type,
			code,
		});

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
			account = await this.userRepository.findByPhone(identifier);
		} else {
			account = await this.userRepository.findByEmail(identifier);
		}
		if (!account) {
			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				details: "Account not found",
			});
		}

		if (type === "phone" && !account.isPhoneVerified) {
			await this.userRepository.update(account.id, {
				isPhoneVerified: true,
			});
		}
		if (type === "email" && !account.isEmailVerified) {
			await this.userRepository.update(account.id, {
				isEmailVerified: true,
			});
		}

		this.usersClient.create({ id: account.id }).subscribe();

		return this.tokenService.generate(account.id);
	}

	public async refresh(data: RefreshRequest) {
		const { refreshToken } = data;

		const result = this.tokenService.verify(refreshToken);

		if (!result.valid) {
			throw new RpcException({
				code: RpcStatus.UNAUTHENTICATED,
				details: result.reason,
			});
		}

		return this.tokenService.generate(result.userId);
	}
}
