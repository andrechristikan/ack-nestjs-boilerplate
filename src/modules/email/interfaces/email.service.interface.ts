import { UserDoc } from 'src/modules/user/repository/entities/user.entity';

export interface IEmailService {
    createSignUp(): Promise<boolean>;
    getSignUp(): Promise<boolean>;
    deleteSignUp(): Promise<boolean>;
    sendSignUp(user: UserDoc): Promise<boolean>;
}
