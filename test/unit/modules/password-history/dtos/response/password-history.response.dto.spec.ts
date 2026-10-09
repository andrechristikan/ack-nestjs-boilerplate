import { faker } from '@faker-js/faker';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';
import { PasswordHistoryResponseSchema } from '@modules/password-history/dtos/response/password-history.response.dto';

describe('PasswordHistoryResponseSchema', () => {
    const user = {
        id: faker.database.mongodbObjectId(),
        createdAt: new Date(),
        createdBy: faker.database.mongodbObjectId(),
        updatedAt: new Date(),
        updatedBy: faker.database.mongodbObjectId(),
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
        id: faker.database.mongodbObjectId(),
        userId: faker.database.mongodbObjectId(),
        user,
        type: EnumPasswordHistoryType.admin,
        expiredAt: new Date(),
        createdAt: new Date(),
        createdBy: faker.database.mongodbObjectId(),
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
            updatedAt: new Date(),
            updatedBy: faker.database.mongodbObjectId(),
            deletedAt: new Date(),
            deletedBy: faker.database.mongodbObjectId(),
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
        expect(() =>
            PasswordHistoryResponseSchema.parse({ ...row, type: 'bogus' })
        ).toThrow();
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
