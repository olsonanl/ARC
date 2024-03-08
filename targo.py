from ArgoLLM import ArgoLLM

a = ArgoLLM(model_type='gpt35', temperature = 0.3)

x = a.invoke("What color is the sky?")
print(x)
