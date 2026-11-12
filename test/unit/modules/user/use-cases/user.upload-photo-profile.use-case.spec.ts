import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IFile } from '@common/file/interfaces/file.interface';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { UserUploadPhotoProfileUseCase } from '@modules/user/use-cases/user.upload-photo-profile.use-case';
import {
    buildRequestContextUser,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserUploadPhotoProfileUseCase', () => {
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();
    const context = buildRequestContextUser(
        buildUser('user-sable', 'user-sable@example.com')
    );

    let useCase: UserUploadPhotoProfileUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserUploadPhotoProfileUseCase,
                { provide: UserProfileService, useValue: userProfileService },
            ],
        }).compile();
        useCase = module.get(UserUploadPhotoProfileUseCase);
    });

    describe('execute', () => {
        it('delegates the file and the snapshot to the domain', async () => {
            const file = {
                originalname: 'photo.png',
                size: 2048,
                buffer: Buffer.from('binary-data'),
            } as IFile;

            await useCase.execute(context, file);

            expect(userProfileService.uploadPhotoProfile).toHaveBeenCalledWith(
                context.snapshot,
                file
            );
        });
    });
});
