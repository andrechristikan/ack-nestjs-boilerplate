import { UserUpdateProfilePhotoRequestSchema } from '@modules/user/dtos/request/user.update-profile-photo.request.dto';

describe('UserUpdateProfilePhotoRequestSchema', () => {
    const payload = {
        key: 'users/507f1f77bcf86cd799439011/profile/aB3xY9zQ1mN7pR2sT4vW.jpg',
    };

    it('accepts a key alone', () => {
        const result = UserUpdateProfilePhotoRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a size', () => {
        const result = UserUpdateProfilePhotoRequestSchema.safeParse({
            ...payload,
            size: 102400,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects a key failing the object key pattern', () => {
        const result = UserUpdateProfilePhotoRequestSchema.safeParse({
            ...payload,
            key: 'not a valid key!',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['key'], code: 'invalid_format' }),
        ]);
    });

    it('rejects an undeclared extension key', () => {
        const result = UserUpdateProfilePhotoRequestSchema.safeParse({
            ...payload,
            extension: 'jpg',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
