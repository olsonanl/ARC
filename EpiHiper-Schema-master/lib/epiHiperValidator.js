/* eslint-disable max-len */
'use strict';

const path = require('path');
const fs = require('fs');
const Ajv = require('ajv');

/**
 * EpiHiper Validator Class
 */
class EpiHiperValidator {
  /**
   * Creates an epiHiperValidator instance.
   * Usage: `epiHiperValidator(schemaDir)`
   * @param {string} schemaDir optional schemaDir
   * @return {Object} epiHiperValidator instance
   */
  constructor(schemaDir) {
    if (!(this instanceof EpiHiperValidator)) {
      return new EpiHiperValidator(schemaDir);
    }

    this.schemaDir = schemaDir;

    this.cwd = path.resolve(process.cwd());

    if (!schemaDir) {
      schemaDir = path.join(__dirname, '..', 'schema');
    }

    this.pkg = require('../package.json');
    this.cfg = require('../config.json');

    this.ajv = new Ajv({schemaId: 'auto'});
    this.ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));

    this.jsontron = require('@shoops/jsontron');
    this.rules = {};

    this.cfg.schema.forEach(function(s) {
      const sInstance = require(path.join(schemaDir, s));
      sInstance['$id'] = 'file://./' + s;
      this.ajv.addSchema(sInstance);

      const RulesFile = path.join(schemaDir, s.replace('Schema.json', 'Rules.json'));

      if (RulesFile.endsWith('Rules.json') && fs.existsSync(RulesFile)) {
        this.rules[s.replace('Schema.json', 'Rules.json')] = require(RulesFile);
      }
    }.bind(this));
  }

  /**
   * Retrieve the first line of a file asyncronously
   * @param {string} file
   * @param {string} firstLine
   */
  async firstLine(file) {
    const {once} = require('events');
    const {createInterface} = require('readline');

    let line = '';

    try {
      const rl = createInterface({
        input: fs.createReadStream(file),
        crlfDelay: Infinity,
      });

      line = await once(rl, 'line');

      rl.close();
    } catch (err) {
      console.error(err);
    }

    return line;
  }

  /**
   * Load a json file
   * @param {string} file
   * @param {string} relativeTo optional
   * @return {Object} instance;
   */
  async load(file, relativeTo) {
    try {
      file = this.resolvePath(file, relativeTo);
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

    Instance.__path = file;
    return Instance;
  }


  /**
   * Process a single file
   * @param {function} validate(instance)
   * @param {string} file
   * @param {string} relativeTo
   * @return {boolean} success
   */
  async processFile(validate, file, relativeTo) {
    const Instance = await this.load(file, relativeTo);
    const success = await validate(Instance);

    if (!success) {
      console.error('Validation failed for \'' + file + '\'');
    }

    return success;
  }

  /**
   * Process a list of files
   * @param {function} validate(instance)
   * @param {Array} files
   * @param {string} relativeTo
   * @return {boolean} success
   */
  async processFiles(validate, files, relativeTo) {
    const Promises = [];

    files.forEach(async function(file) {
      Promises.push(this.processFile(validate, file, relativeTo));
    }.bind(this));

    let success = true;
    const Results = await Promise.all(Promises);

    Results.forEach(function(result) {
      success &= result;
    });

    return success;
  }

  /**
   * Validate whether the provided instace matches the schema
   * @param {Object} instance
   * @return {boolean} success
   */
  async validateSchema(instance) {
    if ((Object.keys(instance).length === 0 && instance.constructor === Object)) return false;

    let success = true;
    const Schema = this.getSchemaName(instance);

    // Check whether we have the schema already loaded
    const validate = this.ajv.getSchema('file://./' + Schema);

    if (typeof validate === 'undefined') {
      console.error('Schema: ' + this.getSchemaURI(instance) + ' not found.');
      success = false;
    }

    if (success) {
      const valid = validate(instance);

      if (!valid) {
        console.error('File: ' + instance.__path + ' invalid');
        console.error(validate.errors);
        success = false;
      } else {
        console.log('File: ' + instance.__path + ' valid');

        if (Schema == 'runParametersSchema.json' ||
            Schema == 'modelScenarioSchema.json') {
          success &= await this.validateReferencedFiles(instance, this.validateSchema.bind(this));
        }
      }
    }

    return success;
  }

  /**
   * Validate whether the provided instance satisfies the rules
   * @param {Object} instance
   * @return {boolean} success
   */
  async validateRules(instance) {
    if ((Object.keys(instance).length === 0 && instance.constructor === Object)) return false;

    let success = true;
    const RulesFile = this.getRulesName(instance);

    // Check whether we have the rules already loaded
    const Rules = this.rules[RulesFile];

    if (typeof Rules === 'undefined') {
      console.error('File: ' + instance.__path + ' no rules provided');
    } else {
      const Report = this.jsontron.JSONTRON.validate(instance, Rules);

      if (Report.finalValidationReport.length) {
        console.error('File: ' + instance.__path + ' invalid');
        console.error(Report.finalValidationReport);
        success = false;
      } else {
        console.log('File: ' + instance.__path + ' valid');
      }
    }

    const Schema = this.getSchemaName(instance);

    if (success &&
        (Schema == 'runParametersSchema.json' ||
         Schema == 'modelScenarioSchema.json')) {
      success &= await this.validateReferencedFiles(instance, this.validateRules.bind(this));
    }

    return success;
  }

  /**
   * Validate referenced files within a run parameter instance
   * @param {object} instance
   * @param {function} validate(instance)
   * @return {boolean} success
   */
  async validateReferencedFiles(instance, validate) {
    const Files = [];

    if (instance.modelScenario) {
      Files.push(instance.modelScenario);
    }

    if (instance.diseaseModel) {
      Files.push(instance.diseaseModel);
    }

    if (instance.initialization) {
      Files.push(instance.initialization);
    }

    if (instance.intervention) {
      Files.push(instance.intervention);
    }

    if (instance.traits) {
      Files.push(instance.traits);
    }

    if (instance.personTraitDB) {
      if (Array.isArray(instance.personTraitDB)) {
        instance.personTraitDB.forEach(function(file) {
          Files.push(file); 
        })
      } else {
        Files.push(instance.personTraitDB);
      }
    }

    const success = await this.processFiles(validate, Files, path.dirname(instance.__path));

    return success;
  }

  /**
   * Resolve the pathspec
   * @param {string} pathSpec
   * @param {string} relativeTo
   * @return {string} absolutePath
   */
  resolvePath(pathSpec, relativeTo) {
    const absolute = new RegExp('/^([a-zA-Z]:)?/([^/]+/)*[^/]+$');

    if (absolute.test(pathSpec)) {
      return pathSpec;
    }

    const selfRelative = new RegExp('^self://(([^/]+/)*[^/]+$)');
    const match = selfRelative.exec(pathSpec);

    if (match) {
      return path.resolve(relativeTo, match[1]);
    }

    return path.resolve(this.cwd, pathSpec);
  }

  /**
   * Determine the URI of the schema of the instance
   * @param {object} instance
   * @return {string} schema
   */
  getSchemaURI(instance) {
    let Schema = '';

    if (instance['$schema']) Schema = instance['$schema'];
    if (instance.epiHiperSchema) Schema = instance.epiHiperSchema;

    return Schema;
  }

  /**
   * Determine the name of the schema of the instance
   * @param {object} instance
   * @return {string} schema
   */
  getSchemaName(instance) {
    return path.basename(this.getSchemaURI(instance));
  }

  /**
   * Determine the URI of the rules of the instance
   * @param {object} instance
   * @return {string} schema
   */
  getRulesURI(instance) {
    return this.getSchemaURI(instance).replace('Schema.json', 'Rules.json');
  }

  /**
   * Determine the name of the rules of the instance
   * @param {object} instance
   * @return {string} schema
   */
  getRulesName(instance) {
    return path.basename(this.getRulesURI(instance));
  }
}

module.exports = EpiHiperValidator;
