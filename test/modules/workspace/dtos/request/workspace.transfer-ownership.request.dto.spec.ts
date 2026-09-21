import { WorkspaceTransferOwnershipRequestSchema } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
describe('WorkspaceTransferOwnershipRequestSchema', () => {
    it('accepts a database id', () =>
        expect(
            WorkspaceTransferOwnershipRequestSchema.safeParse({
                targetUserId: 'a'.repeat(24),
            }).success
        ).toBe(true));
    it.each([
        { targetUserId: 'bad' },
        { targetUserId: 'a'.repeat(24), unknown: true },
    ])('rejects malformed or unknown input', input =>
        expect(
            WorkspaceTransferOwnershipRequestSchema.safeParse(input).success
        ).toBe(false)
    );
});
