import { RpcStatus } from "@cinema-platform/common";
import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { PinoLogger } from "nestjs-pino";
import { createHash } from "node:crypto";

import { RedisService } from "@/infrastructure/redis/redis.service";

@Injectable()
export class OtpService {
	public constructor(
		private readonly redisService: RedisService,
		private readonly logger: PinoLogger,
	) {
		this.logger.setContext(OtpService.name);
	}

	public async send(identifier: string, type: "phone" | "email") {
		const { code, hash } = this.generateCode();

		this.logger.debug(
			`OTP generated for ${identifier}: ${code}, hash=${hash}`,
		);

		await this.redisService.set(
			`otp:${type}:${identifier}`,
			hash,
			"EX",
			300,
		);

		this.logger.info(`OTP stored in Redis for ${identifier}`);

		return { code: String(code), hash };
	}

	public async verify(
		identifier: string,
		code: string,
		type: "phone" | "email",
	) {
		const storedHash = await this.redisService.get(
			`otp:${type}:${identifier}`,
		);

		if (!storedHash) {
			this.logger.warn(`OTP expired or missing for ${identifier}`);

			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				details: "Invalid or expired code",
			});
		}

		const incomingHash = createHash("sha256").update(code).digest("hex");

		if (incomingHash !== storedHash) {
			this.logger.warn(
				`OTP verification failed for ${identifier}: wrong code`,
			);

			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				details: "Invalid or expired code",
			});
		}

		await this.redisService.del(`otp:${type}:${identifier}`);
	}

	private generateCode() {
		const code = Math.floor(100000 + Math.random() * 90000);
		const hash = createHash("sha256").update(String(code)).digest("hex");

		this.logger.debug(`Generated OTP hash=${hash}`);

		return { code, hash };
	}
}
