import traceback
from transformers import GPT2Tokenizer, GPT2LMHeadModel

try:
    print("Loading tokenizer...")
    t = GPT2Tokenizer.from_pretrained('models/generator-ftth')
    print("Loading model...")
    m = GPT2LMHeadModel.from_pretrained('models/generator-ftth')
    print('Success')
except Exception as e:
    print('Error:')
    traceback.print_exc()
