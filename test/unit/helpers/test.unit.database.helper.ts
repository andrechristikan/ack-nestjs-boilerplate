import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { MockProxy } from 'vitest-mock-extended';
import { Prisma } from '@generated/prisma-client/client';
import { DatabaseClient } from '@common/database/constants/database.constant';
import { DatabaseClientFactory } from '@common/database/factories/database.client.factory';
import type { IDatabaseClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type { IDatabaseData } from '@common/database/interfaces/database.extension.interface';
import type { DatabaseExtensionFactory } from '@common/database/factories/database.extension.factory';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

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

/** The stub client's $extends returns its argument, so the extension's hooks are reachable. */
export function extractDatabaseExtension(
    factory: DatabaseExtensionFactory
): IExtension {
    const applyExtension = factory.build() as unknown as (client: {
        $extends: (ext: unknown) => unknown;
    }) => unknown;

    return applyExtension({
        $extends: (ext: unknown) => ext,
    }) as IExtension;
}

export async function createDatabaseService(
    configValues: Record<string, boolean | number>,
    databaseClientFactory: MockProxy<DatabaseClientFactory>,
    client: MockProxy<IDatabaseClient>
): Promise<DatabaseService> {
    const configService = buildConfigService({
        ...TestUnitKitConfigValues,
        ...configValues,
    });

    const module = await Test.createTestingModule({
        providers: [
            ...TestUnitKitProviders,
            DatabaseService,
            { provide: ConfigService, useValue: configService },
            {
                provide: DatabaseClientFactory,
                useValue: databaseClientFactory,
            },
            { provide: DatabaseClient, useValue: client },
        ],
    }).compile();

    return module.get(DatabaseService);
}

export function buildPrismaKnownRequestError(
    code: string,
    target: string | null = null
): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError('prisma failure', {
        code,
        clientVersion: '6.19.0',
        meta: target === null ? {} : { target: [target] },
    });
}
