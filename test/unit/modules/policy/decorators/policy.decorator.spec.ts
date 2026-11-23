import { HttpStatus } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { getParamDecoratorFactory } from '@test/unit/helpers/test.unit.decorator.helper';
import { buildPolicyAbility } from '@test/unit/helpers/test.unit.policy.helper';
import { expectRequestContextMissingWithKey } from '@test/unit/helpers/test.unit.request.helper';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext, Type } from '@nestjs/common';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import {
    PolicyContextStoreKey,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';
import {
    PolicyAbilityProtected,
    PolicyContext,
    PolicyProtected,
} from '@modules/policy/decorators/policy.decorator';
import { PolicyAbilityGuard } from '@modules/policy/guards/policy.ability.guard';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import { PolicyProtectedActionEmptyException } from '@modules/policy/exceptions/policy.protected-action-empty.exception';
import { PolicyProtectedEmptyException } from '@modules/policy/exceptions/policy.protected-empty.exception';

describe('policy.decorator', () => {
    describe('PolicyProtected', () => {
        it('mounts the ability guard, PolicyGuard, the required policies, and the policy error kit on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };
            const requiredPolicies = [
                {
                    subject: EnumPolicySubject.User,
                    action: [EnumPolicyAction.manage],
                },
            ];

            PolicyProtected(...requiredPolicies)(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([PolicyAbilityGuard, PolicyGuard]);
            expect(
                Reflect.getMetadata(PolicyRequiredMetaKey, descriptor.value)
            ).toEqual(requiredPolicies);
            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                {
                    httpStatus: HttpStatus.FORBIDDEN,
                    statusCode: EnumPolicyStatusCodeError.forbidden,
                    messagePath: 'policy.error.forbidden',
                },
                {
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    statusCode: EnumUserStatusCodeError.guardMissing,
                    messagePath: 'user.error.guardMissing',
                },
                {
                    httpStatus: HttpStatus.FORBIDDEN,
                    statusCode: EnumPolicyStatusCodeError.guardMissing,
                    messagePath: 'policy.error.guardMissing',
                },
            ]);
        });

        it('throws at evaluation when no policy is given', () => {
            expect(() => PolicyProtected()).toThrow(
                PolicyProtectedEmptyException
            );
        });

        it('throws at evaluation when a policy names no action', () => {
            expect(() =>
                PolicyProtected({
                    subject: EnumPolicySubject.User,
                    action: [],
                })
            ).toThrow(PolicyProtectedActionEmptyException);
        });
    });

    describe('PolicyAbilityProtected', () => {
        it('applies PolicyAbilityGuard alone', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            PolicyAbilityProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([PolicyAbilityGuard]);
            expect(
                Reflect.getMetadata(PolicyRequiredMetaKey, descriptor.value)
            ).toBeUndefined();
        });
    });

    describe('PolicyContext', () => {
        const policyContext = { ability: buildPolicyAbility([]) };
        const clsService: MockProxy<
            ReturnType<typeof ClsServiceManager.getClsService>
        > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();
        const target = {} as Type<unknown>;
        PolicyContext()(target, 'policyContext', 0);
        const factory = getParamDecoratorFactory(target, 'policyContext');

        beforeEach(() => {
            vi.resetAllMocks();
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
                clsService
            );
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('throws RequestContextMissingException naming the key when the store holds none', () => {
            clsService.get.mockReturnValue(undefined);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(thrown, PolicyContextStoreKey);
        });

        it('returns the stored policy context', () => {
            clsService.get.mockReturnValue(policyContext);

            expect(factory(undefined, executionContext)).toBe(policyContext);
            expect(clsService.get).toHaveBeenCalledWith(PolicyContextStoreKey);
        });
    });
});
