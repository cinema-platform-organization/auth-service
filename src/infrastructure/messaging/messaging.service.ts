import type {
	EmailChangedEvent,
	OtpRequestedEvent,
	PhoneChangedEvent,
} from "@cinema-platform/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { PinoLogger } from "nestjs-pino";

@Injectable()
export class MessagingService {
	public constructor(
		private readonly logger: PinoLogger,
		@Inject("NOTIFICATIONS_CLIENT") private readonly client: ClientProxy,
	) {
		this.logger.setContext(MessagingService.name);
	}

	public async otpRequested(data: OtpRequestedEvent) {
		this.client.emit("auth.otp.requested", data).subscribe({
			error: error => {
				this.logger.error(
					"Failed to emit auth.otp.requested event:",
					error,
				);
			},
		});
	}

	public async emailChanged(data: EmailChangedEvent) {
		this.client.emit("account.email.changed", data).subscribe({
			error: error => {
				this.logger.error(
					"Failed to emit account.email.changed event:",
					error,
				);
			},
		});
	}

	public async phoneChanged(data: PhoneChangedEvent) {
		this.client.emit("account.phone.changed", data).subscribe({
			error: error => {
				this.logger.error(
					"Failed to emit account.phone.changed event:",
					error,
				);
			},
		});
	}
}
