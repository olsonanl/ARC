/* eslint-disable max-len */
'use strict';

const fs = require('fs');
const EpiHiperValidator = require('./epiHiperValidator');

/**
 * EpiHiper Merger Class
 */
class EpiHiperMerger {
  /**
   * Creates an epiHiperMerger instance.
   * Usage: `epiHiperMerger()`
   * @return {Object} epiHiperMerger instance
   */
  constructor() {
    if (!(this instanceof EpiHiperMerger)) {
      return new EpiHiperMerger();
    }

    this.epiHiperValidator = new EpiHiperValidator();

    this.initInstance();
  }

  /**
   * Process the given files
   * @param {Array} files
   * @param {string} output optional std::out
   * @return {boolean} success
   */
  async process(files, output = 'std::out') {
    const Promises = [];
    let success = true;

    // Load each file
    files.forEach(function(file) {
      Promises.push(this.validate(file));
    }.bind(this));

    try {
      const Results = await Promise.all(Promises);

      try {
        Results.forEach((instance) => {
          success &= this.merge(instance);
        }, (reason) => {
          process.exit(1);
        });
      } catch (err) {
        console.log(err);
        return false;
      }
    } catch (err) {
      return false;
    }

    if (this.epiHiperValidator.getSchemaName(this.instance) == 'runParametersSchema.json') {
      this.instance = this.instance.runParameters;
    }

    this.instance.__path = output;

    success &= await this.epiHiperValidator.validateSchema(this.instance);
    success &= await this.epiHiperValidator.validateRules(this.instance);

    delete this.instance.__path;

    if (success) {
      const json = JSON.stringify(this.instance, null, 2);

      if (output == 'std::out') {
        console.log(json);
      } else {
        fs.writeFileSync(output, json, 'utf8');
      }
    }

    return success;
  }

  /**
   * Load a file and validate it
   * @param {string} file
   * @return {Object} instance
   */
  async validate(file) {
    const instance = await this.epiHiperValidator.load(file);

    const success = await this.epiHiperValidator.validateSchema(instance);

    if (!success) {
      throw new Error(false);
    }

    await this.epiHiperValidator.validateRules(instance);

    return instance;
  }

  /**
   * Merge a file content the instance
   * @param {Object} instance
   * @return {boolean} success
   */
  merge(instance) {
    if ((Object.keys(instance).length === 0 && instance.constructor === Object)) return false;

    if (this.epiHiperValidator.getSchemaName(instance) == 'templateSchema.json') {
      return this.merge(instance.template);
    }
    
    if (this.instance.epiHiperSchema === '') {
      this.instance.epiHiperSchema = instance.epiHiperSchema;
    } else if (this.instance.epiHiperSchema != instance.epiHiperSchema) {
      return false;
    }

    switch (this.epiHiperValidator.getSchemaName(instance)) {
      case 'csvDataResourceSchema.json':
        this.addCSvDataResource(instance);
        break;

      case 'diseaseModelSchema.json':
        this.addDiseaseModel(instance);
        break;

      case 'initializationSchema.json':
        this.addSets(instance.sets);
        this.addVariables(instance.variables);
        this.addInitializations(instance.initializations);
        break;

      case 'interventionSchema.json':
        this.addSets(instance.sets);
        this.addVariables(instance.variables);
        this.addTriggers(instance.triggers);
        this.addInterventions(instance.interventions);
        break;

      case 'mergedSchema.json':
        this.addDiseaseModel(instance.diseaseModel);
        this.addSets(instance.sets);
        this.addVariables(instance.variables);
        this.addInitializations(instance.initializations);
        this.addInterventions(instance.interventions);
        this.addTraits(instance.traits);
        this.addPersonTraitDBs(instance.personTraitDBs);
        this.addRunParameters(instance.runParameters);
        break;

      case 'networkSchema.json':
        this.addNetwork(instance);
        break;

      case 'runParametersSchema.json':
        this.addRunParameters(instance);
        break;

      case 'templateSchema.json':
        return false;
        break;

      case 'traitsSchema.json':
        this.addTraits(instance.traits);
        break;
    }

    return true;
  }

  /**
   * Initialize the merged instance
   */
  initInstance() {
    this.instance = {};
    this.instance.epiHiperSchema = '';
    this.instance.diseaseModel = {};
    this.instance.sets = [];
    this.instance.variables = [];
    this.instance.initializations = [];
    this.instance.triggers = [];
    this.instance.interventions = [];
    this.instance.traits = [];
    this.instance.personTraitDBs = [];
    this.instance.network = {};
    this.instance.runParameters = {};
  }

  /**
   * Adds the disease model to the merged EpiHiper input.
   * @param {object} diseaseModel
   * @return {void}
   */
  addDiseaseModel(diseaseModel) {
    if (this.isEmpty(diseaseModel)) return;

    if (!this.isEmpty(this.instance.diseaseModel)) {
      throw new Error('Merging of disease model is not supported.');
    }

    this.instance.diseaseModel = diseaseModel;
  };

  /**
   * Adds sets to the merged EpiHiper input.
   * @param {object} sets
   * @return {void}
   */
  addSets(sets) {
    if (!Array.isArray(sets)) return;

    sets.forEach(function(set) {
      this.instance.sets.push(set);
    }.bind(this));
  };

  /**
   * Adds variables to the merged EpiHiper input.
   * @param {object} variables
   * @return {void}
   */
  addVariables(variables) {
    if (!Array.isArray(variables)) return;

    variables.forEach(function(variable) {
      this.instance.variables.push(variable);
    }.bind(this));
  };

  /**
   * Adds initializations to the merged EpiHiper input.
   * @param {object} initializations
   * @return {void}
   */
  addInitializations(initializations) {
    if (!Array.isArray(initializations)) return;

    initializations.forEach(function(initialization) {
      this.instance.initializations.push(initialization);
    }.bind(this));
  };

  /**
   * Adds triggers to the merged EpiHiper input.
   * @param {object} triggers
   * @return {void}
   */
  addTriggers(triggers) {
    if (!Array.isArray(triggers)) return;

    triggers.forEach(function(trigger) {
      this.instance.triggers.push(trigger);
    }.bind(this));
  };

  /**
   * Adds interventions to the merged EpiHiper input.
   * @param {object} interventions
   * @return {void}
   */
  addInterventions(interventions) {
    if (!Array.isArray(interventions)) return;

    interventions.forEach(function(intervention) {
      this.instance.interventions.push(intervention);
    }.bind(this));
  };

  /**
   * Adds traits to the merged EpiHiper input.
   * @param {object} traits
   * @return {void}
   */
  addTraits(traits) {
    if (!Array.isArray(traits)) return;

    traits.forEach(function(trait) {
      this.instance.traits.push(trait);
    }.bind(this));
  };

  /**
   * Adds personTraitDBs to the merged EpiHiper input.
   * @param {object} personTraitDBs
   * @return {void}
   */
  addPersonTraitDBs(personTraitDBs) {
    if (!Array.isArray(personTraitDBs)) return;

    personTraitDBs.forEach(function(personTraitDB) {
      this.instance.personTraitDBs.push(personTraitDB);
    }.bind(this));
  };

  /**
   * Adds the run parameters to the merged EpiHiper input.
   * @param {object} network
   * @return {void}
   */
  addNetwork(network) {
    if (this.isEmpty(network)) return;

    if (!this.isEmpty(this.instance.network)) {
      throw new Error('Merging of disease model is not supported.');
    }

    this.instance.network = network;
  };

  /**
   * Adds the run parameters to the merged EpiHiper input.
   * @param {object} runParameters
   * @return {void}
   */
  addRunParameters(runParameters) {
    if (this.isEmpty(runParameters)) return;

    if (!this.isEmpty(this.instance.runParameters)) {
      throw new Error('Merging of run parameters is not supported.');
    }

    this.instance.runParameters = runParameters;
  };

  /**
   * Check whether the given object is empty.
   * @param {object} obj
   * @return {Boolean} isEmpty
   */
  isEmpty(obj) {
    return (Object.keys(obj).length === 0 && obj.constructor === Object);
  }
}

module.exports = EpiHiperMerger;
