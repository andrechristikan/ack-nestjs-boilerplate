import { SettingRepositoryName } from 'src/common/setting/repository/entities/setting.entity';
import { SettingMongoRepository } from 'src/common/setting/repository/repositories/setting.mongo.repository';

export const SettingRepositoryProvider = {
    // useClass:
    //     process.env.DATABASE_TYPE === ENUM_DATABASE_TYPE.MONGO
    //         ? SettingMongoRepository
    //         : SettingPostgresRepository,
    useClass: SettingMongoRepository,
    provide: SettingRepositoryName,
};
