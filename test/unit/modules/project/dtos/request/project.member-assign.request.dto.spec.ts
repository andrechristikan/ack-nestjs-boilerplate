import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import { ProjectMemberAssignRequestSchema } from '@modules/project/dtos/request/project.member-assign.request.dto';

describe('ProjectMemberAssignRequestSchema', () => {
    it('parses userId and role', () => {
        const result = ProjectMemberAssignRequestSchema.parse({
            userId: '01920000-0000-7000-8000-6cd799439011',
            role: EnumProjectMemberRole.member,
        });

        expect(result).toEqual({
            userId: '01920000-0000-7000-8000-6cd799439011',
            role: EnumProjectMemberRole.member,
        });
    });

    it('rejects a userId that is not a MongoDB ObjectId', () => {
        expect(() =>
            ProjectMemberAssignRequestSchema.parse({
                userId: 'not-an-id',
                role: EnumProjectMemberRole.member,
            })
        ).toThrow();
    });

    it('rejects a role outside EnumProjectMemberRole', () => {
        expect(() =>
            ProjectMemberAssignRequestSchema.parse({
                userId: '01920000-0000-7000-8000-6cd799439011',
                role: 'owner',
            })
        ).toThrow();
    });

    it('rejects a missing role', () => {
        expect(() =>
            ProjectMemberAssignRequestSchema.parse({
                userId: '01920000-0000-7000-8000-6cd799439011',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ProjectMemberAssignRequestSchema.parse({
                userId: '01920000-0000-7000-8000-6cd799439011',
                role: EnumProjectMemberRole.member,
                extra: true,
            })
        ).toThrow();
    });
});
