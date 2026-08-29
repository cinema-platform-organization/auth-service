import { PROTO_PATHS } from "@cinema-platform/contracts";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";

import type { AllConfigs } from "@/config";

import { UsersClientGrpc } from "./users.grpc";

@Module({
	imports: [
		ClientsModule.registerAsync([
			{
				name: "USERS_PACKAGE",
				useFactory: (configService: ConfigService<AllConfigs>) => ({
					transport: Transport.GRPC,
					options: {
						package: "users.v1",
						protoPath: PROTO_PATHS.USERS,
						url: configService.getOrThrow<string>(
							"grpc.clients.users",
							{ infer: true },
						),
					},
				}),
				inject: [ConfigService],
			},
		]),
	],
	providers: [UsersClientGrpc],
	exports: [UsersClientGrpc],
})
export class UsersModule {}
