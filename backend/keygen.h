#pragma once

struct KeyPair {
    long long e;  // public exponent
    long long d;  // private exponent
    long long n;  // modulus (shared)
};

KeyPair generateKeys();
