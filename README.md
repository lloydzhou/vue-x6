# vue-x6

<a href="https://www.npmjs.com/package/vue-x6"><img alt="NPM Package" src="https://img.shields.io/npm/v/vue-x6.svg?style=flat-square"></a>
![npm bundle size](https://img.shields.io/bundlephobia/minzip/vue-x6?style=flat-square)
![npm](https://img.shields.io/npm/dm/vue-x6?style=flat-square)
<a href="/LICENSE"><img src="https://img.shields.io/github/license/lloydzhou/vue-x6?style=flat-square" alt="MIT License"></a>

## 提供自定义渲染器在vue中直接渲染x6画布

1. 使用`createRender`自定义渲染器
2. 只需抽象create/insert/update/remove既可
3. 最后渲染出来的instance就是Graph/Node/Edge对象，这些对象使用ref可以直接绑定
4. Graph内部将Children做进一步处理，生成带key的子组件（避免list diff导致元素id变化）

## 安装
```
npm install vue-x6
yarn add vue-x6
```

## demo

[online demo](https://codesandbox.io/s/vue-x6-demo-nhogrp?file=/src/App.js)

```
<script setup lang="ts">
import { ref } from 'vue'
import { Snapline } from "@antv/x6-plugin-snapline";
import { Graph, Node, Edge, ElementOfPlugin } from './lib/index'
const click = (e) => {
  console.log(e)
}
const SnaplinePlugin = ElementOfPlugin('Snapline', Snapline)
const visible = ref(true)
const toggle = () => visible.value = !visible.value
</script>

<template>
  <button @click="toggle">显示/隐藏node2</button>
  <Graph grid>
    <SnaplinePlugin key="Snapline" />
    <Node id="1" label="node1" :x="100" :y="100" :width="80" :height="40" @click="click" />
    <Node id="2" label="node2" :x="200" :y="200" :width="80" :height="40" @click="click" v-if="visible" />
    <Node id="3" label="node3" :x="200" :y="100" :width="80" :height="40" parent="1" @click="click" />
    <Edge source="1" target="2" @click="click" />
  </Graph>
</template>
```

## TODO
- [x] 提供渲染器
- [x] Graph组件
- [x] Node/Edge组件
- [x] ElementOfPlugin函数方便封装官方plugin
- [ ] NodePort
- [ ] NodeTool/EdgeTool

