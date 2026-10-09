import { GUARDS_METADATA } from '@nestjs/common/constants';
import { HttpStatus } from '@nestjs/common';
import type { ExecutionContext, Type } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { PolicyRequiredMetaKey } from '@modules/policy/constants/policy.constant';
import {
    PolicyCurrent,
    PolicyProtected,
} from '@modules/policy/decorators/policy.decorator';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import { getParamDecoratorFactory } from '@test/unit/helpers/test.unit.decorator.helper';
import { PolicyProtectedActionEmptyException } from '@modules/policy/exceptions/policy.protected-action-empty.exception';
import { PolicyProtectedEmptyException } from '@modules/policy/exceptions/policy.protected-empty.exception';

describe('policy.decorator', () => {
    describe('PolicyProtected', () => {
        it('mounts PolicyGuard, the required policies, and the policy error kit on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };
            const requiredPolicies = [
                {
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.manage],
                },
            ];

            PolicyProtected(...requiredPolicies)(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([PolicyGuard]);
            expect(
                Reflect.getMetadata(PolicyRequiredMetaKey, descriptor.value)
            ).toEqual(requiredPolicies);
            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                expect.objectContaining({
                    messagePath: 'policy.error.forbidden',
                }),
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
                    subject: EnumPolicySubject.user,
                    action: [],
                })
            ).toThrow(PolicyProtectedActionEmptyException);
        });
    });

    describe('PolicyCurrent', () => {
        const clsService: MockProxy<
            ReturnType<typeof ClsServiceManager.getClsService>
        > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();
        const forbidden = {
            module: 'policy',
            statusCode: EnumPolicyStatusCodeError.forbidden,
            statusCodeKey:
                EnumPolicyStatusCodeError[EnumPolicyStatusCodeError.forbidden],
            httpStatus: HttpStatus.FORBIDDEN,
            messagePath: 'policy.error.forbidden',
        };

        beforeEach(() => {
            vi.resetAllMocks();
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
                clsService
            );
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('throws PolicyForbiddenException when the policy store is undefined', () => {
            clsService.get.mockReturnValue(undefined);
            const target = {} as Type<unknown>;
            PolicyCurrent()(target, 'policies', 0);
            const factory = getParamDecoratorFactory(target, 'policies');

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(forbidden);
        });

        it('throws PolicyForbiddenException when the policy store is null', () => {
            clsService.get.mockReturnValue(null);
            const target = {} as Type<unknown>;
            PolicyCurrent()(target, 'policies', 0);
            const factory = getParamDecoratorFactory(target, 'policies');

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject(forbidden);
        });

        it('returns an empty policy list as a valid value', () => {
            clsService.get.mockReturnValue([]);
            const target = {} as Type<unknown>;
            PolicyCurrent()(target, 'policies', 0);
            const factory = getParamDecoratorFactory(target, 'policies');

            expect(factory(undefined, executionContext)).toEqual([]);
        });

        it('returns the resolved policies', () => {
            const policies: Policy[] = [
                {
                    id: 'policy-1',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    createdBy: null,
                    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                    updatedBy: null,
                    roleId: 'role-1',
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.manage],
                },
            ];
            clsService.get.mockReturnValue(policies);
            const target = {} as Type<unknown>;
            PolicyCurrent()(target, 'policies', 0);
            const factory = getParamDecoratorFactory(target, 'policies');

            expect(factory(undefined, executionContext)).toBe(policies);
        });
    });
});
