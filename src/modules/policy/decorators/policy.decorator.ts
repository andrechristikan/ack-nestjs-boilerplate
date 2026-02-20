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
import {
    IPolicyAbilityRule,
    IPolicyRequirement,
    IPolicyRule,
} from '@modules/policy/interfaces/policy.interface';
import { EnumPolicyMatch } from '@modules/policy/enums/policy.enum';

type AuthorizeInput = IPolicyRule | IPolicyRequirement;

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
 *   { subject: EnumPolicySubject.User, action: [EnumPolicyAction.read] },
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
 *       { subject: EnumPolicySubject.User, action: [EnumPolicyAction.read] },
 *       { subject: EnumPolicySubject.Role, action: [EnumPolicyAction.read] },
 *     ],
 *   },
 * )
 * ```
 *
 * When inputs are mixed (some are rules, some are requirements) the shorthand
 * path is taken and all inputs are treated as plain rules with `match: all`.
 * Avoid mixing input shapes.
 */
export function PolicyAbilityProtected(
    ...inputs: [AuthorizeInput, ...AuthorizeInput[]]
): MethodDecorator & ClassDecorator {
    const useRequirementShape = inputs.every(input => isRequirement(input));
    const requirements: IPolicyRequirement[] = useRequirementShape
        ? (inputs as IPolicyRequirement[]).map(requirement => ({
              ...requirement,
              rules: requirement.rules ?? [],
              match: requirement.match ?? EnumPolicyMatch.all,
          }))
        : [
              {
                  rules: inputs as IPolicyRule[],
                  match: EnumPolicyMatch.all,
              },
          ];

    return applyDecorators(
        UseGuards(PolicyAbilityGuard),
        SetMetadata(PolicyAuthorizeMetaKey, requirements)
    );
}

/**
 * Parameter decorator that injects the user's compiled `PrismaAbility` from
 * the current request into a controller method parameter.
 *
 * The ability is built once per request by `PolicyAbilityGuard` (via
 * `PolicyService.getOrCreateRequestAbility`) and stored on
 * `request.__policyAbilities`.  This decorator simply reads that cached value
 * — it does **not** rebuild the ability.
 *
 * **Requires** `@PolicyAbilityProtected` (or any decorator that activates
 * `PolicyAbilityGuard`) to have run first.  Throws
 * `InternalServerErrorException` when the guard has not populated the cache.
 *
 * ```ts
 * @Get()
 * @PolicyAbilityProtected({ subject: EnumPolicySubject.ActivityLog, action: [EnumPolicyAction.read] })
 * async list(@PolicyAbilityCurrent() ability: IPolicyAbilityRule) {
 *   return this.service.findAll(accessibleBy(ability).ActivityLog);
 * }
 * ```
 */
export const PolicyAbilityCurrent = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): IPolicyAbilityRule => {
        const { __policyAbilities } = ctx.switchToHttp().getRequest<IRequestApp>();
        if (!__policyAbilities) {
            throw new InternalServerErrorException({
                message: 'policy.error.predefinedNotFound',
            });
        }

        return __policyAbilities;
    }
);
