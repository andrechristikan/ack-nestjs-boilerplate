import AppConfig from 'src/config/app.config';
import AuthConfig from 'src/config/auth.config';
import DatabaseConfig from 'src/config/database.config';
import HelperConfig from 'src/config/helper.config';
import AwsConfig from 'src/config/aws.config';
import UserConfig from './user.config';
import KafkaConfig from './kafka.config';

export default [
    AppConfig,
    AuthConfig,
    DatabaseConfig,
    HelperConfig,
    AwsConfig,
    UserConfig,
    KafkaConfig
];
