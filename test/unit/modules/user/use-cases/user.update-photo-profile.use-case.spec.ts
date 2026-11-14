import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import type { UserUpdateProfilePhotoRequestDto } from '@modules/user/dtos/request/user.update-profile-photo.request.dto';
import { UserUpdatePhotoProfileUseCase } from '@modules/user/use-cases/user.update-photo-profile.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserUpdatePhotoProfileUseCase', () => {
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-sable', 'user-sable@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);

    let useCase: UserUpdatePhotoProfileUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserUpdatePhotoProfileUseCase,
                { provide: UserProfileService, useValue: userProfileService },
            ],
        }).compile();
        useCase = module.get(UserUpdatePhotoProfileUseCase);
    });

    describe('execute', () => {
        it('delegates the key and the context to the domain', async () => {
            const dto: UserUpdateProfilePhotoRequestDto = {
                key: 'photo-profile/user-sable/random.png',
            };

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                dto
            );

            expect(userProfileService.updatePhotoProfile).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                { key: dto.key }
            );
        });
    });
});
