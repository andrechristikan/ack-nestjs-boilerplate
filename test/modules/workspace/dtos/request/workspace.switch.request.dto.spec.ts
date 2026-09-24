import { WorkspaceSwitchRequestSchema } from '@modules/workspace/dtos/request/workspace.switch.request.dto';
describe('WorkspaceSwitchRequestSchema', () => {
    const uuidV7 = '01890a5d-ac96-774b-bcce-b302099a8057';
    it('accepts a UUID v7 workspace id', () =>
        expect(
            WorkspaceSwitchRequestSchema.safeParse({ workspaceId: uuidV7 })
                .success
        ).toBe(true));
    it.each([
        {},
        { workspaceId: 'bad' },
        { workspaceId: '507f1f77bcf86cd799439011' },
        { workspaceId: uuidV7, unknown: true },
    ])('rejects missing, malformed, ObjectId, or unknown input', input =>
        expect(WorkspaceSwitchRequestSchema.safeParse(input).success).toBe(
            false
        )
    );
});
