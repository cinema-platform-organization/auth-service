import { RpcStatus } from "@cinema-platform/common";
import type {
	CreateUserRequest,
	UsersServiceClient,
} from "@cinema-platform/contracts/gen/ts/users";
import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { RpcException } from "@nestjs/microservices";
import { PinoLogger } from "nestjs-pino";
import { lastValueFrom } from "rxjs";

@Injectable()
export class UsersClientGrpc implements OnModuleInit {
	private usersService!: UsersServiceClient;

	public constructor(
		private readonly logger: PinoLogger,
		@Inject("USERS_PACKAGE") private readonly client: ClientGrpc,
	) {
		this.logger.setContext(UsersClientGrpc.name);
	}

	public onModuleInit() {
		this.usersService =
			this.client.getService<UsersServiceClient>("UsersService");
	}

	public async create(request: CreateUserRequest) {
		try {
			return await lastValueFrom(this.usersService.createUser(request));
		} catch (error) {
			if (error instanceof RpcException) {
				throw error;
			}

			this.logger.error("Failed to create user profile:", error);
			throw new RpcException({
				code: RpcStatus.INTERNAL,
				details: "Failed to create user profile",
			});
		}
	}
}
