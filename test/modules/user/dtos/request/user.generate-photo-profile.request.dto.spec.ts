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

    it('rejects an extension outside EnumFileExtensionImage', () => {
        expect(() =>
            UserGeneratePhotoProfileRequestSchema.parse({
                ...payload,
                extension: 'pdf',
            })
        ).toThrow();
    });

    it('rejects an undeclared key key', () => {
        expect(() =>
            UserGeneratePhotoProfileRequestSchema.parse({
                ...payload,
                key: 'users/user-1/profile/photo.jpg',
            })
        ).toThrow();
    });
});
