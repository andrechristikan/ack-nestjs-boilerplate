import { ApiKeyRepositoryName } from 'src/common/api-key/repository/entity/api-key.entity';
import { ApiKeyMongoRepository } from 'src/common/api-key/repository/repositories/api-key.mongo.repository';

export const ApiKeyRepositoryProvider = {
    // useClass:
    //     process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
    //         ? ApiKeyMongoRepository
    //         : ApiKeyPostgresRepository,
    useClass: ApiKeyMongoRepository,
    provide: ApiKeyRepositoryName,
};
