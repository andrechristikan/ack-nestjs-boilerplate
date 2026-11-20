import { EnumAwsS3Accessibility } from '@generated/prisma-client/client';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';
import { PasswordHistoryResponseSchema } from '@modules/password-history/dtos/response/password-history.response.dto';

describe('PasswordHistoryResponseSchema', () => {
    const user = {
        id: '507f1f77bcf86cd799439011',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: '507f1f77bcf86cd799439011',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: '507f1f77bcf86cd799439011',
        deletedAt: null,
        deletedBy: null,
        name: 'Nadia Bloom',
        username: 'nadia',
        photo: {
            bucket: 'ASSETS',
            key: '/uploads/photo.jpg',
            cdnUrl: 'https://cdn.example.com/photo.jpg',
            completedUrl: 'https://s3.example.com/photo.jpg',
            mime: 'image/jpeg',
            extension: 'jpg',
            access: EnumAwsS3Accessibility.public,
        },
    };
    const row = {
        id: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439011',
        user,
        type: EnumPasswordHistoryType.admin,
        expiredAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: '507f1f77bcf86cd799439011',
    };

    it('parses a row into exactly the declared fields', () => {
        const result = PasswordHistoryResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = PasswordHistoryResponseSchema.parse({
            ...row,
            extra: 'unexpected',
        });

        expect(result).toEqual(row);
    });

    it('omits updatedAt, updatedBy, deletedAt, and deletedBy even when present on the input', () => {
        const result = PasswordHistoryResponseSchema.parse({
            ...row,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: '507f1f77bcf86cd799439011',
            deletedAt: new Date('2026-01-01T00:00:00.000Z'),
            deletedBy: '507f1f77bcf86cd799439011',
        });

        expect(result).toEqual(row);
    });

    it('accepts a null photo on the embedded user', () => {
        const result = PasswordHistoryResponseSchema.parse({
            ...row,
            user: { ...user, photo: null },
        });

        expect(result).toEqual({ ...row, user: { ...user, photo: null } });
    });

    it('strips a size field on the embedded photo', () => {
        const result = PasswordHistoryResponseSchema.parse({
            ...row,
            user: {
                ...user,
                photo: { ...user.photo, size: 1024 },
            },
        });

        expect(result).toEqual(row);
    });

    it('rejects a type outside EnumPasswordHistoryType', () => {
        const result = PasswordHistoryResponseSchema.safeParse({
            ...row,
            type: 'bogus',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['type'], code: 'invalid_value' }),
        ]);
    });

    it('strips the stored password hash even when present on the input', () => {
        const result = PasswordHistoryResponseSchema.parse({
            ...row,
            password: 'hashed-password-value',
        });

        expect(result).toEqual(row);
        expect(result).not.toHaveProperty('password');
    });
});
