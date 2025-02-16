import React from 'react';
import { View } from 'react-native';
import { NavigationMotion, Scene, SharedElementMotion } from 'navigation-react-mobile';
import { MobileHistoryManager } from 'navigation-react-mobile';

type TransformationType = 'translate' | 'scale' | 'alpha' | 'rotate';
type StyleValue = string | number;

interface TransformConfig {
  type: TransformationType;
  start?: StyleValue;
  from?: StyleValue;
  startX?: StyleValue;
  fromX?: StyleValue;
  startY?: StyleValue;
  fromY?: StyleValue;
  items?: TransformConfig[];
}

const NavigationStack = ({unmountedStyle, mountedStyle, crumbedStyle, unmountStyle = () => null, crumbStyle = () => null,
  sharedElementTransition, duration, renderScene, renderTransition, children}) => {
  const customRender = typeof children === 'function' || renderTransition;
  // if !customRender then turn unmountStyle into unmounted style (and mountedStyle)
  // and crumbStyle into crumbStyle
  // (what about if they're empty like in the zoom sample?)
  const emptyStyle = {duration, translateX: 0, translateX_pc: 0, scaleX: 1, scaleX_pc: 100, alpha: 1};
  const returnOrCall = (item, ...args) => typeof item !== 'function' ? item : item(...args);
  
  const processStyleValue = (value: StyleValue): { value: number; isPercent: boolean } => {
    const isPercent = typeof value === 'string' && value.endsWith('%');
    const numericValue = isPercent ? +(value as string).slice(0, -1) : +value;
    return { value: numericValue, isPercent };
  };

  const getStyle = (trans) => {
    trans = !Array.isArray(trans) ? trans : {items: trans};
    const transStyle = {...emptyStyle};
    const addStyle = (type: TransformationType, value: StyleValue) => {
      if (value === undefined) return;
      
      const { value: numericValue, isPercent } = processStyleValue(value);
      const suffix = isPercent ? '_pc' : '';
      transStyle[type + suffix] = numericValue;
    }
    const convertTrans = (config: TransformConfig) => {
      const { type, start, from, startX, fromX, startY, fromY, items } = config;
      
      if (type === 'translate' || type === 'scale') {
        addStyle(`${type}X` as TransformationType, startX ?? fromX);
        addStyle(`${type}Y` as TransformationType, startY ?? fromY);
      }
      if (type === 'alpha' || type === 'rotate') addStyle(type, start ?? from);
      items?.forEach(convertTrans);
    };
    convertTrans(trans);
    return transStyle;
  }
  return (
      <NavigationMotion
          unmountedStyle={unmountedStyle || ((state, data, crumbs) => {
            let trans = returnOrCall(unmountStyle, true, state, data, crumbs);
            if (!trans || typeof trans === 'string')
              trans = {type: 'translate',  startX: 100};
            return getStyle(trans);
          })}
          mountedStyle={mountedStyle || {...emptyStyle}}
          crumbStyle={crumbedStyle || ((state, data, crumbs, nextState, nextData) => {
            let trans = returnOrCall(crumbStyle, true, state, data, crumbs, nextState, nextData);
            if (!trans || typeof trans === 'string')
              trans = {type: 'translate',  startX: 0};
            return getStyle(trans);
          })}
          sharedElementMotion={sharedElementTransition}
          duration={duration}
          renderScene={renderScene}
          renderMotion={typeof children !== 'function' ? renderTransition || renderMotion : undefined}>
          {typeof children !== 'function' ? cloneScenes(children) : (children || renderMotion)}
      </NavigationMotion>
  );
}

const renderMotion = ({translateX, translateX_pc, scaleX, scaleX_pc, alpha}, scene, key) => (
  <View key={key}
    style={{
      transform: `
        translate(${translateX ? `${translateX}px` : `${translateX_pc}%`})
        scale(${scaleX !== 1 ? `${scaleX}` : `${scaleX_pc / 100}`})
      ` as any,
      opacity: alpha,
      position: 'absolute',
      backgroundColor: '#fff',
      left: 0, right: 0, top: 0, bottom: 0,
      overflow: 'hidden',
    }}>
    {scene}
  </View>
);

const cloneScenes = (children, nested = false) => (
  React.Children.map(children, scene => (
    (scene.type === Scene || nested)
      ? React.cloneElement(scene, { crumbStyle: scene.props.crumbedStyle })
      : React.cloneElement(scene, null, cloneScenes(scene.props.children, true))
  ))
);

NavigationStack.Scene = Scene;
NavigationStack.HistoryManager = MobileHistoryManager;
NavigationStack.SharedElementTransition = SharedElementMotion;

export default NavigationStack;
