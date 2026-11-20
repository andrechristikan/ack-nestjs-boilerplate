import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import type { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserClaimUsernameUseCase } from '@modules/user/use-cases/user.claim-username.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserClaimUsernameUseCase', () => {
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-sable', 'user-sable@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);

    let useCase: UserClaimUsernameUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserClaimUsernameUseCase,
                { provide: UserProfileService, useValue: userProfileService },
            ],
        }).compile();
        useCase = module.get(UserClaimUsernameUseCase);
    });

    describe('execute', () => {
        it('delegates the username and the context to the domain', async () => {
            const dto: UserClaimUsernameRequestDto = {
                username: 'sableGrove' as Lowercase<string>,
            };

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                dto
            );

            expect(userProfileService.claimUsername).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                dto.username
            );
        });
    });
});
