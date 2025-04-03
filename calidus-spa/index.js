const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const blake2b = require('blake2b');
const nacl = require('tweetnacl');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');  // Allow requests from any origin
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

const PORT = 3050;
const NONCE_EXPIRY = 300000; // 5 minutes
const HASH_NONCE_BEFORE_RETURN = false;  // Set false to disable hashing the nonce before returning to frontend
const HASH_NONCE_BEFORE_VERIFY = false;  // Set false to skip hashing when verifying

// Temporary in-memory store
const nonceStore = {};

// Generate raw, random nonce
function generateRawNonce() {
    return crypto.randomBytes(16).toString('hex');
}

// Hash the nonce to standardize
function hashNonce(nonce) {
    const nonceBuffer = Buffer.from(nonce, 'utf8');
    const output = Buffer.alloc(32);
    blake2b(32).update(nonceBuffer).digest(output);
    return output.toString('hex');
}

// Signature verification function
function verifyCalidusSignature(signature, message, publicKeyHex) {
    try {
        const publicKey = Buffer.from(publicKeyHex, 'hex');
        const signatureBytes = Buffer.from(signature, 'hex');
        const messageBytes = Buffer.from(message, 'hex');

        const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey);

        if (!isValid) {
            console.error(`❌ Signature verification failed.`);
        }

        return isValid;
    } catch (error) {
        console.error('❌ Error during signature verification:', error.message);
        return false;
    }
}

// Step 1: Request Authentication
app.post('/request-auth', async (req, res) => {
    const {poolId, calidusKey} = req.body;

    if (!poolId && !calidusKey) {
        console.error('❌ Request failed: No poolId or calidusId provided.');
        return res.status(400).send({error: 'You must provide either a poolId or a calidusId.'});
    }

    try {
        let response;
        let calidusId = null;

        if (poolId) {
            response = await axios.get(`https://preview.koios.rest/api/v1/pool_calidus_keys`, {
                params: {
                    pool_status: 'eq.registered',
                    pool_id_bech32: `eq.${poolId}`
                }
            });

            if (response.data.length > 0) {
                calidusId = response.data[0].calidus_id_bech32;
            }
        } else if (calidusKey) {
            response = await axios.get(`https://preview.koios.rest/api/v1/pool_calidus_keys`, {
                params: {
                    pool_status: 'eq.registered',
                    calidus_id_bech32: `eq.${calidusKey}`
                }
            });
        }

        if (!response || response.data.length === 0) {
            console.error('❌ No valid association found in the Koios API response.');
            return res.status(404).send({error: 'No valid association found with the provided Pool ID or Calidus Key.'});
        }

        const calidusPubKey = response.data[0].calidus_pub_key;

        if (!calidusPubKey) {
            console.error('❌ calidus_pub_key not found in Koios response.');
            return res.status(404).send({error: 'No calidus_pub_key found in the Koios response.'});
        }

        // Generate a raw nonce and maybe hash it
        const rawNonce = generateRawNonce();
        const nonceToReturn = HASH_NONCE_BEFORE_RETURN ? hashNonce(rawNonce) : rawNonce;

        // Store the calidusKey and public key received from Koios
        nonceStore[rawNonce] = {
            calidusKey: calidusId || calidusKey,
            calidusPubKey,
            poolId: poolId || null,
            expiresAt: Date.now() + NONCE_EXPIRY
        };

        console.log(`✅ Nonce generated: ${nonceToReturn} (Raw: ${rawNonce})`);
        return res.status(200).send({
            nonce: rawNonce,
            calidusId: calidusId || calidusKey,
            poolId,
            message: 'Nonce generated successfully. Sign it using your Calidus Key.'
        });

    } catch (error) {
        console.error('❌ Error communicating with Koios API:', error.message);
        return res.status(500).send({
            error: 'An error occurred while communicating with the Koios API.',
            details: error.message
        });
    }
});

// Step 4: Verify Signature
app.post('/verify-signature', (req, res) => {
    const {nonce, signature, calidusKey, nonceData} = req.body;
    console.log(nonce, signature, calidusKey, nonceData)
    if (!nonce || !calidusKey || !signature) {
        console.error('❌ Signature verification failed: Missing required fields.');
        return res.status(400).send({error: 'Missing required fields: nonce, calidusKey, signature.'});
    }

    // Get stored nonce data
    const storedNonceData = nonceStore[nonce];

    if (!storedNonceData) {
        console.error(`❌ Invalid or expired nonce: ${nonce}`);
        return res.status(400).send({error: 'Invalid or expired nonce.'});
    }

    if (Date.now() > storedNonceData.expiresAt) {
        console.error(`❌ Nonce expired: ${nonce}`);
        delete nonceStore[nonce];
        return res.status(400).send({error: 'Nonce has expired.'});
    }

    if (calidusKey !== storedNonceData.calidusId) {
        console.error(`❌ Provided Calidus Key does not match the requested key: ${calidusKey}`);
        return res.status(400).send({error: 'Provided Calidus Key does not match the requested key.'});
    }

    const nonceToVerify = HASH_NONCE_BEFORE_VERIFY ? hashNonce(nonce) : nonce;
console.log(nonceToVerify)
    // Use the cached public key for signature validation
    const isValid = verifyCalidusSignature(signature, nonceToVerify, storedNonceData.calidusPubKey);
console.log(isValid)
    if (!isValid) {
        console.error(`❌ Signature verification failed for Calidus Key: ${calidusKey}`);
        return res.status(400).send({error: 'Signature verification failed.'});
    }

    // Authentication successful
    delete nonceStore[nonce];
    console.log(`✅ Authentication successful for Calidus Key: ${calidusKey}`);
    return res.status(200).send({message: 'Authentication successful!'});
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});