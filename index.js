const seam = '-_-'; 


const polymorphicPatch = require('./lib/polymorphic-patch');
const patchModelMethods = require('./lib/patch-model-methods');


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
                    models = polymorphicPatch(seam, models);
                    
                    // call the actual cb which is in normal sails pipeline
                    return cb2(err, models);
                });
            }

            

            sails.on('hook:orm:loaded', function (){
                sails.log.info('polymorphic orm patching model methods...');

                patchModelMethods(seam, sails.models);
                
                // Then call cb() to finish patching
                return cb();
            });

        },

        // polymorphicPatch,

        // aggregatePolyPopData,

        // save the seam that is used to seperate polymorphicAssociationsKey,model and association attribute
        seam,
    };
}
