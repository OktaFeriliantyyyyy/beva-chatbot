from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Embedding, LSTM, Dense
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.preprocessing.text import tokenizer_from_json
import json
import numpy as np
import os
import firebase_admin
from firebase_admin import credentials, firestore
from flask import make_response
import codecs
import simplejson
import logging
from urllib.parse import unquote_plus
import chardet

logging.basicConfig(level=logging.INFO)

app = Flask(__name__, static_folder='bld', template_folder='templates')
CORS(app, resources={
    r"/*": {
        "origins": "http://localhost:3000",
        "supports_credentials": True,
        "methods": ["POST"],
        "headers": ["Content-Type", "Authorization"],
    }
})
socketio = SocketIO(app)

# Load data from intents.json
with open('intents.json', 'r', encoding='utf-8') as json_data:
    intents = json.load(json_data)

# Extract patterns and responses
patterns = []
responses = []

for intent in intents:
    patterns.extend(intent['patterns'])
    responses.extend(intent['responses'])

# Tokenization and data processing
tokenizer = Tokenizer()
tokenizer.fit_on_texts(patterns + responses)

# Word vectorization
input_sequences = tokenizer.texts_to_sequences(patterns)
output_sequences = tokenizer.texts_to_sequences(responses)

# Padding
max_len = max(len(seq) for seq in output_sequences)
input_data = pad_sequences(input_sequences, maxlen=max_len, padding='post')
output_data = pad_sequences(output_sequences, maxlen=max_len, padding='post')

# Convert labels to one-hot encoding
output_data_one_hot = to_categorical(output_data, num_classes=len(tokenizer.word_index) + 1, dtype='int32')

# Build a simple model
model = Sequential([
    Embedding(input_dim=len(tokenizer.word_index) + 1, output_dim=64, input_length=max_len),
    LSTM(256, return_sequences=True),
    Dense(len(tokenizer.word_index) + 1, activation='softmax')
])

model.compile(loss='categorical_crossentropy', optimizer='adam', metrics=['accuracy'])

# Train the model
model.fit(input_data, output_data_one_hot, epochs=100, batch_size=32)

# Save the model and tokenizer
model.save('chatbot_model.h5')

# Save the Tokenizer to a JSON file
tokenizer_json = tokenizer.to_json()
with open('tokenizer.json', 'w', encoding='utf-8') as tokenizer_file:
    tokenizer_file.write(tokenizer_json)

# Load the model
model = load_model('chatbot_model.h5')

# Load the Tokenizer from the JSON file
with open('tokenizer.json', 'r', encoding='utf-8') as tokenizer_file:
    loaded_tokenizer_json = tokenizer_file.read()
    loaded_tokenizer = tokenizer_from_json(loaded_tokenizer_json)

# Initialize Firebase with your credentials JSON file
cred = credentials.Certificate('chatbot-89b2d-firebase-adminsdk-x9o6t-c12fd3bc86.json')
firebase_admin.initialize_app(cred)

# Initialize Firestore database
db = firestore.client()

# Inisialisasi konteks percakapan
conversation_context = {}

@app.route('/')
def index():
    return render_template('index.html')

def decode_url_data(url_encoded_data):
    try:
        # Add logging to see the value of url_encoded_data
        app.logger.info(f"Encoded data: {url_encoded_data}")

        # Decode data with urllib.parse.unquote_plus
        decoded_data = unquote_plus(url_encoded_data.decode('utf-8'))

        # Clean the data by removing non-ASCII characters
        cleaned_data = ''.join(c if ord(c) < 128 else ' ' for c in decoded_data)

        return cleaned_data
    except Exception as e:
        print(f"Error decoding URL data: {e}")
        raise ValueError("Invalid URL data.")

def decode_request_data():
    try:
        raw_data = request.get_data()

        # Log the raw data
        app.logger.info(f"Raw data: {raw_data}")

        # Print the raw data for additional information
        print("Raw data (print):", raw_data)

        # Check if raw_data is a valid JSON string
        if not raw_data or not isinstance(raw_data, bytes):
            raise ValueError("Invalid JSON data.")

        # Use chardet library to detect the appropriate encoding
        encoding = chardet.detect(raw_data)['encoding']
        cleaned_data = ''.join(c for c in raw_data.decode(encoding, errors='replace') if c.isprintable() or c.isspace())

        # Validate individual characters to ensure compatibility with `utf-8`
        for i, char in enumerate(raw_data.decode(encoding, errors='replace')):
            if not char.isprintable() or not char.isspace():
                print(f"Invalid character at position {i}: {ord(char)}")

        # Parse JSON data
        data_json = json.loads(cleaned_data)

        return data_json

    except Exception as e:
        print(f"Error decoding JSON data: {e}")
        return jsonify({'status': 'error', 'message': 'Invalid JSON data.'}), 400

@app.route('/connect', methods=['POST'])
def connect():
    try:
        data_json = decode_request_data()

        # Access data_json fields
        name = data_json.get('name')
        email = data_json.get('email')
        phone = data_json.get('phone')

        # Validations
        if not name or not email or not phone:
            raise ValueError("Invalid data.")

        # Save user data to Firebase with additional fields (userID, Terakhir Login)
        users_ref = db.collection('users')
        new_user_ref = users_ref.add({
            'name': name,
            'email': email,
            'phone': phone,
            'terakhirLogin': firestore.SERVER_TIMESTAMP  # Gunakan SERVER_TIMESTAMP untuk waktu terakhir login
        })

        # Get the ID of the newly added user
        new_user_id = new_user_ref.id

        # After saving user data, interact with the chatbot model
        user_input = f"New user connected: {name}, {decode_url_data(email)}, {phone}"
        bot_response, _, context_patterns, follow_up_intents = generate_response(user_input)
        print("Bot Response:", bot_response)
        print("User data saved successfully.")

        return jsonify({
            'status': 'connected',
            'user_id': new_user_id,
            'bot_response': bot_response,
            'follow_up_intents': {
                'tag': follow_up_intents.get('tag', ''),
                'patterns': follow_up_intents.get('patterns', []),
                'responses': follow_up_intents.get('responses', []),
                'followUpIntents': follow_up_intents.get('followUpIntents', [])
            }
        })

    except ValueError as e:
        print(f"Invalid data: {e}")
        return jsonify({'status': 'error', 'message': 'Invalid data.'}), 400
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'status': 'error', 'message': 'Internal server error.'}), 500

@socketio.on('user_input')
def handle_user_input(data):
    user_input = data['data']
    try:
        bot_response, recommendations, context_patterns, follow_up_intents = generate_response(user_input)
    except ValueError as e:
        # Tangani kesalahan, misalnya jika generate_response tidak mengembalikan empat nilai yang diharapkan
        print(f"Terjadi kesalahan: {str(e)}")
        bot_response = "Terjadi kesalahan selama pemrosesan."
        follow_up_intents = []

    emit('message', {'data': bot_response, 'recommendations': recommendations, 'context_patterns': context_patterns, 'follow_up_intents': follow_up_intents})


@app.route('/api/chat', methods=['POST'])
def chat():
    if request.method == 'POST':
        try:
            data = request.json
            user_input = data.get('message')
            print(f"Input Pengguna: {user_input}")

            # Memanggil fungsi generate_response dengan menyertakan pola-pola kontekstual (context_patterns)
            response_text, _, follow_up_intents = generate_response(user_input) or ("", [], {})

            response_data = {
                'reply': response_text,
                'follow_up_intents': follow_up_intents
            }
            return jsonify(response_data)
        except Exception as e:
            print(f"Terjadi kesalahan: {str(e)}")
            return jsonify({'reply': 'Terjadi kesalahan selama pemrosesan.'})

def generate_response(input_text):
    input_sequence = loaded_tokenizer.texts_to_sequences([input_text])
    input_sequence = pad_sequences(input_sequence, maxlen=max_len, padding='post')[0]
    predicted_sequence = model.predict(np.expand_dims(np.expand_dims(input_sequence, axis=0), axis=-1))
    response_text, _, follow_up_intents = postprocess_model_output(predicted_sequence, input_text)

    if follow_up_intents:
        # Jika ada follow-up intents, gunakan respons dari follow-up intents
        responses = follow_up_intents.get('responses', [])

        if not responses:
            # Jika tidak ada respons yang spesifik, gunakan respons kosong
            return "", [], follow_up_intents  # Tambahkan nilai default untuk context_patterns
        else:
            # Jika ada respons yang didefinisikan, pilih respons secara acak
            response_text = np.random.choice(responses)

        return response_text, [], follow_up_intents  # Tambahkan nilai default untuk context_patterns

    else:
        # Jika tidak ada follow-up intents, cari pola yang cocok dengan input pengguna
        matching_patterns = []
        for intent in intents:
            for pattern in intent.get('patterns', []):
                if pattern.lower() in input_text.lower():
                    matching_patterns.extend(intent.get('patterns', []))
                    follow_up_intents = intent.get('followUpIntents', [])

                    # Tampilkan informasi di terminal
                    responses = intent.get('responses', [])
                    response_text = np.random.choice(responses) if responses else ""

                    print("Bot Response:", response_text)
                    print("Follow-up Intents:")
                    for follow_up_intent in follow_up_intents:
                        tag = follow_up_intent.get('tag', '')
                        patterns = follow_up_intent.get('patterns', [])
                        print(f"{tag}: {patterns}")
                    break

            if follow_up_intents:
                # Jika ditemukan follow-up intents, lanjutkan pencarian
                break

        return response_text, [], follow_up_intents


def postprocess_model_output(model_output, user_input, context_patterns=[]):
    predicted_indices = np.argmax(model_output, axis=-1)[0]
    non_zero_indices = np.where(predicted_indices > 0)[0]
    predicted_indices = predicted_indices[non_zero_indices]
    response_text = loaded_tokenizer.sequences_to_texts([predicted_indices])[0].strip()

    follow_up_intents = None

    # Check if there are context patterns saved
    if context_patterns:
        # Use context patterns to find a matching response
        for intent in intents:
            for pattern in context_patterns:
                if pattern in intent.get('patterns', []):
                    follow_up_intents = intent.copy()
                    break

    # If there are no context patterns, search for patterns matching user input
    if not follow_up_intents:
        for intent in intents:
            for follow_up_intent in intent.get('followUpIntents', []):
                for pattern in follow_up_intent.get('patterns', []):
                    if pattern.lower() in user_input.lower():
                        follow_up_intents = follow_up_intent.copy()
                        break

    # If there are still no matching patterns, search for patterns matching the model's response
    if not follow_up_intents:
        for intent in intents:
            for follow_up_intent in intent.get('followUpIntents', []):
                for pattern in follow_up_intent.get('patterns', []):
                    if pattern.lower() in response_text.lower():
                        follow_up_intents = follow_up_intent.copy()
                        break

    # Ensure that follow_up_intents has the expected keys
    if follow_up_intents:
        follow_up_intents.setdefault('tag', '')
        follow_up_intents.setdefault('patterns', [])
        follow_up_intents.setdefault('responses', [])
        follow_up_intents.setdefault('followUpIntents', [])

        # Display bot responses from follow-up intents in the terminal
        print("Bot Responses from Follow-up Intents:")
        for response in follow_up_intents.get('responses', []):
            print(f"- {response}")

    return response_text, context_patterns, follow_up_intents

if __name__ == '__main__':
    app.run(debug=True)