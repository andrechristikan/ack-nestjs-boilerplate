import { CacheService } from '@common/cache/services/cache.service';
import { EnumMigrationType } from '@migration/enums/migration.enum';
import type { IMigrationOptions } from '@migration/interfaces/migration.interface';
import { Logger } from '@nestjs/common';
import { CommandRunner, Option } from 'nest-commander';

export abstract class MigrationSeedBase extends CommandRunner {
    private readonly baseLogger: Logger = new Logger(MigrationSeedBase.name);

    constructor(protected readonly cacheService: CacheService) {
        super();
    }

    async run(
        _passedParam: string[],
        options?: IMigrationOptions
    ): Promise<void> {
        this.baseLogger.log(
            { type: options?.type ?? null },
            'Running seed migration'
        );

        // Sequential by design: side effects whose order is part of the contract
        if (options?.type === EnumMigrationType.remove) {
            await this.remove();
            await this.cacheService.flush();
        } else if (options?.type === EnumMigrationType.seed) {
            await this.seed();
            await this.cacheService.flush();
        } else {
            this.baseLogger.warn(
                {
                    seed: EnumMigrationType.seed,
                    remove: EnumMigrationType.remove,
                },
                'Please specify a migration type'
            );
        }
    }

    @Option({
        flags: '-t, --type <type>',
        choices: [EnumMigrationType.seed, EnumMigrationType.remove],
        required: true,
        name: 'type',
        description: `Migration type: ${EnumMigrationType.seed} or ${EnumMigrationType.remove}`,
    })
    parseType(val: EnumMigrationType): EnumMigrationType | null {
        return val;
    }

    abstract seed(): Promise<void>;
    abstract remove(): Promise<void>;
}
