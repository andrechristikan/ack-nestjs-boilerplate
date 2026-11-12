import { HttpStatus } from '@nestjs/common';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { Type } from '@nestjs/common';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { PolicyRequiredMetaKey } from '@modules/policy/constants/policy.constant';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
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
                    subject: EnumPolicySubject.user,
                    action: [],
                })
            ).toThrow(PolicyProtectedActionEmptyException);
        });
    });
});
