import { Graph as X6Graph, Node as X6Node, Edge as X6Edge, ObjectExt, StringExt } from '@antv/x6'
import { defineComponent, onMounted, onUnmounted, ref, shallowReactive, h, nextTick } from 'vue'
import { ElementOf, getRender } from './render'
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

    const children = ref([])
    const idMap = ref(new Map())
    // @ts-ignore
    const processChildren = (children: any[], prefix: string = '') => {
      // console.log('processChildren', children, prefix, idMap.value)
      return children.map((i: any) => {
        // 将key重置，不更改props这些信息
        const { props={}, type, children=[] } = i
        const { id } = props || {}
        const hash = StringExt.hashcode(JSON.stringify(props))
        let key = (id && `${prefix}:${type}:${id}`) || (id && idMap.value.get(`${prefix}:${type}:${id}`)) || idMap.value.get(`${prefix}:${hash}`)
        if (!key) {
          key = StringExt.uuid()
          // 边可能会在节点删除的时候隐式删除，使用旧的对象导致渲染出问题并且不能更新
          // TODO 所以边不传id的时候就使用新的uuid创建
          if (!id && type !== 'Edge') {
            idMap.value.set(id ? `${prefix}:${id}` : `${prefix}:${hash}`, key)
          }
        }
        // 之前直接return i导致被频繁删除和创建，反而是使用h函数生成一个新的不会触发频繁删除
        return h(
          type,
          {...props, id: id || key, key},
          children && processChildren(children, key),
        )
      }).filter((i: any) => i.key)
    }
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

        const { render } = getRender(context.graph)
        // 这里不能直接render(children.value, context.graph)，因为children.value会被重新赋值
        // 这里使用一个h函数将一个匿名函数构成的组件传给render函数
        render(h(() => children.value), context.graph)
      }
    })
    onUnmounted(() => {
      context.graph && context.graph.dispose()
    })
    return () => {
      // update ref in render function, can update children app render on graph
      const value = slots.default && slots.default() || []
      nextTick(() => children.value = processChildren(value))
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {!container && <div ref={containerRef} />}
        </div>
      )
    }
  }
}) as Graph

const createCell = (Ctor: Function, shape: string, newProps: AType, graph: X6Graph) => {
  const { props={}, events={} } = processProps(newProps)
  // 使用默认的shape='rect'，同时props.shape会覆盖
  const node = Ctor({shape, ...props})
  node._remove = () => {
    node._removeEvent()
    graph.model.removeCell(node)
  }
  
  node._update = (nextProps: AType) => {
    const { props={}, events={} } = processProps(nextProps)
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
    graph.trigger('updated:props', {cell: node})
  }

  // 增加监听事件
  graph.model.addCell(node)
  node.parentNode = graph
  if (props.parent) {
    const parentNode = graph.getCellById(props.parent)
    if (parentNode) {
      parentNode.addChild(node)
    }
  }
  node._removeEvent = bindEvent(node, events, graph)
  nextTick(() => node._update(props))
  return node
}

const createPlugin = (Ctor: Function, newProps: AType, graph: X6Graph) => {
  const { props={}, events={} } = processProps(newProps)
  // @ts-ignore
  const plugin = new Ctor({enabled: true, ...props})
  plugin._remove = () => plugin.dispose()
  plugin._update = () => null
  graph.use(plugin)
  bindEvent(null, events, plugin)
  return plugin
}

// labels/ports
const createListInstance = (get: any, set: any, props: AType, graph: X6Graph) => {
  const { id } = props
  // 使用id标记当前的对象
  const instance = {
    id, cell: { id: '' }, props,
    // update只是将newProps存起来，实际执行逻辑在updated:props里面执行
    _update: (p: any) => instance.props = p,
    _insert: (c: any) => instance.cell = c,
    _remove: () => {
      instance._update(null)
      graph.off('updated:props', handler)
    }
  }
  const handler = ({cell}: AType) => {
    if (instance.cell.id == cell.id) {
      const items = get(cell)
      const i = items.findIndex((i: any) => i.id === id)
      // 如果通过id找不到index，就认为在最后（类似push）
      const index = i === -1 ? items.length : i
      // 如果newProps为空，就表示移除当前配置
      if (instance.props) {
        items.splice(index, 1, instance.props)
      } else {
        items.splice(index, 1)
      }
      set(cell, items)
    }
  }
  graph.on('updated:props', handler)
  return instance
}
// label
const createLabel = (props: AType, graph: X6Graph) => createListInstance(
  (edge: X6Edge) => edge.getLabels(),
  (edge: X6Edge, labels: any[]) => edge.setLabels([...labels]),
  props, graph
)

const createNamedInstance = (type: string, update: Function, props: AType, graph: X6Graph) => {
  const { id, name } = props
  const instance = {
    id, name, props, cell: {id: ''},
    // @ts-ignore
    _update: (p?: AType) => instance.props = p,
    _insert: (c: any) => instance.cell = c,
    _remove: () => {
      instance._update()
      graph.off('updated:props', handler)
    }
  }
  const handler = ({cell}: AType) => {
    if (instance.cell.id == cell.id) {
      update(instance, cell, instance.props)
    }
  }
  graph.on('updated:props', handler)
  return instance
}

// marker: type=sourceMarker/targetMarker
const createMarker = (type: string, props: AType, graph: X6Graph) => createNamedInstance(type, (item: AType, edge: X6Edge, newProps: AType) => {
  const lineAttr = edge.attr('line') as AType
  edge.attr('line', { ...lineAttr, [type]: newProps })
}, props, graph)

// portgroup: type=group
const createPortGroup = (type: string, props: AType, graph: X6Graph) => createNamedInstance(type, (item: AType, node: X6Node, newProps: AType) => {
    // dynamic set portgroup not working
    // @ts-ignore
    const { port } = node
    const groups = (node.getPropByPath('ports/groups') || {}) as AType
    if (newProps) {
      // @ts-ignore
      groups[item.name] = port.parseGroup(newProps)
    } else {
      delete groups[item.name]
    }
    node.setPropByPath('ports/groups', {...groups})
}, props, graph)
const createPort = (props: AType, graph: X6Graph) => createListInstance(
  (node: X6Node) => node.getPorts(), // getPorts return ObjectExt.cloneDeep
  (node: X6Node, ports: AType[]) => {
    node.setPropByPath('ports/items', ports)
  },
  props, graph
)

// nodetools/edgetools
const createTool = (props: AType, graph: X6Graph) => createListInstance(
  (cell: any) => {
    const tools = cell.getTools()
    if (tools && tools.items) {
      return tools.items
    }
    return tools || []
  },
  (cell: any, tools: AType[]) => cell.setTools(tools),
  props, graph
)


// @ts-ignore
export const Node = ElementOf("Node", createCell.bind(null, X6Node.create, 'rect'))
// @ts-ignore
export const Edge = ElementOf("Edge", createCell.bind(null, X6Edge.create, 'edge'))
// @ts-ignore
export const SourceMarker = ElementOf("SourceMarker", createMarker.bind(null, 'sourceMarker'))
// @ts-ignore
export const TargetMarker = ElementOf("TargetMarker", createMarker.bind(null, 'targetMarker'))
// @ts-ignore
export const PortGroup = ElementOf("PortGroup", createPortGroup.bind(null, 'group'))
// @ts-ignore
export const Label = ElementOf("Label", createLabel)
// @ts-ignore
export const Port = ElementOf("Port", createPort)
// @ts-ignore
export const EdgeTool = ElementOf("EdgeTool", createTool)
// @ts-ignore
export const NodeTool = ElementOf("NodeTool", createTool)

export function ElementOfPlugin(name: string, type: any) {
  // @ts-ignore
  return ElementOf(name, createPlugin.bind(null, type)) as any
}


