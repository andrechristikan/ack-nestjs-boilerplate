import { HttpStatus } from '@nestjs/common';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { EnumPolicyAction, EnumPolicySubject } from '@generated/prisma-client';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';

describe('PolicyForbiddenException', () => {
    it('exposes module, status code, key, http status and message path with no reason', () => {
        const exception = new PolicyForbiddenException();

        expect(exception).toMatchObject({
            module: 'policy',
            statusCode: EnumPolicyStatusCodeError.forbidden,
            statusCodeKey:
                EnumPolicyStatusCodeError[EnumPolicyStatusCodeError.forbidden],
            httpStatus: HttpStatus.FORBIDDEN,
            messagePath: 'policy.error.forbidden',
        });
        expect(exception.metadata).toBeUndefined();
    });

    it('forwards a given reason as metadata while keeping the default message path', () => {
        const exception = new PolicyForbiddenException({
            reason: 'blocked by rule',
        });

        expect(exception.messagePath).toBe('policy.error.forbidden');
        expect(exception.metadata).toEqual({ reason: 'blocked by rule' });
    });

    it('forwards the missing permissions as metadata', () => {
        const missing = [
            {
                subject: EnumPolicySubject.Project,
                actions: [EnumPolicyAction.read, EnumPolicyAction.update],
            },
        ];
        const exception = new PolicyForbiddenException({ missing });

        expect(exception.metadata).toEqual({ missing });
    });

    it('forwards both reason and missing permissions', () => {
        const missing = [
            {
                subject: EnumPolicySubject.Project,
                actions: [EnumPolicyAction.delete],
            },
        ];
        const exception = new PolicyForbiddenException({
            reason: 'blocked by rule',
            missing,
        });

        expect(exception.metadata).toEqual({
            reason: 'blocked by rule',
            missing,
        });
    });
});
