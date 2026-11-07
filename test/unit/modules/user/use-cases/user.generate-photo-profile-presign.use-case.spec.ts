import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import { EnumFileExtensionImage } from '@common/file/enums/file.enum';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import type { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import { UserGeneratePhotoProfilePresignUseCase } from '@modules/user/use-cases/user.generate-photo-profile-presign.use-case';

describe('UserGeneratePhotoProfilePresignUseCase', () => {
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();

    let useCase: UserGeneratePhotoProfilePresignUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserGeneratePhotoProfilePresignUseCase,
                { provide: UserProfileService, useValue: userProfileService },
            ],
        }).compile();
        useCase = module.get(UserGeneratePhotoProfilePresignUseCase);
    });

    describe('execute', () => {
        it('wraps the presign in a response envelope', async () => {
            const dto: UserGeneratePhotoProfileRequestDto = {
                extension: EnumFileExtensionImage.png,
                size: 2048,
            };
            const presign: IAwsS3Presign = {
                key: 'photo-profile/user-sable/random.png',
                mime: 'image/png',
                extension: 'png',
                presignUrl: 'https://s3.example.com/presign',
                expiredInSeconds: 60,
            };
            userProfileService.generatePhotoProfilePresign.mockResolvedValue(
                presign
            );

            await expect(useCase.execute('user-sable', dto)).resolves.toEqual({
                data: presign,
            });
            expect(
                userProfileService.generatePhotoProfilePresign
            ).toHaveBeenCalledWith('user-sable', {
                extension: dto.extension,
                size: dto.size,
            });
        });
    });
});
