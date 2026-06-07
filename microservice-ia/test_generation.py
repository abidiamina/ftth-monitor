import torch
from transformers import GPT2LMHeadModel, GPT2Tokenizer

print("Loading...")
gen_tokenizer = GPT2Tokenizer.from_pretrained('models/generator-ftth')
gen_model = GPT2LMHeadModel.from_pretrained('models/generator-ftth')

role_upper = "TECHNICIEN"
prompt = f"Role: {role_upper} | Message: "
inputs = gen_tokenizer(prompt, return_tensors="pt")

with torch.no_grad():
    outputs = gen_model.generate(
        **inputs,
        max_new_tokens=30,
        num_return_sequences=1,
        temperature=0.8,
        top_p=0.9,
        do_sample=True,
        pad_token_id=gen_tokenizer.eos_token_id,
    )

generated_text = gen_tokenizer.decode(outputs[0], skip_special_tokens=True)
print("Raw generated_text:", [generated_text])

if "Message: " in generated_text:
    final_message = generated_text.split("Message: ")[-1].strip()
else:
    final_message = generated_text.replace(prompt, "").strip()

print("final_message:", [final_message])

def _looks_valid_message(message: str) -> bool:
    if not message or len(message.strip()) < 8:
        print("Failed len < 8")
        return False
    lower = message.lower()
    if "ã" in lower or "â" in lower or "" in message:
        print("Failed char check")
        return False
    import re
    if re.fullmatch(r"[\W_]+", message):
        print("Failed regex")
        return False
    letters = sum(1 for ch in message if ch.isalpha())
    if not (letters >= max(6, int(len(message) * 0.35))):
        print(f"Failed letters ratio: {letters} vs {max(6, int(len(message) * 0.35))}")
        return False
    return True

print("Looks valid?", _looks_valid_message(final_message))
