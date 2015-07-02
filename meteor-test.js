
Test = new Mongo.Collection("test");

if (Meteor.isClient) {

  Session.setDefault('page', 1);

  sub = null;
  Tracker.autorun(function(){
    var page = Session.get('page');
    sub = Meteor.subscribe("test", page);
  })




} else if (Meteor.isServer) {

  NUM_PER_PAGE = 100;
  Meteor.publish("test", function(page) {
    return Test.find({
      /* some criteria? */
    }, {
      sort: {
        _id: 1
      },
      limit: NUM_PER_PAGE,
      offset: (page - 1) * NUM_PER_PAGE
    });
  });
}
