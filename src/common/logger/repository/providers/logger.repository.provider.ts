import { LoggerRepositoryName } from 'src/common/logger/repository/entities/logger.entity';
import { LoggerMongoRepository } from 'src/common/logger/repository/repositories/logger.mongo.repository';

export const LoggerRepositoryProvider = {
    // useClass:
    //     process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
    //         ? LoggerMongoRepository
    //         : LoggerPostgresRepository,
    useClass: LoggerMongoRepository,
    provide: LoggerRepositoryName,
};
