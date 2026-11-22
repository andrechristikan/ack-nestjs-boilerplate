import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { UserService } from '@modules/user/services/user.service';
import type { UserCheckEmailRequestDto } from '@modules/user/dtos/request/user.check-email.request.dto';
import { UserCheckEmailUseCase } from '@modules/user/use-cases/user.check-email.use-case';

describe('UserCheckEmailUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();

    let useCase: UserCheckEmailUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserCheckEmailUseCase,
                { provide: UserService, useValue: userService },
            ],
        }).compile();
        useCase = module.get(UserCheckEmailUseCase);
    });

    describe('execute', () => {
        it('wraps the check in a response envelope', async () => {
            const dto: UserCheckEmailRequestDto = {
                email: 'cinder@example.com' as Lowercase<string>,
            };
            userService.checkEmail.mockResolvedValue({
                badWord: false,
                exist: true,
            });

            await expect(useCase.execute(dto)).resolves.toEqual({
                data: { badWord: false, exist: true },
            });
        });
    });
});
