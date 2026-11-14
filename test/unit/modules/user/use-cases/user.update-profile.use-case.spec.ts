import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumUserGender,
    EnumActivityLogAction,
} from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { CountryService } from '@modules/country/services/country.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import type { UserUpdateProfileRequestDto } from '@modules/user/dtos/request/user.update-profile.request.dto';
import { UserUpdateProfileUseCase } from '@modules/user/use-cases/user.update-profile.use-case';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserUpdateProfileUseCase', () => {
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();
    const countryService: MockProxy<CountryService> = mock<CountryService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx = mock<IDatabaseTransactionClient>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-sable', 'user-sable@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const entry = { queue: 'activityLog' } as unknown as IOutboxEffect;

    let useCase: UserUpdateProfileUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.recordEffect.mockReturnValue(entry);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserUpdateProfileUseCase,
                { provide: UserProfileService, useValue: userProfileService },
                { provide: CountryService, useValue: countryService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
            ],
        }).compile();
        useCase = module.get(UserUpdateProfileUseCase);
    });

    describe('execute', () => {
        const dto: UserUpdateProfileRequestDto = {
            name: 'Sable Grove Jr.',
            countryId: 'country-sable',
            gender: EnumUserGender.male,
        };

        it('writes the profile and adds the entry on one transaction', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                dto
            );

            expect(countryService.getOne).toHaveBeenCalledWith(dto.countryId);
            expect(userProfileService.updateProfileInTx).toHaveBeenCalledWith(
                tx,
                'user-sable',
                {
                    countryId: dto.countryId,
                    gender: dto.gender,
                    name: dto.name,
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userUpdateProfile }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('opens no transaction when the country is missing', async () => {
            countryService.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, dto)
            ).rejects.toBeInstanceOf(CountryNotFoundException);

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('adds no entry when the write throws', async () => {
            const cause = new Error('database exploded');
            userProfileService.updateProfileInTx.mockRejectedValue(cause);

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, dto)
            ).rejects.toBe(cause);

            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('passes a null name through to clear it', async () => {
            await useCase.execute(requestContext, apiKeyContext, authContext, {
                ...dto,
                name: null,
            });

            expect(userProfileService.updateProfileInTx).toHaveBeenCalledWith(
                tx,
                'user-sable',
                {
                    countryId: dto.countryId,
                    gender: dto.gender,
                    name: null,
                }
            );
        });
    });
});
