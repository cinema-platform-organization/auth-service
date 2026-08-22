import type { DatabaseConfig } from "./database.interface";
import type { GrpcConfig } from "./grpc.interface";
import { RedisConfig } from "./redis.interface";

export interface AllConfigs {
	grpc: GrpcConfig;
	database: DatabaseConfig;
	redis: RedisConfig;
}
