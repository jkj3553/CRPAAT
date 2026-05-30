#include <iostream>
#include <string>
#include "keygen.h"
#include "signature.h"
#include "verify.h"
#include "hash.h"

int main(int argc, char* argv[]) {
    if (argc < 2) return 1;

    std::string command = argv[1];

    if (command == "keygen") {
        KeyPair kp = generateKeys();
        // Output format: e n_public d n_private
        std::cout << kp.e << " " << kp.n << " " << kp.d << " " << kp.n << std::endl;
    }

    else if (command == "sign" && argc == 5) {
        // argv[2] = message, argv[3] = d, argv[4] = n
        std::string msg = argv[2];
        long long d = std::stoll(argv[3]);
        long long n = std::stoll(argv[4]);
        long long sig  = signMessage(msg, d, n);
        long long hash = customHash(msg, n);
        // Output format: signature hash
        std::cout << sig << " " << hash << std::endl;
    }

    else if (command == "verify" && argc == 6) {
        // argv[2] = message, argv[3] = signature, argv[4] = e, argv[5] = n
        std::string msg = argv[2];
        long long sig = std::stoll(argv[3]);
        long long e   = std::stoll(argv[4]);
        long long n   = std::stoll(argv[5]);
        bool valid = verifySignature(msg, sig, e, n);
        // Output format: VALID or INVALID
        std::cout << (valid ? "VALID" : "INVALID") << std::endl;
    }

    return 0;
}
