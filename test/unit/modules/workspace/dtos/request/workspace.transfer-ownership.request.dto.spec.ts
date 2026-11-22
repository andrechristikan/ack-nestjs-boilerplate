import { WorkspaceTransferOwnershipRequestSchema } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';

describe('WorkspaceTransferOwnershipRequestSchema', () => {
    const payload = { targetUserId: '01920000-0000-7000-8000-6cd799439011' };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceTransferOwnershipRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a targetUserId that is not a MongoID', () => {
        expect(() =>
            WorkspaceTransferOwnershipRequestSchema.parse({
                targetUserId: 'not-an-id',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceTransferOwnershipRequestSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });
});
