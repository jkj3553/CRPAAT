#include "hash.h"

long long customHash(const std::string& message, long long n) {
    long long hash = 7;
    for (int i = 0; i < (int)message.size(); i++) {
        hash = (hash * 31 + (unsigned char)message[i]) % n;
    }
    return hash;
}
