import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HttpStatus } from '@nestjs/common';
import { EnumPolicyInvalidRuleReason } from '@modules/policy/enums/policy.invalid-rule-reason.enum';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { PolicyInvalidRuleException } from '@modules/policy/exceptions/policy.invalid-rule.exception';

describe('PolicyInvalidRuleException', () => {
    const languagesRoot = join(process.cwd(), 'src', 'languages');

    it.each(Object.values(EnumPolicyInvalidRuleReason))(
        'carries 51105, invalidRule, 400, and policy.error.invalidRule.%s',
        reason => {
            const exception = new PolicyInvalidRuleException(reason);

            expect(exception).toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.invalidRule,
                statusCodeKey: 'invalidRule',
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: `policy.error.invalidRule.${reason}`,
            });
            expect(exception.statusCode).toBe(51105);
        }
    );

    describe.each(readdirSync(languagesRoot))('%s language', language => {
        const messages = JSON.parse(
            readFileSync(join(languagesRoot, language, 'policy.json'), 'utf8')
        ) as { error: { invalidRule: Record<string, string> } };

        it.each(Object.values(EnumPolicyInvalidRuleReason))(
            'has an i18n leaf for %s',
            reason => {
                expect(messages.error.invalidRule[reason]).toEqual(
                    expect.any(String)
                );
                expect(messages.error.invalidRule[reason]).not.toBe('');
            }
        );
    });
});
