import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseClientToken } from '@common/database/constants/database.constant';
import { DatabaseClientFactory } from '@common/database/factories/database.client.factory';
import type { IDatabaseClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type { IDatabaseData } from '@common/database/interfaces/database.extension.interface';
import type { DatabaseExtensionUtil } from '@common/database/utils/database.extension.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

export interface IExtensionQueryArgs {
    model: string;
    args: IDatabaseData;
    query: (args: IDatabaseData) => Promise<unknown>;
}

export interface IExtension {
    query: {
        $allModels: {
            create: (input: IExtensionQueryArgs) => Promise<unknown>;
            createMany: (input: IExtensionQueryArgs) => Promise<unknown>;
            update: (input: IExtensionQueryArgs) => Promise<unknown>;
            updateMany: (input: IExtensionQueryArgs) => Promise<unknown>;
            upsert: (input: IExtensionQueryArgs) => Promise<unknown>;
        };
    };
    model: {
        $allModels: {
            softDelete: (
                this: { update: (args: IDatabaseData) => Promise<unknown> },
                args: IDatabaseData
            ) => Promise<unknown>;
            restore: (
                this: { update: (args: IDatabaseData) => Promise<unknown> },
                args: IDatabaseData
            ) => Promise<unknown>;
        };
    };
}

// `Prisma.defineExtension` wraps an object definition into `(client) => client.$extends(ext)`
// (see the generated Prisma runtime); passing a stub client whose `$extends` returns its
// argument unwraps `ext` itself, so every query/model hook can be invoked directly.
export function extractDatabaseExtension(
    util: DatabaseExtensionUtil
): IExtension {
    const applyExtension = util.build() as unknown as (client: {
        $extends: (ext: unknown) => unknown;
    }) => unknown;

    return applyExtension({
        $extends: (ext: unknown) => ext,
    }) as IExtension;
}

export async function createDatabaseService(
    configValues: Record<string, boolean>,
    databaseClientFactory: MockProxy<DatabaseClientFactory>,
    client: MockProxy<IDatabaseClient>
): Promise<DatabaseService> {
    const configService = buildConfigService(configValues);

    const module = await Test.createTestingModule({
        providers: [
            DatabaseService,
            { provide: ConfigService, useValue: configService },
            {
                provide: DatabaseClientFactory,
                useValue: databaseClientFactory,
            },
            { provide: DatabaseClientToken, useValue: client },
        ],
    }).compile();

    return module.get(DatabaseService);
}
