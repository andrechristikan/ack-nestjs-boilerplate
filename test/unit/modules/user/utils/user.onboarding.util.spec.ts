import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';

describe('UserOnboardingUtil', () => {
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let util: UserOnboardingUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserOnboardingUtil,
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        util = module.get(UserOnboardingUtil);
    });

    describe('mapCreateCollision', () => {
        it('returns UserUsernameExistException when the collision is on username', () => {
            const error = new Error('collision');
            databaseUtil.isUniqueCollision.mockImplementation(
                (_err, field) => field === 'username'
            );

            const result = util.mapCreateCollision(error);

            expect(result).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameExist
                    ],
                messagePath: 'user.error.usernameExist',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                error,
                'username'
            );
        });

        it('returns UserEmailExistException when the collision is on email', () => {
            const error = new Error('collision');
            databaseUtil.isUniqueCollision.mockImplementation(
                (_err, field) => field === 'email'
            );

            const result = util.mapCreateCollision(error);

            expect(result).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.emailExist],
                messagePath: 'user.error.emailExist',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                error,
                'email'
            );
        });

        it('returns the error untouched when it is neither collision', () => {
            const error = new Error('unrelated');
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            const result = util.mapCreateCollision(error);

            expect(result).toBe(error);
        });
    });
});
