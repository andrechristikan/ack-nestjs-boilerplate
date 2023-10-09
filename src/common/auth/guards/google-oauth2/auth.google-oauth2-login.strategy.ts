import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Profile } from 'passport';
import { AuthGooglePayloadSerialization } from 'src/common/auth/serializations/auth.google-payload.serialization';

@Injectable()
export class AuthGoogleOAuth2LoginStrategy extends PassportStrategy(
    Strategy,
    'googleLogin'
) {
    constructor(private readonly configService: ConfigService) {
        super({
            clientID: configService.get<string>('auth.googleOAuth2.clientId'),
            clientSecret: configService.get<string>(
                'auth.googleOAuth2.clientSecret'
            ),
            callbackURL: configService.get<string>(
                'auth.googleOAuth2.callbackUrlLogin'
            ),
            scope: ['profile', 'email', 'openid'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback
    ): Promise<any> {
        const { name, emails } = profile;
        const user: AuthGooglePayloadSerialization = {
            email: emails[0].value,
            name: `${name.givenName} ${name.familyName}`,
            accessToken,
            refreshToken,
        };

        done(null, user);
    }
}
