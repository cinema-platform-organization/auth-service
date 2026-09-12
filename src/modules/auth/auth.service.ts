import { RpcStatus } from "@cinema-platform/common";
import type {
	RefreshRequest,
	SendOtpRequest,
	VerifyOtpRequest,
} from "@cinema-platform/contracts/gen/ts/auth";
import type { Account } from "@generated/client";
import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { PinoLogger } from "nestjs-pino";

import { MessagingService } from "@/infrastructure/messaging/messaging.service";
import { UserRepository } from "@/shared/repositories";

import { OtpService } from "../otp/otp.service";
import { TokenService } from "../token/token.service";
import { UsersClientGrpc } from "../users/users.grpc";

@Injectable()
export class AuthService {
	public constructor(
		private readonly logger: PinoLogger,
		private readonly userRepository: UserRepository,
		private readonly otpService: OtpService,
		private readonly tokenService: TokenService,
		private readonly messagingService: MessagingService,
		private readonly usersClient: UsersClientGrpc,
	) {
		this.logger.setContext(AuthService.name);
	}

	public async sendOtp(data: SendOtpRequest) {
		const { identifier, type } = data;

		this.logger.info(
			`OTP request received: identifier=${identifier}, type=${type}`,
		);

		let account: Account | null;

		if (type === "phone") {
			account = await this.userRepository.findByPhone(identifier);
		} else {
			account = await this.userRepository.findByEmail(identifier);
		}
		if (!account) {
			this.logger.info(
				`Account not found, creating new account for ${identifier}`,
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

		await this.messagingService.otpRequested({
			identifier,
			type,
			code,
		});

		this.logger.info(`OTP sent successfully to ${identifier}`);

		return { ok: true };
	}

	public async verifyOtp(data: VerifyOtpRequest) {
		const { identifier, code, type } = data;

		this.logger.info(
			`OTP verification attempt: ${identifier}, code=${code}`,
		);

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
				`OTP verified but account not found: ${identifier}`,
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

		this.logger.info(`OTP verified successfully for ${identifier}`);

		try {
			await this.usersClient.create({ id: account.id });
		} catch (error) {
			this.logger.error(
				`Failed to create user profile for account ${account.id}:`,
				error,
			);
			throw new RpcException({
				code: RpcStatus.INTERNAL,
				details: "Failed to create user profile",
			});
		}

		return this.tokenService.generate(account.id);
	}

	public async refresh(data: RefreshRequest) {
		const { refreshToken } = data;

		this.logger.debug("Refresh token requested");

		const result = this.tokenService.verify(refreshToken);

		if (!result.valid) {
			throw new RpcException({
				code: RpcStatus.UNAUTHENTICATED,
				details: result.reason,
			});
		}

		this.logger.info(
			`Refresh token verified successfully for user=${result.userId}`,
		);

		return this.tokenService.generate(result.userId);
	}
}
