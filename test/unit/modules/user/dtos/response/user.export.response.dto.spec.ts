import { UserExportResponseSchema } from '@modules/user/dtos/response/user.export.response.dto';

describe('UserExportResponseSchema', () => {
    const row = { outboxId: '507f1f77bcf86cd799439011' };

    it('parses a row into exactly the declared field', () => {
        const result = UserExportResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = UserExportResponseSchema.parse({
            ...row,
            email: 'fable@example.com',
        });

        expect(result).toEqual(row);
    });

    it('rejects a row without the outbox id', () => {
        const result = UserExportResponseSchema.safeParse({});

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['outboxId'],
                code: 'invalid_type',
            }),
        ]);
    });
});
