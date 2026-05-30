# CRPAAT: RSA Digital Signature System

## Project Overview
This project is a complete, educational demonstration of an RSA Digital Signature system built from scratch. Designed for a college cybersecurity assignment (CRPAAT), the objective is to illustrate the end-to-end workflow of digital signatures—including key generation, document signing, signature verification, and tamper detection—without relying on external cryptographic libraries for the core mathematical operations.

## Technology Stack & Architecture

### 1. Core Cryptographic Engine (Backend)
- **Language**: C++
- **Why C++?**: C++ was chosen for the core engine to satisfy the strict academic "no library" requirement. It allows for low-level memory control and high-performance execution of intensive mathematical operations (like modular exponentiation and large number arithmetic).
- **Modules**:
  - `prime.cpp` & `gcd.cpp`: Handles prime number generation and Greatest Common Divisor calculations (using the Euclidean algorithm).
  - `mod_arith.cpp`: Implements the Extended Euclidean Algorithm for modular inverses and modular exponentiation.
  - `keygen.cpp`: Orchestrates the generation of the public ($e, n$) and private ($d, n$) key pairs.
  - `hash.cpp`: Provides a custom string hashing algorithm to map documents to integer hashes.
  - `signature.cpp` & `verify.cpp`: Implements the core RSA formulas for signing ($S = H^d \pmod n$) and verifying ($H = S^e \pmod n$).

### 2. Web Server (Middleware)
- **Language**: Python (Flask Framework)
- **Why Python?**: Python and Flask provide a lightweight, highly readable, and rapid way to stand up a RESTful API. The server acts as a bridge, accepting HTTP requests from the frontend, securely invoking the compiled C++ binary via `subprocess`, and returning the JSON results.
- **Module**:
  - `app.py`: Defines the `/api/keygen`, `/api/sign`, and `/api/verify` endpoints.

### 3. User Interface (Frontend)
- **Language**: HTML, CSS (Vanilla), JavaScript
- **Why this stack?**: Vanilla web technologies ensure a fast, dependency-free, and accessible application. The UI is designed to be responsive, interactive, and educational, allowing users to physically see the keys, hashes, and signatures change in real-time.
- **Modules**:
  - `index.html`: The structural layout of the application.
  - `style.css`: Modern, glassmorphism-inspired styling with status indicators.
  - `script.js`: Manages session state, handles API calls to the Flask backend, and drives the interactive tamper detection demonstrations.

## How the Cryptography Works

Digital signatures guarantee **Authenticity** and **Integrity**. This project uses the RSA algorithm to achieve this:

1. **Key Generation**: 
   - Generates two prime numbers $p$ and $q$.
   - Computes the modulus $n = p \times q$ and the totient $\phi(n) = (p-1)(q-1)$.
   - Selects a public exponent $e$ that is coprime to $\phi(n)$.
   - Computes the private exponent $d$ (the modular inverse of $e \pmod{\phi(n)}$).
2. **Signing a Document**:
   - The document (string) is passed through a custom **Hash Function** to generate a unique integer representation $H$.
   - The hash is encrypted using the private key: $S = H^d \pmod n$. This resulting $S$ is the **Digital Signature**.
3. **Verification**:
   - The receiver takes the Signature $S$ and decrypts it using the sender's public key: $H' = S^e \pmod n$.
   - The receiver independently hashes the received document to get $H$.
   - If $H' == H$, the signature is **VALID**. The document has not been tampered with.

### Real-Life Application
In the real world, digital signatures are the backbone of secure internet communications (HTTPS/TLS), software distribution (verifying app updates), financial transactions, and legally binding digital contracts (like DocuSign). If a malicious actor alters a signed contract (e.g., changing a payout amount), the hash of the tampered document will completely change. When the verifier runs the math, the hashes will mismatch, instantly exposing the forgery—a scenario beautifully demonstrated in the **Tamper Demo** section of this project.

## Project Structure
```text
CRPAAT/
├── backend/          # C++ Cryptographic Engine
│   ├── main.cpp      # CLI Entry point for the engine
│   ├── keygen.cpp/h  # RSA Key pair generation
│   ├── signature...  # Signing logic
│   ├── verify...     # Verification logic
│   ├── prime/gcd...  # Math utilities
│   └── hash.cpp/h    # Custom hashing algorithm
├── server/           # Python Middleware
│   └── app.py        # Flask REST API
├── frontend/         # User Interface
│   ├── index.html    # Web layout
│   ├── style.css     # UI Styling
│   └── script.js     # API interaction and DOM manipulation
├── Makefile          # Build instructions for C++ backend
└── .gitignore        # Git ignore rules
```

## How to Run

1. **Compile the Backend Engine**
   ```bash
   make
   ```
2. **Start the Flask Server**
   ```bash
   cd server
   python3 app.py
   ```
3. **Use the Application**
   Open your browser and navigate to `http://localhost:5000` to interact with the RSA Digital Signature system.
