import { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumTermPolicyType,
    TermPolicy,
    TermPolicyUserAcceptance,
} from '@generated/prisma-client';
import { IUserRef } from '@modules/user/interfaces/user.interface';

export interface ITermPolicyUserAcceptance extends TermPolicyUserAcceptance {
    user: IUserRef;
    termPolicy: TermPolicy;
}

export interface ITermPolicyContentUpload {
    language: EnumMessageLanguage;
    size: number;
    key: string;
}

export interface ITermPolicyContent extends Omit<IAwsS3, 'data'> {
    language: EnumMessageLanguage;
}

export interface ITermPolicyCreate {
    type: EnumTermPolicyType;
    version: number;
    contents: ITermPolicyContentUpload[];
}

export interface ITermPolicyContentPresign {
    type: EnumTermPolicyType;
    version: number;
    language: EnumMessageLanguage;
    size: number;
}
