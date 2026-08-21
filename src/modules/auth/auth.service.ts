import type { SendOtpRequest } from "@cinema-platform/contracts/gen/auth";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AuthService {
	public async sendOtp(data: SendOtpRequest) {}
}
