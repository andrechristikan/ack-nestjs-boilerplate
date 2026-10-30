import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Country } from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserMobileNumberDomain } from '@modules/user/domains/user.mobile-number.domain';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';
import { UserUtil } from '@modules/user/utils/user.util';

describe('UserMobileNumberDomain', () => {
    const userMobileNumberRepository: MockProxy<UserMobileNumberRepository> =
        mock<UserMobileNumberRepository>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();

    let domain: UserMobileNumberDomain;

    const tx = {} as IDatabaseTransactionClient;
    const country: Country = {
        id: 'country-marlin',
        name: 'Marlin Coast',
        alpha2Code: 'ML',
        alpha3Code: 'MLD',
        phoneCode: ['+1'],
        continent: 'Atlantis',
        timezone: 'UTC',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const mobileNumber: IUserMobileNumber = {
        id: 'mobile-marlin',
        userId: 'user-marlin',
        countryId: country.id,
        phoneCode: '+1',
        number: '5551234',
        isVerified: false,
        verifiedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        country,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserMobileNumberDomain,
                {
                    provide: UserMobileNumberRepository,
                    useValue: userMobileNumberRepository,
                },
                { provide: UserDomain, useValue: userDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: UserUtil, useValue: userUtil },
            ],
        }).compile();
        domain = module.get(UserMobileNumberDomain);
    });

    describe('existsMobileNumber', () => {
        const input = {
            number: '5551234',
            countryId: country.id,
            phoneCode: '+1',
        };

        it('checks the number against all rows of the user when no row is excluded', async () => {
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                true
            );

            await expect(
                domain.existsMobileNumber('user-marlin', input, null)
            ).resolves.toBe(true);
            expect(
                userMobileNumberRepository.existsMobileNumber
            ).toHaveBeenCalledWith('user-marlin', input, null);
        });

        it('excludes the row being updated', async () => {
            userMobileNumberRepository.existsMobileNumber.mockResolvedValue(
                false
            );

            await expect(
                domain.existsMobileNumber('user-marlin', input, 'mobile-1')
            ).resolves.toBe(false);
            expect(
                userMobileNumberRepository.existsMobileNumber
            ).toHaveBeenCalledWith('user-marlin', input, 'mobile-1');
        });
    });

    describe('addMobileNumber', () => {
        it('adds the mobile number', async () => {
            userUtil.checkMobileNumber.mockReturnValue(true);
            userMobileNumberRepository.addInTx.mockResolvedValue(mobileNumber);

            const result = await domain.addMobileNumber(
                'user-marlin',
                {
                    number: '5551234',
                    countryId: country.id,
                    phoneCode: '+1',
                },
                country.phoneCode,
                false
            );

            expect(result).toBe(mobileNumber);
            expect(userUtil.checkMobileNumber).toHaveBeenCalledWith(
                country.phoneCode,
                '+1'
            );
            expect(userMobileNumberRepository.addInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin',
                {
                    number: '5551234',
                    countryId: country.id,
                    phoneCode: '+1',
                }
            );
            expect(userDomain.touchUpdatedByInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin'
            );
        });

        it('throws UserMobileNumberInvalidException when the phone code does not match the country', async () => {
            userUtil.checkMobileNumber.mockReturnValue(false);

            await expect(
                domain.addMobileNumber(
                    'user-marlin',
                    {
                        number: '5551234',
                        countryId: country.id,
                        phoneCode: '+9',
                    },
                    country.phoneCode,
                    false
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberInvalid
                    ],
                messagePath: 'user.error.mobileNumberInvalid',
            });
        });

        it('throws UserMobileNumberExistException when the mobile number already exists', async () => {
            userUtil.checkMobileNumber.mockReturnValue(true);

            await expect(
                domain.addMobileNumber(
                    'user-marlin',
                    {
                        number: '5551234',
                        countryId: country.id,
                        phoneCode: '+1',
                    },
                    country.phoneCode,
                    true
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberExist
                    ],
                messagePath: 'user.error.mobileNumberExist',
            });
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            userUtil.checkMobileNumber.mockReturnValue(true);
            const error = new UserMobileNumberExistException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.addMobileNumber(
                'user-marlin',
                {
                    number: '5551234',
                    countryId: country.id,
                    phoneCode: '+1',
                },
                country.phoneCode,
                false
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberExist
                    ],
                messagePath: 'user.error.mobileNumberExist',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            userUtil.checkMobileNumber.mockReturnValue(true);
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.addMobileNumber(
                'user-marlin',
                {
                    number: '5551234',
                    countryId: country.id,
                    phoneCode: '+1',
                },
                country.phoneCode,
                false
            );

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('getOneMobileNumber', () => {
        it('returns the mobile number of the user', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await expect(
                domain.getOneMobileNumber('user-marlin', mobileNumber.id)
            ).resolves.toBe(mobileNumber);
            expect(
                userMobileNumberRepository.findOneMobileNumber
            ).toHaveBeenCalledWith('user-marlin', mobileNumber.id);
        });

        it('throws UserMobileNumberNotFoundException when the mobile number does not exist', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                null
            );

            await expect(
                domain.getOneMobileNumber('user-marlin', 'missing')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberNotFound
                    ],
                messagePath: 'user.error.mobileNumberNotFound',
            });
        });
    });

    describe('updateMobileNumber', () => {
        it('updates the mobile number, keeping verification when number and phone code are unchanged', async () => {
            const verified = { ...mobileNumber, isVerified: true };
            userUtil.checkMobileNumber.mockReturnValue(true);
            userMobileNumberRepository.updateInTx.mockResolvedValue(verified);

            const result = await domain.updateMobileNumber(
                'user-marlin',
                verified,
                {
                    number: mobileNumber.number,
                    countryId: country.id,
                    phoneCode: mobileNumber.phoneCode,
                },
                country.phoneCode,
                false
            );

            expect(result).toBe(verified);
            expect(userMobileNumberRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                mobileNumber.id,
                {
                    number: mobileNumber.number,
                    countryId: country.id,
                    phoneCode: mobileNumber.phoneCode,
                },
                true
            );
        });

        it('resets verification when the number changes', async () => {
            userUtil.checkMobileNumber.mockReturnValue(true);
            userMobileNumberRepository.updateInTx.mockResolvedValue(
                mobileNumber
            );

            await domain.updateMobileNumber(
                'user-marlin',
                {
                    ...mobileNumber,
                    isVerified: true,
                },
                {
                    number: '5559999',
                    countryId: country.id,
                    phoneCode: mobileNumber.phoneCode,
                },
                country.phoneCode,
                false
            );

            expect(userMobileNumberRepository.updateInTx).toHaveBeenCalledWith(
                tx,
                mobileNumber.id,
                {
                    number: '5559999',
                    countryId: country.id,
                    phoneCode: mobileNumber.phoneCode,
                },
                false
            );
        });

        it('throws UserMobileNumberExistException when another row already has the number', async () => {
            const call = domain.updateMobileNumber(
                'user-marlin',
                mobileNumber,
                {
                    number: '5559999',
                    countryId: country.id,
                    phoneCode: '+1',
                },
                country.phoneCode,
                true
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberExist
                    ],
                messagePath: 'user.error.mobileNumberExist',
            });
        });

        it('throws UserMobileNumberInvalidException when the phone code does not match the country', async () => {
            userUtil.checkMobileNumber.mockReturnValue(false);

            const call = domain.updateMobileNumber(
                'user-marlin',
                mobileNumber,
                {
                    number: '5559999',
                    countryId: country.id,
                    phoneCode: '+9',
                },
                country.phoneCode,
                false
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberInvalid
                    ],
                messagePath: 'user.error.mobileNumberInvalid',
            });
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            userUtil.checkMobileNumber.mockReturnValue(true);
            const error = new UserMobileNumberExistException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.updateMobileNumber(
                'user-marlin',
                mobileNumber,
                {
                    number: mobileNumber.number,
                    countryId: country.id,
                    phoneCode: mobileNumber.phoneCode,
                },
                country.phoneCode,
                false
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberExist
                    ],
                messagePath: 'user.error.mobileNumberExist',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            userUtil.checkMobileNumber.mockReturnValue(true);
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.updateMobileNumber(
                'user-marlin',
                mobileNumber,
                {
                    number: mobileNumber.number,
                    countryId: country.id,
                    phoneCode: mobileNumber.phoneCode,
                },
                country.phoneCode,
                false
            );

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('deleteMobileNumber', () => {
        it('deletes the mobile number', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );
            userMobileNumberRepository.deleteInTx.mockResolvedValue(
                mobileNumber
            );

            const result = await domain.deleteMobileNumber(
                'user-marlin',
                mobileNumber.id
            );

            expect(result).toBe(mobileNumber);
            expect(userMobileNumberRepository.deleteInTx).toHaveBeenCalledWith(
                tx,
                mobileNumber.id
            );
            expect(userDomain.touchUpdatedByInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin'
            );
        });

        it('throws UserMobileNumberNotFoundException when the mobile number does not exist', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                null
            );

            const call = domain.deleteMobileNumber('user-marlin', 'missing');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberNotFound
                    ],
                messagePath: 'user.error.mobileNumberNotFound',
            });
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );
            const error = new UserMobileNumberExistException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.deleteMobileNumber(
                'user-marlin',
                mobileNumber.id
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberExist
                    ],
                messagePath: 'user.error.mobileNumberExist',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.deleteMobileNumber(
                'user-marlin',
                mobileNumber.id
            );

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });
});
