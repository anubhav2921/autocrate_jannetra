from transformers import pipeline

classifier = pipeline("sentiment-analysis")

result = classifier("I am very happy with this system")
print(result)