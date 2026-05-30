#include "verify.h"
#include "hash.h"
#include "mod_arith.h"

bool verifySignature(const std::string& message, long long signature,
                     long long e, long long n) {
    // Recover hash from signature using public key
    long long recoveredHash = modPow(signature, e, n);
    // Recompute hash from message
    long long computedHash = customHash(message, n);
    return (recoveredHash == computedHash);
}
