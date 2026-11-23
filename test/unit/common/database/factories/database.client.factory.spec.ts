import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseClientFactory } from '@common/database/factories/database.client.factory';
import { DatabaseExtensionFactory } from '@common/database/factories/database.extension.factory';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('DatabaseClientFactory', () => {
    const databaseExtensionFactory: MockProxy<DatabaseExtensionFactory> =
        mock<DatabaseExtensionFactory>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let factory: DatabaseClientFactory;

    beforeEach(async () => {
        vi.resetAllMocks();

        databaseUtil.buildClientUrl.mockReturnValue(
            'postgresql://h:5432/db?connect_timeout=5&pool_timeout=5'
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DatabaseClientFactory,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        'database.url': 'postgresql://h:5432/db',
                    }),
                },
                { provide: DatabaseUtil, useValue: databaseUtil },
                {
                    provide: DatabaseExtensionFactory,
                    useValue: databaseExtensionFactory,
                },
            ],
        }).compile();

        factory = module.get(DatabaseClientFactory);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('builds the client url from the configured database url', () => {
            expect(databaseUtil.buildClientUrl).toHaveBeenCalledTimes(1);
            expect(databaseUtil.buildClientUrl).toHaveBeenCalledWith(
                'postgresql://h:5432/db'
            );
        });
    });

    describe('create', () => {
        it('applies the audit extension, then the CASL extension, through $extends', () => {
            const extension = Symbol('audit-extension');
            const finalClient = Symbol('final-client');
            const secondExtend = vi.fn().mockReturnValue(finalClient);
            databaseExtensionFactory.build.mockReturnValue(extension as never);
            const extendSpy = vi
                .spyOn(factory, '$extends')
                .mockReturnValue({ $extends: secondExtend } as never);

            const result = factory.create();

            expect(databaseExtensionFactory.build).toHaveBeenCalledTimes(1);
            expect(extendSpy).toHaveBeenCalledWith(extension);
            expect(secondExtend).toHaveBeenCalledTimes(1);
            expect(result).toBe(finalClient);
        });
    });
});
