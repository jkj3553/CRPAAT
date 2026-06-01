---

# Practical Study of OpenSSL for RSA Digital Signature Generation and Verification

---

| Field            | Details                                                          |
|------------------|------------------------------------------------------------------|
| **Title**        | Practical Study of OpenSSL for RSA Digital Signature Generation and Verification |
| **Course**       | Cryptography and Network Security (CRN)                          |
| **Tool Studied** | OpenSSL (Open Source Cryptographic Toolkit)                      |
| **Student Name** | [Student Name]                                                   |
| **USN**          | [USN]                                                            |
| **College**      | [College Name]                                                   |
| **Department**   | Computer Science and Engineering                                  |
| **Semester**     | IV                                                               |
| **Date**         | [Date of Submission]                                             |

---

## Abstract

Cryptography is the backbone of modern digital security. From online banking to government communications, the assurance that a piece of information is genuine and unaltered is a non-negotiable requirement. This report documents a hands-on practical study of OpenSSL — one of the most widely deployed, battle-tested, open-source cryptographic toolkits in existence — with a focus on RSA Digital Signature Generation and Verification.

The study was performed as a supporting practical to complement a larger course project titled **"Secure Document Integrity Verification using RSA Digital Signatures"**, in which the RSA algorithm and its associated mathematics were implemented from scratch in C++ without the use of any external library. While that project demonstrates the internal working of RSA at a code level, this OpenSSL study shows how the same concepts manifest in a professional-grade, industry-standard tool.

The report walks through five progressive experiments: generating RSA key pairs, creating a test document, signing it with a private key, verifying the signature with a public key, and finally demonstrating what happens when a document is tampered with after signing. Each experiment is explained in detail, connected back to the main project, and followed by observations and learning outcomes.

By the end of this study, the objective is to have a practical working understanding of how digital signatures protect data integrity and authenticity in the real world, and to appreciate why manually implementing the same mathematics — as done in the course project — is such a meaningful educational undertaking.

---

## 1. Introduction

### 1.1 What is OpenSSL?

OpenSSL is a free, open-source software library that implements cryptographic protocols and utilities for securing communications over computer networks. Originally developed in 1998 as a fork of the SSLeay library, OpenSSL has since grown into the de-facto standard for cryptographic operations in the Linux and Unix ecosystems. It is maintained by the OpenSSL Project and is written primarily in C and assembly language for maximum performance and portability.

OpenSSL is not a single tool but a collection of them. It provides:
- A **cryptographic library (libcrypto)** for performing encryption, hashing, and key generation.
- An **SSL/TLS protocol library (libssl)** for establishing secure communications channels.
- A **command-line tool (`openssl`)** that exposes the functionality of both libraries through a terminal interface.

This practical study focuses exclusively on the command-line tool, specifically its `genrsa`, `rsa`, and `dgst` subcommands, which together implement the full RSA digital signature workflow.

### 1.2 Why is OpenSSL Important?

The importance of OpenSSL to modern cybersecurity cannot be overstated. Studies have estimated that OpenSSL secures over 60% of HTTPS traffic on the internet. When you see the padlock icon in your browser, there is a very high probability that OpenSSL is working behind the scenes. Its applications span across virtually every domain of digital security:

- **HTTPS/TLS**: Web browsers use OpenSSL-compatible TLS to establish encrypted channels with websites. Every time you log in to a website or make an online payment, TLS certificates signed using RSA (or ECDSA) ensure you are talking to the genuine server.

- **Digital Certificates**: OpenSSL is used to create, manage, and verify X.509 digital certificates — the identity documents of the internet. Certificate Authorities (CAs) like DigiCert and Let's Encrypt use OpenSSL to issue these certificates.

- **Software Signing**: Linux distributions like Ubuntu and Fedora sign every software package with a digital signature before distributing it. Your package manager verifies these signatures before installation. This is the same concept explored in this practical.

- **Secure Email (S/MIME, PGP)**: Encrypted and signed emails depend on the same RSA infrastructure that OpenSSL implements.

- **Document Verification**: Organizations dealing in legal contracts, financial records, and medical data use digital signatures — generated by tools like OpenSSL — to ensure that documents remain unaltered from the moment of signing.

### 1.3 Relationship to the RSA Digital Signature Project

The companion course project ("Secure Document Integrity Verification using RSA Digital Signatures") implements RSA from the mathematical ground up in C++. It generates prime numbers, computes the GCD and modular inverse, builds the key pair, hashes the message with a polynomial rolling hash function, and computes the signature using fast modular exponentiation. Every piece of mathematics that OpenSSL wraps in a simple one-line command is explicitly coded in that project.

This practical study, therefore, serves as a bridge between theory and industry practice. After understanding exactly how and why each step works in the custom project, it is deeply rewarding to observe OpenSSL performing the exact same steps in a fraction of a second with a single command.

---

## 2. Objectives of the Practical Study

The following objectives guided this study:

1. To understand the structure and purpose of RSA public and private key pairs by generating them using OpenSSL.
2. To comprehend the role of cryptographic hash functions (specifically SHA-256) in the digital signature process.
3. To demonstrate how a digital signature is generated using a private key and verified using the corresponding public key.
4. To empirically verify the integrity-protection property of digital signatures by conducting a document tampering experiment.
5. To draw a meaningful comparison between the OpenSSL implementation and the custom C++ RSA project, reinforcing understanding of the underlying mathematics.
6. To appreciate the security implications of key size, key storage, and private key confidentiality.

---

## 3. Theory Background

### 3.1 Public Key Cryptography

Traditional encryption systems use a single, shared secret key — the same key encrypts and decrypts the data. This approach, called Symmetric Key Cryptography, has a fundamental problem: both parties need to securely share the key before they can communicate. How do you securely share a secret with someone you have never met before?

Public Key Cryptography, introduced by Diffie and Hellman in 1976, solved this problem elegantly. The idea is to generate a mathematically linked pair of keys:

- A **Public Key**, which can be distributed freely to anyone.
- A **Private Key**, which must never leave the owner's control.

Anything encrypted with one key can only be decrypted by the other. For confidentiality, you encrypt a message with the recipient's public key; only their private key can decrypt it. For digital signatures (the focus of this study), the logic is inverted: the sender signs with their private key, and anyone with the public key can verify the signature.

### 3.2 The RSA Algorithm

RSA (Rivest-Shamir-Adleman, 1977) was the first practical implementation of Public Key Cryptography. Its security relies on a simple mathematical asymmetry: multiplying two large prime numbers is trivially easy, but factoring the resulting product back into its prime components is computationally infeasible when the numbers are large enough.

**Key Generation:**

1. Choose two large prime numbers, **p** and **q**. (In the course project: p = 61, q = 53 for demonstration clarity; OpenSSL uses 2048-bit primes for real security.)
2. Compute the modulus: `n = p × q` (In the project: n = 3233)
3. Compute Euler's totient: `φ(n) = (p−1)(q−1)` (In the project: φ(3233) = 3120)
4. Select a public exponent **e** such that `1 < e < φ(n)` and `gcd(e, φ(n)) = 1` (In the project: e = 17)
5. Compute the private exponent **d** as the modular inverse of e modulo φ(n): `d ≡ e⁻¹ (mod φ(n))` (In the project, this is computed using the Extended Euclidean Algorithm in `backend/mod_arith.cpp`)

The **Public Key** is the pair `(e, n)` and the **Private Key** is the pair `(d, n)`.

### 3.3 Digital Signatures

A Digital Signature is the electronic equivalent of a handwritten signature, but with a critical advantage: it is mathematically bound to the specific content being signed. A handwritten signature looks the same regardless of whether the contract says "$100" or "$1,000,000". A digital signature will be completely different for those two documents, and any attempt to reuse the old signature with the modified document will fail verification.

A digital signature provides three security guarantees:

| Property | Definition | How RSA Provides It |
|---|---|---|
| **Authenticity** | Proves the message came from the claimed sender. | Only the holder of the private key could have produced a valid signature. |
| **Integrity** | Proves the message has not been altered since signing. | Any change to the document changes its hash, breaking the signature. |
| **Non-Repudiation** | Prevents the sender from denying they signed it. | No one else could have produced that signature without the private key. |

### 3.4 Hash Functions and Why Documents Are Hashed Before Signing

RSA signing works on numbers. A document could be several megabytes in size — far too large to directly apply RSA math to it efficiently. More importantly, RSA can only sign numbers smaller than the modulus `n`.

The solution is a **cryptographic hash function**: a deterministic algorithm that compresses an arbitrarily-sized input into a fixed-length digest. For SHA-256 (used by OpenSSL in this practical), any input — whether a single character or a 10GB video file — produces a 256-bit (32-byte) output.

The critical properties of a cryptographic hash function are:
- **Deterministic**: The same input always produces the same hash.
- **One-Way (Pre-image Resistant)**: Given a hash, it is computationally infeasible to find the original input.
- **Collision Resistant**: It is computationally infeasible to find two different inputs that produce the same hash.
- **Avalanche Effect**: A tiny change in input (even one bit) produces a completely different hash.

In our custom project, this is implemented in `backend/hash.cpp` using a polynomial rolling hash: `hash = (hash * 31 + char) % n`. OpenSSL uses the standardized SHA-256 algorithm, which is significantly stronger but follows the same conceptual principles.

The signing workflow is therefore:
```
Document → Hash Function → Hash Digest → RSA Private Key → Digital Signature
```
And verification:
```
Signature → RSA Public Key → Recovered Hash Digest
Document → Hash Function → Computed Hash Digest
[Compare: Recovered Hash == Computed Hash?]
```

---

## 4. Practical Environment

| Parameter | Details |
|---|---|
| **Operating System** | Ubuntu Linux (or equivalent Linux distribution) |
| **OpenSSL Version** | [Run `openssl version` to record — e.g., OpenSSL 3.0.2] |
| **Interface** | Bash Command Line Terminal |
| **Working Directory** | `~/openssl_practical/` |
| **Files Created** | `private.pem`, `public.pem`, `document.txt`, `signature.bin` |

Before beginning, create a clean working directory:

```bash
mkdir ~/openssl_practical
cd ~/openssl_practical
```

---

## 5. Practical Experiment 1: RSA Key Pair Generation

### 5.1 Background

Before any signing or verification can occur, we need a key pair. As discussed in the theory section, this involves generating two mathematically linked keys: a private key (kept secret by the signer) and a public key (distributed to anyone who needs to verify signatures).

In the custom C++ project (`backend/keygen.cpp`), this is done by hardcoding `p = 61` and `q = 53` for demonstration stability, then computing `n`, `φ(n)`, `e`, and finally using the Extended Euclidean Algorithm to compute `d`. OpenSSL performs the same steps but with 2048-bit prime numbers generated using a cryptographically secure random number generator.

### 5.2 Generating the Private Key

**Command:**
```bash
openssl genrsa -out private.pem 2048
```

**Explanation:**
- `openssl` — Invokes the OpenSSL command-line tool.
- `genrsa` — Selects the "Generate RSA key" subcommand.
- `-out private.pem` — Specifies the output file. `.pem` stands for Privacy Enhanced Mail, a Base64-encoded format for storing cryptographic objects. This is the standard container format for keys and certificates.
- `2048` — Specifies the key size in bits. This means OpenSSL will find two prime numbers, each approximately 1024 bits long, and multiply them to produce a 2048-bit modulus `n`. This key size is the current minimum recommended by NIST (National Institute of Standards and Technology) for RSA in production systems.

The terminal will print something like:
```
Generating RSA private key, 2048 bit long modulus (2 prime factors)
...+++
..............+++
e is 65537 (0x10001)
```

Notice that OpenSSL chose `e = 65537`. This is the standard choice for the public exponent because it is prime (so `gcd(e, φ(n)) = 1` is almost always satisfied), it is small (making public-key operations fast), and its binary representation `10000000000000001` has only two `1` bits, which means the square-and-multiply exponentiation algorithm (identical to `modPow()` in the project's `backend/mod_arith.cpp`) requires minimal multiplications.

> **Private Key Security Note:** The `private.pem` file contains everything: the prime factors `p` and `q`, the modulus `n`, both exponents `e` and `d`, and the CRT parameters. Anyone who obtains this file can sign documents in your name. In production environments, this file would be stored in an HSM (Hardware Security Module) or protected with a passphrase using `-aes256`.

**[Insert Screenshot: Terminal showing `openssl genrsa` command and output]**

### 5.3 Extracting the Public Key

**Command:**
```bash
openssl rsa -in private.pem -pubout -out public.pem
```

**Explanation:**
- `openssl rsa` — Invokes the RSA key processing subcommand.
- `-in private.pem` — Reads the private key generated in the previous step.
- `-pubout` — Instructs OpenSSL to output only the public component of the key (the pair `(e, n)`), discarding the private exponent `d` and the prime factors.
- `-out public.pem` — Writes the public key to a file named `public.pem`.

Expected output in the terminal:
```
writing RSA key
```

**[Insert Screenshot: Terminal showing the public key extraction command]**

You can inspect the raw key parameters using:
```bash
openssl rsa -in private.pem -text -noout
```
This reveals the modulus, public and private exponents, prime factors, and CRT coefficients — the exact same values that our custom `keygen.cpp` computes, just at a vastly larger scale.

### 5.4 Key Comparison Table

| Parameter | Custom Project (keygen.cpp) | OpenSSL (2048-bit) |
|---|---|---|
| Prime p | 61 (6-bit) | ~1024-bit prime |
| Prime q | 53 (6-bit) | ~1024-bit prime |
| Modulus n | 3233 | 2048-bit number |
| Public exponent e | 17 | 65537 |
| Private exponent d | Computed via modInverse() | Computed internally |
| Storage format | In-memory (long long) | PEM file (Base64) |

### 5.5 Observations

The conceptual steps are identical. OpenSSL simply operates at a scale that makes factoring `n` back into `p` and `q` intractable with current computing power. The course project's small primes are intentional — they make the math traceable and verifiable by hand, which is the point of a teaching demonstration.

### 5.6 Learning Outcome

This experiment establishes the foundational understanding that a key pair is not arbitrary. The public and private keys are mathematically derived from the same prime numbers. You cannot simply generate any two numbers and call them a key pair — they must be computed through the precise process implemented in `keygen.cpp` and automated by OpenSSL's `genrsa`.

---

## 6. Practical Experiment 2: Creating a Sample Document

### 6.1 Background

For a digital signature to be meaningful, there must be something worth signing. In this practical, we simulate a financial transaction instruction — a common real-world context where document integrity is absolutely critical. Banks, payment processors, and financial institutions deal with documents of exactly this nature every day.

### 6.2 Creating the Document

**Command:**
```bash
echo "Transfer Rs.5000 to Account X" > document.txt
```

Or using a text editor:
```bash
nano document.txt
```
Content of `document.txt`:
```
Transfer Rs.5000 to Account X
```

### 6.3 Why Document Integrity Matters in Financial Systems

Consider the scenario: a financial officer signs the document "Transfer Rs.5000 to Account X" and sends it along with a digital signature to the bank's clearing system. The clearing system, using the officer's public key, verifies the signature before processing the transaction.

Now, if an adversary intercepts this instruction and changes it to "Transfer Rs.50000 to Account X," the digital signature — which was computed from the hash of the original text — becomes completely invalid for the modified text. The bank's verification system will reject the forged instruction before any money moves.

This is precisely why the EU's eIDAS regulation, India's Information Technology Act, and the USA's ESIGN Act all legally recognize digital signatures as equivalent to handwritten signatures. The mathematical guarantee of tamper detection is stronger than anything a physical signature can provide.

### 6.4 Observations

Even before signing, it is worth thinking about what we are protecting. The string "Transfer Rs.5000 to Account X" is 31 characters. If we were to sign this directly with RSA, we would need to convert it into a number and apply modular exponentiation — operations that work on the raw byte value. The number would be far smaller than the modulus `n`, which introduces vulnerabilities. Hashing first (next experiment) solves this.

### 6.5 Learning Outcome

The content of the document is the foundation of everything that follows. The digital signature is not a generic approval stamp — it is a mathematically derived fingerprint of this exact string of characters. Changing even a single character, space, or punctuation mark will produce a completely different hash and break the signature.

---

## 7. Practical Experiment 3: Generating a Digital Signature

### 7.1 Background

With the private key and document ready, we can now generate the signature. In our custom project (`backend/signature.cpp`), this is implemented as:

```cpp
long long signMessage(const std::string& message, long long d, long long n) {
    long long h = customHash(message, n);
    return modPow(h, d, n);  // Signature = Hash^d mod n
}
```

OpenSSL's `dgst -sign` command performs the same operation but uses SHA-256 for hashing (instead of the custom polynomial hash) and applies PKCS#1 v1.5 padding before the RSA operation for added security.

### 7.2 Generating the Signature

**Command:**
```bash
openssl dgst -sha256 -sign private.pem -out signature.bin document.txt
```

**Explanation:**
- `openssl dgst` — Invokes the "message digest" (hash) subcommand.
- `-sha256` — Selects SHA-256 as the hashing algorithm. SHA-256 belongs to the SHA-2 family, designed by the NSA and standardized by NIST. It produces a 256-bit (32-byte) digest.
- `-sign private.pem` — Instructs OpenSSL to sign the computed hash using the private key stored in `private.pem`. Internally this computes: `Signature = Hash^d mod n`.
- `-out signature.bin` — Saves the signature as a binary file. Signatures are raw binary data (not human-readable text). You can inspect the binary content using `xxd signature.bin`.
- `document.txt` — The file to be signed.

Expected terminal output: *(No output on success — the signature is written to `signature.bin` silently.)*

You can inspect the signature size:
```bash
ls -la signature.bin
```
A 2048-bit RSA key produces a 256-byte (2048-bit) signature file.

**[Insert Screenshot: Terminal showing the sign command and `ls -la signature.bin`]**

To view the binary signature content as hex:
```bash
xxd signature.bin | head
```

### 7.3 What SHA-256 Does Internally

SHA-256 applies 64 rounds of bitwise transformations, rotations, and additions to the input data, producing a 32-byte output. The avalanche effect means that the hash of "Transfer Rs.5000 to Account X" and "Transfer Rs.50000 to Account X" are completely unrelated — there is no mathematical relationship between them that an attacker could exploit.

In comparison, our project's hash function `hash = (hash * 31 + char) % n` is a much simpler polynomial rolling hash. It is sufficient for a demonstration (and easy to understand), but it does not have the full avalanche property or collision resistance of SHA-256. This is a deliberate trade-off in the project: educational clarity over production-grade security.

### 7.4 Observations

After running the command, `signature.bin` contains 256 bytes — the result of applying RSA's mathematical formula `H^d mod n` to the SHA-256 hash of the document. Anyone who has the public key and the original document can now verify this signature. But without the private key, no one can generate a valid signature for any document.

### 7.5 Learning Outcome

The signing process is a two-step operation: hashing and then RSA encryption of the hash with the private key. Understanding this two-step nature is critical. It means the signature is both document-specific (because of the hash) and signer-specific (because of the private key). This is exactly what our `signMessage()` function in the project implements.

---

## 8. Practical Experiment 4: Verifying a Digital Signature

### 8.1 Background

Verification is performed by the recipient of the document. They need two things:
1. The document (to recompute the hash independently).
2. The signature (to recover the original hash using the public key).

If these two hashes match, the document is authentic and unaltered. In our project (`backend/verify.cpp`):

```cpp
bool verifySignature(const std::string& message, long long signature, long long e, long long n) {
    long long recoveredHash = modPow(signature, e, n);  // Recover hash using public key
    long long computedHash  = customHash(message, n);   // Recompute hash from document
    return (recoveredHash == computedHash);
}
```

OpenSSL's `dgst -verify` performs the same operation using SHA-256 and the RSA public key.

### 8.2 Verifying the Signature

**Command:**
```bash
openssl dgst -sha256 -verify public.pem -signature signature.bin document.txt
```

**Explanation:**
- `openssl dgst` — The message digest subcommand.
- `-sha256` — The same hash algorithm used during signing. This is critical — verification must use the exact same algorithm. Using `-sha512` here would produce a different hash and fail verification even for an untampered document.
- `-verify public.pem` — Tells OpenSSL to perform verification (not signing) using the public key in `public.pem`. Internally it computes `Signature^e mod n` to recover the original hash.
- `-signature signature.bin` — The binary signature file to verify against.
- `document.txt` — The document to hash and compare against.

**Expected Output:**
```
Verified OK
```

**[Insert Screenshot: Terminal showing the verify command and "Verified OK" output]**

### 8.3 What Happens Internally During Verification

When OpenSSL runs this command, it executes the following sequence of operations:

1. Reads `public.pem` and extracts the public exponent `e` and modulus `n`.
2. Reads `signature.bin` and interprets the bytes as the integer `S`.
3. Computes `H_recovered = S^e mod n` — this is modular exponentiation, identical to `modPow(signature, e, n)` in `mod_arith.cpp`.
4. Computes `H_computed = SHA256(document.txt)` — hashes the received document.
5. Compares `H_recovered` and `H_computed`. If equal, prints "Verified OK"; otherwise, "Verification Failure".

This entire process relies on the mathematical relationship between `e` and `d` such that for any number `m`: `(m^d mod n)^e mod n = m`. This is the RSA trapdoor function, and it holds because of Euler's theorem in number theory.

### 8.4 Observations

The output "Verified OK" is a powerful two-word confirmation that carries enormous mathematical weight. It simultaneously proves that:
- The document was signed by the holder of the private key corresponding to `public.pem` (Authenticity).
- The document has not been modified since it was signed (Integrity).
- The signer cannot deny having signed it (Non-Repudiation).

### 8.5 Learning Outcome

Verification uses only the public key — a key that is freely available to everyone. This is the genius of asymmetric cryptography. You do not need to share any secrets to allow someone to verify your signature. The security lies entirely in the mathematical impossibility of forging a valid signature without the private key.

---

## 9. Practical Experiment 5: Tampering Demonstration

### 9.1 Background

This is the most critical experiment in the study. All the theory about hash functions and integrity protection becomes viscerally real when you actually modify a document and watch the verification fail. This experiment mirrors the "Tamper Demo" section of the custom RSA project, where the frontend allows users to enter a modified document and observe the INVALID SIGNATURE result.

### 9.2 Modifying the Document

**Original content of `document.txt`:**
```
Transfer Rs.5000 to Account X
```

Modify it to simulate a fraudulent alteration — adding a single zero to change the transfer amount:

```bash
echo "Transfer Rs.50000 to Account X" > document.txt
```

**Important:** We are NOT generating a new signature. The `signature.bin` file remains exactly as it was — the signature created for the original document. We are testing whether the same signature can fraudulently pass verification for the modified document.

### 9.3 Attempting Verification on the Tampered Document

**Command:**
```bash
openssl dgst -sha256 -verify public.pem -signature signature.bin document.txt
```

This is the exact same verification command as Experiment 4. The only thing that has changed is the content of `document.txt`.

**Expected Output:**
```
Verification Failure
```

**[Insert Screenshot: Terminal showing "Verification Failure" after tampering]**

### 9.4 Why Verification Fails: Step-by-Step Trace

Understanding exactly why this fails reinforces every concept in the theory section.

1. **OpenSSL reads `signature.bin`** and computes `S^e mod n` to recover the hash that was originally signed. Call this `H_original` — the SHA-256 hash of "Transfer Rs.5000 to Account X".

2. **OpenSSL hashes the current `document.txt`**: It computes `SHA256("Transfer Rs.50000 to Account X")`. Because of the avalanche effect, this hash `H_tampered` is completely different from `H_original`.

3. **OpenSSL compares** `H_original` and `H_tampered`. They do not match. The system prints "Verification Failure".

| Document | SHA-256 Hash (Illustrative Partial) |
|---|---|
| `Transfer Rs.5000 to Account X` | `3a7bd3e2360a3d29eea436fcfb7e44c7343bf6d...` |
| `Transfer Rs.50000 to Account X` | `f9c82b41aa1730f5bca74ef1f0a2d9a2c3e5b77...` |

These hashes share no common structure. An attacker who wants to forge a valid signature for the tampered document would need to find `S'` such that `(S')^e mod n` equals the SHA-256 of the tampered document — which requires solving the RSA factoring problem, for which no efficient algorithm is known.

### 9.5 Restoring the Document

```bash
echo "Transfer Rs.5000 to Account X" > document.txt
openssl dgst -sha256 -verify public.pem -signature signature.bin document.txt
```
Expected: `Verified OK` — confirming the signature file is intact and only the document had been modified.

### 9.6 Observations

This experiment proves why digital signatures are superior to physical signatures for document security. A physical signature cannot detect whether the content of a contract was changed after signing. A digital signature makes such alteration immediately detectable — even changing a single space character would produce "Verification Failure".

### 9.7 Learning Outcome

The tamper demonstration is the culminating proof of concept. Every concept from the Cryptography and Network Security course — hashing, asymmetric keys, modular arithmetic, and the RSA trapdoor function — converges at this single experiment. "Verification Failure" is not just an error message; it is a mathematical proof that the document has been altered since it was legitimately signed.

---

## 10. Comparative Analysis: Custom RSA Project vs. OpenSSL

| Aspect | Custom C++ Project | OpenSSL |
|---|---|---|
| **Key Generation** | `keygen.cpp`: p=61, q=53. n=3233. | `openssl genrsa 2048`: Cryptographically secure 1024-bit primes. n is 2048-bit. |
| **Hash Algorithm** | `hash.cpp`: Polynomial rolling hash `(hash*31 + char) % n`. | SHA-256 (NIST standard). Full avalanche effect. |
| **Signature Formula** | `signature.cpp`: `S = H^d mod n` via `modPow()`. | Same: `S = H^d mod n`, with PKCS#1 v1.5 padding. |
| **Verification Formula** | `verify.cpp`: `H' = S^e mod n` via `modPow()`. | Same: `H' = S^e mod n`, compared with `SHA256(document)`. |
| **Modular Exponentiation** | Square-and-multiply in `mod_arith.cpp`, from scratch. | Same algorithm, Barrett reduction variant, optimized C. |
| **Modular Inverse** | Extended Euclidean Algorithm in `mod_arith.cpp`, from scratch. | Same algorithm internally. |
| **Security Level** | Low (small primes, custom hash). Education only. | High (2048-bit, SHA-256). Industry standard. |
| **Interface** | Web UI (HTML/CSS/JS) + Python API + C++ engine. | Command-line terminal. |
| **Real-World Usage** | Not suitable for production. | Powers ~60% of global HTTPS traffic. |

### 10.1 The Critical Insight

The table reveals something important: **the mathematical operations are identical.** The difference between the custom project and OpenSSL is not conceptual — it is one of scale and engineering rigor. Every `modPow()` call in `mod_arith.cpp` does exactly what OpenSSL's RSA engine does internally. The course project does not produce a "simplified imitation" of OpenSSL — it produces a mathematically correct, functionally equivalent implementation that operates on smaller numbers with a simpler hash. The concepts are not simplified; only the scale is.

---

## 11. Security Analysis

### 11.1 Why Small RSA Keys Are Insecure

The custom project uses p = 61 and q = 53, giving n = 3233. A standard laptop factors 3233 into 61 and 53 in microseconds. Once an attacker knows p and q, they compute φ(n) = 3120 and derive the private exponent `d` from `e = 17`, completely breaking the system.

Real RSA systems use keys of at least 2048 bits. Factoring a 2048-bit number using the best known algorithm (General Number Field Sieve) would take longer than the estimated age of the universe with all Earth's computing resources combined.

### 11.2 Key Size Recommendations

| Key Size | Security Status | Recommended Use |
|---|---|---|
| < 1024 bits | Broken / Insecure | Never use |
| 1024 bits | Deprecated (since 2013) | Legacy systems only |
| 2048 bits | Secure (current minimum) | Standard production use |
| 3072 bits | Strong | High-security environments |
| 4096 bits | Very strong | Long-term sensitive archives |

### 11.3 Private Key Protection

The entire security model rests on the private key remaining private. Best practices include:

- **Passphrase encryption**: `openssl genrsa -aes256 -out private.pem 2048` encrypts the key file at rest with AES-256.
- **Hardware Security Modules (HSMs)**: Physical devices that store keys internally, never exposing raw key material to software.
- **Strict file permissions**: On Linux, `chmod 600 private.pem` ensures only the owner can read the file.
- **Key rotation**: Periodically generating new key pairs limits the exposure window.

### 11.4 Hash Function Security

The custom project's polynomial hash has a collision space limited by n (only 3233 possible values). SHA-256 provides a 2^256 hash space, making collisions computationally infeasible. SHA-1 and MD5, while still supported by OpenSSL, have known collision vulnerabilities and must not be used for new signature applications.

---

## 12. Applications in Real-World Cybersecurity

| Domain | Application | How Digital Signatures Are Used |
|---|---|---|
| **Banking & Finance** | SWIFT, UPI, Net Banking | Every inter-bank instruction carries a digital signature to prevent mid-transit tampering. |
| **Software Updates** | Windows Update, apt, Play Store | Updates are signed by the developer; the OS verifies before installation to block malware injection. |
| **Code Signing** | GitHub GPG Commits, Apple App Store, Microsoft Authenticode | Developers sign their code; users can verify authenticity. |
| **Government Documents** | Aadhaar eSign, DigiLocker, Income Tax Portal | Legal citizen documents use digital signatures under India's IT Act. |
| **Secure Email** | S/MIME, PGP/GPG | Signed emails prove sender identity and email body integrity. |
| **SSL/TLS Certificates** | HTTPS, VPN, SSH | Every website certificate is signed by a CA; browsers verify before trusting the connection. |
| **Blockchain** | Bitcoin, Ethereum | Every transaction is signed with the sender's private key; the network verifies ownership. |

The same mathematical operation — `S = H^d mod n` and `H = S^e mod n` — is the underlying mechanism in all of these applications. The five OpenSSL commands demonstrated in this practical are what protect global financial systems, software supply chains, and government identity infrastructure.

---

## 13. Challenges Faced During Study

**1. Understanding the Signing Direction**
The initial confusion was why the private key is used for signing when signatures need to be publicly verifiable. Grasping that signing is the mathematical inverse of encryption — locking with the private key so others can unlock with the public key to confirm identity — required careful re-reading of the asymmetric theory section.

**2. PEM File Format**
When opening `private.pem` in a text editor, the Base64-encoded content was not immediately interpretable. Using `openssl rsa -in private.pem -text -noout` to reveal the raw numerical parameters made the connection to `keygen.cpp` concrete.

**3. Binary Signature File**
The `signature.bin` file appeared garbled in a text editor. Using `xxd signature.bin` to view the hex representation was an important step. It also confirmed that a 2048-bit RSA signature is exactly 256 bytes.

**4. Connecting Commands to Mathematics**
OpenSSL abstracts away the mathematics entirely. Having first built the RSA system in C++ — seeing `modPow(h, d, n)` written explicitly in `signature.cpp` — made it clear what `openssl dgst -sign` was doing internally. Without that prior understanding, the OpenSSL commands would have felt like incantations rather than mathematical operations.

**5. Hash Algorithm Selection**
OpenSSL supports MD5, SHA-1, SHA-256, and SHA-512. Understanding why SHA-256 is recommended — that MD5 and SHA-1 have known collision vulnerabilities — required additional reading on cryptanalysis beyond the course material.

---

## 14. Conclusion

This practical study has been an illuminating hands-on exploration of RSA digital signatures through the lens of OpenSSL. Beginning with key pair generation, through document creation and signing, to signature verification, and finally to the definitive "Verification Failure" upon document tampering — every step reinforced a specific theoretical concept from the Cryptography and Network Security curriculum.

The most significant learning outcome is the understanding that OpenSSL is not magic. It is a highly optimized implementation of the same mathematics explored in the custom C++ RSA project. The `modPow()` function in `mod_arith.cpp`, the key generation logic in `keygen.cpp`, the hash in `hash.cpp`, the signing in `signature.cpp`, and the verification in `verify.cpp` — all of these map directly to specific OpenSSL commands. The only substantive differences are the size of the numbers (small primes vs. 2048-bit primes) and the strength of the hash function (custom polynomial vs. SHA-256). The conceptual architecture is identical.

The tamper demonstration drives home the real-world importance of this technology. Digital signatures prevent fraudulent financial transactions, ensure software updates are not weaponized by hackers, and provide legal standing to electronic documents. In a world where so much commerce, governance, and communication happens digitally, understanding how these trust mechanisms work is foundational knowledge for a computer science engineer.

This dual perspective — building RSA from scratch in the course project and then seeing it operate at production scale in OpenSSL — provides a depth of understanding that reading textbooks alone cannot achieve.

---

## 15. References

1. **OpenSSL Official Documentation** — https://www.openssl.org/docs/
   *Primary reference for all OpenSSL commands, options, and cryptographic protocols.*

2. **Rivest, R. L., Shamir, A., & Adleman, L. M. (1978).** A Method for Obtaining Digital Signatures and Public-Key Cryptosystems. *Communications of the ACM, 21*(2), 120–126.
   *The original RSA paper describing the mathematical foundations.*

3. **Stallings, W. (2022).** *Cryptography and Network Security: Principles and Practice* (8th ed.). Pearson.
   *Standard textbook for cryptographic concepts, RSA, digital signatures, and hash functions.*

4. **NIST SP 800-57 Part 1 Rev. 5.** Recommendation for Key Management. National Institute of Standards and Technology.
   *Official guidance on RSA key size recommendations and security levels.*

5. **Forouzan, B. A. (2007).** *Cryptography and Network Security*. McGraw-Hill.
   *Additional reference for public key cryptography and certificate infrastructure.*

6. **RFC 8017 — PKCS #1: RSA Cryptography Specifications Version 2.2** (2016). Internet Engineering Task Force (IETF).
   *Formal specification for RSA operations, padding schemes (PKCS#1 v1.5), and key formats used by OpenSSL.*

7. **FIPS PUB 180-4.** Secure Hash Standard (SHS). NIST, 2015.
   *Official specification of the SHA-2 family of hash algorithms, including SHA-256 used in this practical.*

8. **Course Project Source Code — CRPAAT: Secure Document Integrity Verification using RSA Digital Signatures.**
   GitHub Repository: https://github.com/jkj3553/CRPAAT
   *Custom C++ implementation of RSA digital signatures from scratch, the primary project this practical study supports.*

---

*End of Report*

---
> **Submission Note:** This report was prepared as a practical study for the Cryptography and Network Security course (4th Semester, CSE). All experiments were performed on a Linux system using standard OpenSSL tools. The report is intended to be read alongside the companion course project source code, which implements the same algorithms manually in C++.
