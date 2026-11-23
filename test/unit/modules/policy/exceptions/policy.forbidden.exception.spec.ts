import { HttpStatus } from '@nestjs/common';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';

describe('PolicyForbiddenException', () => {
    describe('constructor', () => {
        it('declares the policy module contract for a missing required policy', () => {
            const exception = new PolicyForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.forbidden,
                statusCodeKey:
                    EnumPolicyStatusCodeError[
                        EnumPolicyStatusCodeError.forbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'policy.error.forbidden',
            });
            expect(exception.metadata).toBeNull();
        });

        it('carries the missing permissions and the matched rule reason in metadata', () => {
            const missing = [
                {
                    subject: EnumPolicySubject.User,
                    actions: [EnumPolicyAction.update],
                },
            ];

            const exception = new PolicyForbiddenException({
                missing,
                reason: 'locked',
            });

            expect(exception.metadata).toEqual({ missing, reason: 'locked' });
        });

        it('leaves the reason out of metadata when no rule gave one', () => {
            const missing = [
                {
                    subject: EnumPolicySubject.Role,
                    actions: [EnumPolicyAction.read],
                },
            ];

            const exception = new PolicyForbiddenException({ missing });

            expect(exception.metadata).toEqual({ missing });
        });
    });
});
