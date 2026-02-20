import { IRequestApp } from '@common/request/interfaces/request.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { EnumPolicyMatch } from '@modules/policy/enums/policy.enum';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import {
    IPolicyAbilityInput,
    IPolicyAbilityRule,
    IPolicyRequirement,
    IPolicyRule,
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
     * Asserts that the request carries a fully authenticated user.
     *
     * Throws a 403 `ForbiddenException` with the `jwtAccessTokenInvalid` status
     * code when either `request.__user` or `request.user` is absent, indicating
     * the JWT guard did not populate the request correctly.
     *
     * @param request - The current HTTP request enriched by the auth middleware.
     * @throws {ForbiddenException} When the request lacks a resolved user.
     */
    private validateAuthenticatedContext(request: IRequestApp): void {
        const { __user, user } = request;
        if (!__user || !user) {
            throw new ForbiddenException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }
    }

    /**
     * Returns the user's compiled `PrismaAbility` for the current request, building
     * and caching it on first access.
     *
     * On the first call the ability is constructed from `request.__abilities` (when
     * present) or from the role abilities stored on `request.__user.role.abilities`,
     * with condition placeholders resolved against `{ userId }`.  The result is
     * stored on `request.__policyAbilities` so subsequent calls within the same
     * request lifecycle are free.
     *
     * @param request - The current authenticated HTTP request.
     * @returns The user's compiled ability object.
     * @throws {ForbiddenException} When the request is not authenticated (delegated
     *   to {@link validateAuthenticatedContext}).
     */
    getOrCreateRequestAbility(request: IRequestApp): IPolicyAbilityRule {
        this.validateAuthenticatedContext(request);

        const existingAbility = request.__policyAbilities;
        if (existingAbility) {
            return existingAbility;
        }

        const abilities = request.__abilities
            ? request.__abilities
            : ((request.__user?.role.abilities ?? []) as IPolicyAbilityInput[]);
        const userAbilities = this.policyAbilityFactory.createForUser(abilities, {
            userId: request.__user.id,
        });
        request.__policyAbilities = userAbilities;

        return userAbilities;
    }

    /**
     * Validates that the authenticated user satisfies all policy requirements
     * declared on the current route.
     *
     * Auth validation and ability resolution are delegated to
     * {@link getOrCreateRequestAbility}, which ensures the user is authenticated
     * and that the ability is built (or retrieved from cache) exactly once per
     * request.
     *
     * @param request - The current authenticated HTTP request.
     * @param requirements - The policy requirements attached to the route via
     *   `@PolicyAbilityProtected`.  Must be non-empty and each requirement must
     *   contain at least one rule.
     * @returns `true` when the user satisfies every requirement.
     * @throws {InternalServerErrorException} When `requirements` is empty or any
     *   requirement has no rules (misconfigured decorator).
     * @throws {ForbiddenException} When the user's ability does not satisfy one or
     *   more requirements.
     */
    async validatePolicyGuard(
        request: IRequestApp,
        requirements: IPolicyRequirement[]
    ): Promise<boolean> {
        // Auth validation and ability construction are handled by the delegate.
        const userAbilities = this.getOrCreateRequestAbility(request);

        if (requirements.length === 0) {
            throw new InternalServerErrorException({
                statusCode: EnumPolicyStatusCodeError.predefinedNotFound,
                message: 'policy.error.predefinedNotFound',
            });
        }

        if (requirements.some(requirement => !requirement.rules?.length)) {
            throw new InternalServerErrorException({
                statusCode: EnumPolicyStatusCodeError.predefinedNotFound,
                message: 'policy.error.predefinedNotFound',
            });
        }

        const failedSubjects: string[] = [];

        const isAllowed = requirements.every(requirement => {
            const mode = requirement.match ?? EnumPolicyMatch.all;

            const evaluator = (rule: IPolicyRule): boolean =>
                this.policyAbilityFactory.evaluateRule(userAbilities, rule);

            const passed =
                mode === EnumPolicyMatch.any
                    ? requirement.rules.some(evaluator)
                    : requirement.rules.every(evaluator);

            if (!passed) {
                const subjects = [
                    ...new Set(requirement.rules.map(r => r.subject)),
                ];
                const actions = [
                    ...new Set(requirement.rules.flatMap(r => r.action)),
                ];
                failedSubjects.push(
                    `${subjects.join(',')}:[${actions.join(',')}]`
                );
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
