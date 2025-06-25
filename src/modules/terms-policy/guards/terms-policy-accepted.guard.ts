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
        const country = 'UK';

        try {
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
                await this.termsPolicyAcceptanceService.findOneAcceptedByUser(
                    user.sub,
                    latestPolicy.type,
                    language
                );

            if (!userAcceptedPolicy) {
                return this.handleFailure(options, latestPolicy, policyType);
            }

            if (options.requireLatestVersion) {
                const isLatestVersion =
                    userAcceptedPolicy.policy.version >= latestPolicy.version;

                if (!isLatestVersion) {
                    return this.handleFailure(
                        options,
                        latestPolicy,
                        policyType
                    );
                }
            }
        } catch (error) {
            if (
                error instanceof BadRequestException ||
                error instanceof ForbiddenException
            ) {
                throw error;
            }

            // Handle unexpected errors
            throw new BadRequestException({
                statusCode: 'TERMS_POLICY.UNEXPECTED_ERROR',
                message: 'terms-policy.error.unexpectedError',
            });
        }

        return true;
    }

    private handleFailure(
        options: ITermsPolicyOptions,
        policy: TermsPolicyDoc,
        type: ENUM_TERMS_POLICY_TYPE
    ): boolean {
        if (options.respondWithPolicyDetails) {
            throw new ForbiddenException({
                statusCode: ENUM_TERMS_POLICY_STATUS_CODE_ERROR.NOT_ACCEPTED,
                message: 'terms-policy.error.notAccepted',
                _metadata: {
                    customProperty: {
                        messageProperties: {
                            property: type,
                        },
                    },
                    policyDetails: {
                        id: policy.id,
                        type: type,
                        version: policy.version,
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
