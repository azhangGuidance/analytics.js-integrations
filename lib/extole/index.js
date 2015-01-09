'use strict';

/**
* Module dependencies.
*/

var bind = require('bind');
var domify = require('domify');
var each = require('each');
var integration = require('analytics.js-integration');
var json = require('json');
var object = require('object');

/**
* Expose `Extole` integration.
*/

var Extole = module.exports = integration('Extole')
  .global('extole')
  .option('clientId', '')
  .mapping('events')
  .tag('main', '<script src="//tags.extole.com/{{ clientId }}/core.js">');

/**
* Initialize.
*
* @param {Object} page
*/

Extole.prototype.initialize = function(){
  if (this.loaded()) return this.ready();
  this.load('main', bind(this, this.ready));
};

/**
* Loaded?
*
* @return {Boolean}
*/

Extole.prototype.loaded = function(){
  return !!(window.extole);
};

/**
* Track.
*
* @param {Track} track
*/

Extole.prototype.track = function(track){
  var event = track.event();
  var events = this.events(event);

  if (!events.length) return this.debug('No events found for %s', event);

  var params = { 'tag:segment_event': event };
  var properties = track.properties();

  each(events, function(event){
    each(event, function(key, value){
      params[key] = properties[value];
    });
  });

  var conversion = {
    type: 'purchase',
    params: params
  };

  this._registerConversion(injectConversionTag(conversion));
};

/**
* Completed Order.
*
* @param {Track} track
*/

Extole.prototype.completedOrder = function(track){
  // `completedOrder` should only fire when there are no `conversionEvents`
  if (!object.isEmpty(this.options.events)) return;

  var conversion = {
    type: 'purchase',
    params: {
      e: this.analytics.user().traits().email,
      'tag:cart_value': track.revenue(),
      partner_conversion_id: track.orderId()
    }
  };

  this._registerConversion(injectConversionTag(conversion));
};

/**
 * Create an Extole conversion tag.
 *
 * @param {HTMLElement} conversionTag A HTML element containing an Extole
 * conversion.
 */

Extole.prototype._registerConversion = function(conversionTag){
  if (window.extole.main && window.extole.main.fireConversion) {
    return window.extole.main.fireConversion(conversionTag);
  }

  if (window.extole.initializeGo) {
    window.extole.initializeGo().andWhenItsReady(function(){
      window.extole.main.fireConversion(conversionTag);
    });
  }
};

/**
 * Create an Extole conversion tag.
 *
 * @param {Object }conversion An Extole conversion object.
 * @return {HTMLElement}
 */

function injectConversionTag(conversion){
  var conversionText = json.stringify(conversion);
  var conversionTag = domify('<script type="extole/conversion">' + conversionText + '</script>');
  var firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode.insertBefore(conversionTag, firstScript);
  return conversionTag;
}
