import { AppBaseConfigEntityBase } from '@common/features/bases/base-config.entity';
import { IDatabaseDocument } from '@common/database/interfaces/database.interface';
import { DatabaseRepositoryBase } from '@common/database/bases/database.repository';

export abstract class AppBaseConfigRepositoryBase<
    Entity extends AppBaseConfigEntityBase,
    Document extends IDatabaseDocument<Entity>,
> extends DatabaseRepositoryBase<Entity, Document> {}
