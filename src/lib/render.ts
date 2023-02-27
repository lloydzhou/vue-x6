// @ts-nocheck
import { createRenderer } from '@vue/runtime-core'
import type { DefineComponent } from 'vue'

const componentsMap = new Map()
export function ElementOf<Element, T extends string>(type: T, Ctor: () => any): DefineComponent<Element, {[key: string]: any}> {
  componentsMap.set(type, Ctor)
  return type as any
}

// https://vuejs.org/api/custom-renderer.html#createrenderer
const { render, createApp } = createRenderer({
  patchProp: (el, key, prevValue, nextValue) => el._update(key, prevValue, nextValue),
  insert: (el, parent) => el && el._insert(parent),
  remove: (el) => el && el._remove(),
  createElement: (type, isSVG, isCustomizedBuiltIn, vnodeProps) => {
    const Ctor = componentsMap.get(type)
    return Ctor && Ctor(vnodeProps)
  },
  createText: (text) => {
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

