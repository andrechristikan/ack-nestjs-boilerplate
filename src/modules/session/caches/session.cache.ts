import { HelperStringService } from '@common/helper/services/helper.string.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SessionCache {
    private readonly loginKeyPattern: string;
    readonly loginTtlInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService
    ) {
        this.loginKeyPattern =
            this.configService.get<string>('session.keyPattern')!;
        this.loginTtlInMs = this.configService.get<number>(
            'session.loginCacheTtlInMs'
        )!;
    }

    buildLoginKey(userId: string, sessionId: string): string {
        return this.helperStringService.fillPattern(this.loginKeyPattern, {
            userId,
            sessionId,
        });
    }
}
