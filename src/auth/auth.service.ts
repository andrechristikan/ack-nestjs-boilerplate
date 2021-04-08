import { Injectable } from '@nestjs/common';
import { HashService } from 'src/hash/hash.service';
import { Hash } from 'src/hash/hash.decorator';

@Injectable()
export class AuthService {
    constructor(@Hash() private readonly hashService: HashService) {}

    async createAccessToken(payload: Record<string, any>): Promise<string> {
        return this.hashService.jwtSign(payload);
    }

    async validateAccessToken(
        token: string,
        payload?: boolean
    ): Promise<boolean | Record<string, any>> {
        const verify: boolean = await this.hashService.jwtVerify(token);
        if (!verify) {
            return verify;
        }

        if (payload) {
            return this.hashService.jwtPayload(token);
        }

        return verify;
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
