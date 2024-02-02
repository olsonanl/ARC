/* eslint-disable max-len */
'use strict';

const path = require('path');
const fs = require('fs');
const jp = require('jsonpath');
const EpiHiperValidator = require('./epiHiperValidator');

/**
 * EpiHiper Merger Class
 */
class EpiHiperAddNoise {
  path = '';
  distribution = '';
  replace = false;
  integer = false;
  negative = false;
  sigma = NaN;
  min =  NaN;
  max =  NaN;
  value =  NaN;

  /**
   * Creates a EpiHiperAddNoise instance based on the given commander
   * @param {object} commander 
   * @returns {object} EpiHiperAddNoise
   */
  static fromCommander(commander) {
    return new EpiHiperAddNoise(commander.path,
      commander.distribution,
      parseFloat(commander.sigma),
      parseFloat(commander.min),
      parseFloat(commander.max),
      parseFloat(commander.value),
      commander.replace,
      commander.integer,
      commander.negative);
  }

  /**
   * Creates a EpiHiperAddNoise instance which replaces path with value.
   * @param {string} path 
   * @param {number} value 
   * @param {bool} integer
   * @returns {object} EpiHiperAddNoise
   */
  static replace(path, value, integer) {
    return new EpiHiperAddNoise(path,
      'fixed',
      NaN,
      NaN,
      NaN,
      value,
      true,
      integer,
      false);
  }

  /**
   * Load a json file
   * @param {string} file
   * @return {Object} instance;
   */
   static async load(file) {
    try {
      file = path.resolve(file);
    } catch (err) {
      console.error(err);
    }

    if (!fs.existsSync(file)) {
      console.error('File: ' + file + ' not found');
      return {};
    }

    let RawData = '';
    let Instance = {};

    try {
      RawData = await this.firstLine(file);
      Instance = JSON.parse(RawData);
    } catch (err) {
      try {
        RawData = fs.readFileSync(file);
        Instance = JSON.parse(RawData);
      } catch (err) {
        console.error('File: ' + file + ' does not contain valid JSON.');
        return {};
      }
    }

    return Instance;
  }

  /**
   * Update files with new values the provided parameter descriptions.
   * @param {string} fileNewValues 
   * @param {string} fileParameterDescriptions 
   */
  static async updateConfigs(fileNewValues, fileParameterDescriptions) {
    let UpdatedValues = await EpiHiperAddNoise.load(fileNewValues);
    let ParameterDescriptions = await EpiHiperAddNoise.load(fileParameterDescriptions);
  
    if (UpdatedValues.parameters.length != ParameterDescriptions.parameters.length) {
      throw ('EpiHiperAddNoise: Incompatible parameter descriptions and updated parameter values.');
    }

    UpdatedValues.parameters.forEach(function (parameter) {
      let Description;
  
      ParameterDescriptions.parameters.forEach(function(description) {
        if (parameter.name == description.name) {
          Description = description;
        }
      });
  
      if (typeof Description == 'undefined') {
        throw ('EpiHiperAddNoise: No parameter descriptions and updated parameter ' + parameter.name + '.');
      }

      Description.targets.forEach(function (target) {
        EpiHiperAddNoise.replace(target.path, parameter.value, target.integer).process([target.file]);
      });
    });
  }
  
  /**
   * Creates an EpiHiperAddNoise instance.
   * @param {string} path 
   * @param {string} distribution 
   * @param {number} sigma 
   * @param {number} min 
   * @param {number} max 
   * @param {number} value 
   * @param {bool} replace 
   * @param {bool} integer 
   * @param {bool} negative 
   * @returns {object} EpiHiperAddNoise
   */
  constructor(path, distribution, sigma, min, max, value, replace, integer, negative) {
    if (!(this instanceof EpiHiperAddNoise)) {
      return new EpiHiperAddNoise(path, distribution, sigma, min, max, value, replace, integer, negative);
    }

    this.path = path;
    this.distribution = distribution;
    this.sigma = sigma;
    this.min = min;
    this.max = max;
    this.value = value;
    this.replace = (typeof replace === 'undefined') ? false : replace;
    this.integer = (typeof integer === 'undefined') ? false : integer;
    this.negative = (typeof negative === 'undefined') ? false : negative;

    // Sanity checks:
    if (this.path === undefined) {
      throw ('EpiHiperAddNoise: Missing path');
    }

    if (this.distribution === undefined) {
      throw ('EpiHiperAddNoise: Missing distribution [normal|uniform|fixed]');
    }

    if (this.distribution != 'normal' && this.distribution != 'uniform' && this.distribution != 'fixed') {
      throw ('EpiHiperAddNoise: Invalid distribution [normal|uniform|fixed]');
    }

    if (this.distribution == 'normal' && isNaN(this.sigma)) {
      throw ('EpiHiperAddNoise: Missing sigma standard deviation of normal distribution');
    } else if (this.distribution == 'uniform' && isNaN(this.min)) {
      throw ('EpiHiperAddNoise: Missing min for uniform distribution');
    } else if (this.distribution == 'uniform' && isNaN(this.max)) {
      throw ('EpiHiperAddNoise: Missing max for uniform distribution');
    } else if (this.distribution == 'fixed' && isNaN(this.value)) {
      throw ('EpiHiperAddNoise: Missing value for fixed distribution');
    } 

    if (this.distribution == 'uniform') {
      if (this.integer) {
        this.min = Math.round(this.min);
        this.max = Math.round(this.max);
      }

      if (this.min == this.max) {
        this.distribution = 'fixed';
        this.value = this.min;
      }
    }  
  }

  /**
   * Process the given files
   * @param {Array} files
   * @return {boolean} success
   */
  async process(files) {
    const Promises = [];
    let success = true;

    // Load each file
    files.forEach(function(file) {
      Promises.push(this.addNoise(file));
    }.bind(this));

    try {
      await Promise.all(Promises);
    } catch (err) {
      console.log(err);
      success = false;
    }

    return success;
  }

  /**
   * Load a file and validate it
   * @param {string} file
   * @return {boolean} success
   */
  async addNoise(file) {
    let success = true;
    const epiHiperValidator = new EpiHiperValidator();
    const instance = await epiHiperValidator.load(file);

    const Promises = [];
    const nodes = jp.nodes(instance, this.path);

    nodes.forEach(function(node) {
      Promises.push(this.sample(instance, node));
    }.bind(this));

    try {
      await Promise.all(Promises);
    } catch (err) {
      console.log(err);
      success = false;
    }

    success &= await epiHiperValidator.validateSchema(instance);
    success &= await epiHiperValidator.validateRules(instance);

    if (success) {
      delete instance.__path;
      const json = JSON.stringify(instance, null, 2);

      if (this.replace) {
        fs.writeFileSync(file, json, 'utf8');
      } else {
        console.log(json);
      }
    }

    return success;
  }

  /**
   * If the node contains a number sample from the distribution
   * @param {Object} instance
   * @param {Object} node
   * @return {boolean} success
   */
  async sample(instance, node) {
    if (typeof node.value !== 'number') {
      return false;
    }

    if (this.distribution == 'normal') {
      node.value = this.normal(node.value, this.sigma);
    } else if (this.distribution == 'uniform') {
      node.value = this.uniform(this.min, this.max);
    } else if (this.distribution == 'fixed') {
      node.value = this.value;
    }

    if (!this.negative) {
      node.value = Math.max(0.0, node.value);
    }

    if (this.integer) {
      node.value = Math.round(node.value);
    }

    let object = instance;

    for (let i = 1; i < node.path.length - 1; i++) {
      object = object[node.path[i]];
    }

    object[node.path[node.path.length - 1]] = node.value;

    return true;
  }

  /**
   * Calculates the standard normal distribution (mean, sigma*mean).
   * @param {number} mean
   * @param {number} sigma
   * @return {number} normalDistribution
   */
  normal(mean, sigma) {
    return mean *= 1.0 + sigma * this.normalDistribution();
  }

  /**
   * Calculates the standard normal distribution (mean=0, sigma=1).
   * @return {number} normalDistribution
   */
  normalDistribution(mean) {
    let a = 0;
    let b = 0;
    let s = 0;

    do {
      do {
        a = Math.random();
      }
      while (a === 0); // Converting [0,1) to (0,1)
      a = 2.0 * a - 1.0;

      do {
        b = Math.random();
      }
      while (b === 0); // Converting [0,1) to (0,1)
      b = 2.0 * b - 1.0;

      s = a * a + b * b;
    } while (s >= 1.0 || s == 0);

    s = Math.sqrt(-2.0 * Math.log(s) / s);

    return s * b;
  }

  /**
   * Calculates the uniform distribution [min, max].
   * @param {number} min
   * @param {number} max
   * @return {number} uniformDistribution
   */
  uniform(min, max) {
    if (min == max)
      return min;

    if (!this.integer)
      return min + this.uniformDistribution() * (max - min);

    return Math.floor(min +  Math.random() * (max + 1 - min)); 
  }
  
  /**
   * Calculates the uniform distribution [0, 1].
   * @return {number} uniformDistribution
   */
   uniformDistribution() {
    if (Math.random() === 0)
      return 1;

    return Math.random();
  }  
}

module.exports = EpiHiperAddNoise;
