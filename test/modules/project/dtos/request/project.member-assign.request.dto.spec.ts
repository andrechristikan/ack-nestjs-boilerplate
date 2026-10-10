import { ProjectMemberAssignRequestSchema } from '@modules/project/dtos/request/project.member-assign.request.dto';

describe('ProjectMemberAssignRequestSchema', () => {
    const valid = {
        userId: '01890a5d-ac96-774b-bcce-b302099a8057',
        roleId: '01890a5d-ac96-774b-bcce-b302099a8058',
    };

    it('accepts a UUID v7 user id with a UUID v7 role id', () =>
        expect(ProjectMemberAssignRequestSchema.safeParse(valid).success).toBe(
            true
        ));

    it.each([
        { ...valid, userId: 'bad' },
        { ...valid, userId: '507f1f77bcf86cd799439011' },
        { ...valid, roleId: 'member' },
        { ...valid, roleId: '507f1f77bcf86cd799439011' },
        { userId: valid.userId },
        { roleId: valid.roleId },
        { userId: valid.userId, role: 'member' },
        { ...valid, role: 'member' },
        { ...valid, unknown: true },
    ])('rejects malformed, non-UUID, legacy role, or unknown input', input =>
        expect(ProjectMemberAssignRequestSchema.safeParse(input).success).toBe(
            false
        )
    );
});
