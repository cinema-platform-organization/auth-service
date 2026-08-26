import { RpcStatus } from "@cinema-platform/common";
import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { createHash } from "node:crypto";

import { RedisService } from "@/infrastructure/redis/redis.service";

@Injectable()
export class OtpService {
	public constructor(private readonly redisService: RedisService) {}

	public async send(identifier: string, type: "phone" | "email") {
		const { code, hash } = this.generateCode();

		await this.redisService.set(
			`otp:${type}:${identifier}`,
			hash,
			"EX",
			300,
		);

		return { code, hash };
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
			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				details: "Invalid or expired code",
			});
		}

		const incomingHash = createHash("sha256").update(code).digest("hex");

		if (incomingHash !== storedHash) {
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

		return { code, hash };
	}
}
