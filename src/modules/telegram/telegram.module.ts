import { Module } from "@nestjs/common";

import { UserRepository } from "@/shared/repositories";

import { TokenModule } from "../token/token.module";

import { TelegramController } from "./telegram.controller";
import { TelegramRepository } from "./telegram.repository";
import { TelegramService } from "./telegram.service";

@Module({
	imports: [TokenModule],
	controllers: [TelegramController],
	providers: [TelegramService, TelegramRepository, UserRepository],
})
export class TelegramModule {}
