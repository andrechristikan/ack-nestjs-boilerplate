import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HashService } from 'src/hash/hash.service';
import { Hash } from 'src/hash/hash.decorator';
import { ConfigService } from '@nestjs/config';
import { AUTH_JWT_SECRET_KEY } from './auth.constant';

@Injectable()
export class AuthService {
    constructor(
        @Hash() private readonly hashService: HashService,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService
    ) {}

    async createAccessToken(payload: Record<string, any>): Promise<string> {
        return this.jwtService.sign(payload);
    }

    async validateAccessToken(token: string): Promise<Record<string, any>> {
        // Env
        const authJwtTokenSecret =
            this.configService.get('app.auth.jwtSecretKey') ||
            AUTH_JWT_SECRET_KEY;
        return this.jwtService.verify(token, authJwtTokenSecret);
    }

    async createBasicToken(
        clientId: string,
        clientSecret: string
    ): Promise<string> {
        const token: string = `${clientId}:${clientSecret}`;
        return this.hashService.encryptBase64(token);
    }

    async validateBasicToken(
        clientBasicToken: string,
        ourBasicToken: string
    ): Promise<boolean> {
        if (ourBasicToken !== clientBasicToken) {
            return false;
        }
        return true;
    }

    async validateUser(
        passwordString: string,
        passwordHash: string
    ): Promise<boolean> {
        return this.hashService.bcryptComparePassword(
            passwordString,
            passwordHash
        );
    }
}
