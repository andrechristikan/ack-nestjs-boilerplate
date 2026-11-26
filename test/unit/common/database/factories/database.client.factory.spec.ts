import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseClientFactory } from '@common/database/factories/database.client.factory';
import { DatabaseExtensionFactory } from '@common/database/factories/database.extension.factory';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('DatabaseClientFactory', () => {
    const databaseExtensionFactory: MockProxy<DatabaseExtensionFactory> =
        mock<DatabaseExtensionFactory>();

    let factory: DatabaseClientFactory;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DatabaseClientFactory,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'database.url': 'mongodb://h:27017/db',
                    }),
                },
                DatabaseUtil,
                {
                    provide: DatabaseExtensionFactory,
                    useValue: databaseExtensionFactory,
                },
            ],
        }).compile();

        factory = module.get(DatabaseClientFactory);
    });

    describe('constructor', () => {
        it('builds the client url from the configured database url', () => {
            const engineConfig = (
                factory as unknown as {
                    _engineConfig: {
                        overrideDatasources: { db: { url: string } };
                    };
                }
            )._engineConfig;

            expect(engineConfig.overrideDatasources.db.url).toBe(
                'mongodb://h:27017/db?serverSelectionTimeoutMS=5000&connectTimeoutMS=5000'
            );
        });
    });

    describe('create', () => {
        it('applies the audit extension, then the unavailable extension on its result, and returns that client', () => {
            const auditExtension = Symbol('audit-extension');
            const unavailableExtension = Symbol('unavailable-extension');
            const finalClient = Symbol('final-client');
            const auditedClient = {
                $extends: vi.fn().mockReturnValue(finalClient),
            };
            databaseExtensionFactory.build.mockReturnValue(
                auditExtension as never
            );
            databaseExtensionFactory.buildUnavailable.mockReturnValue(
                unavailableExtension as never
            );
            const extendSpy = vi
                .spyOn(factory, '$extends')
                .mockReturnValue(auditedClient as never);

            const result = factory.create();

            expect(extendSpy).toHaveBeenCalledWith(auditExtension);
            expect(auditedClient.$extends).toHaveBeenCalledWith(
                unavailableExtension
            );
            expect(result).toBe(finalClient);
        });
    });
});
