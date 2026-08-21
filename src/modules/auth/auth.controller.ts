import type {
	SendOtpRequest,
	SendOtpResponse,
} from "@cinema-platform/contracts/gen/auth";
import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";

import { AuthService } from "./auth.service";

@Controller()
export class AuthController {
	public constructor(private readonly authService: AuthService) {}

	@GrpcMethod("AuthService", "SendOtp")
	public async sendOtp(data: SendOtpRequest): Promise<SendOtpResponse> {
		return { ok: true };
	}
}
