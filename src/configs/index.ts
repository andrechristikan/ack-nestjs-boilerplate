import AppConfig from '@configs/app.config';
import AuthConfig from '@configs/auth.config';
import DatabaseConfig from '@configs/database.config';
import AwsConfig from '@configs/aws.config';
import UserConfig from '@configs/user.config';
import RequestConfig from '@configs/request.config';
import DocConfig from '@configs/doc.config';
import MessageConfig from '@configs/message.config';
import EmailConfig from '@configs/email.config';
import RedisConfig from '@configs/redis.config';
import ForgotPasswordConfig from '@configs/forgot-password.config';
import VerificationConfig from '@configs/verification.config';
import HomeConfig from '@configs/home.config';
import LoggerConfig from '@configs/logger.config';
import SessionConfig from '@configs/session.config';
import TermPolicyConfig from '@configs/term-policy.config';
import FeatureFlagConfig from '@configs/feature-flag.config';
import ResponseConfig from '@configs/response.config';

export default [
    AppConfig,
    AuthConfig,
    DatabaseConfig,
    AwsConfig,
    UserConfig,
    RequestConfig,
    DocConfig,
    MessageConfig,
    EmailConfig,
    RedisConfig,
    LoggerConfig,
    ForgotPasswordConfig,
    VerificationConfig,
    HomeConfig,
    SessionConfig,
    TermPolicyConfig,
    FeatureFlagConfig,
    ResponseConfig,
];
