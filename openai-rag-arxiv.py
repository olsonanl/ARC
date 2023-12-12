from langchain import hub

from langchain.document_loaders import ArxivLoader
from langchain.retrievers import ArxivRetriever
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Chroma

from langchain.embeddings import OpenAIEmbeddings
from langchain.chat_models import ChatOpenAI

from langchain.schema.runnable import RunnablePassthrough
from langchain.schema import StrOutputParser


import os
import getpass
os.environ['OPENAI_API_KEY'] = getpass.getpass("Enter your openai api key: ")

# cleanup previous
# vectorstore.delete_collection()

docs = ArxivLoader(query="Antibiotic design using deep learning", load_max_docs=10).load()

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
splits = text_splitter.split_documents(docs)

vectorstore = Chroma.from_documents(documents=splits, embedding=OpenAIEmbeddings())
retriever = vectorstore.as_retriever()

prompt = hub.pull("rlm/rag-prompt")
llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

resp = rag_chain.invoke(
  """
  Can you provide a summary of the current state of applying
  deep learning to the discovery of new antibiotics?
  """
)

print(f'{resp.format()}')

# vectorstore.delete_collection()


