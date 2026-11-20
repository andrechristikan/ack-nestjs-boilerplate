import { WorkspaceTransferOwnershipRequestSchema } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';

describe('WorkspaceTransferOwnershipRequestSchema', () => {
    const payload = { targetUserId: '507f1f77bcf86cd799439011' };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceTransferOwnershipRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a targetUserId that is not a MongoID', () => {
        const result = WorkspaceTransferOwnershipRequestSchema.safeParse({
            targetUserId: 'not-an-id',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['targetUserId'],
                code: 'too_small',
            }),
            expect.objectContaining({
                path: ['targetUserId'],
                code: 'invalid_format',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = WorkspaceTransferOwnershipRequestSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
