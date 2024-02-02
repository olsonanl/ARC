#!/usr/bin/env python
# coding: utf-8

# In[1]:




# In[18]:

mode = 'ARGO'

from getpass import getpass
import os
if mode != 'ARGO' and not 'OPENAI_API_KEY' in os.environ:
	os.environ['OPENAI_API_KEY'] = getpass()



# In[19]:


#Define tools
import re
import time

from langchain import hub
from langchain_community.chat_models import ChatOpenAI
from langchain_community.document_loaders import WebBaseLoader
from langchain_openai import OpenAIEmbeddings
from langchain.schema import StrOutputParser
from langchain.schema.runnable import RunnablePassthrough
#from openai import OpenAI
from CustomLLM import ARGO_LLM
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma

from ARGO import ArgoWrapper

wrapper = ArgoWrapper()
client = ARGO_LLM(argo = wrapper)

# client = ARGO_LLM() #OpenAI()

from langchain_community.tools import DuckDuckGoSearchRun
duck_search_tool = DuckDuckGoSearchRun()

from langchain_community.tools.pubmed.tool import PubmedQueryRun
pubmed_tool = PubmedQueryRun()

from langchain_community.tools.semanticscholar.tool import SemanticScholarQueryRun
scholar_tool = SemanticScholarQueryRun()

search_tools = [duck_search_tool,pubmed_tool,scholar_tool]

import zipfile
from langchain_community.document_loaders import DirectoryLoader
import glob
import unstructured
import os

# Step 1: Absolute path (replace with the actual absolute path)
absolute_path = './EpiHiper-Schema-master/'

# Step 2: Check if the directory exists
if not os.path.exists(absolute_path):
    print(f"Directory does not exist: {absolute_path}")
else:
    print(f"Directory exists: {absolute_path}")

    # Step 3: Manually list files
    file_paths = glob.glob(absolute_path + '/**/*.*', recursive=True)
    print(f"Manually found {len(file_paths)} files:")
    #for file_path in file_paths:
    #    print(file_path)
    file_contents_dict={}
    for file_path in file_paths:
        try:
            filename = os.path.basename(file_path)
            with open(file_path, 'r') as file_pt:
                content = file_pt.read()
            if filename in file_contents_dict:
                file_contents_dict[filename] += '\n' + content
            else:
                file_contents_dict[filename] = content
        except Exception as e:
            print(f"Error reading file {file_path}: {e}")

#loader2 = DirectoryLoader('./EpiHiper-Schema-master/', glob="**/*.*", show_progress=True)
#abm_codes = loader2.load()
# Debugging: Print the number of loaded files
#print(f"Number of loaded files: {len(abm_codes)}")

#code_splits = split_by_length_with_overlap(abm_codes)
#vectorstore = Chroma.from_documents(documents=abm_codes, embedding=OpenAIEmbeddings())
#ABM_retriever = vectorstore.as_retriever()

disease_model_schema = file_contents_dict['diseaseModelSchema.json']
disease_model_rules = file_contents_dict['diseaseModelRules.json']


# In[20]:


from langchain_openai import ChatOpenAI
from crewai import Agent, Task, Crew, Process
import textwrap

#llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=.2)
# llm = ARGO_LLM() #"gpt-4-1106-preview", "gpt-4-0314"

llm = client

PRISMA_expert = Agent(
    role="PRISMA Meta-Analysis Expert",
    goal="Ensure any meta-analysis of papers and data are performed according to the PRISMA guidelines for meta-analyses",
    backstory=textwrap.dedent("""
    Created by a collaborative effort of research institutions worldwide, PRISMA_expert embodies the collective 
    wisdom of leading experts in systematic reviews and meta-analysis. Its inception was motivated by the need 
    for rigorous, transparent, and replicable research findings in the scientific community. With the PRISMA 
    (Preferred Reporting Items for Systematic Reviews and Meta-Analyses) guidelines at its core, PRISMA_expert 
    is designed to assist researchers in conducting meta-analyses that are both comprehensive and methodologically 
    sound. It leverages advanced algorithms to analyze research data, identify relevant studies, and assess 
    their quality, ensuring that the results of meta-analyses are reliable and actionable. PRISMA_expert also 
    educates users on best practices for systematic reviews, aiming to elevate the quality of research across 
    disciplines. Its development was fueled by the increasing complexity of research data and the challenges 
    associated with synthesizing vast amounts of scientific information. By streamlining the meta-analysis 
    process and enforcing adherence to PRISMA guidelines, PRISMA_expert aims to facilitate the generation of 
    evidence-based insights, thereby advancing scientific knowledge and informing policy decisions.
    """),
#    backstory=textwrap.dedent("""
#        PRISMA_expert, whose real name is Dr. Emily Harris, is a distinguished researcher and academic 
#        in the field of evidence-based medicine. Her journey into becoming a PRISMA Meta-Analysis Expert 
#        began during her early years as a medical student. Dr. Harris was always intrigued by the power 
#        of systematic reviews and meta-analyses in synthesizing existing research to inform clinical 
#        decision-making. She saw the potential for improving healthcare outcomes by ensuring that these 
#        analyses were conducted rigorously and transparently.
#
#        As a student, Emily Harris struggled to find comprehensive resources on how to conduct 
#        meta-analyses properly. She was often frustrated by the lack of clear guidelines and standards 
#        in the field. Determined to make a difference, she decided to pursue a career dedicated to 
#        rectifying this issue. After completing her medical degree, Emily embarked on a PhD program in 
#        epidemiology and evidence-based medicine, focusing on meta-analysis methodology.
#
#        During her academic journey, Dr. Harris published several groundbreaking papers on meta-analysis 
#        techniques and guidelines. Her dedication and expertise caught the attention of the PRISMA Group, 
#        a renowned organization that develops and maintains the PRISMA (Preferred Reporting Items for 
#        Systematic Reviews and Meta-Analyses) guidelines. Impressed by her work, they invited her to join 
#        their expert panel.
#
#        Emily gladly accepted the invitation and became an integral part of the PRISMA Group. Over the 
#        years, she played a pivotal role in refining and updating the PRISMA guidelines, ensuring they 
#        stayed aligned with the evolving landscape of evidence synthesis. Dr. Harris's work not only 
#        contributed to the improvement of meta-analysis standards but also helped researchers worldwide 
#        conduct more reliable and transparent reviews.
#
#        Today, as a PRISMA Meta-Analysis Expert, Dr. Emily Harris is on a mission to ensure that any 
#        meta-analysis of papers and data adheres to the PRISMA guidelines. She imparts her knowledge 
#        and expertise through workshops, webinars, and consultations with research teams. Her ultimate 
#        goal is to raise the quality and credibility of meta-analyses across various fields of research, 
#        thus advancing evidence-based decision-making in healthcare and beyond.
#    """),
    verbose=True,
    allow_delegation=False,
    tools=[],  ###
    llm=llm,
)

query_executor = Agent(
    role="""
        Agent Role: Information Gathering and Analysis Specialist

        Primary Objectives:
        1. Identify the type of information that is needed. Scientific knowledge or general knowledge.
        2. Use the appropriate tool. Scientific information can be searched using either Pubmed or Semantic Scholar.
        General knowledge can be searched using a DuckDuckGo web search.
        3. Determine if the information found answers the question.
        4. If not, then search again using a different tool.

        The list of tools are:
        -duck_search_tool which is called by DuckDuckGoSearchRun()
        -pubmed_tool which is called by PubmedQueryRun()
        -scholar_tool which is called by SemanticScholarQueryRun()
    """,
    goal=textwrap.dedent("""
        To efficiently retrieve, analyze, and synthesize information from diverse sources to answer 
        complex queries and support decision-making processes. The agent aims to leverage its integrated 
        tools to access a wide range of databases and search engines, including scientific literature, 
        general knowledge, and academic research, ensuring comprehensive and accurate responses.
    """),
    backstory=textwrap.dedent("""
        Developed by a consortium of data scientists and information technology experts, Query_Executor 
        is the culmination of efforts to bridge the gap between vast information repositories and the 
        need for actionable intelligence. With the digital age flooding every sector with data, the 
        ability to sift through, analyze, and present this information in a coherent and useful manner 
        has become invaluable. Query_Executor integrates cutting-edge natural language processing 
        capabilities with advanced search technologies from DuckDuckGo, PubMed, and Semantic Scholar. 
        This allows it to navigate through millions of data points, from academic papers to general 
        knowledge, efficiently and effectively. Its inception was driven by the demand for a tool that 
        could support researchers, analysts, and decision-makers by providing quick access to relevant 
        information and insights, helping to make informed decisions in a timely manner. By synthesizing 
        information from both broad and specialized databases, Query_Executor stands as a versatile and 
        powerful assistant in research, planning, and strategic analysis across various fields.
    """),
    verbose=True,
    llm=llm,
    # tools=[SqlTools.do_sql_query, RagTools.do_rag_query],
    tools=search_tools,
    allow_delegation=True,
)

param_executor = Agent(
    role="""
        Agent Role: Model Parameterizer
        """,
    goal="Plan the steps needed to parameterize an agent-based simulation",
    backstory=textwrap.dedent("""
        You are an expert at identifying modeling parameters from code base that implements 
        an agent-based model and listing the model choices, parameters, and json config files 
        whose values need to be determined. You will break down each model choice, parameter, 
        and json config file into sub-questions such that the answer to each sub-question will 
        inform the value to be used in the agent-based simulation.
        Accept the user-question and determine if it requires sub-questions to either a web
        search, Pubmed search, or Semantic Scholar search.
        Your final answer MUST be a description of sub-questions and step-by-step instructions
        that explain how to find the data needed to choose the best model parameter ranges 
        for an agent-based modeling code base.
    """),
    verbose=True,
    llm=llm,
    # tools=[SqlTools.do_sql_query, RagTools.do_rag_query],
    tools=[],
    allow_delegation=True,
)


# In[21]:


user_query = "Model the current flavivirus outbreak using an agent based model"

task1 = Task(
    description=textwrap.dedent(f"""
        Your task is to go through a json file in the agent-based model code base understand
        what data is needed in order to parameterize the below schema:
            {disease_model_schema}
        Decide what general disease information and questions would be useful in light of the
        below user query: 
            {user_query}
        The final output should be a JSON formated schema file that has been written to 
        accomodate the query, a list of parameters whose values need to be set based on disease
        or outbreak specific information, and a list of sub-questions to be answered to estimate
        values for those parameters, and search strategies for that information.
    """),
    agent=param_executor
)

task2 = Task(
    description=textwrap.dedent(f"""
        You will recieve a set of queries and information from the previous task. Your task is
        to gather the information needed and to summarize the answers to the list of sub-questions
        based on that information, parameter-by-parameter.
    """),
    agent=query_executor
)

task3 = Task(
    description=textwrap.dedent(f"""
        You will recieve a set of queries and information from the previous task. You will:
        1. Examine the information, critique it, and decide if the numbers are numerically reasonable 
        in light of the data provided for the meta-analysis.
        2. If absolute numbers are not available from in the provided data, then you will 
        examine the suggested parameter values to see if they are related appropriately,
        i.e., greater than, less than, or approximately equal. 
        3. You will list the value ranges for all parameters from points 1 and 2, their original
        value, and suggest a new value based on what is most reasonable given the evidence
        provided.
        Your final answer must a range of values for all the parameters extracted from the original
        JSON file.
    """),
    agent=PRISMA_expert
)


# In[22]:


crew = Crew(
    agents=[param_executor,PRISMA_expert,query_executor],
    tasks=[task1,task2,task3],
    verbose=2,  # print what tasks are being worked on, can set it to 1 or 2
    process=Process.sequential,
)

result = crew.kickoff()

print("######################")
print(result)


# In[ ]:




