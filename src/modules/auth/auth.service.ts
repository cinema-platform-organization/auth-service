import { RpcStatus } from "@cinema-platform/common";
import type {
	RefreshRequest,
	SendOtpRequest,
	VerifyOtpRequest,
} from "@cinema-platform/contracts/gen/ts/auth";
import type { Account } from "@generated/client";
import { Injectable, Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";

import { MessagingService } from "@/infrastructure/messaging/messaging.service";
import { UserRepository } from "@/shared/repositories";

import { OtpService } from "../otp/otp.service";
import { TokenService } from "../token/token.service";
import { UsersClientGrpc } from "../users/users.grpc";

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);

	public constructor(
		private readonly userRepository: UserRepository,
		private readonly otpService: OtpService,
		private readonly tokenService: TokenService,
		private readonly messagingService: MessagingService,
		private readonly usersClient: UsersClientGrpc,
	) {}

	public async sendOtp(data: SendOtpRequest) {
		const { identifier, type } = data;

		this.logger.log({ identifier, type }, "OTP request received");

		let account: Account | null;

		if (type === "phone") {
			account = await this.userRepository.findByPhone(identifier);
		} else {
			account = await this.userRepository.findByEmail(identifier);
		}
		if (!account) {
			this.logger.log(
				{ identifier },
				"Account not found, creating new account",
			);

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

		this.messagingService.otpRequested({
			identifier,
			type,
			code,
		});

		this.logger.log({ identifier }, "OTP sent");

		return { ok: true };
	}

	public async verifyOtp(data: VerifyOtpRequest) {
		const { identifier, code, type } = data;

		this.logger.log({ identifier, type }, "OTP verification attempt");

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
			this.logger.warn(
				{ identifier },
				"OTP verified but account not found",
			);

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

		this.logger.log({ accountId: account.id }, "OTP verified");

		await this.usersClient.create({ id: account.id });

		return this.tokenService.generate(account.id);
	}

	public refresh(data: RefreshRequest) {
		const { refreshToken } = data;

		this.logger.debug("Refresh token requested");

		const result = this.tokenService.verify(refreshToken);

		if (!result.valid) {
			throw new RpcException({
				code: RpcStatus.UNAUTHENTICATED,
				details: result.reason,
			});
		}

		this.logger.log({ userId: result.userId }, "Refresh token verified");

		return this.tokenService.generate(result.userId);
	}
}
