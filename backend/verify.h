#pragma once
#include <string>
bool verifySignature(const std::string& message, long long signature,
                     long long e, long long n);
