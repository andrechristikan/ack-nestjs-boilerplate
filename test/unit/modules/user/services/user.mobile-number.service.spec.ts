import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Country } from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { buildRequestContext } from '@test/unit/helpers/test.unit.request.helper';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { UserService } from '@modules/user/services/user.service';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type { IUserMobileNumber } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';

describe('UserMobileNumberService', () => {
    const userMobileNumberRepository: MockProxy<UserMobileNumberRepository> =
        mock<UserMobileNumberRepository>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const context = buildRequestContext('user-marlin');
    const entry = { queue: 'activityLog' } as unknown as IOutboxEffect;
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let service: UserMobileNumberService;

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

        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        activityLogService.recordEffect.mockReturnValue(entry);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserMobileNumberService,
                {
                    provide: UserMobileNumberRepository,
                    useValue: userMobileNumberRepository,
                },
                { provide: UserService, useValue: userService },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        service = module.get(UserMobileNumberService);
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
                service.existsMobileNumber('user-marlin', input, null)
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
                service.existsMobileNumber('user-marlin', input, 'mobile-1')
            ).resolves.toBe(false);
            expect(
                userMobileNumberRepository.existsMobileNumber
            ).toHaveBeenCalledWith('user-marlin', input, 'mobile-1');
        });
    });

    describe('addMobileNumber', () => {
        it('adds the mobile number', async () => {
            userMobileNumberRepository.addInTx.mockResolvedValue(mobileNumber);

            const result = await service.addMobileNumber(
                'user-marlin',
                {
                    number: '5551234',
                    countryId: country.id,
                    phoneCode: '+1',
                },
                country.phoneCode,
                false,
                context
            );

            expect(result).toBe(mobileNumber);
            expect(userMobileNumberRepository.addInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin',
                {
                    number: '5551234',
                    countryId: country.id,
                    phoneCode: '+1',
                }
            );
            expect(userService.touchUpdatedByInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                { action: EnumActivityLogAction.userAddMobileNumber },
                context
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });

        it('throws UserMobileNumberInvalidException when the phone code does not match the country', async () => {
            await expect(
                service.addMobileNumber(
                    'user-marlin',
                    {
                        number: '5551234',
                        countryId: country.id,
                        phoneCode: '+9',
                    },
                    country.phoneCode,
                    false,
                    context
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
            await expect(
                service.addMobileNumber(
                    'user-marlin',
                    {
                        number: '5551234',
                        countryId: country.id,
                        phoneCode: '+1',
                    },
                    country.phoneCode,
                    true,
                    context
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
            const error = new UserMobileNumberExistException();
            outboxService.withTransaction.mockRejectedValueOnce(error);

            const call = service.addMobileNumber(
                'user-marlin',
                {
                    number: '5551234',
                    countryId: country.id,
                    phoneCode: '+1',
                },
                country.phoneCode,
                false,
                context
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
            const error = new Error('boom');
            outboxService.withTransaction.mockRejectedValueOnce(error);

            const call = service.addMobileNumber(
                'user-marlin',
                {
                    number: '5551234',
                    countryId: country.id,
                    phoneCode: '+1',
                },
                country.phoneCode,
                false,
                context
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

        it('maps a unique collision to UserMobileNumberExistException', async () => {
            const collision = new Error('unique');
            outboxService.withTransaction.mockRejectedValueOnce(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const call = service.addMobileNumber(
                'user-marlin',
                {
                    number: '5551234',
                    countryId: country.id,
                    phoneCode: '+1',
                },
                country.phoneCode,
                false,
                context
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
                messagePath: 'user.error.mobileNumberExist',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'number'
            );
        });
    });

    describe('getOneMobileNumber', () => {
        it('returns the mobile number of the user', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );

            await expect(
                service.getOneMobileNumber('user-marlin', mobileNumber.id)
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
                service.getOneMobileNumber('user-marlin', 'missing')
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
            userMobileNumberRepository.updateInTx.mockResolvedValue(verified);

            const result = await service.updateMobileNumber(
                'user-marlin',
                verified,
                {
                    number: mobileNumber.number,
                    countryId: country.id,
                    phoneCode: mobileNumber.phoneCode,
                },
                country.phoneCode,
                false,
                context
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
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                { action: EnumActivityLogAction.userUpdateMobileNumber },
                context
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });

        it('resets verification when the number changes', async () => {
            userMobileNumberRepository.updateInTx.mockResolvedValue(
                mobileNumber
            );

            await service.updateMobileNumber(
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
                false,
                context
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
            const call = service.updateMobileNumber(
                'user-marlin',
                mobileNumber,
                {
                    number: '5559999',
                    countryId: country.id,
                    phoneCode: '+1',
                },
                country.phoneCode,
                true,
                context
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
            const call = service.updateMobileNumber(
                'user-marlin',
                mobileNumber,
                {
                    number: '5559999',
                    countryId: country.id,
                    phoneCode: '+9',
                },
                country.phoneCode,
                false,
                context
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
            const error = new UserMobileNumberExistException();
            outboxService.withTransaction.mockRejectedValueOnce(error);

            const call = service.updateMobileNumber(
                'user-marlin',
                mobileNumber,
                {
                    number: mobileNumber.number,
                    countryId: country.id,
                    phoneCode: mobileNumber.phoneCode,
                },
                country.phoneCode,
                false,
                context
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
            const error = new Error('boom');
            outboxService.withTransaction.mockRejectedValueOnce(error);

            const call = service.updateMobileNumber(
                'user-marlin',
                mobileNumber,
                {
                    number: mobileNumber.number,
                    countryId: country.id,
                    phoneCode: mobileNumber.phoneCode,
                },
                country.phoneCode,
                false,
                context
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

        it('maps a unique collision to UserMobileNumberExistException', async () => {
            const collision = new Error('unique');
            outboxService.withTransaction.mockRejectedValueOnce(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const call = service.updateMobileNumber(
                'user-marlin',
                mobileNumber,
                {
                    number: '5559999',
                    countryId: country.id,
                    phoneCode: mobileNumber.phoneCode,
                },
                country.phoneCode,
                false,
                context
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberExist,
                messagePath: 'user.error.mobileNumberExist',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'number'
            );
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

            const result = await service.deleteMobileNumber(
                'user-marlin',
                mobileNumber.id,
                context
            );

            expect(result).toBe(mobileNumber);
            expect(userMobileNumberRepository.deleteInTx).toHaveBeenCalledWith(
                tx,
                mobileNumber.id
            );
            expect(userService.touchUpdatedByInTx).toHaveBeenCalledWith(
                tx,
                'user-marlin'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                { action: EnumActivityLogAction.userDeleteMobileNumber },
                context
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });

        it('throws UserMobileNumberNotFoundException when the mobile number does not exist', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                null
            );

            const call = service.deleteMobileNumber(
                'user-marlin',
                'missing',
                context
            );

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

        it('throws UserMobileNumberNotFoundException when the guarded delete misses', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );
            userMobileNumberRepository.deleteInTx.mockResolvedValue(null);

            const call = service.deleteMobileNumber(
                'user-marlin',
                mobileNumber.id,
                context
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberNotFound
                    ],
                messagePath: 'user.error.mobileNumberNotFound',
            });
            expect(userService.touchUpdatedByInTx).not.toHaveBeenCalled();
        });

        it('throws UserMobileNumberNotFoundException on a write conflict', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );
            const conflict = new Error('write-conflict');
            outboxService.withTransaction.mockRejectedValueOnce(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            const call = service.deleteMobileNumber(
                'user-marlin',
                mobileNumber.id,
                context
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.mobileNumberNotFound
                    ],
                messagePath: 'user.error.mobileNumberNotFound',
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            userMobileNumberRepository.findOneMobileNumber.mockResolvedValue(
                mobileNumber
            );
            const error = new UserMobileNumberExistException();
            outboxService.withTransaction.mockRejectedValueOnce(error);

            const call = service.deleteMobileNumber(
                'user-marlin',
                mobileNumber.id,
                context
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
            outboxService.withTransaction.mockRejectedValueOnce(error);

            const call = service.deleteMobileNumber(
                'user-marlin',
                mobileNumber.id,
                context
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

    describe('removeByUserInTx', () => {
        it('deletes every mobile number of the user on the given transaction', async () => {
            await service.removeByUserInTx(tx, 'user-marlin');

            expect(
                userMobileNumberRepository.deleteByUserInTx
            ).toHaveBeenCalledWith(tx, 'user-marlin');
        });
    });

    describe('checkMobileNumber', () => {
        it('returns true when the phone code belongs to the country', () => {
            expect(service['checkMobileNumber'](['+1', '+44'], '+1')).toBe(
                true
            );
        });

        it('returns false when the phone code does not belong to the country', () => {
            expect(service['checkMobileNumber'](['+1', '+44'], '+33')).toBe(
                false
            );
        });
    });
});
