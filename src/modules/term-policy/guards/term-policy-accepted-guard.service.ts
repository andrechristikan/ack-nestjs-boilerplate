import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TermPolicyAcceptanceService } from '../services/term-policy-acceptance.service';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { ENUM_TERM_POLICY_STATUS_CODE_ERROR } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyDoc } from '@modules/term-policy/repository/entities/term-policy.entity';
import { TermPolicyService } from '../services/term-policy.service';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import {
    TERM_POLICY_OPTIONS_META_KEY,
    TERM_POLICY_TYPE_META_KEY,
} from '../constants/term-policy.constant';
import { ITermPolicyOptions } from '../decorators/term-policy.decorator';

@Injectable()
export class TermPolicyAcceptedGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly termPolicyService: TermPolicyService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const policyType = this.reflector.get<ENUM_TERM_POLICY_TYPE>(
            TERM_POLICY_TYPE_META_KEY,
            context.getHandler()
        );

        if (!policyType) {
            return true;
        }

        const options = this.reflector.get<ITermPolicyOptions>(
            TERM_POLICY_OPTIONS_META_KEY,
            context.getHandler()
        ) || { requireLatestVersion: true, respondWithPolicyDetails: true };

        const request = context.switchToHttp().getRequest<IRequestApp>();
        const user = request.user;
        const language = request.__language;
        const country = request.__country;

        const latestPolicy = await this.termPolicyService.findOne({
            type: policyType,
            language: language,
            country: country,
            latest: true,
            published: true,
        });

        if (!latestPolicy) {
            throw new BadRequestException({
                statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'termPolicy.error.notFound',
            });
        }

        // Did the user accept any version of this terms type?
        const userAcceptedPolicy =
            await this.termPolicyAcceptanceService.findOneByUser(
                user.sub,
                latestPolicy.type,
                country,
                ENUM_MESSAGE_LANGUAGE[language]
            );

        if (!userAcceptedPolicy) {
            // User never accepted this term-policy
            this.throwPolicyError(
                ENUM_TERM_POLICY_STATUS_CODE_ERROR.NOT_ACCEPTED,
                'termPolicy.error.notAccepted',
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
                ENUM_TERM_POLICY_STATUS_CODE_ERROR.REQUIRE_ACCEPT_NEW_VERSION,
                'termPolicy.error.newerVersionExist',
                options,
                latestPolicy,
                userAcceptedPolicy.version
            );
        }

        return true;
    }

    private throwPolicyError(
        statusCode: ENUM_TERM_POLICY_STATUS_CODE_ERROR,
        message: string,
        options: ITermPolicyOptions,
        policy: TermPolicyDoc,
        currentAcceptedVersion?: number
    ): void {
        const newerVersionAvailable =
            statusCode ===
            ENUM_TERM_POLICY_STATUS_CODE_ERROR.REQUIRE_ACCEPT_NEW_VERSION;

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
