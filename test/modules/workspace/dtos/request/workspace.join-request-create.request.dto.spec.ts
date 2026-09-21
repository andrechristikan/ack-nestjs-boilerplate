import { WorkspaceJoinRequestCreateRequestSchema } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';
describe('WorkspaceJoinRequestCreateRequestSchema', () => {
    const valid = { workspaceId: 'a'.repeat(24), message: 'm'.repeat(500) };
    it('accepts boundary input', () =>
        expect(
            WorkspaceJoinRequestCreateRequestSchema.safeParse(valid).success
        ).toBe(true));
    it.each([
        { ...valid, workspaceId: 'bad' },
        { ...valid, message: 'm'.repeat(501) },
        { ...valid, unknown: true },
    ])('rejects malformed or unknown input', input =>
        expect(
            WorkspaceJoinRequestCreateRequestSchema.safeParse(input).success
        ).toBe(false)
    );
});
