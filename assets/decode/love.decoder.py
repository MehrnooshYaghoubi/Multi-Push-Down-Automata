import numpy as np

def text_to_matrix(text, cols):
    nums = [ord(char) for char in text]
    while len(nums) % cols != 0:
        nums.append(ord(' '))
    return np.array(nums).reshape(-1, cols)

def matrix_to_text(matrix):
    nums = matrix.flatten()
    return ''.join(chr(int(round(num))) for num in nums)

original_text = "A butterfly's journey is proof that you can go through darkness and still become something beautiful"
target_text = "Every thought of you fills my heart with warmth. Mehrnoosh, I am yours, now and forever - Your Erfan"

assert len(original_text) == len(target_text)

A = text_to_matrix(original_text, 10)
print("A", A)       
B = text_to_matrix(target_text, 10)
print("B", B)
M = np.linalg.solve(A, B)
print("M", M)
#Encode
encoded = np.dot(A, M)

# Decode (just to verify)
decoded = np.dot(encoded, np.linalg.inv(M))

# Convert matrices back to text
encoded_text = matrix_to_text(encoded)
decoded_text = matrix_to_text(decoded)

print("Original Text:", original_text)
print("Target (Encoded) Text:", encoded_text)
print("Decoded Text:", decoded_text)