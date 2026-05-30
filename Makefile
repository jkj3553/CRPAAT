all:
	g++ -o backend/rsa_engine backend/main.cpp backend/prime.cpp \
	backend/gcd.cpp backend/mod_arith.cpp backend/keygen.cpp \
	backend/hash.cpp backend/signature.cpp backend/verify.cpp

clean:
	rm -f backend/rsa_engine
