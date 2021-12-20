import AppConfig from 'src/config/app.config';
import AuthConfig from 'src/config/auth.config';
import DatabaseConfig from 'src/config/database.config';
import HelperConfig from 'src/config/helper.config';
import MiddlewareConfig from 'src/config/middleware.config';
import AwsConfig from 'src/config/aws.config';
import KafkaConfig from 'src/config/kafka.config';
import UserConfig from './user.config';

export default [
    AppConfig,
    AuthConfig,
    DatabaseConfig,
    HelperConfig,
    MiddlewareConfig,
    AwsConfig,
    KafkaConfig,
    UserConfig
];
