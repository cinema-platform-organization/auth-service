// sort-imports-ignore
import "./observability/tracing";

import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module";
import { createGrpcServer } from "./infrastructure/grpc/grpc.server";

async function bootstrap() {
	const app = await NestFactory.create(AppModule, { bufferLogs: true });

	app.useLogger(app.get(Logger));

	const config = app.get(ConfigService);

	createGrpcServer(app, config);

	await app.startAllMicroservices();
	await app.listen(9101);
}
bootstrap();
