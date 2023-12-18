from langchain.embeddings import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
print(f'EMBEDDINGS: {embeddings}')
# EMBEDDINGS: client=SentenceTransformer(
#  (0): Transformer({'max_seq_length': 256, 'do_lower_case': False}) with Transformer model: BertModel 
#  (1): Pooling({'word_embedding_dimension': 384, 'pooling_mode_cls_token': False, 'pooling_mode_mean_tokens': True, 'pooling_mode_max_tokens': False, 'pooling_mode_mean_sqrt_len_tokens': False})
#  (2): Normalize()
# ) model_name='all-MiniLM-L6-v2' cache_folder=None model_kwargs={} encode_kwargs={} multi_process=False

text = "This is a test document."

query_result = embeddings.embed_query(text)
print(f'QUERY_RESULT: {query_result}')
# looks like a plain 1d array of floats

doc_result = embeddings.embed_documents([text, "This is not a test document."])
print(f'DOC_RESULT: {doc_result}')
# looks like a plain 2d array of floats
