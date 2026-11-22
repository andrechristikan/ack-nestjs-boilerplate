import { WorkspaceSoftDeleteResponseSchema } from '@modules/workspace/dtos/response/workspace.soft-delete.response.dto';

describe('WorkspaceSoftDeleteResponseSchema', () => {
    const row = { outboxId: '507f1f77bcf86cd799439011' };

    it('parses a row into exactly the declared field', () => {
        const result = WorkspaceSoftDeleteResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = WorkspaceSoftDeleteResponseSchema.parse({
            ...row,
            password: 'temporary-password',
        });

        expect(result).toEqual(row);
    });

    it('rejects a row without the outbox id', () => {
        const result = WorkspaceSoftDeleteResponseSchema.safeParse({});

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['outboxId'],
                code: 'invalid_type',
            }),
        ]);
    });
});
