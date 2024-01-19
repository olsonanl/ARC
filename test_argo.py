import CustomLLM
from ARGO import ArgoWrapper
wrapper = ArgoWrapper()
l = CustomLLM.ARGO_LLM(argo = wrapper)

l.invoke("Why is the pool green?")