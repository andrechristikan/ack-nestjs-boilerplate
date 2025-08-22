import crypto from 'crypto';
import fs from 'fs';
import path, { join } from 'path';

/**
 * Utility class for generating and managing JWT ES512 key pairs and JWKS.
 * Handles creation, rollback, and environment configuration updates for JWT authentication keys.
 */
class JwtKeysGenerator {
    private readonly keyDir: string;
    private readonly jwksOutputPath: string;
    private readonly accessTokenPrivateKeyPath: string;
    private readonly accessTokenPublicKeyPath: string;
    private readonly refreshTokenPrivateKeyPath: string;
    private readonly refreshTokenPublicKeyPath: string;

    constructor(keyDir: string) {
        this.keyDir = keyDir;
        this.accessTokenPrivateKeyPath = path.join(
            this.keyDir,
            'access-token.pem'
        );
        this.accessTokenPublicKeyPath = path.join(
            this.keyDir,
            'access-token.pub'
        );
        this.refreshTokenPrivateKeyPath = path.join(
            this.keyDir,
            'refresh-token.pem'
        );
        this.refreshTokenPublicKeyPath = path.join(
            this.keyDir,
            'refresh-token.pub'
        );
        this.jwksOutputPath = path.join(this.keyDir, 'jwks.json');
    }

    /**
     * Creates directory if it doesn't exist.
     * @param dir - Directory path to create
     */
    ensureDir(dir: string): void {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Generates ES512 elliptic curve key pair and saves to specified paths.
     * @param privateKeyPath - Path to save private key
     * @param publicKeyPath - Path to save public key
     */
    generateES512KeyPair(privateKeyPath: string, publicKeyPath: string): void {
        const keyPair = crypto.generateKeyPairSync('ec', {
            namedCurve: 'secp521r1',
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        });

        fs.writeFileSync(privateKeyPath, keyPair.privateKey);
        fs.writeFileSync(publicKeyPath, keyPair.publicKey);

        try {
            fs.chmodSync(privateKeyPath, 0o600);
        } catch (err) {
            console.warn(`Could not set permissions for ${privateKeyPath}`);
        }
    }

    /**
     * Extracts elliptic curve parameters from public key for JWK creation.
     * @param publicKeyPath - Path to public key file
     * @returns Object containing x, y coordinates and curve type
     */
    extractECParams(publicKeyPath: string): {
        x?: string;
        y?: string;
        crv?: string;
    } {
        try {
            const pemContent = fs.readFileSync(publicKeyPath, 'utf8');
            const publicKey = crypto.createPublicKey({
                key: pemContent,
                format: 'pem',
            });

            const keyDetails = publicKey.export({ format: 'jwk' });

            return {
                x: keyDetails.x,
                y: keyDetails.y,
                crv: keyDetails.crv,
            };
        } catch (error) {
            console.error(
                `Error extracting EC parameters from ${publicKeyPath}: ${error.message}`
            );
            throw error;
        }
    }

    /**
     * Creates JSON Web Key (JWK) object from elliptic curve parameters.
     * @param params - EC parameters (x, y, crv)
     * @param kid - Key identifier
     * @returns JWK object for ES512 algorithm
     */
    createJwk(
        params: {
            x?: string;
            y?: string;
            crv?: string;
        },
        kid: string
    ): {
        kty: string;
        crv?: string;
        x?: string;
        y?: string;
        use: string;
        alg: string;
        kid: string;
    } {
        return {
            kty: 'EC',
            crv: params.crv,
            x: params.x,
            y: params.y,
            use: 'sig',
            alg: 'ES512',
            kid,
        };
    }

    /**
     * Creates JSON Web Key Set (JWKS) from access and refresh token public keys.
     * @param accessKeyPath - Path to access token public key
     * @param refreshKeyPath - Path to refresh token public key
     * @param outputPath - Path to save JWKS file
     */
    createJwks(
        accessKeyPath: string,
        refreshKeyPath: string,
        outputPath: string
    ): void {
        try {
            const accessParams = this.extractECParams(accessKeyPath);
            const refreshParams = this.extractECParams(refreshKeyPath);

            // randomly generate a kid for the keys
            const accessKid = crypto.randomBytes(16).toString('hex');
            const refreshKid = crypto.randomBytes(16).toString('hex');
            const accessJwk = this.createJwk(accessParams, accessKid);
            const refreshJwk = this.createJwk(refreshParams, refreshKid);

            const jwks = {
                keys: [accessJwk, refreshJwk],
            };

            const outputDir = path.dirname(outputPath);
            this.ensureDir(outputDir);

            fs.writeFileSync(outputPath, JSON.stringify(jwks, null, 2));
            console.log(`JWKS successfully created at ${outputPath}`);
        } catch (error) {
            console.error(`Error creating JWKS: ${error.message}`);
            throw error;
        }
    }

    /**
     * Main method to generate all JWT keys and JWKS file.
     * Creates access token keys, refresh token keys, and JWKS configuration.
     */
    generateKeys(): void {
        try {
            this.ensureDir(this.keyDir);

            // Generate access token
            console.log('Generating Access Token ES512 keys...');
            this.generateES512KeyPair(
                this.accessTokenPrivateKeyPath,
                this.accessTokenPublicKeyPath
            );

            // Generate refresh token
            console.log('Generating Refresh Token ES512 keys...');
            this.generateES512KeyPair(
                this.refreshTokenPrivateKeyPath,
                this.refreshTokenPublicKeyPath
            );

            // Generate JWKS
            console.log('Generating JWKS...');
            this.createJwks(
                this.accessTokenPublicKeyPath,
                this.refreshTokenPublicKeyPath,
                this.jwksOutputPath
            );

            console.log('JWT keys and JWKS generated successfully!');
        } catch (err) {
            console.error(`Failed to generate JWT keys: ${err.message}`);
            process.exit(1);
        }
    }

    /**
     * Removes all generated JWT keys and JWKS files.
     * Used for cleanup or regeneration scenarios.
     */
    rollbackKeys(): void {
        try {
            if (fs.existsSync(this.accessTokenPrivateKeyPath)) {
                fs.unlinkSync(this.accessTokenPrivateKeyPath);
            }

            if (fs.existsSync(this.accessTokenPublicKeyPath)) {
                fs.unlinkSync(this.accessTokenPublicKeyPath);
            }

            if (fs.existsSync(this.refreshTokenPrivateKeyPath)) {
                fs.unlinkSync(this.refreshTokenPrivateKeyPath);
            }

            if (fs.existsSync(this.refreshTokenPublicKeyPath)) {
                fs.unlinkSync(this.refreshTokenPublicKeyPath);
            }

            if (fs.existsSync(this.jwksOutputPath)) {
                fs.unlinkSync(this.jwksOutputPath);
            }

            console.log('JWT keys and JWKS removed successfully!');
        } catch (err) {
            console.error(`Failed to remove JWT keys: ${err.message}`);
            process.exit(1);
        }
    }

    /**
     * Updates .env file with new key identifiers from generated JWKS.
     * Synchronizes environment configuration with generated keys.
     */
    updateEnv(): void {
        const envPath = path.join(process.cwd(), '.env');
        const envExamplePath = path.join(process.cwd(), '.env.example');

        // 1. Read jwks.json
        const jwksPath = path.join(this.keyDir, 'jwks.json');
        if (!fs.existsSync(jwksPath)) {
            console.error(`jwks.json not found at ${jwksPath}`);
            process.exit(1);
        }
        const jwks = JSON.parse(fs.readFileSync(jwksPath, 'utf8'));
        const [accessJwk, refreshJwk] = jwks.keys;

        // 2. Ensure .env exists
        if (!fs.existsSync(envPath)) {
            if (fs.existsSync(envExamplePath)) {
                fs.copyFileSync(envExamplePath, envPath);
                console.log('.env file created from .env.example');
            } else {
                console.error('.env.example not found. Cannot create .env');
                process.exit(1);
            }
        }

        // 3. Extract current KIDs from .env
        const envContent = fs.readFileSync(envPath, 'utf8');
        const accessKidMatch = envContent.match(
            /^AUTH_JWT_ACCESS_TOKEN_KID=(.*)$/m
        );
        const refreshKidMatch = envContent.match(
            /^AUTH_JWT_REFRESH_TOKEN_KID=(.*)$/m
        );
        const accessKid = accessKidMatch ? accessKidMatch[1] : '';
        const refreshKid = refreshKidMatch ? refreshKidMatch[1] : '';

        // 4. If already up-to-date, skip
        if (accessKid === accessJwk.kid && refreshKid === refreshJwk.kid) {
            console.log('.env KIDs are already up to date.');
            return;
        }

        // 5. Update .env with new KIDs
        let newEnv = envContent;
        if (accessKidMatch) {
            newEnv = newEnv.replace(
                /^AUTH_JWT_ACCESS_TOKEN_KID=.*$/m,
                `AUTH_JWT_ACCESS_TOKEN_KID=${accessJwk.kid}`
            );
        } else {
            newEnv += `\nAUTH_JWT_ACCESS_TOKEN_KID=${accessJwk.kid}`;
        }
        if (refreshKidMatch) {
            newEnv = newEnv.replace(
                /^AUTH_JWT_REFRESH_TOKEN_KID=.*$/m,
                `AUTH_JWT_REFRESH_TOKEN_KID=${refreshJwk.kid}`
            );
        } else {
            newEnv += `\nAUTH_JWT_REFRESH_TOKEN_KID=${refreshJwk.kid}`;
        }
        fs.writeFileSync(envPath, newEnv);
        console.log('.env KIDs updated successfully.');
    }
}

function main() {
    const argv = process.argv.slice(2);
    const command = argv[0] || 'generate';
    const keyDir = argv[1] || join(process.cwd(), 'keys');

    const generator = new JwtKeysGenerator(keyDir);

    if (command === 'generate') {
        generator.generateKeys();
        generator.updateEnv();
    } else if (command === 'rollback') {
        generator.rollbackKeys();
    } else {
        console.log(`
Usage: node migrate-jwt-keys.js [command] [keysDir]

Commands:
  generate    Generate JWT ES512 keys and JWKS (default)
  rollback    Remove JWT ES512 keys and JWKS

Arguments:
  keysDir     Output directory for keys (default: ./keys)
        `);
    }
}

/**
 * CLI entry point that processes command line arguments and executes appropriate operations.
 * Supports generate and rollback commands with configurable key directory.
 */
main();
