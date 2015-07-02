var ReactMeteorData = {
  componentWillMount() {
    this.data = {};
    this._meteorDataManager = new MeteorDataManager(this);
    const newData = this._meteorDataManager.calculateData();
    this._meteorDataManager.updateData(newData);
  },
  componentWillUpdate(nextProps, nextState) {
    const saveProps = this.props;
    const saveState = this.state;
    let newData;
    try {
      // Temporarily assign this.state and this.props,
      // so that they are seen by getMeteorData!
      // This is a simulation of how the proposed Observe API
      // for React will work, which calls observe() after
      // componentWillUpdate and after props and state are
      // updated, but before render() is called.
      // See https://github.com/facebook/react/issues/3398.
      this.props = nextProps;
      this.state = nextState;
      newData = this._meteorDataManager.calculateData();
    } finally {
      this.props = saveProps;
      this.state = saveState;
    }

    this._meteorDataManager.updateData(newData);
  },
  componentWillUnmount() {
    this._meteorDataManager.dispose();
  }
};

// A class to keep the state and utility methods needed to manage
// the Meteor data for a component.
class MeteorDataManager {
  constructor(component) {
    this.component = component;
    this.computation = null;
    this.oldData = null;
  }

  dispose() {
    if (this.computation) {
      this.computation.stop();
      this.computation = null;
    }
  }

  calculateData() {
    const component = this.component;
    const {props, state} = component;

    if (! component.getMeteorData) {
      return null;
    }

    if (this.computation) {
      this.computation.stop();
      this.computation = null;
    }

    let data;
    // Use Tracker.nonreactive in case we are inside a Tracker Computation.
    // This can happen if someone calls `React.render` inside a Computation.
    // In that case, we want to opt out of the normal behavior of nested
    // Computations, where if the outer one is invalidated or stopped,
    // it stops the inner one.
    this.computation = Tracker.nonreactive(() => {
      return Tracker.autorun((c) => {
        if (c.firstRun) {
          data = component.getMeteorData();
        } else {
          // Stop this computation instead of using the re-run.
          // We use a brand-new autorun for each call to getMeteorData
          // to capture dependencies on any reactive data sources that
          // are accessed.  The reason we can't use a single autorun
          // for the lifetime of the component is that Tracker only
          // re-runs autoruns at flush time, while we need to be able to
          // re-call getMeteorData synchronously whenever we want, e.g.
          // from componentWillUpdate.
          c.stop();
          // Calling forceUpdate() triggers componentWillUpdate which
          // recalculates getMeteorData() and re-renders the component.

          //XXX - This is the change compared to standard ReactMeteorData
          Meteor.setTimeout(function(){
            component.forceUpdate();
          }, 15);

        }
      });
    });
    return data;
  }

  updateData(newData) {
    const component = this.component;
    const oldData = this.oldData;

    if (! (newData && (typeof newData) === 'object')) {
      throw new Error("Expected object returned from getMeteorData");
    }
    // update componentData in place based on newData
    for (let key in newData) {
      component.data[key] = newData[key];
    }
    // if there is oldData (which is every time this method is called
    // except the first), delete keys in newData that aren't in
    // oldData.  don't interfere with other keys, in case we are
    // co-existing with something else that writes to a component's
    // this.data.
    if (oldData) {
      for (let key in oldData) {
        if (!(key in newData)) {
          delete component.data[key];
        }
      }
    }
    this.oldData = newData;
  }
}

var App = React.createClass({
  mixins: [ReactMeteorData],
  getMeteorData() {
    var page = Session.get('page'); // hacky way of forcing it to look at the new sub handle
    // lets be nice on sub load
    if (!sub.ready()){
      return {
        page: page,
        tests: []
      }
    }
    return {
      page: page,
      tests: Test.find({}, { sort: { _id: -1 } }).fetch()
    }
  },
  nextPage(e){
    e.preventDefault();
    Session.set('page', Session.get('page') + 1);
  },
  firstPage(e){
    e.preventDefault();
    Session.set('page', Math.min(1, Session.get('page') - 1));
  },
  render() {
    var rows = this.data.tests.map(function(t) {
      //console.log(t);
      return <tr key={t._id}>
        <td>{t._id.toString()}</td>
        <td>{t.a}</td>
        <td>{t.b}</td>
        <td>{t.c.toString()}</td>
      </tr>;
    });
    return <div>
      <h3>num: {this.data.tests.length}, now: {new Date().toString()}</h3>
      <a href="#" onClick={this.firstPage}>First Page</a> <a href="#" onClick={this.nextPage}>Next Page</a> Current {this.data.page}
      <table className="table table-bordered table-striped table-condensed">
        <thead>
        <tr>
          <th>_id</th>
          <th>a</th>
          <th>b</th>
          <th>c</th>
        </tr>
        </thead>
        <tbody>
        {rows}
        </tbody>
      </table>
    </div>;
  }
});

if (Meteor.isClient) {
  Meteor.startup(function () {
    React.render(<App />, document.getElementById('root'));
  });
}
