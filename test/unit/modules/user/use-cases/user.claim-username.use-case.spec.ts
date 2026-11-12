import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import type { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserClaimUsernameUseCase } from '@modules/user/use-cases/user.claim-username.use-case';
import { buildRequestContext } from '@test/unit/helpers/test.unit.request.helper';

describe('UserClaimUsernameUseCase', () => {
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();
    const context = buildRequestContext('user-sable');

    let useCase: UserClaimUsernameUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

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

            await useCase.execute('user-sable', dto, context);

            expect(userProfileService.claimUsername).toHaveBeenCalledWith(
                'user-sable',
                dto.username,
                context
            );
        });
    });
});
