import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import { UserGeneratePhotoProfileRequestSchema } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';

describe('UserGeneratePhotoProfileRequestSchema', () => {
    const payload = {
        size: 102400,
        extension: EnumFileExtensionImage.jpg,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserGeneratePhotoProfileRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a size of 0', () => {
        const result = UserGeneratePhotoProfileRequestSchema.safeParse({
            ...payload,
            size: 0,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['size'], code: 'too_small' }),
        ]);
    });

    it('rejects an extension outside EnumFileExtensionImage', () => {
        const result = UserGeneratePhotoProfileRequestSchema.safeParse({
            ...payload,
            extension: 'pdf',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['extension'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects an undeclared key key', () => {
        const result = UserGeneratePhotoProfileRequestSchema.safeParse({
            ...payload,
            key: 'users/user-1/profile/photo.jpg',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
