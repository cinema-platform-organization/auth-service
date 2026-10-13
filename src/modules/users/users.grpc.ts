import { toRpcException } from "@cinema-platform/common";
import type {
	CreateUserRequest,
	UsersServiceClient,
} from "@cinema-platform/contracts/gen/ts/users";
import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";

@Injectable()
export class UsersClientGrpc implements OnModuleInit {
	private readonly logger = new Logger(UsersClientGrpc.name);

	private usersService!: UsersServiceClient;

	public constructor(
		@Inject("USERS_PACKAGE") private readonly client: ClientGrpc,
	) {}

	public onModuleInit() {
		this.usersService =
			this.client.getService<UsersServiceClient>("UsersService");
	}

	public async create(request: CreateUserRequest) {
		try {
			return await lastValueFrom(this.usersService.createUser(request));
		} catch (error) {
			this.logger.error(
				{ err: error as Error, userId: request.id },
				"Failed to create user profile",
			);
			throw toRpcException(error, "Failed to create user profile");
		}
	}
}
