import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { Type } from '@nestjs/common';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { TermPolicyRequiredGuardMetaKey } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { TermPolicyGuard } from '@modules/term-policy/guards/term-policy.guard';

describe('term-policy.decorator', () => {
    describe('TermPolicyAcceptanceProtected', () => {
        it('mounts TermPolicyGuard, the required term policies, and the error kit on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };
            const requiredTermPolicies = [
                EnumTermPolicyType.privacy,
                EnumTermPolicyType.termsOfService,
            ];

            TermPolicyAcceptanceProtected(...requiredTermPolicies)(
                target,
                'method',
                descriptor
            );

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([TermPolicyGuard]);
            expect(
                Reflect.getMetadata(
                    TermPolicyRequiredGuardMetaKey,
                    descriptor.value
                )
            ).toEqual(requiredTermPolicies);
            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                expect.objectContaining({
                    messagePath: 'termPolicy.error.requiredInvalid',
                }),
                expect.objectContaining({
                    httpStatus: HttpStatus.UNAUTHORIZED,
                    messagePath: 'user.error.guardMissing',
                }),
            ]);
        });

        it('mounts an empty required-term-policy list when none is given', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            TermPolicyAcceptanceProtected()(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(
                    TermPolicyRequiredGuardMetaKey,
                    descriptor.value
                )
            ).toEqual([]);
        });
    });
});
