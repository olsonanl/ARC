#!/usr/bin/env python
# coding: utf-8


from typing import Any, List, Mapping, Optional
from langchain_core.callbacks.manager import CallbackManagerForLLMRun
from langchain_core.language_models.llms import LLM
import requests
import json
from datetime import datetime
def _print(message):
    print ("{} {}".format(datetime.now(), message))
    return


# A helper function to call from invoke. Sends the HTTP
# query to the ARGO model


def _invoke_model(prompt: str, url: str = None) -> str:  
        
    if url is None:
        url = "https://apps-dev.inside.anl.gov/argoapi/api/v1/resource/chat/"
    headers = {
        "Content-Type": "application/json"
    }
    data = {
            "user": "mtdapi",
            "model": "gpt35",
            "system": "You are a helpful operations assistant AI named Argo. You specialize in supporting the personnel, scientists, and facility users at Argonne National Laboratory.",
            "prompt": [prompt],
            "stop": [],
            "temperature": 0.8,
            "top_p": 0.7
    }
        
    data_json = json.dumps(data)    
    response = requests.post(url, headers=headers, data=data_json)

    if response.status_code == 200:
        print(response.json())
    else:
        print(f"Request failed with status code: {response.status_code}")
        print(response.text)
    
    return response.text


# The ARGO_LLM class. Uses the _invoke_model helper function.
# It implements the _call function.


class ARGO_LLM(LLM):

    n: int
    @property
    def _llm_type(self) -> str:
        return "custom"

    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        if stop is not None:
            raise ValueError("stop kwargs are not permitted.")
        #return prompt[: self.n]
        _print("calling _invoke_model")
        response = _invoke_model("What are some common flaviviruses?")
        _print("done calling _invoke_model")
        return response

    @property
    def _identifying_params(self) -> Mapping[str, Any]:
        """Get the identifying parameters."""
        return {"n": self.n}

    @property
    def _generations(self):
        return


# In[12]:


if __name__ == "__main__":
	llm = ARGO_LLM(n=10)
	
	_print("calling invoke")
	llm.invoke("What are some common flaviviruses", {})
	_print("done calling invoke")
