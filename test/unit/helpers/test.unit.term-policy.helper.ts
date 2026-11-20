import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';

export async function createTermPolicyUtilModule(
    uploadContentPathPattern: string
): Promise<TestingModule> {
    return Test.createTestingModule({
        providers: [
            TermPolicyUtil,
            ...TestUnitKitProviders,
            {
                provide: ConfigService,
                useValue: buildConfigService({
                    ...TestUnitKitConfigValues,
                    'termPolicy.uploadContentPathPattern':
                        uploadContentPathPattern,
                    'termPolicy.contentPublicPathPattern':
                        'public/term-policies/{type}/{version}',
                    'termPolicy.content.maxSizeInBytes': 4096,
                    'termPolicy.contentKeyRandomLength': 20,
                }),
            },
        ],
    }).compile();
}
