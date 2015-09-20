/*
format:
  parent = {
    prop: {_op: operation, param1: ...}
  }
  
operations | params
  set (s)       | ns: value is any
    !(prop in parent) ? parent[prop] = n : err
  modify (m)    | om: old value is not undefined, nm: new value is not undefined
    deepequals(parent[prop], om) ? parent[prop] = nm : err
  delete (d)    | od: old value
    deepequals(parent[prop], od) ? delete parent[prop] : err
    
  setundef (su)  | [osu]: old value is not undefined
   !(prop in parent) || deepequals(parent[prop], osu) ? parent[prop] = undefined : err
  modundef (mu)  | nmu: new value is not undefined
    prop in parent && typeof parent[prop] === 'undefined' ? parent[prop] = nmu : err
  delundef (du)
    typeof parent[prop] === 'undefined' ? delete [parent[prop]] : err
*/

var sharedThreshold = 0.5;

// assert(isPOJS(origin) && isPOJS(comparand))
function diff(origin, comparand) {
  if (!isPOJS(origin) || !isPOJS(comparand))
    throw new Error('Attempting to diff a non-object');
  var delta = {}, props = [];
  
  var originProps = Object.keys(origin), comparandProps = Object.keys(comparand), numSharedProps = 0;
  [].push.apply(props, originProps);
  [].push.apply(props, comparandProps);
  props = props.filter(function(element, index, array) {
    return this.hasOwnProperty(element) ? (numSharedProps++, false) : (this[element] = true);
  }, {});
  
  if ((originProps.length > 0 && numSharedProps / originProps.length < sharedThreshold) || (comparandProps.length > 0 && numSharedProps / comparandProps.length < sharedThreshold))
    return {_op: 'm', om: origin, nm: comparand};
  
  var fPropInOrigin, fPropInComparand, fUndefinedInOrigin, fUndefinedInComparand, fTypesMatch, fObjInOrigin, fObjInComparand;
  var subDelta;
  for (var i = 0; i < props.length; i++) {
    fPropInOrigin = props[i] in origin;
    fPropInComparand = props[i] in comparand;
    fUndefinedInOrigin = typeof origin[props[i]] === 'undefined';
    fUndefinedInComparand = typeof comparand[props[i]] === 'undefined';
    fTypesMatch = typeof comparand[props[i]] === typeof origin[props[i]];
    fObjInOrigin = isPOJS(origin[props[i]]);
    fObjInComparand = isPOJS(comparand[props[i]]);
    
    if (fPropInOrigin && fUndefinedInOrigin && !fUndefinedInComparand)
      delta[props[i]] = {_op: 'mu', nmu: comparand[props[i]]};
    else if (fPropInComparand && (!fUndefinedInOrigin || !fPropInOrigin) && fUndefinedInComparand)
      delta[props[i]] = {_op: 'su', osu: origin[props[i]]};
    else if (!fPropInOrigin && fPropInComparand )
      delta[props[i]] = {_op: 's', ns: comparand[props[i]]};
    else if (fPropInOrigin && !fPropInComparand)
      delta[props[i]] = {_op: 'd', od: origin[props[i]]}
    else if (fUndefinedInOrigin && !fPropInComparand)
      delta[props[i]] = {_op: 'du'};
    else if (!fTypesMatch || (fTypesMatch && !fObjInOrigin && !fObjInComparand && origin[props[i]] !== comparand[props[i]]))
      delta[props[i]] = {_op: 'm', om: origin[props[i]], nm: comparand[props[i]]};
    else if (typeof (subDelta = diff(origin[props[i]], comparand[props[i]])) !== 'undefined')
      delta[props[i]] = subDelta;
      
  }

  if (Object.keys(delta).length > 0)
    return delta;
}

function patch(target, delta, checked) {
  if (typeof checked === 'undefined' && !check(target, delta))
    return false;
    
  Object.keys(delta).forEach(function(prop) {
    if (!('_op' in delta[prop]))
      patch(target[prop], delta[prop]);
    
    switch(delta[prop]._op) {
      case 's':  target[prop] = delta[prop].ns;   break;
      case 'm':  target[prop] = delta[prop].nm;   break;
      case 'su': target[prop] = undefined;        break;
      case 'mu': target[prop] = delta[prop].nmu;  break;
      case 'd':
      case 'du': delete target[prop];             break;
    }
  });
}

function check(target, delta) {
  return Object.keys(delta).every(function(prop) {
    if (!('_op' in delta[prop]))
      return check(target[prop], delta[prop]);
    try {
      switch(delta[prop]._op) {
        case 's':  return !(prop in target);
        case 'm':  return deepequals(target[prop], delta[prop].om);
        case 'd':  return deepequals(target[prop], delta[prop].od);
        case 'su': return !(prop in target) || deepEquals(target[prop], delta[prop].osu);
        case 'mu':
        case 'du': return (prop in target) && typeof target[prop] === 'undefined';
      }
    } catch (e) {
      return false;
    };
  });
}

function isPOJS(obj) {
  return !(
    obj instanceof Date ||
    obj instanceof RegExp ||
    obj instanceof String ||
    obj instanceof Number) &&
    typeof obj === 'object' &&
    obj !== null;
}

function deepequals(origin, comparand, props) {
  if (!isPOJS(origin))
    return origin === comparand;
  
  if (typeof props === 'undefined')
    [].push.apply(props = Object.keys(origin), Object.keys(comparand));
    
  for (var i = 0, isObj; i < props.length; i++) {
    if (typeof origin[props[i]] !== typeof comparand[props[i]] || ((isObj = isPOJS(origin[props[i]])) !== isPOJS(comparand[props[i]])) )
      return false;
    else if (isObj && !deepequals(origin[props[i]], comparand[props[i]]))
      return false;
    else if (!isObj && origin[props[i]] !== comparand[props[i]])
      return false;
  }
  
  return true;
}