import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import { ProjectMemberAssignRequestSchema } from '@modules/project/dtos/request/project.member-assign.request.dto';
describe('ProjectMemberAssignRequestSchema', () => {
    const valid = {
        userId: '01890a5d-ac96-774b-bcce-b302099a8057',
        role: EnumProjectMemberRole.member,
    };
    it('accepts a UUID v7 user id with a role', () =>
        expect(ProjectMemberAssignRequestSchema.safeParse(valid).success).toBe(
            true
        ));
    it.each([
        { ...valid, userId: 'bad' },
        { ...valid, userId: '507f1f77bcf86cd799439011' },
        { ...valid, role: 'invalid' },
        { userId: valid.userId },
        { ...valid, unknown: true },
    ])('rejects malformed, non-UUID, or unknown input', input =>
        expect(ProjectMemberAssignRequestSchema.safeParse(input).success).toBe(
            false
        )
    );
});
