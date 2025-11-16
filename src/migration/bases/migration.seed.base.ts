import { ENUM_MIGRATION_TYPE } from '@migration/enums/migration.enum';
import { IMigrationOptions } from '@migration/interfaces/migration.interface';
import { Logger } from '@nestjs/common';
import { CommandRunner, Option } from 'nest-commander';

export abstract class MigrationSeedBase extends CommandRunner {
    private readonly _logger: Logger = new Logger(MigrationSeedBase.name);

    async run(
        _passedParam: string[],
        options?: IMigrationOptions
    ): Promise<void> {
        this._logger.log(`Running ${MigrationSeedBase.name} migration...`);

        if (options?.type === ENUM_MIGRATION_TYPE.REMOVE) {
            await this.remove();
        } else if (options?.type === ENUM_MIGRATION_TYPE.SEED) {
            await this.seed();
        } else {
            this._logger.warn(
                `Please specify --type ${ENUM_MIGRATION_TYPE.SEED} or ${ENUM_MIGRATION_TYPE.SEED}`
            );
        }
    }

    @Option({
        flags: '-t, --type <type>',
        choices: [ENUM_MIGRATION_TYPE.SEED, ENUM_MIGRATION_TYPE.REMOVE],
        defaultValue: null,
        required: true,
        name: 'type',
        description: `Migration type: ${ENUM_MIGRATION_TYPE.SEED} or ${ENUM_MIGRATION_TYPE.SEED}`,
    })
    parseType(val: ENUM_MIGRATION_TYPE): ENUM_MIGRATION_TYPE | null {
        return val;
    }

    abstract seed(): Promise<void>;
    abstract remove(): Promise<void>;
}
