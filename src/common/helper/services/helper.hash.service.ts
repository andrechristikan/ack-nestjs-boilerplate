import { IHelperHashService } from '@common/helper/interfaces/helper.hash.service.interface';
import { Injectable } from '@nestjs/common';
import { compareSync, genSaltSync, hashSync } from 'bcryptjs';
import { MD5, SHA256, enc } from 'crypto-js';

@Injectable()
export class HelperHashService implements IHelperHashService {
    bcryptGenerateSalt(length: number): string {
        return genSaltSync(length);
    }

    bcryptHash(passwordString: string, salt: string): string {
        return hashSync(passwordString, salt);
    }

    bcryptCompare(passwordString: string, passwordHashed: string): boolean {
        return compareSync(passwordString, passwordHashed);
    }

    sha256Hash(string: string): string {
        return SHA256(string).toString(enc.Hex);
    }

    sha256Compare(hashOne: string, hashTwo: string): boolean {
        return hashOne === hashTwo;
    }

    md5Hash(string: string): string {
        return MD5(string).toString(enc.Hex);
    }

    md5Compare(hashOne: string, hashTwo: string): boolean {
        return hashOne === hashTwo;
    }
}
