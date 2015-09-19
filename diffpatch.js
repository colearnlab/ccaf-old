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
    
  setundef (su)  | o: old value is not undefined
   deepequals(parent[prop], o) ? parent[prop] = undefined : err
  modundef (mu)  | n: new value is not undefined
    typeof parent[prop] === 'undefined' ? parent[prop] = n : err
  delundef (du)
    typeof parent[prop] === 'undefined' ? delete [parent[prop]
*/

var params = {
  
};

function diff(origin, comparand) {
  var delta, props;
  var originProps = Object.keys(origin), comparandProps = Object.keys(comparand), sharedKeys = 0;
  [].push.apply(props, originProps);
  [].push.apply(props, comparandProps);
  props = props.filter(function(element, index, array) {
    return this.hasOwnProperty(item) ? sharedKeys++, false : (this[item] = true);
  }, {});
  
  var fPropInOrigin, fPropInComparand, fUndefinedInOrigin, fUndefinedInComparand, fTypesMatch, fObjInOrigin, fObjInComparand;
  for (var i = 0; i < props.length; i++)
    fPropInOrigin = props[i] in origin;
    fPropInComparand = props[i] in comparand;
    fUndefinedInOrigin = fPropInOrigin && typeof origin[props[i]] === 'undefined';
    fUndefinedInComparand = fPropInComparand && typeof comparand[props[i]] === 'undefined';
    fTypesMatch = typeof comparand[props[i]] === typeof origin[props[i]];
    fObjInOrigin = isPOJS(origin[props[i]]);
    fObjInComparand = isPOJS(comparand[props[i]]);
    
    if (!fPropInOrigin && fPropInComparand)
      delta[props[i]] = {_op: 's', ns: comparand[props[i]]};
    else if (fPropInOrigin && !fPropInComparand)
      delta[props[i]] = {_op: 'd', od: origin[props[i]]}
    else if (fUndefinedInOrigin && !fUndefinedInComparand)
      delta[props[i]] = {_op: 'mu', nmu: comparand[props[i]]};
    else if (!fUndefinedInOrigin && fUndefinedInComparand)
      delta[props[i]] = {_op: 'su', osu: origin[props[i]]]};              
    

  }
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