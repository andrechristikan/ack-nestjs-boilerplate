import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    ExecutionContext,
    InternalServerErrorException,
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { PolicyAuthorizeMetaKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityGuard } from '@modules/policy/guards/policy.ability.guard';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import {
    IPolicyAbilityRule,
    IPolicyRequirement,
    IPolicyRule,
} from '@modules/policy/interfaces/policy.interface';
import { EnumPolicyMatch } from '@modules/policy/enums/policy.enum';

type AuthorizeInput = IPolicyRule | IPolicyRequirement;
type PolicyRuleArgs = [IPolicyRule, ...IPolicyRule[]];
type PolicyRequirementArgs = [IPolicyRequirement, ...IPolicyRequirement[]];

function isRequirement(input: AuthorizeInput): input is IPolicyRequirement {
    return 'rules' in input && Array.isArray((input as IPolicyRequirement).rules);
}

/**
 * Route-level decorator that attaches CASL authorization requirements and
 * activates `PolicyAbilityGuard` for the decorated handler or controller.
 *
 * **Shorthand usage** — pass plain `IPolicyRule` objects.  All rules are
 * combined into a single requirement evaluated with `match: all` (the user
 * must satisfy every rule):
 *
 * ```ts
 * @PolicyAbilityProtected(
 *   { subject: EnumPolicySubject.user, action: [EnumPolicyAction.read] },
 * )
 * ```
 *
 * **Full requirement usage** — pass `IPolicyRequirement` objects to control
 * the match mode per requirement group:
 *
 * ```ts
 * @PolicyAbilityProtected(
 *   {
 *     match: EnumPolicyMatch.any,
 *     rules: [
 *       { subject: EnumPolicySubject.user, action: [EnumPolicyAction.read] },
 *       { subject: EnumPolicySubject.role, action: [EnumPolicyAction.read] },
 *     ],
 *   },
 * )
 * ```
 *
 * When inputs are mixed (some are rules, some are requirements) the shorthand
 * is considered invalid and this decorator throws immediately.
 */
export function PolicyAbilityProtected(
    ...inputs: PolicyRuleArgs
): MethodDecorator & ClassDecorator;
export function PolicyAbilityProtected(
    ...inputs: PolicyRequirementArgs
): MethodDecorator & ClassDecorator;
export function PolicyAbilityProtected(
    ...inputs: [AuthorizeInput, ...AuthorizeInput[]]
): MethodDecorator & ClassDecorator {
    const requirementCount = inputs.filter(isRequirement).length;

    if (requirementCount > 0 && requirementCount < inputs.length) {
        throw new InternalServerErrorException({
            statusCode: EnumPolicyStatusCodeError.invalidConfiguration,
            message: 'policy.error.invalidConfiguration',
            errors: [
                {
                    detail: 'Do not mix IPolicyRule and IPolicyRequirement in PolicyAbilityProtected.',
                },
            ],
        });
    }

    const requirements: IPolicyRequirement[] =
        requirementCount > 0
            ? (inputs as PolicyRequirementArgs).map(requirement => ({
                  ...requirement,
                  rules: requirement.rules ?? [],
                  match: requirement.match ?? EnumPolicyMatch.all,
              }))
            : [
                  {
                      rules: inputs as PolicyRuleArgs,
                      match: EnumPolicyMatch.all,
                  },
              ];

    return applyDecorators(
        UseGuards(PolicyAbilityGuard),
        SetMetadata(PolicyAuthorizeMetaKey, requirements)
    );
}

/**
 * Parameter decorator that injects the user's compiled `PrismaAbility` into a controller method.
 *
 * Requires `@PolicyAbilityProtected` (or any decorator that activates `PolicyAbilityGuard`)
 * to have run first.
 *
 * @throws {InternalServerErrorException} When the ability guard has not run for the route.
 *
 * ```ts
 * @Get()
 * @PolicyAbilityProtected({ subject: EnumPolicySubject.activityLog, action: [EnumPolicyAction.read] })
 * async list(@PolicyAbilityCurrent() ability: IPolicyAbilityRule) {
 *   return this.service.findAll(accessibleBy(ability).ActivityLog);
 * }
 * ```
 */
export const PolicyAbilityCurrent = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): IPolicyAbilityRule => {
        const { __policyAbilities } = ctx.switchToHttp().getRequest<IRequestApp>();
        if (__policyAbilities == null) {
            throw new InternalServerErrorException({
                statusCode: EnumPolicyStatusCodeError.invalidConfiguration,
                message: 'policy.error.invalidConfiguration',
            });
        }

        return __policyAbilities;
    }
);
