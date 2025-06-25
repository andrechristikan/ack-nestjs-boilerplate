import { Injectable, Logger } from '@nestjs/common';
import { TermsPolicyAcceptanceService } from './terms-policy-acceptance.service';
import { TermsPolicyService } from './terms-policy.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { IDatabaseCreateOptions } from '@common/database/interfaces/database.interface';
import { ENUM_TERMS_POLICY_TYPE } from '@modules/terms-policy/enums/terms-policy.enum';

/**
 * Service for handling policy acceptance interactions for users
 */
@Injectable()
export class TermsPolicyUserService {
    private readonly logger = new Logger(TermsPolicyUserService.name);

    constructor(
        private readonly termsPolicyAcceptanceService: TermsPolicyAcceptanceService,
        private readonly termsPolicyService: TermsPolicyService,
        private readonly helperDateService: HelperDateService
    ) {}

    async createAcceptances(
        userId: string,
        policyTypes: ENUM_TERMS_POLICY_TYPE[],
        language: ENUM_MESSAGE_LANGUAGE,
        options?: IDatabaseCreateOptions
    ): Promise<void> {
        try {
            if (policyTypes.length === 0) {
                return; // No consents to process
            }

            // Fetch all required policies in a single database query
            const latestPolicies =
                await this.termsPolicyService.findAllLatestPublishedByTypes(
                    policyTypes,
                    language
                );

            // Get policy IDs to accept
            const policyIds = [];
            for (const policyType of policyTypes) {
                const policy = latestPolicies.get(policyType);

                if (!policy) {
                    this.logger.warn(
                        `No policy found for type ${policyType} and language ${language}`
                    );
                    continue;
                }

                policyIds.push(policy.id);
            }

            // Create all acceptance records in one batch operation
            if (policyIds.length > 0) {
                const now = this.helperDateService.create();
                await this.termsPolicyAcceptanceService.createMany(
                    userId,
                    policyIds,
                    now,
                    options
                );
            }
        } catch (error) {
            this.logger.error('Error processing policy acceptances', { error });
            throw error;
        }
    }
}
