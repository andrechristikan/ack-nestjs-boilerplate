import { WorkspaceTransferOwnershipRequestSchema } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
describe('WorkspaceTransferOwnershipRequestSchema', () => {
    const uuidV7 = '01890a5d-ac96-774b-bcce-b302099a8057';
    it('accepts a UUID v7 id', () =>
        expect(
            WorkspaceTransferOwnershipRequestSchema.safeParse({
                targetUserId: uuidV7,
            }).success
        ).toBe(true));
    it.each([
        { targetUserId: 'bad' },
        { targetUserId: '507f1f77bcf86cd799439011' },
        { targetUserId: uuidV7, unknown: true },
    ])('rejects malformed, non-UUID, or unknown input', input =>
        expect(
            WorkspaceTransferOwnershipRequestSchema.safeParse(input).success
        ).toBe(false)
    );
});
