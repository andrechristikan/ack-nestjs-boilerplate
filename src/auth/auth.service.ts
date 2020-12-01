import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(private jwtService: JwtService) {}

    async createAccessToken(payload: Record<string, any>): Promise<string> {
        return new Promise(resolve => {
            const accessToken = this.jwtService.sign(payload);
            resolve(accessToken);
        });
    }
}
