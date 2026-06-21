import { EnumMigrationType } from '@migration/enums/migration.enum';
import { IMigrationOptions } from '@migration/interfaces/migration.interface';
import { Logger } from '@nestjs/common';
import { CommandRunner, Option } from 'nest-commander';

/**
 * Base seed command: dispatches to `seed()` or `remove()` based on the required `--type` flag.
 */
export abstract class MigrationSeedBase extends CommandRunner {
    private readonly _logger: Logger = new Logger(MigrationSeedBase.name);

    async run(
        _passedParam: string[],
        options?: IMigrationOptions
    ): Promise<void> {
        this._logger.log(`Running ${MigrationSeedBase.name} migration...`);

        if (options?.type === EnumMigrationType.remove) {
            await this.remove();
        } else if (options?.type === EnumMigrationType.seed) {
            await this.seed();
        } else {
            this._logger.warn(
                `Please specify --type ${EnumMigrationType.seed} or ${EnumMigrationType.seed}`
            );
        }
    }

    @Option({
        flags: '-t, --type <type>',
        choices: [EnumMigrationType.seed, EnumMigrationType.remove],
        required: true,
        name: 'type',
        description: `Migration type: ${EnumMigrationType.seed} or ${EnumMigrationType.seed}`,
    })
    parseType(val: EnumMigrationType): EnumMigrationType | null {
        return val;
    }

    abstract seed(): Promise<void>;
    abstract remove(): Promise<void>;
}
