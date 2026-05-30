#include "signature.h"
#include "hash.h"
#include "mod_arith.h"

long long signMessage(const std::string& message, long long d, long long n) {
    long long h = customHash(message, n);
    // Signature = Hash^d mod n (RSA signing)
    return modPow(h, d, n);
}
