import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    ITermsPolicyOptions,
    TERMS_POLICY_OPTIONS_META_KEY,
    TERMS_POLICY_TYPE_META_KEY,
} from '../decorators/terms-policy.decorator';
import { TermsPolicyAcceptanceService } from '../services/terms-policy-acceptance.service';
import { ENUM_TERMS_POLICY_TYPE } from '@modules/terms-policy/enums/terms-policy.enum';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ENUM_TERMS_POLICY_STATUS_CODE_ERROR } from '@modules/terms-policy/enums/terms-policy.status-code.enum';
import { TermsPolicyDoc } from '@modules/terms-policy/repository/entities/terms-policy.entity';
import { TermsPolicyService } from '../services/terms-policy.service';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';

@Injectable()
export class TermsPolicyAcceptedGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly termsPolicyAcceptanceService: TermsPolicyAcceptanceService,
        private readonly termsPolicyService: TermsPolicyService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const policyType = this.reflector.get<ENUM_TERMS_POLICY_TYPE>(
            TERMS_POLICY_TYPE_META_KEY,
            context.getHandler()
        );

        if (!policyType) {
            return true;
        }

        const options = this.reflector.get<ITermsPolicyOptions>(
            TERMS_POLICY_OPTIONS_META_KEY,
            context.getHandler()
        ) || { requireLatestVersion: true, respondWithPolicyDetails: true };

        const request = context.switchToHttp().getRequest<IRequestApp>();
        const user = request.user;
        const language = request.__language;
        const country = request.__country;

        // Include the language when retrieving the latest policy
        const latestPolicy = await this.termsPolicyService.findOne({
            type: policyType,
            language: language,
            country: country,
        });

        if (!latestPolicy) {
            throw new BadRequestException({
                statusCode: ENUM_TERMS_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'terms-policy.error.notFound',
            });
        }

        // Did the user accepted any version of this terms type?
        const userAcceptedPolicy =
            await this.termsPolicyAcceptanceService.findOneByUser(
                user.sub,
                latestPolicy.type,
                country,
                ENUM_MESSAGE_LANGUAGE[language]
            );

        if (!userAcceptedPolicy) {
            return this.handleFailure(options, latestPolicy);
        }

        if (options.requireLatestVersion) {
            const isLatestVersion =
                userAcceptedPolicy.version >= latestPolicy.version;

            if (!isLatestVersion) {
                return this.handleFailure(options, latestPolicy);
            }
        }

        return true;
    }

    private handleFailure(
        options: ITermsPolicyOptions,
        policy: TermsPolicyDoc
    ): boolean {
        if (options.respondWithPolicyDetails) {
            throw new ForbiddenException({
                statusCode: ENUM_TERMS_POLICY_STATUS_CODE_ERROR.NOT_ACCEPTED,
                message: 'terms-policy.error.notAccepted',
                _metadata: {
                    customProperty: {
                        messageProperties: {
                            property: policy.type,
                        },
                    },
                    policyDetails: {
                        id: policy.id,
                        type: policy.type,
                        version: policy.version,
                        country: policy.country,
                        language: policy.language
                    },
                },
            });
        } else {
            // Generic error without policy details
            throw new ForbiddenException({
                statusCode: ENUM_TERMS_POLICY_STATUS_CODE_ERROR.NOT_ACCEPTED,
                message: 'terms-policy.error.notAccepted',
            });
        }
    }
}
