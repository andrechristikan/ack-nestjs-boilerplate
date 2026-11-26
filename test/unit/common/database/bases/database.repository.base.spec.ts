import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Prisma } from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import {
    DatabaseRecordNotFoundCode,
    DatabaseUniqueConstraintCode,
} from '@common/database/constants/database.constant';
import { DatabaseEmptyErrorContract } from '@common/database/contracts/database.empty-error.contract';
import { DatabaseRepositoryBase } from '@common/database/bases/database.repository.base';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import type { IDatabaseErrorContract } from '@common/database/interfaces/database.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';
import {
    buildDatabaseRepository,
    buildPrismaKnownRequestError,
} from '@test/unit/helpers/test.unit.database.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

const NamedErrorContract = {
    [DatabaseRecordNotFoundCode]: WorkspaceNotFoundException,
    [DatabaseUniqueConstraintCode]: {
        [Prisma.WorkspaceScalarFieldEnum.slug]:
            WorkspaceSlugAlreadyExistsException,
    },
} satisfies IDatabaseErrorContract;

describe('DatabaseRepositoryBase', () => {
    let named: DatabaseRepositoryBase;
    let empty: DatabaseRepositoryBase;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                DatabaseUtil,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        'database.serverSelectionTimeoutInMs': 5000,
                        'database.connectTimeoutInMs': 5000,
                    }),
                },
            ],
        }).compile();

        const databaseUtil = module.get(DatabaseUtil);
        named = buildDatabaseRepository(databaseUtil, NamedErrorContract);
        empty = buildDatabaseRepository(
            databaseUtil,
            DatabaseEmptyErrorContract
        );
    });

    describe('toException', () => {
        it('returns the same DatabaseUnavailableException instance it is given', () => {
            const exception = new DatabaseUnavailableException();

            expect(named['toException'](exception)).toBe(exception);
            expect(empty['toException'](exception)).toBe(exception);
        });

        it('returns a new instance of the contract class for a P2002 on the mapped field', () => {
            const error = buildPrismaKnownRequestError('P2002', 'slug');

            const result = named['toException'](error);

            expect(result).toBeInstanceOf(WorkspaceSlugAlreadyExistsException);
            expect(named['toException'](error)).not.toBe(result);
        });

        it('returns the P2025 class the contract names', () => {
            const result = named['toException'](
                buildPrismaKnownRequestError('P2025')
            );

            expect(result).toBeInstanceOf(WorkspaceNotFoundException);
        });

        it('returns AppUnknownException carrying the error for a P2002 on another field', () => {
            const error = buildPrismaKnownRequestError('P2002', 'name');

            const result = named['toException'](error);

            expect(result).toBeInstanceOf(AppUnknownException);
            expect(result.rawError).toBe(error);
        });

        it('returns AppUnknownException carrying the error for a P2034', () => {
            const error = buildPrismaKnownRequestError('P2034');

            const result = named['toException'](error);

            expect(result).toBeInstanceOf(AppUnknownException);
            expect(result.rawError).toBe(error);
        });

        it('returns AppUnknownException carrying the error for a plain Error', () => {
            const error = new Error('boom');

            const result = named['toException'](error);

            expect(result).toBeInstanceOf(AppUnknownException);
            expect(result.rawError).toBe(error);
        });

        it('returns AppUnknownException for a P2025 when the contract names none', () => {
            const error = buildPrismaKnownRequestError('P2025');

            const result = empty['toException'](error);

            expect(result).toBeInstanceOf(AppUnknownException);
            expect(result.rawError).toBe(error);
        });

        it('returns AppUnknownException for a P2002 when the contract names no field', () => {
            const error = buildPrismaKnownRequestError('P2002', 'slug');

            const result = empty['toException'](error);

            expect(result).toBeInstanceOf(AppUnknownException);
            expect(result.rawError).toBe(error);
        });
    });
});
