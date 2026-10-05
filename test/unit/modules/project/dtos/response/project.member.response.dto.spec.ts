import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import { ProjectMemberResponseSchema } from '@modules/project/dtos/response/project.member.response.dto';

describe('ProjectMemberResponseSchema', () => {
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    const updatedAt = new Date('2026-01-03T03:04:05.000Z');
    const joinedAt = new Date('2026-01-01T00:00:00.000Z');

    const user = {
        id: '507f1f77bcf86cd799439014',
        createdAt,
        createdBy: '507f1f77bcf86cd799439012',
        updatedAt,
        updatedBy: '507f1f77bcf86cd799439012',
        deletedAt: null,
        deletedBy: null,
        name: 'Jane Smith',
        username: 'meadowlark',
        photo: {
            bucket: 'sample-bucket',
            key: 'users/jane/photo.jpg',
            cdnUrl: 'https://cdn.example.com/users/jane/photo.jpg',
            completedUrl: 'https://cdn.example.com/users/jane/photo.jpg',
            mime: 'image/jpeg',
            extension: 'jpg',
            access: EnumAwsS3Accessibility.public,
        },
    };

    const row = {
        id: '507f1f77bcf86cd799439011',
        createdAt,
        createdBy: '507f1f77bcf86cd799439012',
        updatedAt,
        updatedBy: '507f1f77bcf86cd799439012',
        projectId: '507f1f77bcf86cd799439013',
        userId: user.id,
        user,
        role: EnumProjectMemberRole.member,
        joinedAt,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = ProjectMemberResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses a null photo on the embedded user', () => {
        const result = ProjectMemberResponseSchema.parse({
            ...row,
            user: { ...user, photo: null },
        });

        expect(result).toEqual({ ...row, user: { ...user, photo: null } });
    });

    it('strips deletedAt and deletedBy', () => {
        const result = ProjectMemberResponseSchema.parse({
            ...row,
            deletedAt: new Date('2026-01-04T00:00:00.000Z'),
            deletedBy: '507f1f77bcf86cd799439015',
        });

        expect(result).toEqual(row);
    });

    it('rejects a role outside EnumProjectMemberRole', () => {
        expect(() =>
            ProjectMemberResponseSchema.parse({ ...row, role: 'owner' })
        ).toThrow();
    });

    it('rejects a joinedAt that is not a Date', () => {
        expect(() =>
            ProjectMemberResponseSchema.parse({
                ...row,
                joinedAt: joinedAt.toISOString(),
            })
        ).toThrow();
    });
});
