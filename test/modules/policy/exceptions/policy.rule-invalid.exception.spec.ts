import { HttpStatus } from '@nestjs/common';
import { EnumPolicyRuleInvalidReason } from '@modules/policy/enums/policy.rule-invalid-reason.enum';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyRuleInvalidException } from '@modules/policy/exceptions/policy.rule-invalid.exception';

describe('PolicyRuleInvalidException', () => {
    it('exposes module, status code, key and http status', () => {
        const exception = new PolicyRuleInvalidException(
            EnumPolicyRuleInvalidReason.scopeMissing
        );

        expect(exception.module).toBe('policy');
        expect(exception.statusCode).toBe(
            EnumPolicyStatusCodeError.invalidRule
        );
        expect(exception.statusCodeKey).toBe('invalidRule');
        expect(exception.httpStatus).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it('holds exactly the three rejection reasons', () => {
        expect(Object.values(EnumPolicyRuleInvalidReason).sort()).toEqual(
            ['actionNotAllowed', 'roleScopeInvalid', 'scopeMissing'].sort()
        );
    });

    it.each(Object.values(EnumPolicyRuleInvalidReason))(
        'selects the %s message and carries the reason',
        reason => {
            const exception = new PolicyRuleInvalidException(reason);

            expect(exception.messagePath).toBe(
                `policy.error.invalidRule.${reason}`
            );
            expect(exception.reason).toBe(reason);
        }
    );
});
