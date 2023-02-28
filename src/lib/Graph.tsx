import { Graph as X6Graph, Node as X6Node, Edge as X6Edge, ObjectExt, StringExt } from '@antv/x6'
import { defineComponent, onMounted, onUnmounted, ref, shallowReactive, h, nextTick } from 'vue'
import { ElementOf, render } from './render'
import type { DefineComponent, Ref } from 'vue'

type AType = {[key: string]: any}
const processProps = (props: AType) => {
  return Object.entries(props).reduce((res: AType, [name, value]) => {
    if (name.startsWith('on')) {
      res.events[name.substr(2).toLowerCase()] = value
    } else {
      // enabled --> enabled: true
      res.props[name] = value === "" ? true : value
    }
    return res
  }, {props:{}, events: {}})
}

const bindEvent = (node: any, events: AType, graph: X6Graph) => {
  // 绑定事件都是包了一层的，返回一个取消绑定的函数
  const ubindEvents = Object.entries(events).map(([name, callback]) => {
    const handler = (e: any) => {
      const { cell } = e
      if (node && cell.id === node.id) {
        // @ts-ignore
        callback(e)
      }
    }
    graph.on(`cell:${name}`, handler)
    return () => graph.off(`cell:${name}`, handler)
  })
  return () => ubindEvents.forEach(h => h())
}

interface Props {
  container?: Ref<HTMLElement>;
}
type Graph = DefineComponent<X6Graph.Options & Props, {[key: string]: any}>

export const Graph = defineComponent({
  inheritAttrs: false,
  name: 'Graph',
  setup(props, { attrs, slots, expose }) {
    const { container } = props
    const { props: gprops={}, events={} } = processProps(attrs)
    const { width=800, height=600, ...other } = gprops
    const containerRef = ref<HTMLElement | undefined>(container)
    const context = shallowReactive<{graph: X6Graph | null}>({ graph: null })
    const children = ref()
    const idMap = ref(new Map())
    expose(context)
    onMounted(() => {
      // options
      if (containerRef.value) {
        context.graph = new X6Graph({
          container: containerRef.value,
          width,
          height,
          ...other,
        })
        bindEvent(null, events, context.graph)

        const item = h(() => (children.value || []).filter((i: any) => i.props).map((i: any) => {
          // 将key重置，不更改props这些信息
          const { key, props={}, type } = i
          const { id } = props
          if (!key) {
            const hash = StringExt.hashcode(JSON.stringify(props))
            i.key = id || idMap.value.get(id) || idMap.value.get(hash) || StringExt.uuid()
            // 边可能会在节点删除的时候隐式删除，使用旧的对象导致渲染出问题并且不能更新
            // TODO 所以边不传id的时候就使用新的uuid创建
            if (!id && type !== 'Edge') {
              idMap.value.set(id || hash, i.key)
            }
          }
          return i
        }), context)
        render(item, context.graph)
      }
    })
    onUnmounted(() => {
      context.graph && context.graph.dispose()
    })
    return () => {
      // update ref in render function, can update children app render on graph
      const value = slots.default && slots.default() || []
      nextTick(() => children.value = value)
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {!container && <div ref={containerRef} />}
        </div>
      )
    }
  }
}) as Graph

const createCell = (Ctor: Function, shape: string, newProps: AType) => {
  const { props={}, events={} } = processProps(newProps)
  let graph: X6Graph
  const node = Ctor(newProps)
  node._remove = () => {
    node._removeEvent()
    graph!.model.removeCell(node)
  }
  node._insert = (g: X6Graph) => {
    graph = g.addCell(node)
    // 增加监听事件
    node._removeEvent = bindEvent(node, events, graph)
    node.parentNode = g
    if (props.parent) {
      const parentNode = graph.getCellById(props.parent)
      if (parentNode) {
        parentNode.addChild(node)
      }
    }
  }
  
  let timer: any
  let nextProps: AType = {}
  node._update = (key: string, prevValue: any, nextValue: any) => {
    // vue only supprt patchProp
    if (timer) {clearTimeout(timer)}
    nextProps[key] = nextValue
    timer = setTimeout(() => node._update_props(nextProps), 1)
  }
  node._update_props = (newProps: AType) => {
    const { props={}, events={} } = processProps(newProps)
    const t = Ctor({shape: node.shape, ...props, parent: undefined})
    const prop = t.getProp()
    if (!ObjectExt.isEqual(node.getProp(), prop)) {
      Object.keys(prop).forEach((key) => {
        if (['id', 'parent', 'shape'].indexOf(key) === -1) {
          node.setProp(key, prop[key])
        }
      });
    }
    // 移除旧事件，监听新事件
    node._removeEvent()
    // 重新监听新的事件
    node._removeEvent = bindEvent(node, events, graph)
    newProps = {}
  }
  return node
}

const createPlugin = (Ctor: Function, newProps: AType) => {
  const { props={}, events={} } = processProps(newProps)
  // @ts-ignore
  const plugin = new Ctor({enabled: true, ...props})
  plugin._insert = (graph: X6Graph) => {
    graph.use(plugin)
    bindEvent(null, events, plugin)
  }
  plugin._remove = () => plugin.dispose()
  // TODO
  plugin._update = () => null
  return plugin
}

// @ts-ignore
export const Node = ElementOf("Node", createCell.bind(null, X6Node.create, 'rect'))
// @ts-ignore
export const Edge = ElementOf("Edge", createCell.bind(null, X6Edge.create, 'edge'))
export function ElementOfPlugin(name: string, type: any) {
  // @ts-ignore
  return ElementOf(name, createPlugin.bind(null, type)) as any
}


