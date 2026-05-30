from flask import Flask, request, jsonify, send_from_directory
import subprocess
import os

app = Flask(__name__, static_folder='../frontend')

# Path to compiled C++ binary
BINARY = os.path.join(os.path.dirname(__file__), '..', 'backend', 'rsa_engine')

def run_engine(args):
    """Run the C++ binary with given arguments, return stdout as string."""
    result = subprocess.run(
        [BINARY] + [str(a) for a in args],
        capture_output=True,
        text=True,
        timeout=5
    )
    return result.stdout.strip()

@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('../frontend', path)

@app.route('/api/keygen', methods=['GET'])
def keygen():
    out = run_engine(['keygen']).split()
    return jsonify({
        'e':      out[0],
        'n_pub':  out[1],
        'd':      out[2],
        'n_priv': out[3]
    })

@app.route('/api/sign', methods=['POST'])
def sign():
    data = request.get_json()
    message   = data['message']
    d         = data['d']
    n         = data['n']
    out = run_engine(['sign', message, d, n]).split()
    return jsonify({
        'signature': out[0],
        'hash':      out[1]
    })

@app.route('/api/verify', methods=['POST'])
def verify():
    data = request.get_json()
    message   = data['message']
    signature = data['signature']
    e         = data['e']
    n         = data['n']
    out = run_engine(['verify', message, signature, e, n])
    return jsonify({'result': out})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
