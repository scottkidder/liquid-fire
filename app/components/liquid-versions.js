import Ember from "ember";
import { containingElement } from "liquid-fire/ember-internals";

var get = Ember.get;
var set = Ember.set;

export default Ember.Component.extend({
  tagName: "",
  name: 'liquid-versions',

  appendVersion: Ember.on('init', Ember.observer('value', function() {
    var versions = get(this, 'versions');
    var firstTime = false;
    var newValue = get(this, 'value');
    var oldValue;

    if (!versions) {
      firstTime = true;
      versions = Ember.A();
    } else {
      oldValue = versions[0];
    }

    // TODO: may need to extend the comparison to do the same kind of
    // key-based diffing that htmlbars is doing.
    if ((!oldValue && !newValue) ||
        (oldValue  === newValue)) {
      return;
    }

    if (newValue) {
      this.notifyContainer('willTransition', versions);
      versions.unshiftObject({
        value: newValue,
        isNew: true
      });
      if (firstTime) {
        this.firstTime = true;
        set(this, 'versions', versions);
      }
    } else {
      // If this isn't our first render, we may need to transition out
      // any previous versions, even though there's no new version.
      if (!firstTime) {
        this.notifyContainer('willTransition', versions);
        this._transition();
      }
    }
  })),

  _transition: function() {
    var versions = get(this, 'versions');
    var transition;
    var firstTime = this.firstTime;
    this.firstTime = false;


    this.notifyContainer('afterChildInsertion', versions);

    transition = this.transitionMap.transitionFor({
      versions: versions,
      parentElement: Ember.$(containingElement(this)),
      use: get(this, 'use'),
      firstTime: firstTime,
      helperName: get(this, 'name')
    });

    if (this._runningTransition) {
      this._runningTransition.interrupt();
    }
    this._runningTransition = transition;

    transition.run().then((wasInterrupted) => {
      // if we were interrupted, we don't handle the cleanup because
      // another transition has already taken over.
      if (!wasInterrupted) {
        for (var i = versions.length-1; i >= 0; i--) {
          var version = versions[i];
          if (version.isNew) {
            version.isNew = false;
          } else {
            versions.removeObject(version);
          }
        }
        this.notifyContainer("afterTransition", versions);
      }
    });

  },

  notifyContainer: function(method, versions) {
    var target = get(this, 'notify');
    if (target) {
      target[method](versions);
    }
  },

  actions: {
    childDidRender: function(child) {
      var version = get(child, 'version');
      set(version, 'view', child);
      this._transition();
    }
  }

});