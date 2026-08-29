import { RpcStatus } from "@cinema-platform/common";
import {
	TelegramCompleteRequest,
	TelegramConsumeRequest,
	TelegramVerifyRequest,
} from "@cinema-platform/contracts/gen/auth";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RpcException } from "@nestjs/microservices";
import { createHash, createHmac, randomBytes } from "crypto";

import { AllConfigs } from "@/config";
import { RedisService } from "@/infrastructure/redis/redis.service";
import { UserRepository } from "@/shared/repositories";

import { TokenService } from "../token/token.service";
import { UsersClientGrpc } from "../users/users.grpc";

import { TelegramSession, TelegramTokens } from "./interfaces";
import { TelegramRepository } from "./telegram.repository";

@Injectable()
export class TelegramService {
	private readonly BOT_ID: string;
	private readonly BOT_TOKEN: string;
	private readonly BOT_USERNAME: string;
	private readonly REDIRECT_ORIGIN: string;

	public constructor(
		private readonly redisService: RedisService,
		private readonly configService: ConfigService<AllConfigs>,
		private readonly telegramRepository: TelegramRepository,
		private readonly userRepository: UserRepository,
		private readonly tokenService: TokenService,
		private readonly usersClient: UsersClientGrpc,
	) {
		this.BOT_ID = this.configService.get("telegram.botId", { infer: true });
		this.BOT_TOKEN = this.configService.get("telegram.botToken", {
			infer: true,
		});
		this.BOT_USERNAME = this.configService.get("telegram.botUsername", {
			infer: true,
		});
		this.REDIRECT_ORIGIN = this.configService.get(
			"telegram.redirectOrigin",
			{
				infer: true,
			},
		);
	}

	public getAuthUrl() {
		const url = new URL("https://oauth.telegram.org/auth");

		url.searchParams.append("bot_id", this.BOT_ID);
		url.searchParams.append("origin", this.REDIRECT_ORIGIN);
		url.searchParams.append("request_access", "write");
		url.searchParams.append("return_to", this.REDIRECT_ORIGIN);

		return { url: url.href };
	}

	public async verify(data: TelegramVerifyRequest) {
		const isValid = this.checkTelegramAuth(data.query);

		if (!isValid)
			throw new RpcException({
				code: RpcStatus.UNAUTHENTICATED,
				details: "Invalid Telegram signature",
			});

		const telegramId = data.query.id;

		const exists =
			await this.telegramRepository.findByTelegramId(telegramId);

		if (exists && exists.phone) {
			return this.tokenService.generate(exists.id);
		}
		this.usersClient.create({ id: exists.id }).subscribe();

		const sessionId = randomBytes(16).toString("hex");

		await this.redisService.set(
			`telegram_session:${sessionId}`,
			JSON.stringify({ telegramId, username: data.query.username }),
			"EX",
			300,
		);

		return { url: `https://t.me/${this.BOT_USERNAME}?start=${sessionId}` };
	}

	public async complete(data: TelegramCompleteRequest) {
		const { sessionId, phone } = data;

		const raw = await this.redisService.get(
			`telegram_session:${sessionId}`,
		);

		if (!raw) {
			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				details: "Session not found",
			});
		}

		const { telegramId } = JSON.parse(raw) as TelegramSession;
		let user = await this.userRepository.findByPhone(phone);

		if (!user) {
			user = await this.userRepository.create({ phone });
		}

		await this.userRepository.update(user.id, {
			telegramId,
			isPhoneVerified: true,
		});

		const tokens = this.tokenService.generate(user.id);

		await this.redisService.set(
			`telegram_tokens:${sessionId}`,
			JSON.stringify(tokens),
			"EX",
			120,
		);
		await this.redisService.del(`telegram_session:${sessionId}`);

		return { sessionId };
	}

	public async consumeSession(data: TelegramConsumeRequest) {
		const { sessionId } = data;

		const raw = await this.redisService.get(`telegram_tokens:${sessionId}`);

		if (!raw) {
			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				details: "Session not found",
			});
		}

		const tokens = JSON.parse(raw) as TelegramTokens;

		await this.redisService.del(`telegram_tokens:${sessionId}`);

		return tokens;
	}

	private checkTelegramAuth(query: Record<string, string>) {
		const hash = query.hash;

		if (!hash) {
			return false;
		}

		const dataCheckArr = Object.keys(query)
			.filter(k => k !== "hash")
			.sort()
			.map(k => `${k}=${query[k]}`);

		const dataCheckString = dataCheckArr.join("\n");

		const secretKey = createHash("sha256")
			.update(`${this.BOT_ID}:${this.BOT_TOKEN}`)
			.digest();

		const hmac = createHmac("sha256", secretKey)
			.update(dataCheckString)
			.digest("hex");

		const isValid = hmac === hash;

		return isValid;
	}
}
