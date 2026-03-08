import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    EnumPolicyAction,
    EnumPolicyMatch,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import {
    IPolicyRequirement,
    PolicyAbility,
} from '@modules/policy/interfaces/policy.interface';
import { IPolicyService } from '@modules/policy/interfaces/policy.service.interface';
import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';

@Injectable()
export class PolicyService implements IPolicyService {
    private readonly logger = new Logger(PolicyService.name);

    constructor(
        private readonly policyAbilityFactory: PolicyAbilityFactory
    ) {}

    /**
     * Compiles a CASL ability for the request user from their stored role abilities.
     *
     * @throws {ForbiddenException} When the request is not authenticated.
     */
    buildAbility(request: IRequestApp): PolicyAbility {
        if (request.__abilities) {
            return request.__abilities;
        }

        const { __user, user } = request;
        if (!__user || !user) {
            throw new InternalServerErrorException({
                statusCode: EnumPolicyStatusCodeError.invalidConfiguration,
                message: 'policy.error.invalidConfiguration',
            });
        }

        const abilities = this.policyAbilityFactory.parseAbilities(__user.role.abilities);
        return this.policyAbilityFactory.createForUser(abilities, { userId: __user.id });
    }

    /**
     * Validates that the authenticated user satisfies all policy requirements for the route.
     *
     * @returns The compiled `PolicyAbility` for the request user.
     * @throws {InternalServerErrorException} When `requirements` is empty or any requirement has no rules.
     * @throws {ForbiddenException} When the user's ability does not satisfy one or more requirements.
     */
    validatePolicyGuard(
        request: IRequestApp,
        requirements: IPolicyRequirement[]
    ): PolicyAbility {
        if (
            requirements.length === 0 ||
            requirements.some(r => r.rules == null || r.rules.length === 0)
        ) {
            throw new InternalServerErrorException({
                statusCode: EnumPolicyStatusCodeError.predefinedNotFound,
                message: 'policy.error.predefinedNotFound',
            });
        }

        const userAbilities = this.buildAbility(request);

        const failedRequirements = requirements.filter(requirement => {
            const check = (requirement.match ?? EnumPolicyMatch.all) === EnumPolicyMatch.any ? 'some' : 'every';
            return !requirement.rules[check](r => this.policyAbilityFactory.evaluateRule(userAbilities, r));
        });

        if (failedRequirements.length > 0) {
            this.logger.warn({
                message: 'policy.error.forbidden',
                userId: request.__user?.id,
                failedRequirements: failedRequirements.map(req => ({
                    subjects: [...new Set(req.rules.map(r => r.subject))],
                    actions:  [...new Set(req.rules.flatMap(r => r.action))],
                })),
            });
            throw new ForbiddenException({
                statusCode: EnumPolicyStatusCodeError.forbidden,
                message: 'policy.error.forbidden',
            });
        }

        return userAbilities;
    }

    /**
     * Returns the fields the ability permits for the given action + subject.
     *
     * Delegates to `PolicyAbilityFactory.getPermittedFields`. Exposed here so
     * consumers only need to depend on `PolicyService`, not the factory directly.
     *
     * @returns `undefined` when all fields are permitted; `string[]` when field-level
     *   restrictions exist — callers should limit access to those fields only.
     */
    getPermittedFields(
        ability: PolicyAbility,
        action: EnumPolicyAction,
        subject: EnumPolicySubject
    ): string[] | undefined {
        return this.policyAbilityFactory.getPermittedFields(ability, action, subject);
    }
}
