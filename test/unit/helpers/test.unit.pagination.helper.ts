import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

export async function createPaginationServiceModule(
    encryptionSecret: string
): Promise<TestingModule> {
    return Test.createTestingModule({
        providers: [
            ...TestUnitKitProviders,
            PaginationService,
            {
                provide: ConfigService,
                useValue: buildConfigService({
                    ...TestUnitKitConfigValues,
                    'app.encryptionSecret': encryptionSecret,
                }),
            },
        ],
    }).compile();
}
