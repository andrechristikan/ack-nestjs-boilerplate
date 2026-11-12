import { UserImportResponseSchema } from '@modules/user/dtos/response/user.import.response.dto';

describe('UserImportResponseSchema', () => {
    const row = { outboxId: '507f1f77bcf86cd799439011' };

    it('parses a row into exactly the declared field', () => {
        const result = UserImportResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = UserImportResponseSchema.parse({
            ...row,
            password: 'temporary-password',
        });

        expect(result).toEqual(row);
    });

    it('rejects a row without the outbox id', () => {
        const result = UserImportResponseSchema.safeParse({});

        expect(result.success).toBe(false);
    });
});
