// @ts-nocheck
import { createRenderer } from '@vue/runtime-core'
import type { DefineComponent } from 'vue'

const componentsMap = new Map()
export function ElementOf<Element, T extends string>(type: T, Ctor: () => any): DefineComponent<Element, {[key: string]: any}> {
  componentsMap.set(type, Ctor)
  return type as any
}

const patchProp = function(el, key, prevValue, nextValue, isSVG, prevChildren, parentComponent, parentSuspense, unmountChildren) {
  el._update(key, prevValue, nextValue)
}

const createElement = function(type, isSVG, isCustomizedBuiltIn, vnodeProps){
  const Ctor = componentsMap.get(type)
  const com = Ctor && Ctor(vnodeProps)
  return com
}

// https://vuejs.org/api/custom-renderer.html#createrenderer
const { render, createApp } = createRenderer({
  patchProp,
  insert: (el, parent) => el && el._insert(parent),
  remove: (el) => el && el._remove(),
  createElement,
  createText(text) {
    const t = {text, _insert: (parent) => t.parentNode = parent}
    return t
  },
  createComment: () => null,
  setText: () => null,
  setElementText: () => null,
  parentNode: (node) => node.parentNode,
  nextSibling(graph) {},
  // optional, DOM-specific
  // querySelector,
  // setScopeId,
  // cloneNode,
  // insertStaticContent,
})

export { render, createApp }

