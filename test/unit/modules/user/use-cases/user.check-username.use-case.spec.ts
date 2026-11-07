import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { UserService } from '@modules/user/services/user.service';
import type { UserCheckUsernameRequestDto } from '@modules/user/dtos/request/user.check-username.request.dto';
import { UserCheckUsernameUseCase } from '@modules/user/use-cases/user.check-username.use-case';

describe('UserCheckUsernameUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();

    let useCase: UserCheckUsernameUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserCheckUsernameUseCase,
                { provide: UserService, useValue: userService },
            ],
        }).compile();
        useCase = module.get(UserCheckUsernameUseCase);
    });

    describe('execute', () => {
        it('wraps the check in a response envelope', async () => {
            const dto: UserCheckUsernameRequestDto = {
                username: 'cinder2wolfe' as Lowercase<string>,
            };
            userService.checkUsername.mockResolvedValue({
                badWord: false,
                exist: false,
                pattern: false,
            });

            await expect(useCase.execute(dto)).resolves.toEqual({
                data: { badWord: false, exist: false, pattern: false },
            });
        });
    });
});
