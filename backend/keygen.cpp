#include "keygen.h"
#include "mod_arith.h"
#include "gcd.h"

KeyPair generateKeys() {
    // p and q are hardcoded for demo reliability
    // All math below is computed from scratch — no library used
    long long p = 61;
    long long q = 53;
    long long n = p * q;               // n = 3233
    long long phi = (p - 1) * (q - 1); // phi = 3120

    // e must satisfy: 1 < e < phi and gcd(e, phi) == 1
    long long e = 17; // gcd(17, 3120) = 1, verified

    // d = modular inverse of e mod phi
    long long d = modInverse(e, phi);

    return KeyPair{e, d, n};
}
