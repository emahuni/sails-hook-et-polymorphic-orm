# Sails-hook-polymorphic-orm

[![NPM](https://nodei.co/npm/sails-hook-polymorphic-orm.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/sails-hook-polymorphic-orm/)

Hook to add missing polymorphic associations in sails - waterline. The hook patches models to use the normal many to many, one to many etc associations by creating the needed relationships between the models. This means the polymorphism is just normal waterline logic being played to provide polymorphic associations. I hope this gets integrated into waterline, let me know I want to go with it.

## Installation:

Installing the hook is very simple in sails.

```cmd
npm install --save sails-hook-polymorphic-orm
```

That's it.

## What's next?

Well, now the hook will simply patch all polymorphic models with polymorphism.

You can find a complete hook example in the [test folder](https://github.com/emahuni/sails-hook-polymorphic-orm/tree/master/test/app/).

### What is Polymorphic Associations?

As in the tests, let's imagine we have a Status model that can belong to both Person and House models.

Normally you would define an association as follows:

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
				via: "person_status",
    },

  },
};

```
then in another model

```js
// api/models/House.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    states: {
				collection: "status",
				via: "house_states",
    },

  },
};

```
then in status model
```js
// api/models/Status.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    person_status: {
				model: "person",
    },

    house_states: {
        collection: "house",
        via: "states",
    },

  },
};

```

You may say, that's fine, what's wrong with that? Well for many reasons it is limited and can get very complex. The person model doesn't need nor use the house_states attribute nor does the house model use nor need the person_status.

Ok for real use cases the Status model can belong to any models in the app that can have a status... What if our status model can belong to uknown models; that's the key here. If we had a kid model, shop model, family model, community model etc... all these models can have status, heck even a status model can have a status. How are we going to keep track of all those models and populations? If the status model is needed in all models in the app, then the app can easily become blotted and too complex to manage and reason about.  I think you get the picture by now.
You say well just point in one way, ie: from the other models and put nothing in Status. What if you want to know to which models the status belongs to?
Here is what the status model can look like just for the mentioned models:

```js
// api/models/Status.js
module.exports = {
  attributes: {
    // ...

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    // in addition to the above

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

It gets worse. You have populate all those models manually each time, even for the ones the status record doesn't belong to.


### Polymorphism to the rescue
What if we could just create an attribute in the model that automatically reverses and point to all associations that associate with the model? Here is how

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

Just that! The asterix mean that we don't know to whom this belongs, you figure it out at runtime. I call this the polymorphic attribute and this model becomes a polymorphic model.

The other models: just put `via: 'affiliated'` instead and stop putting funny prefixes to make them diffent. eg: `person_status` or `house_states`.

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
let affiliates = await Status.findPolyPop().sort('label DESC').then((r)=>Status.bundlePolyPopData(r));
```
This gets the requested records as usual, but populates the associated models automatically and aggregates all records that point to this status record into the polymorphic attribute, regardless of their model. In fact it will give you each affiliated records keyed with the model name...

## API:

All methods are wrappers of their waterline counterparts; they have the same signature except for `streamPolyPop`, which requirs a callback that you pass to it.

The only huge difference is the bundling method that is required at the end of each query. This cleans up the returned records and aggregates them into the polymorphic attribute such as `affiliated` in the above example. I couldn't figure a way to internalise it without modifying waterline. If this get intergrated into waterline that part should happen internally automatically. The reason why I put it outside was because I wanted everything to work just like waterline instance methods with chaining enabled.

### bundlePolyPopData (records)
it only takes 1 argument; the record(s) that have possible polymorphic data that needs aggregation.

## Development

### Contributing
  
Please follow the [Felix's Node.js Style Guide](https://github.com/felixge/node-style-guide).

We use [semantic versioning](https://docs.npmjs.com/getting-started/semantic-versioning) for the NPM package.

### Contributors

- [Emmanuel Mahuni](https://github.com/emahuni)


