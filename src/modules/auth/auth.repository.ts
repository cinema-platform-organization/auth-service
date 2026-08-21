import { Account } from "@generated/client";
import { AccountCreateInput } from "@generated/models";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/infrastructure/prisma/prisma.service";

@Injectable()
export class AuthRepository {
	public constructor(private readonly prismaService: PrismaService) {}

	public async findByPhone(phone: string): Promise<Account | null> {
		return await this.prismaService.account.findUnique({
			where: {
				phone,
			},
		});
	}

	public async findByEmail(email: string): Promise<Account | null> {
		return await this.prismaService.account.findUnique({
			where: {
				email,
			},
		});
	}

	public async create(data: AccountCreateInput): Promise<Account> {
		return await this.prismaService.account.create({
			data,
		});
	}
}
