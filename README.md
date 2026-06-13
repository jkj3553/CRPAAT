# Digital Signature Integrity Platform (OpenSSL Edition)

## Project Overview
This project is an advanced, educational cybersecurity simulation platform designed to visually demonstrate the end-to-end mechanics of **RSA Digital Signatures** using industry-standard **OpenSSL** as the core cryptographic engine. 

The application is structured to teach students and security practitioners three fundamental tenets of security architecture, directly mapped to interactive attack simulations:
1. **Authenticity**: Confirming that a document originated from the genuine sender (Alice). *Tested via the Wrong Key Attack scenario.*
2. **Integrity**: Mathematically proving that a document has not been altered in transit. *Tested via the Man-in-the-Middle (MitM) simulation and Avalanche Effect Analysis.*
3. **Non-Repudiation & Trust**: Ensuring the signer cannot deny having signed the message and protecting the foundational assumption of trust. *Tested via the Private Key Compromise simulation.*

---

## Architectural Layout & Storyline

Unlike generic file-upload applications, this is a live visualization of a **Man-in-the-Middle (MitM) Attack Simulation** mapped to a state-of-the-art glassmorphism dashboard.

```text
       ┌───────────┐      Encrypted Channel      ┌─────────┐
       │   Alice   ├────────────────────────────>│   Bob   │
       │ (Signer)  │              │              │ (Verify)│
       └───────────┘              │              └─────────┘
                                  ▼
                            ┌───────────┐
                            │ Adversary │
                            │   (MitM)  │
                            └───────────┘
```

1. **Alice (Sender / Signer)**: 
   - Uploads a raw document.
   - Generates a SHA-256 hash using OpenSSL.
   - Signs the hash using her private RSA key.
   - **Key Metadata Inspector**: The platform actively parses raw `.pem` files using OpenSSL subprocesses to display live mathematical internals (Algorithm, Key Size, Exponents) and defines their functional roles (Signing vs. Verification), ensuring the UI never lies to the user.
2. **Adversary (Man-in-the-Middle)**: 
   - Intercepts the document silently from the communication line.
   - Modifies the text payload in a glassmorphic terminal emulator.
   - Relays the altered document to Bob. Note that no network alarm is triggered yet, modeling stealth attacks!
3. **Bob (Receiver / Verifier)**:
   - Receives the payload and signature.
   - Runs Bob's verification button, which triggers the **4-Stage Verification Pipeline**.
   - Instead of treating OpenSSL as a binary "pass/fail" black box, the platform decomposes the verification into an academic pipeline:
     1. **Hash Validation**: Verifies Data Integrity.
     2. **Signature Validation**: Proves the mathematical soundness of the RSA structure (padding and modulus limits).
     3. **Identity Verification**: Enforces PKI binding by ensuring the specific public key genuinely belongs to Alice.
     4. **Trust Decision**: Aggregates the previous stages to establish or reject cryptographic trust.

---

## The Cryptanalysis Lab

The platform includes a dedicated **Cryptanalysis Lab** interface for in-depth cryptographic learning, divided into two core modules:

### Module 1: Avalanche Effect Analysis (SHA-256)
Demonstrates the strict diffusion properties of cryptographic hashing.
* Calculates exact character differences (using Levenshtein edit distance) vs. bit-level hash differences (using Hamming weight).
* Shows how a single character change in a message radically alters the resulting SHA-256 hash output by over 40-50% of its bits.

### Module 2: Digital Signature Attack Analysis (RSA)
Tests the boundary conditions and assumptions of digital trust using impersonation scenarios involving a malicious actor, Mallory.
* **Random Signature Attack**: Shows that an attacker cannot forge a signature simply by submitting random bytes, as they mathematically fail public key decryption verification.
* **Wrong Key Attack**: Demonstrates that even if Mallory signs a message with her *own* valid private key, the system catches the mismatch when verifying against Alice's public key (Testing Authenticity).
* **Private Key Compromise**: Visualizes the catastrophic flow where an attacker steals Alice's private key, successfully forging a signature that passes verification, proving that cryptography only secures key ownership, not human identity.

---

## Technical Stack

* **Frontend**: Responsive Single Page App (SPA) built with HTML, Vanilla CSS, and modern interactive JavaScript. Styled with glassmorphism overlays, real-time glowing pipelines, status indicators, and terminal animations.
* **Server**: Lightweight Node.js/Express web server acting as a secure REST API middleware.
* **Cryptographic Engine**: Native **OpenSSL (3.x)** command-line executable invoked securely from the server runtime.

---

## How the Cryptography Works (OpenSSL Commands under the Hood)

The REST API coordinates the following real-world shell-equivalent commands to perform raw operations:

### 1. Initialize RSA Environment
Generates a highly secure private RSA key and extracts its public counterpart (handled automatically for Alice and the adversary Mallory at startup):
```bash
# Generate the private key for Alice
openssl genrsa -out server/keys/alice_private.pem 2048

# Extract the public key in PEM format
openssl rsa -in server/keys/alice_private.pem -pubout -out server/keys/alice_public.pem
```
*(Note: The platform is dynamically adaptable to changing bit-sizes. If transitioned from 2048 to 4096-bit via OpenSSL, the UI automatically parses the `.pem` and adapts.)*

### 2. SHA-256 Hashing
Maps arbitrary-length document bytes to a fixed 256-bit hexadecimal string representation:
```bash
openssl dgst -sha256 server/uploads/original.txt
```

### 3. Creating the Digital Signature
Computes the SHA-256 hash of the uploaded document and signs it with Alice's private key:
```bash
openssl dgst -sha256 -sign server/keys/alice_private.pem -out server/signatures/document.sig server/uploads/original.txt
```

### 4. Recipient Cryptographic Verification
Rather than just executing a single verification command, the platform dynamically decomposes verification to feed the 4-Stage Verification Pipeline:
1. **Hashing Validation**: Re-hashes the incoming document (`openssl dgst -sha256`) against the expected digest.
2. **Mathematical Decryption**: Reverses the signature bytes using RSA public decryption to extract the original digest (`openssl rsautl -verify -pubin -inkey ...`) to test RSA padding.
3. **Identity Binding**: The system validates that the public key explicitly belongs to the intended sender.
```bash
# Core verification command used as baseline
openssl dgst -sha256 -verify server/keys/alice_public.pem -signature server/signatures/document.sig server/uploads/original.txt
```

---

## Secure Software Engineering Highlights 

* **Immunized Against Command Injection**:  
  Rather than using traditional string-concatenated shell executors (`child_process.execSync`) which are highly vulnerable to input injection vectors, this server utilizes safe child process argument execution:
  ```javascript
  const { execFileSync } = require('child_process');
  execFileSync('openssl', ['dgst', '-sha256', '-verify', PUBLIC_KEY, ...]);
  ```
  This guarantees that arguments bypass the system shell interpreter completely, making shell command injection mathematically impossible.
* **Multi-Step Animation Pipeline**:  
  Alice's signature box separates the **Hashing** phase (yellow `#️⃣` state) from the **Signing** phase (green `🔒` state) dynamically, explaining the physical mathematical progression to students.

---

## Setup & Running the Platform

### Prerequisites
* **Node.js** (v16+)
* **OpenSSL** installed and available in your system path.

### 1. Installation
Navigate to the `server/` directory and install the required dependencies:
```bash
cd server
npm install
```

### 2. Running in Development Mode
Start the Node.js server with nodemon for automatic file tracking:
```bash
npm run dev
```

### 3. Access the Dashboard
Open your web browser of choice and go to:
```text
http://localhost:3000
```
