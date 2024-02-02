# Templates

### Problem
In many cases an instantiation of a template or the template itself will depend on external references, e.g. a health state of a disease model for proper initialization. We therefore have a general need for specifying such requirements. Furthermore valid values of user input for a template may also be found in other entities such as the person trait database, the disease model, or user defined traits. Both of these situations should use the same mechanism. 

### Solution
All data or meta-data in which external references occur are in JSON format and thus we can specify occurring objects and attributes within a JSON document by using an established format such as [JSONPath](https://support.smartbear.com/readyapi/docs/testing/jsonpath-reference.html#notation). This solution is extremely flexible by allowing [filters](https://support.smartbear.com/readyapi/docs/testing/jsonpath-reference.html#filters). Implementations are available in [JSON](https://www.npmjs.com/search?q=jsonpath), [JAVA](https://github.com/json-path/JsonPath), and [Python](https://pypi.org/search/?q=JSONPath). To develope a valid JSONPath one can use an online [validator](https://jsonpath.com/)

To check whether a requirement is fulfilled we have to query all JSON documents in the current context. If one of this queries returns a matching objecit or attribute, i.e., we get a non empty return set, the requirement is satisfied otherwise not. 
To retrieve valid values we can proceed in a similar way. The valid values are the set of values returned by joining all JSONPath matches of all documents in the current context.

### Considerations
I anticipate that checking all documents in the current context is not a large computational burden. If this is not the case we would have to add information in which class of JSON document the requirement should be fulfilled.

If the context changes, i.e., the disease model, or the region changes, all requirements need to be reevaluated. Additionally we need to check whther all user selected template value are still valid.


#### Schema
__Valid Values__
```
  "validValues": {
    "type": "array",
    "items": {
      "type": "object",
      "oneOf": [
        {"$ref": "./typeRegistry.json#/definitions/jsonPath"},
        {
          "type": "object",
          "required": ["interval"],
          "properties": {
            "interval": {
              "type": "object",
              "required": [
                "min",
                "max"
              ],
              "properties": {
                "min": {"type": "number"},
                "max": {"type": "number"}
              }
            }
          }
        },
        {
          "type": "object",
          "required": ["enum"],
          "properties": {
            "enum": {
              "type": "array",
              "items": {"type": "string"} 
            }
          }
        }
      ]
    }
  }
```
__Example:__ Infectious states: ` "validValues": [{"jsonPath": "$.states.[?(@.infectivity > 0)].id"}]`
```
[
  "Isymp",
  "Iasymp"
]
```

__Requirements__

Note, for backwards compatibility we allow the old syntax but it should be considered deprecated.
```
  "requirements": {
    "type": "array",
    "items": {
      "oneOf": [
        {
          "type": "object",
          "required": ["value"],
          "properties": {
            "value": {
              "oneOf": [
                {"$ref": "./typeRegistry.json#/definitions/healthState"},
                {"$ref": "./typeRegistry.json#/definitions/traitEnum"}
              ]
            }
          }
        },
        {
          "type": "object",
          "oneOf": [
            {
              "required": ["set"]
            },
            {
              "required": ["variable"]
            }
          ],
          "properties": {
            "set": {
              "type": "object",
              "required": ["idRef"],
              "properties": {
                "idRef": {"$ref": "./typeRegistry.json#/definitions/uniqueIdRef"}
              }
            },
            "variable": {
              "type": "object",
              "required": ["idRef"],
              "properties": {
                "idRef": {"$ref": "./typeRegistry.json#/definitions/uniqueIdRef"}
              }
            }
          },
          "maxProperties": 1
        },
        {"$ref": "./typeRegistry.json#/definitions/edgeProperty"},
        {"$ref": "./typeRegistry.json#/definitions/nodeProperty"},
        {"$ref": "./typeRegistry.json#/definitions/dbField"},
        {
          "type": "object",
          "required": ["jsonPath"],
          "properties": {
            "jsonPath": {"$ref": "./typeRegistry.json#/definitions/jsonPath"}
          }
        }
      ]
    }
  }
```

__Example:__ Activity type college: ` "validValues": [{"jsonPath": "$.activityEncoding.features.[?(@.id == "activityType")].enums.[?(@.id == "college")]"}]`
```
[
  {
    "id": "college"
  }
]
```
