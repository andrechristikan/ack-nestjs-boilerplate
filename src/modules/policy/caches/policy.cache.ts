import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperStringService } from '@common/helper/services/helper.string.service';

@Injectable()
export class PolicyCache {
    private readonly keyPattern: string;
    readonly cacheTtlInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService
    ) {
        this.keyPattern = this.configService.get<string>('policy.keyPattern')!;
        this.cacheTtlInMs = this.configService.get<number>(
            'policy.cacheTtlInMs'
        )!;
    }

    buildPolicyRulesKey(roleId: string, policyRevision: number): string {
        return this.helperStringService.fillPattern(this.keyPattern, {
            roleId,
            policyRevision: String(policyRevision),
        });
    }
}
