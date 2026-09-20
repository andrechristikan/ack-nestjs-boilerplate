import { Injectable } from '@nestjs/common';
import { compareSync, genSaltSync, hashSync } from 'bcryptjs';
import { createHash, timingSafeEqual } from 'node:crypto';

@Injectable()
export class HelperHashService {
    bcryptGenerateSalt(length: number): string {
        return genSaltSync(length);
    }

    bcryptHash(passwordString: string, salt: string): string {
        return hashSync(passwordString, salt);
    }

    bcryptCompare(passwordString: string, passwordHashed: string): boolean {
        return compareSync(passwordString, passwordHashed);
    }

    sha256Hash(value: string): string {
        return createHash('sha256').update(value, 'utf8').digest('hex');
    }

    /** Constant-time comparison; strings of different byte length are never equal. */
    sha256Compare(hashOne: string, hashTwo: string): boolean {
        const one = Buffer.from(hashOne, 'utf8');
        const two = Buffer.from(hashTwo, 'utf8');

        return one.length === two.length && timingSafeEqual(one, two);
    }
}
