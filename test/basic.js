const Sails = require('sails').Sails;
const chai = require('chai');
const expect = chai.expect;

describe('Basic tests ::', function() {
    // Var to hold a running sails app instance
    var sails, log;

    // Before running any tests, attempt to lift Sails
    before(function (done) {
        // Hook will timeout in 10 seconds
        this.timeout(11000);

        // change the working dir to test so we load test app
        process.chdir('./test/app');
        
        // Attempt to lift sails
        Sails().load({
            hooks: {
                // Load the hook
                "sails-hook-polymorphic-orm": require('../'),

                // the following should be loaded only after our hook
                "orm": require('sails-hook-orm'),
            },
            log: {
                level: "debug"
            },
            
            models: {
                migrate: "drop",
            },
            
        },function (err, _sails) {
            if (err) return done(err);
            
            sails = _sails;
            // log = sails.log;
            log =  console;
            // console.log('models: %o', sails.models);
            return done();
        });
    });

    // After tests are complete, lower Sails
    after(function (done) {
        // Lower Sails (if it successfully lifted)
        if (sails) {
            return sails.lower(done);
        }

        // Otherwise just return
        return done();
    });

    // Test that Sails can lift with the hook in place
    it ('doesn\'t crash Sails', async function() {
        return true;
    });

    context ('Patched orm models polymorphism successfully ::', function (){
        context ('Status - the model with polymorphic attribute', function (){
            // Status is the only one with a polymorphic attribute, so it's the only one that should have the following in this test app:
            it('has polymorphic associations defined', async function (){
                expect(Status.polymorphicAssociations, 'no polymorphic associations exists, hook ran after orm or it didn\' run properly').to.be.an('array');
            });

            it('has polymorphic attribute key', async function (){
                expect(Status.polyAttribKey,'attribute that morphs accordingto associations has not been defined').to.be.a('string');
            });

            it('has polymorphic attributes patched in', async function (){
                expect(Status.attributes, 'No polymorphed attributes according to expected associations').to.be.an('object').that.includes.all.keys(Status.polymorphicAssociations);
            });

            context.skip('has polyPop functions - polymorphic PopulateAll functions', function (){
                it('has polyPop', async function (){
                    expect(Status).to.be.an('object').that.has.own.property('polyPop');
                });
            });
        });
    })

    context('Polymorphic Tests ::', async function () {
        var people, houses, statuses, sharedResults;
        
        before('load seeds', async function () {
            // the following seeds should not be altered, tests are highly dependant on them
            // create people
            people = await Person.createEach([
                {firstname: 'Tendai', lastname: 'Mahobho'},
                {firstname: 'Boydho', lastname: 'Kambarami'},
                {firstname: 'Nyarai', lastname: 'Chengetwa'},
                {firstname: 'Pericle', lastname: 'Ncube'},
            ]).fetch();

            // create houses
            houses = await House.createEach([
                {address: '11055 St Mary\'s'},
                {address: '2123 Gaydon Borrowdale'},
                {address: '15 Chaza Harare'},
                {address: '1443 Murombedzi'},
            ]).fetch();

            // create statuses
            statuses = await Status.createEach([
                {label: 'Active', color: 'yellow'},
                {label: 'Inactive', color: 'black'},
                {label: 'Zero', color: 'white'},
                {label: 'Full', color: 'blue' },
            ]).fetch();

            // log.debug('awaited statuses: %o, \rhouses: %o, \rpeople: %o',statuses, houses, people);
        });

        // the following are progressive tests, meaning each test modifies the db and doesn't clean up
        // the next tests will use those modifications
        it(`creates an association between people[0] => statuses[2]`, async function (){
            await Person.addToCollection(people[0].id, 'statuses', statuses[2].id);

            // now assert it
            await Person.find(people[0].id).populate('statuses').then(r=>{
                // log.debug('association result: ', r);
                expect(r[0].statuses).to.be.an('array').that.has.lengthOf(1);
            });
        });
        
        it(`can find a polymorphic associations between people[0,2] <= statuses[2] and populate the results`, async function (){
            // add another association with status 2
            await Person.addToCollection(people[2].id, 'statuses', statuses[2].id);
            
            // polymorphic methods are only found on polymorphic models chete
            let awaitedResult = await Status.findPolyPop(statuses[2].id).then(r=>Status.bundlePolyPopData(r)).then(r=>{
                // bundlePolyPopData normalizes the polymorphic associations data into the polymorphic attribute as an array
                
                // log.debug('polymorphic association result: %o', r);
                // 'affiliated' is the polymorphic association key defined in the statuses model. see statuses model definition in test/app/api/models/Statuses.js
                expect(r[0].affiliated[0].person).to.be.an('array').that.has.lengthOf(2);
                
                // return it so that it can be used by the awaiting var awaitingResult
                return r;
            });

            // log.debug('awaitedResult: ', awaitedResult);
            expect(awaitedResult).to.be.an('array');
        });

        it('works with modifiers - used sort successfully', async function (){
            // should sort the statuses in reverse order on the name key
            let awaitedResult = await Status.findPolyPop().sort('label DESC').then(r => Status.bundlePolyPopData(r));

            // log.debug('awaitedResult: ', awaitedResult);
            
            // the sort should have worked, if status Zero is coming on result 0
            expect(awaitedResult[0].label).to.be.equal('Zero');
            // make sure we still have our bundling done right: see previous test for details on the association
            expect(awaitedResult[0].affiliated[0].person[1].firstname).to.be.equal(people[2].firstname); 
        });
        
        it(`can find ONE polymorphic association between people[3] <= statuses[1]`, async function (){
            await Person.addToCollection(people[3].id, 'statuses', statuses[1].id);

            // this is the same as findOne
            let awaitedResult = await Status.findOnePolyPop(statuses[1].id).then(r=>{
                // another way of using bundlePolyPopData. we are doing this here coz i don't know how to hook onto the model instance and do this internally without modifying waterline
                // this is supposed to be done internally just before the results are returned into userland code
                r = Status.bundlePolyPopData(r);

                // since this is a single record, it will be an obj and not an array
                expect(r).to.be.an('object');
                expect(r.affiliated[0].person[0].firstname).to.be.equal(people[3].firstname);

                return r;
            });

            // log.debug('awaitedResult: ', awaitedResult);
            expect(awaitedResult).to.be.an('object');
        });

        
        
        it(`can find a polymorphic associations between houses[1] <= statuses[2] and people[0,2] <= statuses[2] and populate the results`, async function (){
            // add another association with status 2
            await House.addToCollection(houses[1].id, 'states', statuses[2].id);
            
            // polymorphic methods are only found on polymorphic models chete
            let awaitedResult = await Status.findPolyPop(statuses[2].id).then(r=>Status.bundlePolyPopData(r)).then(r=>{
                // bundlePolyPopData normalizes the polymorphic associations data into the polymorphic attribute as an array
                
                // log.debug('polymorphic association result: %o', r);
                // 'affiliated' is the polymorphic association key defined in the statuses model. see statuses model definition in test/app/api/models/Statuses.js
                expect(r[0].affiliated).to.be.an('array').that.has.lengthOf(2);
                expect(r[0].affiliated[0].house).to.be.an('array').that.has.lengthOf(1);
                expect(r[0].affiliated[1].person).to.be.an('array').that.has.lengthOf(2);
                
                // return it so that it can be used by the awaiting var awaitingResult
                return r;
            });

            // log.debug('awaitedResult: ', awaitedResult);
            expect(awaitedResult).to.be.an('array');
        });
        
    });
});










