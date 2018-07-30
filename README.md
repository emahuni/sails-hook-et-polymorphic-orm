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

If we had a big app with a Status model that is reffered to by any model in the app this means our status model can belong to many uknown models. writting the relationships in the status model can be very counter intuitive.

For example, if we had kid, shop, family, community models in our app that associate themselves with the status model, the following is what you could write in the status model without polymorphic associations:

```js
// api/models/Status.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    kids: {
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
For many reasons this is a source of confusion and blotting of code, which makes it very hard to mentain and reason about.

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

Just that! The asterix means that we don't know to whom this belongs, figure out who points here at runtime and create a reverse relationship; thus polymorphing the attribute. The `affiliated` key is the polymorphic attribute and this model becomes a polymorphic model. You can name the polymorphic attribute whatever you choose that makes sense to you it doesn't have to be 'affiliated'. The hook will figure it out and work with it accordingly.

As in the tests, our Status model belongs to both Person and House models, but it doesn't have any reference to either of them.

In the other associating  models: just put `via: 'affiliated'` instead. eg for kid model:

```js
// api/models/Kid.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    status: {
        collection: "status",
        via: "affiliated",
    },
  },
};

```

### What happens when we populate?

For getting status records for any model that associates itself with status, just do the normal:
```js
let statuses await Person.find().populate('status');
// or
let states await House.findOne().populate('status');
```

Clean and intuitive.

For getting the inverse related data ie: the unknown models' records that associate with this status record:

```js
let affiliates = await Status.findPolyPop().sort('label DESC');
console.log(affiliates);
// [ { name: 'active',
//     'affiliated-_-house-_-states': [],
//     'affiliated-_-person-_-statuses': [],
//     createdAt: 1532942612454,
//     updatedAt: 1532942612454,
//     id: 1,
//     label: '',
//     color: 'brown' },
//   { name: 'inactive',
//     'affiliated-_-house-_-states': [],
//     'affiliated-_-person-_-statuses':
//      [ { createdAt: 1532942470430,
//          updatedAt: 1532942470430,
//          id: 1,
//          firstname: 'boydo',
//          lastname: 'kamuzu',
//          dob: 0 } ],
//     createdAt: 1532942612454,
//     updatedAt: 1532942612454,
//     id: 2,
//     label: '',
//     color: 'brown' } ]
```
This gets the requested records as usual, but notice the two attributes that it includes in each record. These the relationships that were created by the hook to map polymorphic functionality on the models. They were populated automatically by the polyPop part of `findPolyPop`.

To aggregates all the populated polymorphic records into one dictionary keyed by the polymorphic attribute name use `bundlePolyPopData`. In addition it will give you each affiliated record dictionary keyed with the model name in the aggregation.

```js
let affiliates = await Status.findPolyPop().sort('label DESC').then(r=>Status.bundlePolyPopData(r));
console.log(affiliates);
// [ { name: 'active',
//     createdAt: 1532942612454,
//     updatedAt: 1532942612454,
//     id: 1,
//     label: '',
//     color: 'brown',
//     affiliated: []
//   },
//   { name: 'inactive',
//     createdAt: 1532942612454,
//     updatedAt: 1532942612454,
//     id: 2,
//     label: '',
//     color: 'brown',
//     affiliated: [ { person: [ {
//          createdAt: 1532942470430,
//          updatedAt: 1532942470430,
//          id: 1,
//          firstname: 'boydo',
//          lastname: 'kamuzu',
//          dob: 0 } ]
//      } ]
// } ]
```

Remember the `via:"affiliated"` part in the House and Person models? that's what you are getting there as the key.

You can find a complete hook example in the [test folder](https://github.com/emahuni/sails-hook-et-polymorphic-orm/tree/master/test/).

## API:

All methods are wrappers of their waterline counterparts; they have the same signature except for `streamPolyPop`, which requirs a callback that you pass to it.

The only huge difference is the bundling method that is required at the end of each query. This cleans up the returned records and aggregates them into the polymorphic attribute such as `affiliated` in the above example. I couldn't figure a way to internalise it without modifying waterline. If this get intergrated into waterline that part should happen internally automatically. The reason why I put it outside was because I wanted everything to work just like waterline instance methods with chaining enabled.

I changed the name from `sails-hook-polymorphic-orm` to `sails-hook-et-polymorphic-orm`. The reason was that this hook was being loaded before the orm when installed from npm. In tests and `api/hooks` etc it is loaded well before `orm`. So changing the name to start with an `e` makes sure it is loaded before `orm` that start with an `o` and not after. This is because of the lack of `sails.before` method or any other way to load hooks in a particular order. the only way is to rename the hook to have preceedence alphabetically.

### bundlePolyPopData (records)
it only takes 1 argument; the record(s) that have possible polymorphic data that needs aggregation.

## Development

### Contributing
  
Please follow the [Felix's Node.js Style Guide](https://github.com/felixge/node-style-guide).

We use [semantic versioning](https://docs.npmjs.com/getting-started/semantic-versioning) for the NPM package.

### Contributors

- [Emmanuel Mahuni](https://github.com/emahuni)


