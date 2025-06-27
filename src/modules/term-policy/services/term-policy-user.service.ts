import { Injectable, Logger } from '@nestjs/common';
import { TermPolicyAcceptanceService } from './term-policy-acceptance.service';
import { TermPolicyService } from './term-policy.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { IDatabaseCreateOptions } from '@common/database/interfaces/database.interface';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';

@Injectable()
export class TermPolicyUserService {
    private readonly logger = new Logger(TermPolicyUserService.name);

    constructor(
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly termPolicyService: TermPolicyService,
        private readonly helperDateService: HelperDateService
    ) {}

    async createAcceptances(
        userId: string,
        policyTypes: ENUM_TERM_POLICY_TYPE[],
        language: ENUM_MESSAGE_LANGUAGE,
        country: string,
        options?: IDatabaseCreateOptions
    ): Promise<void> {
        try {
            if (policyTypes.length === 0) {
                return; // No consents to process
            }

            const latestPolicies =
                await this.termPolicyService.findAllByFilters({
                    language,
                    country,
                    latest: true,
                    published: true,
                    type: { $in: policyTypes },
                });

            if (latestPolicies.length === 0) {
                this.logger.warn(
                    `No policies found for types [${policyTypes.join(
                        ', '
                    )}], language ${language}, country ${country}`
                );
                return;
            }

            const policyData = latestPolicies.map(policy => ({
                type: policy.type,
                country: policy.country,
                language: policy.language,
                version: policy.version,
            }));

            const now = this.helperDateService.create();
            await this.termPolicyAcceptanceService.createMany(
                userId,
                policyData,
                now,
                options
            );
        } catch (error) {
            this.logger.error('Error processing policy acceptances', error);
            throw error;
        }
    }
}
