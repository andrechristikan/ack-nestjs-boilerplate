import type { Provider } from '@nestjs/common';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { FirebaseUtil } from '@common/firebase/utils/firebase.util';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { LoggerUrlUtil } from '@common/logger/utils/logger.url.util';
import { LoggerUtil } from '@common/logger/utils/logger.util';
import { PaginationCursorUtil } from '@common/pagination/utils/pagination.cursor.util';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestUtil } from '@common/request/utils/request.util';

export const TestUnitKitProviders: Provider[] = [
    HelperArrayService,
    HelperDateService,
    HelperEncryptionService,
    HelperHashService,
    HelperNumberService,
    HelperStringService,
    DatabaseUtil,
    LoggerUrlUtil,
    LoggerUtil,
    PaginationCursorUtil,
    PaginationFilterUtil,
    PaginationOffsetUtil,
    PaginationQueryUtil,
    RequestUtil,
    FirebaseUtil,
];

export const TestUnitKitEncryptionSecret = Buffer.alloc(48, 7).toString(
    'base64url'
);

export const TestUnitKitConfigValues: Record<string, unknown> = {
    'app.timezone': 'UTC',
    'app.encryptionSecret': TestUnitKitEncryptionSecret,
    'helper.argon2': {
        memoryInBytes: 8192,
        passes: 1,
        parallelism: 1,
        saltLength: 16,
        tagLength: 32,
    },
    'database.serverSelectionTimeoutInMs': 5000,
    'database.connectTimeoutInMs': 5000,
};
