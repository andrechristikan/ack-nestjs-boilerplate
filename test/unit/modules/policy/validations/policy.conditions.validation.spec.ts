import { PolicyConditionsMaxLength } from '@modules/policy/constants/policy.constant';
import { PolicyConditionsRequestSchema } from '@modules/policy/validations/policy.conditions.validation';

describe('PolicyConditionsRequestSchema', () => {
    it('passes an object', () => {
        const value = { workspaceId: '${workspaceId}' };

        expect(PolicyConditionsRequestSchema.safeParse(value).success).toBe(
            true
        );
    });

    it('fails an array', () => {
        expect(PolicyConditionsRequestSchema.safeParse([]).success).toBe(false);
    });

    it('fails null', () => {
        expect(PolicyConditionsRequestSchema.safeParse(null).success).toBe(
            false
        );
    });

    it('fails an object longer than PolicyConditionsMaxLength characters', () => {
        const value = { note: 'a'.repeat(PolicyConditionsMaxLength) };

        expect(PolicyConditionsRequestSchema.safeParse(value).success).toBe(
            false
        );
    });
});
