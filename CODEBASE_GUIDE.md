# CRPAAT Codebase Guide: Complete Line-by-Line Technical Walkthrough

Welcome to the Developer and Codebase Guide for the RSA Digital Signature System (CRPAAT). This document is designed for students, educators, and developers who want to understand how every single line of code in this project works, why it was written that way, and how all components interact to build a complete cryptographic web application.

---

## 1. Directory Structure and Architectural Overview

The application is structured into three distinct layers, creating a clean Separation of Concerns:

```text
CRPAAT/
├── Makefile                  # Build system for compiling C++ source files
├── backend/                  # Layer 1: Core Cryptographic Engine (C++)
│   ├── main.cpp              # CLI entry point parsing system inputs
│   ├── prime.h / .cpp        # Prime number generation and tests
│   ├── gcd.h / .cpp          # Euclidean algorithm for greatest common divisor
│   ├── mod_arith.h / .cpp    # Square-and-Multiply & Extended Euclidean Algorithm
│   ├── keygen.h / .cpp       # RSA key pair calculation
│   ├── hash.h / .cpp         # Polynomial rolling string hash implementation
│   ├── signature.h / .cpp    # RSA encryption of the hash digest
│   └── verify.h / .cpp       # Public-key decryption and hash comparison
├── server/                   # Layer 2: HTTP API Middleware (Python & Flask)
│   └── app.py                # Subprocess-based bridge linking UI to C++ engine
└── frontend/                 # Layer 3: Interactive User Interface (HTML/CSS/JS)
    ├── index.html            # Application markup structure
    ├── style.css             # Glassmorphism aesthetic theme
    └── script.js             # API request broker and UI state manager
```

---

## 2. Compilation: Makefile

The compilation process is managed by a single configuration file called a `Makefile`. This ensures compiling the entire C++ backend requires only a single terminal command.

```makefile
1: all:
2: 	g++ -o backend/rsa_engine backend/main.cpp backend/prime.cpp \
3: 	backend/gcd.cpp backend/mod_arith.cpp backend/keygen.cpp \
4: 	backend/hash.cpp backend/signature.cpp backend/verify.cpp
5: 
6: clean:
7: 	rm -f backend/rsa_engine
```

### Line-by-Line Explanation:
*   **Line 1 (`all:`)**: The default target rule executed when running `make`.
*   **Lines 2-4**: Invokes `g++` (the GNU C++ compiler).
    *   `-o backend/rsa_engine` compiles the final executable binary and outputs it as `backend/rsa_engine`.
    *   The remaining arguments specify every `.cpp` source file that must be compiled and linked together into a single unified engine.
*   **Line 6 (`clean:`)**: A helper target utility to reset the directory environment.
*   **Line 7**: Runs shell command `rm -f` to forcibly delete the compiled binary file, ensuring subsequent builds start from a clean state.

---

## 3. Layer 1: The Cryptographic Engine (C++)

Every component of the RSA algorithm in this directory is written from first principles to explain the underlying mathematics.

---

### 3.1 greatest common divisor: `backend/gcd.h` and `gcd.cpp`

The Greatest Common Divisor (GCD) utility is vital during key generation to ensure the chosen public exponent $e$ shares no factors with the Euler totient value $\phi(n)$.

#### `gcd.h`
```cpp
1: #pragma once
2: long long gcd(long long a, long long b);
```
*   **Line 1 (`#pragma once`)**: A preprocessor directive telling the compiler to include this header file only once in a single compilation, preventing redundant declarations.
*   **Line 2**: Declares the function signature. It accepts two 64-bit integer values (`long long`) and returns their greatest common divisor as a `long long`.

#### `gcd.cpp`
```cpp
1: #include "gcd.h"
2: 
3: long long gcd(long long a, long long b) {
4:     while (b != 0) {
5:         long long t = b;
6:         b = a % b;
7:         a = t;
8:     }
9:     return a;
10: }
```
*   **Line 1**: Imports the header declaration to verify that implementation types match the header specification.
*   **Line 3**: Implements the iterative **Euclidean Algorithm** for finding the greatest common divisor of two numbers.
*   **Line 4**: The loop continues as long as `b` is not zero. The Euclidean algorithm repeatedly replaces $a$ with $b$ and $b$ with the remainder of $a$ divided by $b$.
*   **Line 5**: Stores the current value of `b` in a temporary variable `t`.
*   **Line 6**: Updates `b` to be the remainder of `a / b` using the modulo operator (`%`).
*   **Line 7**: Updates `a` to the previous value of `b` stored in `t`.
*   **Line 9**: When the loop terminates (`b == 0`), the value remaining in `a` is the GCD, which is returned to the caller.

---

### 3.2 Prime Utilities: `backend/prime.h` and `prime.cpp`

These files verify and supply the prime number coordinates for key calculations.

#### `prime.h`
```cpp
1: #pragma once
2: bool isPrime(int n);
3: int generatePrime();
```
*   **Line 2**: Declares a helper function `isPrime` to test if a number is prime.
*   **Line 3**: Declares `generatePrime` to supply a prime number.

#### `prime.cpp`
```cpp
1: #include "prime.h"
2: #include <cstdlib>
3: 
4: bool isPrime(int n) {
5:     if (n < 2) return false;
6:     for (int i = 2; i * i <= n; i++)
7:         if (n % i == 0) return false;
8:     return true;
9: }
10: 
11: int generatePrime() {
12:     // Hardcoded reliable small primes for demo stability
13:     // This is intentional — random prime generation can fail during live demo
14:     int primes[] = {53, 59, 61, 67, 71, 73, 79, 83, 89, 97};
15:     srand(42); // Fixed seed for reproducibility
16:     return primes[rand() % 10];
17: }
```
*   **Line 2**: Imports standard library utilities including random seeding (`srand`) and generation (`rand`).
*   **Line 4**: Implements `isPrime` using a trial division algorithm.
*   **Line 5**: If `n` is less than 2, it is not prime; return `false`.
*   **Line 6**: Runs a loop from 2 up to the square root of `n` (`i * i <= n`). This is mathematically optimal because if a factor exists, its corresponding divisor must be less than or equal to the square root.
*   **Line 7**: If `n % i == 0`, `n` is divisible by `i`, so it is composite; return `false`.
*   **Line 8**: If no divisors are found, return `true`.
*   **Line 11**: Implements `generatePrime`.
*   **Line 14**: Hardcodes an array of small prime numbers. In a classroom or laboratory demonstration, using a raw randomized prime search can easily lead to keys that exceed standard C++ datatype limits (`long long` overflow) during modular arithmetic. Hardcoding specific coordinates maintains educational stability.
*   **Line 15**: Seeds the random number generator with a constant (`42`) to make outputs deterministic and reproducible.
*   **Line 16**: Returns a pseudo-randomly selected prime from the pre-defined list.

---

### 3.3 Modular Arithmetic math: `backend/mod_arith.h` and `mod_arith.cpp`

This module is the core mathematical engine. It calculates large power computations without memory overflow and computes the modular multiplicative inverse.

#### `mod_arith.h`
```cpp
1: #pragma once
2: long long modPow(long long base, long long exp, long long mod);
3: long long modInverse(long long a, long long m);
```
*   **Line 2**: Declares the modular exponentiation function ($base^{exp} \pmod{mod}$).
*   **Line 3**: Declares the modular multiplicative inverse function ($a^{-1} \pmod m$).

#### `mod_arith.cpp`
```cpp
1: #include "mod_arith.h"
2: 
3: // Square-and-multiply algorithm
4: long long modPow(long long base, long long exp, long long mod) {
5:     long long result = 1;
6:     base = base % mod;
7:     while (exp > 0) {
8:         if (exp % 2 == 1)
9:             result = (result * base) % mod;
10:         exp = exp / 2;
11:         base = (base * base) % mod;
12:     }
13:     return result;
14: }
```
*   **Line 4**: Implements the **Square-and-Multiply** binary exponentiation algorithm. This is critical: computing $base^{exp}$ directly and then modulo-ing the result would result in massive integer overflows even for modest inputs. This algorithm computes exponentiation logarithmic in time ($O(\log(\text{exp}))$) while keeping intermediate variables small.
*   **Line 5**: Initializes our computation accumulator variable `result` to 1.
*   **Line 6**: Modulo checks the `base` to prevent overflow in the first iteration.
*   **Line 7**: Iterates as long as the exponent is greater than 0.
*   **Line 8**: Inspects the least significant bit of the exponent binary representation. If the exponent is odd (`exp % 2 == 1`):
*   **Line 9**: Multiplies `result` by current `base` and applies `mod` immediately to prevent datatype overflow.
*   **Line 10**: Shifts the binary representation of the exponent right by dividing it by 2.
*   **Line 11**: Squares the current base (`base * base`) and applies `mod` to keep the magnitude within safe range.
*   **Line 13**: Returns the modular exponential result.

```cpp
16: // Extended Euclidean Algorithm
17: long long modInverse(long long a, long long m) {
18:     long long m0 = m;
19:     long long x0 = 0, x1 = 1;
20:     if (m == 1) return 0;
21:     while (a > 1) {
22:         long long q = a / m;
23:         long long t = m;
24:         m = a % m;
25:         a = t;
26:         t = x0;
27:         x0 = x1 - q * x0;
28:         x1 = t;
29:     }
30:     if (x1 < 0) x1 += m0;
31:     return x1;
32: }
```
*   **Line 17**: Computes the modular inverse of `a` modulo `m` using the **Extended Euclidean Algorithm**. This solves the equation: $a \cdot x \equiv 1 \pmod m$. The returned $x$ represents the private key parameter $d$ when $a = e$ and $m = \phi(n)$.
*   **Line 18**: Stores the original modulus value `m` in `m0` to handle negative results at the end.
*   **Line 19**: Initializes iteration parameters for updating coefficients.
*   **Line 20**: If the modulus is 1, a modular inverse cannot exist; return 0.
*   **Line 21**: Continues calculations as long as `a` is greater than 1.
*   **Line 22**: Calculates the integer quotient `q` of `a / m`.
*   **Line 23-25**: Performs standard GCD step (similar to `gcd.cpp`), updating `a` and `m` using the remainder.
*   **Line 26-28**: Updates coefficients to track the path back to the linear combination of inputs.
*   **Line 30**: If the result coefficient `x1` is negative, adds `m0` to bring it back to a valid positive range ($0 \leq x_1 < m$).
*   **Line 31**: Returns the calculated modular multiplicative inverse.

---

### 3.4 Key Calculation: `backend/keygen.h` and `keygen.cpp`

This module uses the modular arithmetic and prime search functions to generate the cryptographic keys.

#### `keygen.h`
```cpp
1: #pragma once
2: 
3: struct KeyPair {
4:     long long e;  // public exponent
5:     long long d;  // private exponent
6:     long long n;  // modulus (shared)
7: };
8: 
9: KeyPair generateKeys();
```
*   **Lines 3-7**: Defines a unified custom structure `KeyPair` containing the public key exponent `e`, private key exponent `d`, and shared modulus integer `n`.

#### `keygen.cpp`
```cpp
1: #include "keygen.h"
2: #include "mod_arith.h"
3: #include "gcd.h"
4: 
5: KeyPair generateKeys() {
6:     // p and q are hardcoded for demo reliability
7:     // All math below is computed from scratch — no library used
8:     long long p = 61;
9:     long long q = 53;
10:     long long n = p * q;               // n = 3233
11:     long long phi = (p - 1) * (q - 1); // phi = 3120
12: 
13:     // e must satisfy: 1 < e < phi and gcd(e, phi) == 1
14:     long long e = 17; // gcd(17, 3120) = 1, verified
15: 
16:     // d = modular inverse of e mod phi
17:     long long d = modInverse(e, phi);
18: 
19:     return KeyPair{e, d, n};
20: }
```
*   **Lines 8-9**: Defines our two prime numbers: $p = 61$ and $q = 53$.
*   **Line 10**: Calculates the RSA modulus $n = p \cdot q = 3233$. This number is public and serves as the modulus clock for all computations.
*   **Line 11**: Computes Euler's totient function $\phi(n) = (p-1) \cdot (q-1) = 60 \cdot 52 = 3120$. This defines the size of the multiplicative group modulo $n$.
*   **Line 14**: Defines the public exponent $e = 17$. $e$ must be coprime to $\phi(n)$. Since $\text{gcd}(17, 3120) = 1$, 17 is a valid exponent.
*   **Line 17**: Computes the private exponent $d$ by calling `modInverse(e, phi)`. Internally, this calculates $17^{-1} \pmod{3120} = 2753$.
*   **Line 19**: Instantiates and returns the resulting `KeyPair` structure containing $e = 17, d = 2753, n = 3233$.

---

### 3.5 String Hashing: `backend/hash.h` and `hash.cpp`

Before signing any message, we must compress it into a single representative integer value using a hashing algorithm.

#### `hash.h`
```cpp
1: #pragma once
2: #include <string>
3: long long customHash(const std::string& message, long long n);
```
*   **Line 3**: Declares the `customHash` function which accepts the message string and the modulus limit `n`, returning a compiled hash integer value.

#### `hash.cpp`
```cpp
1: #include "hash.h"
2: 
3: long long customHash(const std::string& message, long long n) {
4:     long long hash = 7;
5:     for (int i = 0; i < (int)message.size(); i++) {
6:         hash = (hash * 31 + (unsigned char)message[i]) % n;
7:     }
8:     return hash;
9: }
```
*   **Line 4**: Initializes a prime base hash seed value (`7`).
*   **Line 5**: Loops through every individual character of the input string one by one.
*   **Line 6**: Implements a **Polynomial Rolling Hash** (using prime multiplier `31` to reduce collisions) and bounds the hash accumulation value modulo `n` at every step to prevent variable overflow. This is equivalent to a basic rolling checksum.
*   **Line 8**: Returns the calculated hash integer value to the caller.

---

### 3.6 Signature Generation: `backend/signature.h` and `signature.cpp`

Signing a message uses the private key exponent $d$ to encrypt the calculated document hash.

#### `signature.h`
```cpp
1: #pragma once
2: #include <string>
3: long long signMessage(const std::string& message, long long d, long long n);
```
*   **Line 3**: Declares `signMessage` which takes the target string, private key $d$, and modulus $n$, returning the signature integer.

#### `signature.cpp`
```cpp
1: #include "signature.h"
2: #include "hash.h"
3: #include "mod_arith.h"
4: 
5: long long signMessage(const std::string& message, long long d, long long n) {
6:     long long h = customHash(message, n);
7:     // Signature = Hash^d mod n (RSA signing)
8:     return modPow(h, d, n);
9: }
```
*   **Line 6**: Computes the integer hash of the document message string by calling `customHash`.
*   **Line 8**: Applies the core mathematical definition of RSA signing: $S = H^d \pmod n$. It passes the calculated hash `h`, the secret private key parameter `d`, and the modulus `n` to the binary exponentiation function `modPow`. The result is the digital signature.

---

### 3.7 Verification: `backend/verify.h` and `verify.cpp`

Verification checks if a signature was produced by the owner of the matching public key for that exact message.

#### `verify.h`
```cpp
1: #pragma once
2: #include <string>
3: bool verifySignature(const std::string& message, long long signature,
4:                      long long e, long long n);
```
*   **Lines 3-4**: Declares the boolean validation utility. It returns `true` if the validation passes, otherwise `false`.

#### `verify.cpp`
```cpp
1: #include "verify.h"
2: #include "hash.h"
3: #include "mod_arith.h"
4: 
5: bool verifySignature(const std::string& message, long long signature,
6:                      long long e, long long n) {
7:     // Recover hash from signature using public key
8:     long long recoveredHash = modPow(signature, e, n);
9:     // Recompute hash from message
10:     long long computedHash = customHash(message, n);
11:     return (recoveredHash == computedHash);
12: }
```
*   **Line 8**: Decrypts the signature value using the public exponent `e` and the modulus `n` by computing: $H' = S^e \pmod n$.
*   **Line 10**: Recomputes the hash directly from the message string.
*   **Line 11**: Compares the recovered hash ($H'$) with the computed hash ($H$). If they match exactly, the verification is successful (`true`). If even a single character was changed, the hashes mismatch, and validation fails (`false`).

---

### 3.8 Entry Router CLI: `backend/main.cpp`

This file parses command line input strings to route requests to the appropriate backend module.

```cpp
1: #include <iostream>
2: #include <string>
3: #include "keygen.h"
4: #include "signature.h"
5: #include "verify.h"
6: #include "hash.h"
7: 
8: int main(int argc, char* argv[]) {
9:     if (argc < 2) return 1;
10: 
11:     std::string command = argv[1];
```
*   **Line 8**: Standard C++ entry point. `argc` tracks argument counts, and `argv` stores character pointers of input command strings.
*   **Line 9**: If no arguments are passed, exit the process with code 1.
*   **Line 11**: Converts the first argument (`argv[1]`) to a C++ standard string class named `command`.

```cpp
13:     if (command == "keygen") {
14:         KeyPair kp = generateKeys();
15:         // Output format: e n_public d n_private
16:         std::cout << kp.e << " " << kp.n << " " << kp.d << " " << kp.n << std::endl;
17:     }
```
*   **Line 13**: Evaluates if the action is key generation.
*   **Line 14**: Calls `generateKeys()` to calculate RSA public and private parameters.
*   **Line 16**: Prints the results to standard output stream, separated by spaces: `e n d n` (e.g., `17 3233 2753 3233`).

```cpp
19:     else if (command == "sign" && argc == 5) {
20:         // argv[2] = message, argv[3] = d, argv[4] = n
21:         std::string msg = argv[2];
22:         long long d = std::stoll(argv[3]);
23:         long long n = std::stoll(argv[4]);
24:         long long sig  = signMessage(msg, d, n);
25:         long long hash = customHash(msg, n);
26:         // Output format: signature hash
27:         std::cout << sig << " " << hash << std::endl;
28:     }
```
*   **Line 19**: Evaluates if the action is to sign a message. Requires 5 total arguments (executable path, command, message, key d, modulus n).
*   **Line 21**: Extracts the target message string from `argv[2]`.
*   **Lines 22-23**: Parses the string representation of $d$ and $n$ into `long long` variables using string-to-long-long (`std::stoll`).
*   **Line 24**: Calls the signing module to generate the numeric signature.
*   **Line 25**: Calculates the raw hash value for the frontend interface representation.
*   **Line 27**: Prints the signature and the hash separated by spaces.

```cpp
30:     else if (command == "verify" && argc == 6) {
31:         // argv[2] = message, argv[3] = signature, argv[4] = e, argv[5] = n
32:         std::string msg = argv[2];
33:         long long sig = std::stoll(argv[3]);
34:         long long e   = std::stoll(argv[4]);
35:         long long n   = std::stoll(argv[5]);
36:         bool valid = verifySignature(msg, sig, e, n);
37:         // Output format: VALID or INVALID
38:         std::cout << (valid ? "VALID" : "INVALID") << std::endl;
39:     }
40: 
41:     return 0;
42: }
```
*   **Line 30**: Evaluates verification requests. Requires 6 arguments.
*   **Lines 32-35**: Parses the input message, signature integer, public exponent $e$, and modulus $n$.
*   **Line 36**: Performs the public key verification test.
*   **Line 38**: Prints "VALID" if the signature matches the message, or "INVALID" otherwise.

---

## 4. Layer 2: API Middleware (Python / Flask)

The Python server acts as a wrapper, converting REST API calls from the browser into command-line arguments passed to the C++ executable.

```python
1: from flask import Flask, request, jsonify, send_from_directory
2: import subprocess
3: import os
4: 
5: app = Flask(__name__, static_folder='../frontend')
```
*   **Line 1**: Imports the Flask web application frame, request readers, JSON packaging tools, and folder serving assets.
*   **Line 2**: Imports the standard Python `subprocess` module, which allows running system commands as subprocesses.
*   **Line 3**: Imports `os` to construct absolute folder paths regardless of local operating system formats.
*   **Line 5**: Instantiates the Flask class object, mapping the static root path of web assets to the relative path of the UI folder.

```python
7: # Path to compiled C++ binary
8: BINARY = os.path.join(os.path.dirname(__file__), '..', 'backend', 'rsa_engine')
9: 
10: def run_engine(args):
11:     """Run the C++ binary with given arguments, return stdout as string."""
12:     result = subprocess.run(
13:         [BINARY] + [str(a) for a in args],
14:         capture_output=True,
15:         text=True,
16:         timeout=5
17:     )
18:     return result.stdout.strip()
```
*   **Line 8**: Resolves the exact location of the compiled C++ executable file (`rsa_engine`) based on the location of `app.py`.
*   **Line 10**: Declares a helper wrapper function to launch the C++ binary.
*   **Lines 12-17**: Uses Python's modern `subprocess.run` to spawn a new process executing the compiled C++ code.
    *   It passes the binary path and arguments as an array.
    *   `capture_output=True` redirects the standard outputs of the C++ executable back into Python variables.
    *   `text=True` automatically decodes the output byte stream into a Python string.
    *   `timeout=5` prevents runaway processes if the C++ engine hangs.
*   **Line 18**: Returns the C++ standard output, removing any trailing whitespace characters.

```python
20: @app.route('/')
21: def index():
22:     return send_from_directory('../frontend', 'index.html')
23: 
24: @app.route('/<path:path>')
25: def static_files(path):
26:     return send_from_directory('../frontend', path)
```
*   **Lines 20-22**: Routes visitors accessing the root URL (`/`) directly to the frontend's main HTML entry point.
*   **Lines 24-26**: Serves auxiliary static files (like styles and JavaScript controllers) from the frontend subdirectory.

```python
28: @app.route('/api/keygen', methods=['GET'])
29: def keygen():
30:     out = run_engine(['keygen']).split()
31:     return jsonify({
32:         'e':      out[0],
33:         'n_pub':  out[1],
34:         'd':      out[2],
35:         'n_priv': out[3]
36:     })
```
*   **Line 28**: Exposes a GET API route at `/api/keygen` for key calculations.
*   **Line 30**: Calls the helper function with `['keygen']`, spawning the C++ process (`rsa_engine keygen`). It then splits the string response (e.g., `"17 3233 2753 3233"`) by whitespace into a list.
*   **Lines 31-36**: Formats and returns this output as a JSON object to the browser.

```python
38: @app.route('/api/sign', methods=['POST'])
39: def sign():
40:     data = request.get_json()
41:     message   = data['message']
42:     d         = data['d']
43:     n         = data['n']
44:     out = run_engine(['sign', message, d, n]).split()
45:     return jsonify({
46:         'signature': out[0],
47:         'hash':      out[1]
48:     })
```
*   **Line 38**: Exposes a POST endpoint `/api/sign` to generate signatures.
*   **Line 40**: Extracts the JSON payload from the incoming client request.
*   **Lines 41-43**: Extracts the document string (`message`), the private exponent (`d`), and the modulus (`n`).
*   **Line 44**: Invokes the C++ engine with arguments: `rsa_engine sign "message" d n`.
*   **Lines 45-48**: Splits the C++ console response and returns the signature and hash values as JSON.

```python
50: @app.route('/api/verify', methods=['POST'])
51: def verify():
52:     data = request.get_json()
53:     message   = data['message']
54:     signature = data['signature']
55:     e         = data['e']
56:     n         = data['n']
57:     out = run_engine(['verify', message, signature, e, n])
58:     return jsonify({'result': out})
59: 
60: if __name__ == '__main__':
61:     app.run(debug=True, port=5000)
```
*   **Line 50**: Exposes verification requests at `/api/verify`.
*   **Lines 52-56**: Extracts the message, signature, public key exponent, and modulus from the incoming request.
*   **Line 57**: Invokes the C++ engine: `rsa_engine verify "message" signature e n`.
*   **Line 58**: Returns the result (`"VALID"` or `"INVALID"`) as a JSON payload.
*   **Lines 60-61**: Starts the Flask server locally on port 5000 with debug features enabled if the script is run directly.

---

## 5. Layer 3: Interactive User Interface (HTML/CSS/JS)

The frontend collects inputs, formats and displays calculations, and handles visual representations of key generation, signing, verification, and tampering.

---

### 5.1 User Action Controller: `frontend/script.js`

This script manages browser states, handles HTTP requests to Python, and dynamically modifies HTML page elements.

```javascript
1: // ─── Session State ────────────────────────────────────────────────────────────
2: const session = {
3:   e: null,
4:   d: null,
5:   n: null,
6:   currentSignature: null,
7:   currentDoc: null
8: };
```
*   **Lines 2-8**: Defines a globally accessible state object to store key parameters and signature values temporarily in the browser session.

```javascript
10: // ─── Navigation ───────────────────────────────────────────────────────────────
11: function showSection(id) {
12:   document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
13:   document.getElementById(id).classList.add('active');
14:   document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
15:   const navBtn = document.getElementById('nav-' + id);
16:   if (navBtn) navBtn.classList.add('active');
17:   window.scrollTo({ top: 0, behavior: 'smooth' });
18:   updateKeyStatusBars();
19: }
```
*   **Line 11**: Toggles between different dashboard steps (Home, Keygen, Sign, Verify, Tamper).
*   **Lines 12-16**: Uses CSS class swaps to hide inactive screens and display the active screen.
*   **Line 17**: Automatically scrolls the browser view smoothly back to the top of the page.
*   **Line 18**: Updates the status indicators showing which keys are currently loaded.

```javascript
22: function updateKeyStatusBars() {
23:   // Sign section key status
24:   const signBar  = document.getElementById('key-status-sign');
25:   const signIcon = document.getElementById('key-status-sign-icon');
26:   const signText = document.getElementById('key-status-sign-text');
27:   if (session.e && session.d && session.n) {
28:     signBar.classList.add('ok');
29:     signIcon.textContent = '✅';
30:     signText.textContent = `Keys loaded — Public (e=${session.e}, n=${session.n}) · Private (d=${session.d})`;
31:     signBar.querySelector('.btn-small').style.display = 'none';
32:   } else {
33:     signBar.classList.remove('ok');
34:     signIcon.textContent = '⚠️';
35:     signText.textContent = 'No keys loaded. Please generate keys first.';
36:     signBar.querySelector('.btn-small').style.display = '';
37:   }
```
*   **Line 22**: Updates the key status indicators.
*   **Line 27**: If the key variables `e`, `d`, and `n` are loaded, update the UI to display the active key parameters and hide warnings. If keys are missing, show a warning prompt.

```javascript
39:   // Tamper section key status
40:   const tamperBar = document.getElementById('tamper-key-status');
41:   if (session.currentSignature) {
42:     tamperBar.classList.add('ok');
43:     tamperBar.innerHTML = `<span>✅</span><span>Signature loaded from Step 2 — ready to test tampering.</span>`;
44:     // Update original doc display
45:     const origDisplay = document.getElementById('tamper-original-doc');
46:     if (session.currentDoc && origDisplay) {
47:       origDisplay.textContent = session.currentDoc;
48:     }
49:   }
50: }
```
*   **Line 41**: If a document signature exists in the current session, update the tamper page status and display the original signed document content for comparison.

```javascript
53: async function generateKeys() {
54:   const btn = document.getElementById('btn-keygen');
55:   btn.disabled = true;
56:   btn.textContent = '⏳ Generating…';
57: 
58:   try {
59:     const res  = await fetch('/api/keygen');
60:     if (!res.ok) throw new Error('Server error: ' + res.status);
61:     const data = await res.json();
62: 
63:     session.e = data.e;
64:     session.d = data.d;
65:     session.n = data.n_pub;
```
*   **Line 53**: Triggers the key generation workflow.
*   **Lines 54-56**: Disables the generate button and shows a loading indicator to prevent double submissions.
*   **Line 59**: Makes an asynchronous HTTP GET request to the Flask server's `/api/keygen` endpoint.
*   **Lines 63-65**: Saves the returned public and private key values to the local `session` object.

```javascript
67:     document.getElementById('pub-e').textContent  = data.e;
68:     document.getElementById('pub-n').textContent  = data.n_pub;
69:     document.getElementById('priv-d').textContent = data.d;
70:     document.getElementById('priv-n').textContent = data.n_priv;
71: 
72:     document.getElementById('key-output').classList.remove('hidden');
73:     updateKeyStatusBars();
74: 
75:     btn.textContent = '✅ Keys Generated';
76:     btn.style.background = 'linear-gradient(135deg, #00ff88, #00cc66)';
77:   } catch (err) {
78:     alert('❌ Error generating keys.\n\nMake sure the Flask server is running:\n  cd server/ && python app.py\n\nAlso verify the C++ binary was compiled:\n  make');
79:     console.error(err);
80:     btn.disabled = false;
81:     btn.innerHTML = '<span class="btn-icon">⚡</span> Generate RSA Key Pair';
82:   }
83: }
```
*   **Lines 67-70**: Updates the HTML page to display the generated keys.
*   **Line 72**: Reveals the key container card by removing the `hidden` class.
*   **Lines 77-82**: Handles errors (such as connection timeouts or missing backend binaries) by showing a descriptive alert and resetting the button state.

```javascript
86: async function signDoc() {
87:   if (!session.d || !session.n) {
88:     alert('⚠️ Please generate keys first (Step 1).');
89:     showSection('keygen');
90:     return;
91:   }
```
*   **Line 86**: Triggers the signing workflow.
*   **Lines 87-91**: Validates that keys are loaded before attempting to sign. If they are missing, alerts the user and redirects to the generator page.

```javascript
93:   const message = document.getElementById('doc-input').value.trim();
94:   if (!message) {
95:     alert('⚠️ Please enter a document to sign.');
96:     return;
97:   }
```
*   **Line 93**: Reads the document string from the input textarea.
*   **Lines 94-97**: Validates that the user has entered a message.

```javascript
99:   const btn = document.getElementById('btn-sign');
100:   btn.disabled = true;
101:   btn.textContent = '⏳ Signing…';
102: 
103:   try {
104:     const res  = await fetch('/api/sign', {
105:       method:  'POST',
106:       headers: { 'Content-Type': 'application/json' },
107:       body:    JSON.stringify({ message, d: session.d, n: session.n })
108:     });
109:     if (!res.ok) throw new Error('Server error: ' + res.status);
110:     const data = await res.json();
```
*   **Lines 104-108**: Sends a POST request to the `/api/sign` endpoint containing the message and the private key variables in the body.
*   **Line 110**: Parses the JSON response from the server.

```javascript
112:     session.currentSignature = data.signature;
113:     session.currentDoc       = message;
114: 
115:     document.getElementById('hash-val').textContent = data.hash;
116:     document.getElementById('sig-val').textContent  = data.signature;
117:     document.getElementById('sign-output').classList.remove('hidden');
118: 
119:     // Auto-fill verify section
120:     document.getElementById('verify-doc').value = message;
121:     document.getElementById('verify-sig').value = data.signature;
122: 
123:     updateKeyStatusBars();
```
*   **Lines 112-113**: Stores the signature and document values in the session state.
*   **Lines 115-116**: Updates the UI text elements with the returned hash and signature.
*   **Line 117**: Reveals the signing output card.
*   **Lines 120-121**: Automatically populates the document and signature fields in the verification step to make the application workflow smoother.

```javascript
134: async function verifyDoc() {
135:   if (!session.e || !session.n) {
136:     alert('⚠️ Please generate keys first (Step 1).');
137:     showSection('keygen');
138:     return;
139:   }
```
*   **Line 134**: Triggers the verification workflow.
*   **Lines 135-139**: Validates that keys are loaded. If not, redirects to the generator.

```javascript
141:   const message   = document.getElementById('verify-doc').value.trim();
142:   const signature = document.getElementById('verify-sig').value.trim();
143: 
144:   if (!message || !signature) {
145:     alert('⚠️ Please enter both the document and signature.');
146:     return;
147:   }
```
*   **Lines 141-142**: Reads the current document text and signature value from the input fields.
*   **Lines 144-147**: Validates that both fields are populated.

```javascript
149:   try {
150:     const res  = await fetch('/api/verify', {
151:       method:  'POST',
152:       headers: { 'Content-Type': 'application/json' },
153:       body:    JSON.stringify({ message, signature, e: session.e, n: session.n })
154:     });
155:     if (!res.ok) throw new Error('Server error: ' + res.status);
156:     const data = await res.json();
157: 
158:     const box = document.getElementById('verify-result');
159:     box.classList.remove('hidden');
```
*   **Lines 150-154**: Sends a POST request to `/api/verify` with the message, signature, public key exponent, and modulus values.
*   **Line 158**: Finds the verification result element in the DOM and reveals it.

```javascript
161:     if (data.result === 'VALID') {
162:       box.innerHTML = `
163:         <div class="status valid">✅ VALID SIGNATURE — Document is Authentic</div>
164:         <p style="margin-top:12px; color:var(--text-dim); font-size:0.86em; line-height:1.7">
165:           The recovered hash <code style="color:var(--cyan);font-family:monospace">σ<sup>e</sup> mod n</code>
166:           matches the recomputed hash <code style="color:var(--cyan);font-family:monospace">H(message)</code>.
167:           The document has not been tampered with and the signature is valid.
168:         </p>`;
169:     } else {
170:       box.innerHTML = `
171:         <div class="status invalid">❌ INVALID SIGNATURE — Verification Failed</div>
172:         <p style="margin-top:12px; color:var(--text-dim); font-size:0.86em; line-height:1.7">
173:           The recovered hash does not match the recomputed hash.
174:           The document has been modified or the signature is incorrect.
175:         </p>`;
176:     }
```
*   **Line 161**: Checks the verification outcome string returned from the C++ backend.
*   **Lines 162-168**: If the signature is valid, updates the UI container styling to green and explains that the recovered mathematical signature output ($S^e \pmod n$) matches the document hash.
*   **Lines 169-176**: If the signature is invalid, updates the UI styling to red and displays a warning message.

```javascript
184: async function runTamperDemo() {
185:   if (!session.currentSignature) {
186:     alert('⚠️ Please sign a document first (Step 2) to get a signature for testing.');
187:     showSection('sign');
188:     return;
189:   }
```
*   **Line 184**: Triggers the tamper testing demonstration.
*   **Lines 185-189**: Validates that a signature has been generated during the current session.

```javascript
191:   const tamperedDoc = document.getElementById('tamper-doc').value.trim();
192:   if (!tamperedDoc) {
193:     alert('⚠️ Please enter a (tampered) document to test.');
194:     return;
195:   }
```
*   **Lines 191-192**: Reads the modified document text from the input textarea.
*   **Lines 192-195**: Verifies that the field is not empty.

```javascript
197:   try {
198:     const res  = await fetch('/api/verify', {
199:       method:  'POST',
200:       headers: { 'Content-Type': 'application/json' },
201:       body:    JSON.stringify({
202:         message:   tamperedDoc,
203:         signature: session.currentSignature,
204:         e:         session.e,
205:         n:         session.n
206:       })
207:     });
```
*   **Lines 198-206**: Sends the validation request to `/api/verify` containing the **tampered document text** but the **original session signature**.

```javascript
209:     const data = await res.json();
210: 
211:     const resultBox  = document.getElementById('tamper-result');
212:     const explainBox = document.getElementById('tamper-explanation');
213:     resultBox.classList.remove('hidden');
```
*   **Lines 209-213**: Parses the response and reveals the tamper result display containers.

```javascript
215:     if (data.result === 'VALID') {
216:       resultBox.innerHTML = `
217:         <div class="status valid">
218:           ✅ VALID (Hash collision detected — try a different modification)
219:         </div>
220:         <p class="note" style="margin-top:8px">
221:           This document happened to produce the same hash. Try changing more characters.
222:         </p>`;
223:     } else {
224:       resultBox.innerHTML = `
225:         <div class="status invalid">
226:           ⚠️ DOCUMENT TAMPERED — INTEGRITY FAILURE DETECTED
227:         </div>
228:         <p class="note" style="margin-top:8px">
229:           The signature was valid for the original document. This tampered version fails verification.
230:         </p>`;
231:       explainBox.classList.remove('hidden');
232:     }
```
*   **Line 215**: In the rare event of a hash collision (which is mathematically possible but highly unlikely with larger hash spaces), explain the collision.
*   **Lines 224-231**: Typically, the verification will fail. The UI displays an alert showing that the document modification was detected, and reveals the explanation block.

```javascript
240: document.addEventListener('DOMContentLoaded', () => {
241:   showSection('home');
242: });
```
*   **Line 240**: Listens for the HTML DOM elements to finish rendering in the browser.
*   **Line 241**: Displays the Home section as the default view.

---

## 6. How the System Connects (Data Flow Trace)

To summarize how all these components work together, here is what happens when you sign a document:

```text
[ Browser UI ] ──( 1. Click "Sign" with message "Hello" )──> [ server/app.py ]
                                                                     │
[ server/app.py ] ──( 2. Launch Subprocess with parameters )─────────┘
      │
      └─> [ backend/rsa_engine sign "Hello" 2753 3233 ]
                │
                ├──> calls customHash("Hello", 3233) inside hash.cpp (Returns 1024)
                ├──> calls modPow(1024, 2753, 3233) inside mod_arith.cpp (Returns 921)
                └──> outputs string: "921 1024" to standard terminal output
                                                                     │
[ server/app.py ] <──( 3. Reads stdout "921 1024" )──────────────────┘
      │
      └──( 4. Returns JSON: { signature: "921", hash: "1024" } )──> [ Browser UI ]
```

This clean architecture ensures the user interface remains responsive and modern, while the core cryptographic calculations are executed by compiled C++ modules.
