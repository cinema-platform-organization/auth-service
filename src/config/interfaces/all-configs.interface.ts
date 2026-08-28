import type { DatabaseConfig } from "./database.interface";
import type { GrpcConfig } from "./grpc.interface";
import type { PassportConfig } from "./passport.interface";
import type { RedisConfig } from "./redis.interface";
import type { TelegramConfig } from "./telegram.interface";

export interface AllConfigs {
	grpc: GrpcConfig;
	database: DatabaseConfig;
	redis: RedisConfig;
	passport: PassportConfig;
	telegram: TelegramConfig;
}
