import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IAuthLoginIdentifiers } from '@modules/auth/interfaces/auth.interface';
import { HelperStringService } from '@common/helper/services/helper.string.service';

@Injectable()
export class AuthUtil {
    private readonly jtiLength: number;

    constructor(
        private readonly helperStringService: HelperStringService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly configService: ConfigService
    ) {
        this.jtiLength = this.configService.get<number>('auth.jwt.jtiLength')!;
    }

    generateJti(): string {
        return this.helperStringService.random(this.jtiLength);
    }

    createLoginIdentifiers(): IAuthLoginIdentifiers {
        const sessionId = this.databaseUtil.createId();
        const jti = this.generateJti();

        return { sessionId, jti };
    }
}
