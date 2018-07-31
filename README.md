# Sails-hook-et-polymorphic-orm

[![NPM](https://nodei.co/npm/sails-hook-et-polymorphic-orm.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/sails-hook-et-polymorphic-orm/)

Hook to add missing polymorphic associations in sails - waterline. The hook patches models to use the normal many to many, one to many etc associations by creating the needed relationships between the models. This means the polymorphism is just normal waterline logic being played to provide polymorphic associations. I hope this gets integrated into waterline, let me know I want to go with it.

[![Donate using Liberapay](https://liberapay.com/assets/widgets/donate.svg)](https://liberapay.com/emahuni/donate)

## Installation:

Installing the hook is very simple in sails.

```cmd
npm install --save sails-hook-et-polymorphic-orm
```

That's it.

## What's next?

Well, now the hook will simply patch all polymorphic models with polymorphism.

## Usage

If we had a big app with a Status model that is reffered to by any model in the app this means our status model can belong to many uknown models.
If our app had House and Person models that require back-references(many-many).

### Normal usage without polymorphism

We create the following models:

```js
// api/models/House.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    state: {
        collection: "status",
        via: "house_states",
    },
  },
};

```

```js
// api/models/Person.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    statuses: {
        collection: "status",
        via: "person_statuses",
    },
  },
};

```
and you have to write the relationships in the Status model:

```js
// api/models/Status.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    house_states: {
        model: "person",
    },
    
    person_statuses: {
        collection: "person",
        via: "statuses",
    },
  },
};

```

Each time we refer to the status model with a `via` key we have to write the inverse relationship in the Status model otherwise Waterline will throw at us. For example, if we had additional kid, shop, family and community models in our app that associate themselves with the status model, the following is what you should write in the status model without polymorphic associations:

```js
// api/models/Status.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    kid_status: {
        collection: "kid",
        via: "status",
    },

    shops: {
        collection: "shop",
        via: "status",
    },

    family: {
        model: "family",
    },

    community: {
        model: "community",
    },

    // ... and so on
  },
};

```
For many reasons this is a source of confusion and blotting of code, which makes it very hard to mentain and reason about. Especially in this case, a status isn't something you would want to blot like that. Those relationships have nothing to do with each other and the resulting data will just look ugly and blotted:

```js
let statuses = await Status.find().sort('label DESC');
console.log(statuses);
// [ { house_states: [],
//     person_statuses: [],
//     kid_status: [],
//     shops: [],
//     family: [],
//     community: [],
//     createdAt: 1532942612454,
//     updatedAt: 1532942612454,
//     id: 2,
//     label: 'inactive',
//     color: 'grey' },
//   { house_states: [],
//     person_statuses: 
//      [ { createdAt: 1532942470430,
//          updatedAt: 1532942470430,
//          id: 1,
//          firstname: 'Boydho',
//          lastname: 'Zhangazha',
//          dob: 0 } ],
//     kid_status: [],
//     shops: [],
//     family: [],
//     community: [],
//     createdAt: 1532942612156,
//     updatedAt: 1532942612156,
//     id: 1,
//     label: 'active',
//     color: 'green' } ]
```

It's only better if we didn't want to know what status belongs to.

### Using polymorphic associations

With polymorphic associations this becomes very simple. Just create an attribute in the status model that automatically reverses and points to all associations that associate with the model? Here is how:

```js
// api/models/Status.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    affiliated: {
        collection: "*",
    },
  },
};

```

Just that! Our Status model belongs to all the abovementioned models including both Person and House models, but it doesn't have any declarative reference to any of them.

The asterix means we don't know to whom this belongs, figure out who points here at runtime and create a reverse relationship; thus polymorphing the attribute. The `affiliated` key is the polymorphic attribute that morphs according to associations, and this model becomes a polymorphic model. You can name the polymorphic attribute whatever you choose that makes sense to you it doesn't have to be 'affiliated'. The hook will figure it out and work with it accordingly.

In the other associating  models: just put `via: 'affiliated'` instead; eg. for Person model:

```js
// api/models/Person.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    statuses: {
        collection: "status",
        via: "affiliated",
    },
  },
};

```

#### What happens when we populate?

After adding records and doing `addToCollection` on their reletives and we need to find out their associations, we use normal waterline methods for the normal models and other special methods for the polymophic models.

For getting status records for any model that associates itself with status, just do the normal (for simplicity we will stick with House and Person models only):

```js
let statuses await Person.find().populate('statuses');
// or
let state await House.findOne().populate('state');
```

Here we just get the normal things find returns, nothing fancy.

For getting the inverse related data ie: the unknown models' records that associate with this status record:

```js
let affiliates = await Status.findPolyPop().sort('label DESC');
console.log(affiliates);
// [ { 'affiliated-_-house-_-states': [],
//     'affiliated-_-person-_-statuses': [],
//     createdAt: 1532942612454,
//     updatedAt: 1532942612454,
//     id: 2,
//     label: 'inactive',
//     color: 'grey' },
//   { 'affiliated-_-house-_-states': [],
//     'affiliated-_-person-_-statuses':
//      [ { createdAt: 1532942470430,
//          updatedAt: 1532942470430,
//          id: 1,
//          firstname: 'Boydho',
//          lastname: 'Zhangazha',
//          dob: 0 } ],
//     createdAt: 1532942612156,
//     updatedAt: 1532942612156,
//     id: 1,
//     label: 'active',
//     color: 'green' } ]
```
This gets the requested records as usual, but notice the two weird attributes that it includes in each record, which also look ugly. These are the relationships that were created by the hook to map polymorphic functionality on the models. They were populated automatically by the polyPop part of `findPolyPop`.

To cleanup and aggregate all the populated polymorphic records into one dictionary keyed by the polymorphic attribute name use `bundlePolyPopData`. In addition it will give you each affiliated record dictionary keyed with the model name in the aggregation.

```js
let affiliates = await Status.findPolyPop().sort('label DESC').then(r=>Status.bundlePolyPopData(r));
console.log(affiliates);
// [ { createdAt: 1532942612454,
//     updatedAt: 1532942612454,
//     id: 2,
//     label: 'inactive',
//     color: 'grey',
//     affiliated: [],
//   },
//   { createdAt: 1532942612156,
//     updatedAt: 1532942612156,
//     id: 1,
//     label: 'active',
//     color: 'green',
//     affiliated: [ { person: [ {
//          createdAt: 1532942470430,
//          updatedAt: 1532942470430,
//          id: 1,
//          firstname: 'Boydho',
//          lastname: 'Zhangazha',
//          dob: 0 } ]
//      } ]
// } ]
```

Clean and intuitive. Remember the `via:"affiliated"` part in the House and Person models? that's what you are getting there as the aggregate key.

You can find a complete hook example in the [test folder](https://github.com/emahuni/sails-hook-et-polymorphic-orm/tree/master/test/).

## API:

### findPolyPop ()
### findOnePolyPop ()
### streamPolyPop ()

All these methods are wrappers of their waterline counterparts; they have the same signatures.

The only huge difference is the aggregating method `bundlePolyPopData`:

### bundlePolyPopData (records)
it only takes 1 argument; the record(s) that have possible polymorphic data that need aggregation.

It is required at the end of each query to aggregate polymorphic records. This cleans up the returned records and aggregates them into the polymorphic attribute such as `affiliated` in the above example. I couldn't figure a way to internalise it without modifying waterline. If this get intergrated into waterline that part should happen within populate.

## Development

I changed the name from `sails-hook-polymorphic-orm` to `sails-hook-et-polymorphic-orm`. The reason was that this hook was being loaded before the orm when installed from npm. In tests and `api/hooks` etc it is loaded well before `orm`. So changing the name to start with an `e` makes sure it is loaded before `orm` that start with an `o` and not after. This is because of the lack of `sails.before` method or any other way to load hooks in a particular order. the only way is to rename the hook to have preceedence alphabetically.

### Contributing
  
Please follow the [Felix's Node.js Style Guide](https://github.com/felixge/node-style-guide).

We use [semantic versioning](https://docs.npmjs.com/getting-started/semantic-versioning) for the NPM package.

### Contributors

- Author: [Emmanuel Mahuni](https://github.com/emahuni)


