import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthPasswordUtil {
    createContextWords(
        appName: string,
        email: string,
        username: string | null,
        name: string | null
    ): string[] {
        const localPart = email.slice(0, email.indexOf('@'));
        const words = [appName, localPart];
        if (username !== null) {
            words.push(username);
        }
        if (name !== null) {
            words.push(name);
        }

        return words;
    }
}
