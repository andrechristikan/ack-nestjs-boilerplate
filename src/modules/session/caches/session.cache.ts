import { HelperStringService } from '@common/helper/services/helper.string.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SessionCache {
    private readonly keyPattern: string;
    readonly loginCacheTtlInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService
    ) {
        this.keyPattern = this.configService.get<string>('session.keyPattern')!;
        this.loginCacheTtlInMs = this.configService.get<number>(
            'session.loginCacheTtlInMs'
        )!;
    }

    buildLoginKey(userId: string, sessionId: string): string {
        return this.helperStringService.fillPattern(this.keyPattern, {
            userId,
            sessionId,
        });
    }
}
