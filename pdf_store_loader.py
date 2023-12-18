from langchain.document_loaders import PyPDFLoader
from langchain.embeddings import HuggingFaceEmbeddings

from os import listdir
from os.path import isfile, join, dirname, realpath

print(dirname(realpath(__file__)))
from _util import _print


t = _print('Start')

mypath="pdfs"
onlyfiles = [f for f in listdir(mypath) if isfile(join(mypath, f))]
print(f'file_count: {len(onlyfiles)}')




# This needs to run parallel
t = _print("Loading documents", t)
document_count = page_count = 0
pages = []    # one pdf has one or more pages
for pdf in onlyfiles:
    if pdf.endswith(".pdf"):
        
        loader = PyPDFLoader("pdfs/" + pdf)
        document_count = document_count + 1

        pages = loader.load_and_split()
        page_count = page_count + len(pages)
        
        print(f'document_count: {document_count}\tpage_count: {page_count}')

        # Need to get the embeddings and embed these new pages
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        # Equivalent to SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")

        # Tokenize
        # Then should investigate the best way to embed. How big of chunks.
        # Then need to load into a vector store



t = _print("Done loading documents", t)


