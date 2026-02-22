import { IRequestApp } from '@common/request/interfaces/request.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumPolicyMatch } from '@modules/policy/enums/policy.enum';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import {
    IPolicyAbilityInput,
    IPolicyRequirement,
    PolicyAbility,
} from '@modules/policy/interfaces/policy.interface';
import { IPolicyService } from '@modules/policy/interfaces/policy.service.interface';
import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class PolicyService implements IPolicyService {
    constructor(
        private readonly policyAbilityFactory: PolicyAbilityFactory
    ) {}

    /**
     * Returns the compiled ability for the request user, building and caching it on first call.
     *
     * @throws {ForbiddenException} When the request is not authenticated.
     */
    getOrCreateRequestAbility(request: IRequestApp): PolicyAbility {
        const { __user, user } = request;
        if (__user == null || user == null) {
            throw new ForbiddenException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        if (request.__policyAbilities) {
            return request.__policyAbilities;
        }

        const abilities = (request.__abilities ??
            request.__user.role.abilities) as IPolicyAbilityInput[];
        const userAbilities = this.policyAbilityFactory.createForUser(abilities, {
            userId: __user.id,
        });
        request.__policyAbilities = userAbilities;

        return userAbilities;
    }

    /**
     * Validates that the authenticated user satisfies all policy requirements for the route.
     *
     * @throws {InternalServerErrorException} When `requirements` is empty or any requirement has no rules.
     * @throws {ForbiddenException} When the user's ability does not satisfy one or more requirements.
     */
    validatePolicyGuard(
        request: IRequestApp,
        requirements: IPolicyRequirement[]
    ): boolean {
        if (
            requirements.length === 0 ||
            requirements.some(r => r.rules == null || r.rules.length === 0)
        ) {
            throw new InternalServerErrorException({
                statusCode: EnumPolicyStatusCodeError.predefinedNotFound,
                message: 'policy.error.predefinedNotFound',
            });
        }

        const userAbilities = this.getOrCreateRequestAbility(request);

        const failedSubjects: string[] = [];

        const isAllowed = requirements.every(requirement => {
            const mode = requirement.match ?? EnumPolicyMatch.all;

            const passed =
                mode === EnumPolicyMatch.any
                    ? requirement.rules.some(r =>
                          this.policyAbilityFactory.evaluateRule(userAbilities, r)
                      )
                    : requirement.rules.every(r =>
                          this.policyAbilityFactory.evaluateRule(userAbilities, r)
                      );

            if (passed === false) {
                const subjects = [...new Set(requirement.rules.map(r => r.subject))];
                const actions = [...new Set(requirement.rules.flatMap(r => r.action))];
                failedSubjects.push(`${subjects.join(',')}:[${actions.join(',')}]`);
            }

            return passed;
        });

        if (!isAllowed) {
            throw new ForbiddenException({
                statusCode: EnumPolicyStatusCodeError.forbidden,
                message: 'policy.error.forbidden',
                errors: failedSubjects.map(detail => ({
                    requirement: detail,
                })),
            });
        }

        return true;
    }
}
