from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-5",
    input="Uzraksti vienu īsu joku latviski"
)

print(response.output_text) 
from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-5",
    input="Uzraksti vienu īsu joku latviski"
)

print(response.output_text)
from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-5",
    input="Uzraksti vienu īsu joku latviski"
)

print(response)
from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-5",
    input="Uzraksti vienu īsu joku latviski"
)

print(response)
print("START")

from openai import OpenAI
client = OpenAI()

print("Before request")

response = client.responses.create(
    model="gpt-5",
    input="Sveiks!"
)

print("After request")
print(response)