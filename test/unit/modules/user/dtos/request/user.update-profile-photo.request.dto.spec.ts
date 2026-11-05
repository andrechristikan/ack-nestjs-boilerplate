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
        expect(() =>
            UserUpdateProfilePhotoRequestSchema.parse({
                ...payload,
                size: 102400,
            })
        ).toThrow();
    });

    it('rejects a key failing the object key pattern', () => {
        expect(() =>
            UserUpdateProfilePhotoRequestSchema.parse({
                ...payload,
                key: 'not a valid key!',
            })
        ).toThrow();
    });

    it('rejects an undeclared extension key', () => {
        expect(() =>
            UserUpdateProfilePhotoRequestSchema.parse({
                ...payload,
                extension: 'jpg',
            })
        ).toThrow();
    });
});
