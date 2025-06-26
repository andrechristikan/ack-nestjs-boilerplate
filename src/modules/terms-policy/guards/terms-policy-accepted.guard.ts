import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TermsPolicyAcceptanceService } from '../services/terms-policy-acceptance.service';
import { ENUM_TERMS_POLICY_TYPE } from '@modules/terms-policy/enums/terms-policy.enum';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ENUM_TERMS_POLICY_STATUS_CODE_ERROR } from '@modules/terms-policy/enums/terms-policy.status-code.enum';
import { TermsPolicyDoc } from '@modules/terms-policy/repository/entities/terms-policy.entity';
import { TermsPolicyService } from '../services/terms-policy.service';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import {
    TERMS_POLICY_OPTIONS_META_KEY,
    TERMS_POLICY_TYPE_META_KEY,
} from '../constants/terms-policy.constant';
import { ITermsPolicyOptions } from '../decorators/terms-policy.decorator';

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

        const latestPolicy = await this.termsPolicyService.findOne({
            type: policyType,
            language: language,
            country: country,
            latest: true,
            published: true,
        });

        if (!latestPolicy) {
            throw new BadRequestException({
                statusCode: ENUM_TERMS_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'terms-policy.error.notFound',
            });
        }

        // Did the user accept any version of this terms type?
        const userAcceptedPolicy =
            await this.termsPolicyAcceptanceService.findOneByUser(
                user.sub,
                latestPolicy.type,
                country,
                ENUM_MESSAGE_LANGUAGE[language]
            );

        if (!userAcceptedPolicy) {
            // User never accepted this term-policy
            this.throwPolicyError(
                ENUM_TERMS_POLICY_STATUS_CODE_ERROR.NOT_ACCEPTED,
                'terms-policy.error.notAccepted',
                options,
                latestPolicy
            );
        }

        if (
            options.requireLatestVersion &&
            userAcceptedPolicy.version !== latestPolicy.version
        ) {
            // User had accepted a older version of the term-policy
            this.throwPolicyError(
                ENUM_TERMS_POLICY_STATUS_CODE_ERROR.REQUIRE_ACCEPT_NEW_VERSION,
                'terms-policy.error.newerVersionExist',
                options,
                latestPolicy,
                userAcceptedPolicy.version
            );
        }

        return true;
    }

    private throwPolicyError(
        statusCode: ENUM_TERMS_POLICY_STATUS_CODE_ERROR,
        message: string,
        options: ITermsPolicyOptions,
        policy: TermsPolicyDoc,
        currentAcceptedVersion?: number
    ): void {
        const newerVersionAvailable =
            statusCode ===
            ENUM_TERMS_POLICY_STATUS_CODE_ERROR.REQUIRE_ACCEPT_NEW_VERSION;

        if (options.respondWithPolicyDetails) {
            const policyDetails: Record<string, any> = {
                id: policy.id,
                type: policy.type,
                version: policy.version,
                country: policy.country,
                language: policy.language,
            };

            if (newerVersionAvailable && currentAcceptedVersion !== undefined) {
                policyDetails.currentAcceptedVersion = currentAcceptedVersion;
            }

            throw new ForbiddenException({
                statusCode,
                message,
                _metadata: {
                    customProperty: {
                        messageProperties: {
                            property: policy.type,
                        },
                    },
                    policyDetails,
                },
            });
        } else {
            throw new ForbiddenException({
                statusCode,
                message,
            });
        }
    }
}
