import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { UserService } from '@modules/user/services/user.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserGetOneUseCase } from '@modules/user/use-cases/user.get-one.use-case';
import { buildUser } from '@test/unit/helpers/test.unit.request.helper';

describe('UserGetOneUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();

    let useCase: UserGetOneUseCase;

    const baseUser: IUser = buildUser('user-cinder', 'cinder@example.com');

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserGetOneUseCase,
                { provide: UserService, useValue: userService },
            ],
        }).compile();
        useCase = module.get(UserGetOneUseCase);
    });

    describe('execute', () => {
        it('wraps the user in a response envelope', async () => {
            const user = baseUser;
            userService.getOne.mockResolvedValue({
                ...user,
                mobileNumbers: [],
                country: {
                    id: user.countryId,
                    name: 'Cinder Coast',
                    alpha2Code: 'CD',
                    alpha3Code: 'CDL',
                    phoneCode: ['+1'],
                    continent: 'Atlantis',
                    timezone: 'UTC',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    createdBy: null,
                    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                    updatedBy: null,
                },
            });

            await expect(useCase.execute(user.id)).resolves.toMatchObject({
                data: { id: user.id },
            });
        });
    });
});
