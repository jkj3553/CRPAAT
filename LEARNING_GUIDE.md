# The Complete Beginner's Guide to the CRPAAT RSA Project

Welcome! If you know absolutely nothing about cryptography, prime numbers, or programming, you are in the right place. By the end of this guide, you will understand exactly what this project is, the concepts behind it, and how the code brings it all to life.

---

## 1. What is this project solving?
Imagine you need to sign a legal contract, but you live 1,000 miles away from the other person. You can't use a pen. You send an email saying "I agree to pay you $50," but how does the other person know:
1. **You** actually sent it, and not someone pretending to be you? (This is called **Authenticity**).
2. A hacker didn't intercept the email and change it to "I agree to pay you $5,000"? (This is called **Integrity**).

This project is a **Digital Signature Demonstration**. It proves mathematically that a document is authentic and has not been tampered with. To achieve this, we built a system from scratch using a famous mathematical recipe called **RSA** (named after its inventors Rivest, Shamir, and Adleman).

---

## 2. The Big Picture: The Restaurant Analogy
Before we look at the math, let's look at how the software is built. Think of this project like a restaurant:

*   **The Frontend (HTML, CSS, JavaScript)**: This is the **Dining Room**. It's what you (the user) see on your screen. It has buttons, text boxes, and a nice design. You place your order here (e.g., you click the "Sign this document" button).
*   **The Middleware Server (Python / Flask)**: This is the **Waiter**. The waiter takes your order from the dining room and walks it back to the kitchen. Python is a friendly programming language that excels at passing messages between the frontend and the backend.
*   **The Backend Engine (C++)**: This is the **Kitchen / Chef**. It doesn't look pretty, but it does all the heavy lifting. C++ is a super-fast programming language. We use it to perform massive mathematical calculations. The Chef cooks the result, hands it to the Waiter (Python), who brings it back to your table (Frontend).

---

## 3. The Core Concepts: Step-by-Step

To make a digital signature work, we need three core concepts: **Hashing**, **Asymmetric Keys**, and **Clock Math**.

### Concept 1: Hashing (The Digital Fingerprint)
Imagine you have a 500-page book. Instead of checking every single word to see if it was changed, what if you could mathematically compress the entire book into a unique 5-digit number? 
*   If the book stays exactly the same, the number is exactly the same.
*   If someone changes *one single letter* on page 499, the 5-digit number changes completely.

This is called a **Hash**. It is a one-way mathematical blender. In our project (inside the `backend/hash.cpp` file), we take the text you type and blend it into a unique number. 

### Concept 2: Asymmetric Keys (The Magic Padlock)
Normally, a password unlocks a file. If you know the password, you can lock it AND unlock it. This is called *Symmetric* (the same key is used for both).

RSA uses **Asymmetric Cryptography**. You generate *two* keys that are mathematically linked:
*   **The Public Key**: You give this to the whole world. Think of it as an open padlock. Anyone can snap it shut on a box, but they cannot open it.
*   **The Private Key**: You keep this completely secret. This is the only key that can open the locked padlocks.

**For digital signatures, we use this in reverse!**
You lock (encrypt) the document's Hash with your **Private Key**. Because *only* your Private Key could have locked it, when someone else successfully unlocks it with your **Public Key**, it mathematically proves **YOU** were the one who locked it!

### Concept 3: The Math Behind RSA
How do we actually make these keys? We use **Prime Numbers** and **Modular Arithmetic** (Clock Math).

1.  **Prime Numbers**: A prime number is a number only divisible by 1 and itself (like 2, 3, 5, 7, 11). In our project (`backend/prime.cpp`), we generate two prime numbers. Let's call them **p** and **q**.
2.  **The Modulus (n)**: We multiply them together. `n = p × q`. This `n` is part of your Public Key. It's easy to multiply two numbers, but if `n` is massive, it is practically impossible for a computer to guess the original primes `p` and `q`. This difficulty is the entire basis of RSA security!
3.  **The Exponents (e and d)**: Using some clever math (the Extended Euclidean Algorithm in `backend/mod_arith.cpp`), we find two special numbers:
    *   **e** (Public exponent)
    *   **d** (Private exponent)

---

## 4. How They Work Together (The Final Workflow)

### Step 1: Signing the Document
1.  **You write:** "I owe you $10."
2.  **Hash it:** The blender turns this into the number `12345`.
3.  **Sign it:** The C++ kitchen takes `12345`, raises it to the power of your private key **d**, and wraps it around a clock of size **n** (Modular Exponentiation). The result is your **Signature** (let's say the result is `88990`).

### Step 2: Verifying the Document
1.  Your friend receives the document: "I owe you $10" and the Signature `88990`.
2.  **Hash it:** Your friend runs the text through the exact same blender and gets `12345`.
3.  **Verify it:** Your friend takes the Signature `88990`, raises it to the power of your public key **e**, and wraps it around the clock **n**.
4.  **The Magic Reveal:** The math states that if you unlock it correctly, the result will be `12345`. Since this matches your friend's hash, the signature is **Valid!**

### Step 3: The Tamper Demo (Why this matters)
What if a hacker intercepts the message and changes it to "I owe you $100"?
1.  Your friend receives the tampered message and the original signature `88990`.
2.  Your friend hashes "I owe you $100". The blender outputs a totally different number, say `99999`.
3.  Your friend verifies the signature `88990` with your public key, which safely outputs the original hash `12345`.
4.  `99999` does not equal `12345`. **The system instantly detects the tamper and sounds the alarm.** (You can try this yourself in the Tamper Demo section of the website!).

---

## 5. Why build this from scratch?
Normally, programmers use pre-built code libraries to do this math. However, this project was intentionally built completely from scratch in C++ without any libraries. Why?
*   **To Learn:** You don't truly understand how a car works until you build the engine yourself.
*   **To Prove:** It proves that complex cryptographic systems are just layers of beautiful, logical mathematics that anyone can understand and implement if they break it down step-by-step.
