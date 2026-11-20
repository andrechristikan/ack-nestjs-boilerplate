import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import { ProjectMemberAssignRequestSchema } from '@modules/project/dtos/request/project.member-assign.request.dto';

describe('ProjectMemberAssignRequestSchema', () => {
    it('parses userId and role', () => {
        const result = ProjectMemberAssignRequestSchema.parse({
            userId: '507f1f77bcf86cd799439011',
            role: EnumProjectMemberRole.member,
        });

        expect(result).toEqual({
            userId: '507f1f77bcf86cd799439011',
            role: EnumProjectMemberRole.member,
        });
    });

    it('rejects a userId that is not a MongoDB ObjectId', () => {
        const result = ProjectMemberAssignRequestSchema.safeParse({
            userId: 'not-an-id',
            role: EnumProjectMemberRole.member,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['userId'], code: 'too_small' }),
            expect.objectContaining({
                path: ['userId'],
                code: 'invalid_format',
            }),
        ]);
    });

    it('rejects a role outside EnumProjectMemberRole', () => {
        const result = ProjectMemberAssignRequestSchema.safeParse({
            userId: '507f1f77bcf86cd799439011',
            role: 'owner',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['role'], code: 'invalid_value' }),
        ]);
    });

    it('rejects a missing role', () => {
        const result = ProjectMemberAssignRequestSchema.safeParse({
            userId: '507f1f77bcf86cd799439011',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['role'], code: 'invalid_value' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = ProjectMemberAssignRequestSchema.safeParse({
            userId: '507f1f77bcf86cd799439011',
            role: EnumProjectMemberRole.member,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
