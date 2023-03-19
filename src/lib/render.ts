// @ts-nocheck
import { createRenderer } from '@vue/runtime-core'
import type { DefineComponent } from 'vue'

const componentsMap = new Map()
export function ElementOf<Element, T extends string>(type: T, Ctor: () => any): DefineComponent<Element, {[key: string]: any}> {
  componentsMap.set(type, Ctor)
  return type as any
}

export const getRender = (graph) => {
  let timer
  const nextProps = new Map()
  // 通过包装一下，将_update变成和react-reconciler中的commitUpdate类似的更新旧值和新值
  const patchProp = (el, key, prevValue, nextValue) => {
    if (!el) return;
    const props = nextProps.get(el.id) || {}
    if (timer) {clearTimeout(timer)}
    props[key] = nextValue
    nextProps.set(el.id, {...props, [key]: nextValue})
    timer = setTimeout(() => {
      el._update(nextProps.get(el.id) || {})
      // patchProp只会更新有变动的，所以不能将旧的props清空
      // nextProps.set(el.id, {})
    }, 1)
  }
  // https://vuejs.org/api/custom-renderer.html#createrenderer
  return createRenderer({
    patchProp,
    insert: (el, parent) => el._insert && el._insert(parent),
    remove: (el) => el && el._remove(),
    createElement: (type, isSVG, isCustomizedBuiltIn, vnodeProps) => {
      const Ctor = componentsMap.get(type)
      // 将createelement
      return Ctor && Ctor(vnodeProps, graph)
    },
    createText: (text) => {
      const t = {text, _insert: (parent) => t.parentNode = parent}
      return t
    },
    createComment: (t) => {
      console.log('createComment', t)
    },
    setText: () => null,
    setElementText: () => null,
    parentNode: (node) => node.parentNode,
    nextSibling(graph) {},
    // optional, DOM-specific
    // querySelector,
    // setScopeId,
    // cloneNode,
    // insertStaticContent,
  }, graph)
}


