
## The Environment on uicgpu01

    conda create --name langchain python=3.11
    conda activate langchain
    pip install langchain pypdf openai

## The Environment on rbdgx1 (for openai-rag-arxiv.py)

    conda create --prefix /rbscratch/brettin/conda_envs/openai-rag-arxiv python=3.11
    conda activate /rbscratch/brettin/conda_envs/openai-rag-arxiv
    pip install chromadb langchain arxiv pymupdf openai tiktoken langchainhub

Then you should be able to run:

    python ./openai-rag-arxiv.py

## To install jupyter, see the jupyter-requirements.txt

    pip install IPython==8.15.0 ipykernel==6.25.0 ipywidgets==8.0.4 jupyter_client==7.4.9 jupyter_core==5.3.0 jupyter_server==1.23.4 jupyterlab==3.6.3 nbclient==0.5.13 nbconvert==6.5.4 nbformat==5.9.2 notebook==6.5.4 qtconsole==5.4.2 traitlets==5.7.1

    pip install --no-cache jupyter


## For the falcon encoder (done on the UIC machine)

    pip install --upgrade transformers
    huggingface-cli login
 

## For the arxiv pdf example and web loader example
    conda activate langchain
    pip install chromadb
    pip install tiktoken
    pip install langchainhub
    pip install arxiv
    install pymupdf

This is from the collab notebook
!pip install -U langchain openai chromadb langchainhub bs4 tiktoken kaleido python-multipart cohere arxiv pymupdf


## For the example agent
    pip install tavily-python # This turned out to be a dead end.
    pip install pyvespa # This also turned out to be a dead end.
    # I decided to use an arxiv retreiver.
    
