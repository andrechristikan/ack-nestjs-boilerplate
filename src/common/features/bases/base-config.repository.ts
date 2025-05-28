import { AppBaseConfigEntityBase } from '@common/features/bases/base-config.entity';
import { IDatabaseDocument } from '@common/database/interfaces/database.interface';
import { DatabaseRepositoryBase } from '@common/database/bases/database.repository';

export abstract class AppBaseConfigRepositoryBase<T extends AppBaseConfigEntityBase, D extends IDatabaseDocument<T>> extends DatabaseRepositoryBase<T, D> {
}