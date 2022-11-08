import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { DatabaseEntityAbstract } from 'src/common/database/abstracts/database.entity.repository';

export const UserDatabaseName = 'users';
export const UserRepository = 'UserRepositoryToken';

export class UserEntity extends DatabaseEntityAbstract {
    username: string;
    firstName: string;
    lastName: string;
    mobileNumber: string;
    email: string;
    role: string;
    password: string;
    passwordExpired: Date;
    salt: string;
    isActive: boolean;
    photo?: AwsS3Serialization;
}
