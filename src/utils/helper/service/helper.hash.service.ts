import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash, compare, genSalt } from 'bcrypt';
import { createHash } from 'crypto';

@Injectable()
export class HelperHashService {
    constructor(private readonly configService: ConfigService) {}

    async randomSalt(length?: number): Promise<string> {
        return genSalt(
            length || this.configService.get<number>('helper.salt.length')
        );
    }

    async bcrypt(passwordString: string, salt: string): Promise<string> {
        return hash(passwordString, salt);
    }

    async bcryptCompare(
        passwordString: string,
        passwordHashed: string
    ): Promise<boolean> {
        return compare(passwordString, passwordHashed);
    }

    async sha256(string: string): Promise<string> {
        return createHash('sha256').update(string).digest('hex');
    }

    async sha256Compare(hashOne: string, hashTwo: string): Promise<boolean> {
        return hashOne === hashTwo;
    }
}
