
Test = new Mongo.Collection("test");

if (Meteor.isClient) {
  sub = Meteor.subscribe("test");

  Template.table.helpers({
    num: function() {
      var r = Test.find().count() + ", " + new Date();
      console.log(r);
      return r;
    },
    records: function() {
      return Test.find({}, { sort: { _id: -1 } });
    }
  });
} else if (Meteor.isServer) {
  Meteor.publish("test", function() {
    return Test.find({}, {
      sort: { _id: -1 },
      //limit: 1000
    });
  });
}
