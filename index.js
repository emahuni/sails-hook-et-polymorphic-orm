const seam = '-_-'; 


const mapPolymorphic = function (models, polymorphicModel, polyAttribKey, polyAttrib) {
    // get the polymorphic attribute's key
    const polymorphicModelID = polymorphicModel.identity;

      // We have to find if they are a model linked to this key
    _.forIn(models, model => {
          // go thru all attributes of this model
        _.forIn(model.attributes, (attrib, attribKey) => {
                  // is this model's attribute referring to the polymorphic model's id and via its polymorphic key?
                if (attrib.hasOwnProperty('via') && attrib.via === polyAttribKey && ((attrib.hasOwnProperty('model') && attrib.model === polymorphicModelID) || attrib.hasOwnProperty('collection') && attrib.collection === polymorphicModelID)) {
                    let type = null;

                    // now create the inverse mapping polymorphically, using the type of relation required by the polymorphic attribute 
                    if (polyAttrib.hasOwnProperty('collection')) {
                        type = 'collection';
                    } else if (polyAttrib.hasOwnProperty('model')) {
                        type = 'model';
                    }

                    if (type) {
                        // create the unique relationship
                        let relation = `${polyAttribKey}${seam}${model.identity}${seam}${attribKey}`;
                        
                        // insert the polymorphic attribute into the polymorphic model's attributes 
                        models[polymorphicModelID].attributes[relation] = _.merge({ [type]: model.identity }, type === 'collection' ? {via: attribKey}: {});
                        // sails.log.debug('ins relation in %o: %o',polymorphicModelID, models[polymorphicModelID]);

                        // store all polymorphic relations about this model somewhere
                        if(models[polymorphicModelID].hasOwnProperty('polymorphicAssociations')){
                            models[polymorphicModelID].polymorphicAssociations.push(relation);
                        } else {
                            models[polymorphicModelID].polymorphicAssociations = [relation];
                        }

                        // store the original polymorphic attribute's key
                        if(!models[polymorphicModelID].hasOwnProperty('polyAttribKey')){
                            models[polymorphicModelID].polyAttribKey = polyAttribKey;
                        }

                        // insert the inverse of the relation in the related model. nb: this side will always be collection since it uses via
                        models[model.identity].attributes[attribKey].via = relation;

                        // break the loop and go to the next model
                        return false;
                    }  else {
                        // implement some form of warning or error, the key for the relation wasn't defined at all in the attrib as expected. could leave it for waterline
                    }
                }
          });
    });


    return models;
};


/**
*  populate polymorphic associations of the model it belongs to for the given id. (wish i could use model instances for this to work like the real populate)
*  nb: not async fn coz i want to return the deffered object
**/
const findPolyPop = function (query) {
    return polyPop (this, 'find', query);
};

const findOnePolyPop = function (query) {
    return polyPop (this, 'findOne', query);
};

const streamPolyPop = function (query, cb) {
    if(_.isFunction(query)){
        cb = query;
        query = undefined;
    }

    return polyPop(this, 'stream', query).eachBatch(async (batch, next)=>{
        batch = await this.relate(batch);

        // labours of pain for not having model instance methods
        if (_.isFunction(cb)){
            cb(batch);
        }

        return  next();
    });
};

// implement DRY programming
const polyPop = function (model, method, query){
    let deffered = model[method](query);
    
    // populate all polymorphic associations
    deffered = polymorphicsPopulate(model, deffered);
    
    return deffered;
};


const polymorphicsPopulate = function (model, deffered){
    // let's go thru all saved polymorphic associations and populate them,
    // don't use populateAll coz it will unintently populate other associations in the model
    _.forEach(model.polymorphicAssociations, ass => {
        deffered.populate(ass);
    })
    
    return deffered;
};

// the workhorse of bundlePolyPopData
const bundlePolyPopRecord = function (model, rec) {
    let bundle = [];

    // go through each association record key and push into bundle array
    _.forEach(model.polymorphicAssociations,  ass => {
        if(rec.hasOwnProperty(ass)){
            // only keep the ones that aren't empty
            if(_.isArray(rec[ass]) && rec[ass].length > 0){
                bundle.push(
                    {[ass.split(seam)[1]]: rec[ass]} // infer the related model using the given relationship string
                );
            }

            // clean up association data from the record
            rec = _.omit(rec, ass);
        } else if(rec.hasOwnProperty(model.polyAttribKey)){
            // bundle = rec[model.polyAttribKey];
            // just don't do anything, it has the key already, but don't quit, maybe there is a new association.
        } else {
            console.warn('This is not supposed to happen. there is a bug in the hook or this record is mulformed. record: %o, association: %o, data: %o  ', rec, ass, rec[ass]);    
        }
    });

    // merge the bundled association data into the polymorphic attribute
    rec[model.polyAttribKey] = _.union(rec[model.polyAttribKey], bundle);

    return rec;
}

// aggregate populated polymorphic attributes data into one common attribute that is determined by the polymorphic attribute key for the given record(s). eg: related 
const bundlePolyPopData = function (records) {
    // _.bind(bundlePolyPopRecord);
    
    if(_.isArray(records)){
        //handle for multiple records
        // bundle populated polymorphic data for each record
        _.forEach(records, (rec, i) => {
            // put back in records;
            records[i] =  bundlePolyPopRecord(this, rec);
        });               
    } else if(_.isObject(records)) {
        // handle for single record, use with findOne records
        records = bundlePolyPopRecord(this, records);
    } else {
        sails.log.warn('This should be shown, there is a bug in the hook or you passed a none record to bundlePolyPopData');
    }
    
    return records;
};


/**
* build polymorphic relationships within the passed models object
*
**/
const polymorphicPatch = function (models) {
    // go thru all given models to map them out
    _.forIn(models, model =>{
        // go thru the given model to see if it has any polymorphic definition
        _.forIn(model.attributes, (attrib, attribKey) => {
            // see if this attribute is a definition of a polymorphic association
            if ((attrib.hasOwnProperty('collection') && attrib.collection === '*') || (attrib.hasOwnProperty('model') && attrib.model === '*')) {
                
                // this model attribute is a polymorphic attribute, map its relationships
                mapPolymorphic(models, model, attribKey, attrib);

                // remove the polymorphic key so it doesn't crash waterline since we are done with it.
                delete model.attributes[attribKey];
                
                // add model methods that populate all polymorphic associations if not there already
                if(!model.hasOwnProperty('findPolyPop')){
                    model = _.merge(model, {
                        findPolyPop,
                        findOnePolyPop,
                        streamPolyPop,
                        polyPop,

                        // also add relations data bundler
                        bundlePolyPopData,
                    });
                }
            }
            
        });                     // model.attriibutes
    });                         // models
            
    return models;
};


module.exports = function definePolymorphicHook (sails) {
    return {
        initialize: function(cb) {
            // keep the original function
            const loadModels = sails.hooks.moduleloader.loadModels;
            
            sails.log.info('- Patching loadModels with polymorphic analysis logic...');

            // monkey patch the load models function
            sails.hooks.moduleloader.loadModels = function (cb2) {
                // call the original function to do its thing and our patch as the callback function
                loadModels(function(err, models){
                    if (err){
                        return cb2(err, models);
                    }

                    // modify the models according to polymorphic rules
                    // send raw model objects for polymorphic relashionships injection
                    models = polymorphicPatch(models);
                    
                    // call the actual cb which is in normal sails pipeline
                    return cb2(err, models);
                });
            }

            // Then call cb() to finish patching
            return cb();
        },

        polymorphicPatch,
        findPolyPop,
        findOnePolyPop,
        streamPolyPop,
        polyPop,

        bundlePolyPopData,

        // save the seam that is used to seperate polymorphicAssociationsKey,model and association attribute
        seam,
    };
}
