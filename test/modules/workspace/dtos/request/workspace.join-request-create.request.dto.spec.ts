import { WorkspaceJoinRequestCreateRequestSchema } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
describe('WorkspaceJoinRequestCreateRequestSchema', () => {
    const valid = {
        workspaceId: '01890a5d-ac96-774b-bcce-b302099a8057',
        message: 'm'.repeat(500),
    };
    it('accepts boundary input', () =>
        expect(
            WorkspaceJoinRequestCreateRequestSchema.safeParse(valid).success
        ).toBe(true));
    it.each([
        { ...valid, workspaceId: 'bad' },
        { ...valid, workspaceId: '507f1f77bcf86cd799439011' },
        { ...valid, message: 'm'.repeat(501) },
        { ...valid, unknown: true },
    ])('rejects malformed, ObjectId, or unknown input', input =>
        expect(
            WorkspaceJoinRequestCreateRequestSchema.safeParse(input).success
        ).toBe(false)
    );
});
