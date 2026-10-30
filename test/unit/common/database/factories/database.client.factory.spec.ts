import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseClientFactory } from '@common/database/factories/database.client.factory';
import { DatabaseExtensionFactory } from '@common/database/factories/database.extension.factory';

describe('DatabaseClientFactory', () => {
    const databaseExtensionFactory: MockProxy<DatabaseExtensionFactory> =
        mock<DatabaseExtensionFactory>();

    let factory: DatabaseClientFactory;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DatabaseClientFactory,
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

    describe('create', () => {
        it('builds the audit extension and applies it through $extends', () => {
            const extension = Symbol('audit-extension');
            const extendedClient = Symbol('extended-client');
            databaseExtensionFactory.build.mockReturnValue(extension as never);
            const extendSpy = vi
                .spyOn(factory, '$extends')
                .mockReturnValue(extendedClient as never);

            const result = factory.create();

            expect(databaseExtensionFactory.build).toHaveBeenCalledTimes(1);
            expect(extendSpy).toHaveBeenCalledWith(extension);
            expect(result).toBe(extendedClient);
        });
    });
});
