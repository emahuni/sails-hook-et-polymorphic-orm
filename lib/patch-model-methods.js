

const populatePatch = require('./populate-patch');
const aggregatePolyPopData = require('./aggregate-poly-pop-data');


// INSTANCE METHODS PATCHES


const findPatch = function (seam, criteria) {
    let deffered = this._find(criteria);

    patchInstanceMethods(seam, deffered);
    
    return deffered;
};

const findOnePatch = function (seam, criteria) {
    let deffered = this._findOne(criteria);

    patchInstanceMethods(seam, deffered);
    
    return deffered;
};

const findOneCreatePatch = function (seam, criteria, initVals) {
    let deffered = this._findOneCreate(criteria, initVals);

    patchInstanceMethods(seam, deffered);
    
    return deffered;
};


const streamPatch = function (seam, criteria) {
    let deffered = this._stream(criteria);

    patchInstanceMethods(seam, deffered);
    
    return deffered;
};

// patch exec so that we can cleanup and aggregate the polymorphic associations data
const execPatch =  function (cb) {    
    // run the default log
    this._exec((err, results, args)=>{
        this.aggregatePolyPopData(results);

        cb(err, results, args);
    });
};



// wrap and bind instance methods to deffered obj
const patchInstanceMethods = function (seam, deffered){
    deffered._populate = deffered.populate;
    deffered.populate = _.bind(populatePatch, deffered, seam);

    deffered.aggregatePolyPopData = _.bind(aggregatePolyPopData, deffered, seam);

    deffered._exec =  deffered.exec;
    deffered.exec = _.bind(execPatch, deffered);
};






module.exports = function patchModelMethods  (seam, models) {
    // go thru all given models to map them out
    _.forIn(models, model =>{
        // patch model methods
        model._find = model.find;
        model.find = _.bind(findPatch, model, seam);
        
        model._findOne = model.findOne;
        model.findOne = _.bind(findOnePatch, model, seam)

        model._findOneCreate = model.findOneCreate;
        model.findOneCreate = _.bind(findOneCreatePatch, model, seam);

        model._stream = model.stream;
        model.stream = _.bind(streamPatch, model, seam);
    });                         // models
            
    return models;
}
