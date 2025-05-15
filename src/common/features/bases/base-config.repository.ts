import { DatabaseRepositoryBase } from 'src/common/database/bases/database.repository';
import { AppBaseConfigEntityBase } from '@common/features/bases/base-config.entity';
import { IDatabaseDocument } from 'src/common/database/interfaces/database.interface';

export abstract class AppBaseConfigRepositoryBase<T extends AppBaseConfigEntityBase, D extends IDatabaseDocument<T>> extends DatabaseRepositoryBase<T, D> {
}